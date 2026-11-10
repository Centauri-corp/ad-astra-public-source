import "server-only";
import { createPublicKey } from "node:crypto";
import { verifyToken } from "@clerk/backend";
import { decodeJwt } from "@clerk/backend/jwt";
import { previewEnabled, previewOrigin } from "../lib/preview-policy.ts";
import type { AccessStatus } from "../lib/access-status.ts";

type Environment = Readonly<Record<string, string | undefined>>;
type Configuration = {
  jwtKey: string;
  issuer: string;
  audience: string;
  origin: string;
};
export type WorkspacePrincipal = Readonly<{
  subject: string;
  sessionId: string;
  expiresAt: number;
  scope: Readonly<{ kind: "personal" | "organization"; key: string }>;
}>;
const verifiedPrincipals = new WeakSet<WorkspacePrincipal>();
const issuer = "https://clerk.adastra.global",
  audience = "ad-astra-workspace";

function configuration(env: Environment): Configuration | null {
  if (
    !previewEnabled(env) ||
    env.AD_ASTRA_WORKSPACE_SESSION_QA !== "true" ||
    env.AD_ASTRA_AUTH_ISSUER !== issuer ||
    env.AD_ASTRA_AUTH_AUDIENCE !== audience
  )
    return null;
  const jwtKey = env.CLERK_JWT_KEY;
  if (
    !jwtKey ||
    jwtKey.length > 8192 ||
    !jwtKey.startsWith("-----BEGIN PUBLIC KEY-----") ||
    !jwtKey.trimEnd().endsWith("-----END PUBLIC KEY-----")
  )
    return null;
  try {
    const key = createPublicKey(jwtKey);
    if (
      key.asymmetricKeyType !== "rsa" ||
      (key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048
    )
      return null;
    return { jwtKey, issuer, audience, origin: previewOrigin(env)! };
  } catch {
    return null;
  }
}

export function accessStatus(env: Environment): AccessStatus {
  return {
    schema: "ad-astra-access/v1",
    identityProvider: "clerk",
    sessionBoundary: configuration(env) ? "qa-configured" : "qa-unconfigured",
    customerAccess: false,
    providerQaAccepted: false,
    liveChat: false,
    persistence: false,
    privilegedActions: false,
  };
}

type Authentication =
  | { ok: true; principal: WorkspacePrincipal }
  | {
      ok: false;
      status: 401 | 503;
      error:
        | "authentication_required"
        | "authentication_invalid"
        | "authentication_unavailable";
    };
const validId = (value: unknown, prefix: string): value is string =>
  typeof value === "string" &&
  value.length <= 128 &&
  new RegExp(`^${prefix}_[A-Za-z0-9]+$`).test(value);

export async function authenticateSession(
  request: Request,
  env: Environment,
): Promise<Authentication> {
  const config = configuration(env);
  if (!config)
    return { ok: false, status: 503, error: "authentication_unavailable" };
  const authorization = request.headers.get("authorization");
  // Cookies and browser-supplied tenant/role headers cannot substitute for a token.
  if (!authorization)
    return { ok: false, status: 401, error: "authentication_required" };
  if (
    authorization.length > 12007 ||
    !/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(
      authorization,
    )
  )
    return { ok: false, status: 401, error: "authentication_invalid" };
  try {
    const token = authorization.slice(7);
    const header = decodeJwt(token).header;
    if (
      header.alg !== "RS256" ||
      header.typ !== "JWT" ||
      typeof header.kid !== "string" ||
      !header.kid ||
      header.kid.length > 128 ||
      ["crit", "jku", "x5u", "jwk", "cat"].some((key) =>
        Object.hasOwn(header, key),
      )
    )
      throw new Error("invalid_header");
    // The public PEM is mandatory: no secret-key fallback or remote key lookup.
    const claims = await verifyToken(token, {
      jwtKey: config.jwtKey,
      issuer: config.issuer,
      audience: config.audience,
      authorizedParties: [config.origin],
      clockSkewInMs: 0,
    });
    const now = Math.floor(Date.now() / 1000);
    if (
      ![claims.exp, claims.iat, claims.nbf].every(Number.isSafeInteger) ||
      claims.exp <= now ||
      claims.nbf > now ||
      claims.iat > now ||
      claims.iat < now - 300 ||
      claims.exp <= claims.iat ||
      claims.exp - claims.iat > 300 ||
      !validId(claims.sub, "user") ||
      !validId(claims.sid, "sess") ||
      (claims.sts !== undefined && claims.sts !== "active") ||
      claims.act !== undefined
    )
      throw new Error("invalid_session");
    let organization: unknown;
    if (claims.v === 2) {
      if (
        ["org_id", "org_role", "org_permissions", "org_slug"].some((key) =>
          Object.hasOwn(claims, key),
        )
      )
        throw new Error("mixed_claim_versions");
      if (claims.o !== undefined) {
        if (
          !claims.o ||
          typeof claims.o !== "object" ||
          Array.isArray(claims.o)
        )
          throw new Error("invalid_organization");
        organization = claims.o.id;
        if (!validId(organization, "org"))
          throw new Error("invalid_organization");
      }
    } else {
      if (claims.v !== undefined || Object.hasOwn(claims, "o"))
        throw new Error("unknown_claim_version");
      organization = claims.org_id;
      if (organization !== undefined && !validId(organization, "org"))
        throw new Error("invalid_organization");
      if (
        organization === undefined &&
        ["org_role", "org_permissions", "org_slug"].some((key) =>
          Object.hasOwn(claims, key),
        )
      )
        throw new Error("incomplete_organization");
    }
    const kind = organization === undefined ? "personal" : "organization";
    const principal: WorkspacePrincipal = Object.freeze({
      subject: claims.sub,
      sessionId: claims.sid,
      expiresAt: claims.exp,
      scope: Object.freeze({
        kind,
        key: `${issuer}|${kind}|${organization ?? claims.sub}`,
      }),
    });
    verifiedPrincipals.add(principal);
    return { ok: true, principal };
  } catch {
    // SDK errors can contain claims; never log or return them.
    return { ok: false, status: 401, error: "authentication_invalid" };
  }
}

// Scope comparison only, NOT a database membership lookup or privileged role grant.
// Call with scope metadata loaded server-side, never a tenant value from a client.
export function sameVerifiedScope(
  principal: unknown,
  serverScopeKey: unknown,
): boolean {
  if (
    !principal ||
    typeof principal !== "object" ||
    !verifiedPrincipals.has(principal as WorkspacePrincipal)
  )
    return false;
  const verified = principal as WorkspacePrincipal;
  return (
    verified.expiresAt > Math.floor(Date.now() / 1000) &&
    typeof serverScopeKey === "string" &&
    verified.scope.key === serverScopeKey
  );
}
