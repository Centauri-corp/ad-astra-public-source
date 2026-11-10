// Ephemeral local signing fixture, never a Clerk/provider acceptance receipt.
import { generateKeyPairSync, sign } from "node:crypto";
export function signingFixture() {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const pem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const origin = "http://127.0.0.1:4176";
  const env = {
    AD_ASTRA_WORKSPACE_PREVIEW: "true",
    AD_ASTRA_WORKSPACE_ORIGIN: origin,
    AD_ASTRA_WORKSPACE_SESSION_QA: "true",
    AD_ASTRA_AUTH_ISSUER: "https://clerk.adastra.global",
    AD_ASTRA_AUTH_AUDIENCE: "ad-astra-workspace",
    CLERK_JWT_KEY: pem,
  };
  function token(
    changes: Record<string, unknown> = {},
    headerChanges: Record<string, unknown> = {},
  ) {
    const now = Math.floor(Date.now() / 1000);
    const header = {
      alg: "RS256",
      typ: "JWT",
      kid: "local-qa-only",
      ...headerChanges,
    };
    const claims = {
      iss: env.AD_ASTRA_AUTH_ISSUER,
      aud: env.AD_ASTRA_AUTH_AUDIENCE,
      azp: origin,
      sub: "user_SyntheticA",
      sid: "sess_SyntheticA",
      iat: now - 1,
      nbf: now - 1,
      exp: now + 120,
      sts: "active",
      ...changes,
    };
    const content = [header, claims]
      .map((value) => Buffer.from(JSON.stringify(value)).toString("base64url"))
      .join(".");
    return (
      content +
      "." +
      sign("RSA-SHA256", Buffer.from(content), privateKey).toString("base64url")
    );
  }
  return { env, origin, token };
}
