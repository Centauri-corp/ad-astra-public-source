import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import {
  accessStatus,
  authenticateSession,
  sameVerifiedScope,
} from "../server/session.ts";
import { sessionHandshake } from "../server/session-handler.ts";
import { parseAccessStatus } from "../lib/access-status.ts";
import { signingFixture } from "./fixtures/session-fixture.ts";
const fixture = signingFixture();
const authRequest = (token?: string, headers: Record<string, string> = {}) =>
  new Request(fixture.origin + "/api/session", {
    method: "POST",
    headers: {
      origin: fixture.origin,
      "x-ad-astra-preview": "workflow-v1",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

test("session configuration defaults closed and production cannot enable QA", () => {
  const closed = [
    {},
    { ...fixture.env, AD_ASTRA_WORKSPACE_SESSION_QA: "false" },
    { ...fixture.env, VERCEL_ENV: "production" },
    { ...fixture.env, AD_ASTRA_WORKSPACE_PREVIEW: "false" },
    { ...fixture.env, AD_ASTRA_AUTH_ISSUER: "https://attacker.example" },
    { ...fixture.env, AD_ASTRA_AUTH_AUDIENCE: "other" },
    { ...fixture.env, CLERK_JWT_KEY: "" },
    { ...fixture.env, AD_ASTRA_WORKSPACE_ORIGIN: "https://adastra.global" },
  ];
  for (const env of closed)
    assert.equal(accessStatus(env).sessionBoundary, "qa-unconfigured");
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const { publicKey } = generateKeyPairSync("rsa", { modulusLength: 1024 });
  for (const key of [
    privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicKey.export({ type: "spki", format: "pem" }).toString(),
    "-----BEGIN PUBLIC KEY-----\ninvalid\n-----END PUBLIC KEY-----",
  ])
    assert.equal(
      accessStatus({ ...fixture.env, CLERK_JWT_KEY: key }).sessionBoundary,
      "qa-unconfigured",
    );
  assert.equal(accessStatus(fixture.env).sessionBoundary, "qa-configured");
});
test("valid personal sessions are verified networklessly with no record/provider requests", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    throw new Error("network forbidden");
  });
  const result = await authenticateSession(
    authRequest(fixture.token()),
    fixture.env,
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.principal.scope.kind, "personal");
  assert.ok(Object.isFrozen(result.principal));
  assert.ok(Object.isFrozen(result.principal.scope));
  assert.equal(
    sameVerifiedScope(result.principal, result.principal.scope.key),
    true,
  );
  assert.equal(calls, 0);
});
test("two signed personal identities cannot share a scope or forge a verified principal", async () => {
  const first = await authenticateSession(
    authRequest(fixture.token()),
    fixture.env,
  );
  const second = await authenticateSession(
    authRequest(
      fixture.token({ sub: "user_SyntheticB", sid: "sess_SyntheticB" }),
    ),
    fixture.env,
  );
  assert.ok(first.ok && second.ok);
  if (!first.ok || !second.ok) return;
  assert.notEqual(first.principal.scope.key, second.principal.scope.key);
  assert.equal(
    sameVerifiedScope(first.principal, second.principal.scope.key),
    false,
  );
  assert.equal(
    sameVerifiedScope(second.principal, first.principal.scope.key),
    false,
  );
  assert.equal(
    sameVerifiedScope({ ...first.principal }, first.principal.scope.key),
    false,
  );
  assert.equal(sameVerifiedScope(null, first.principal.scope.key), false);
});
test("legacy and v2 organization scopes agree, but organizations and personal scope do not", async () => {
  const v1 = await authenticateSession(
    authRequest(
      fixture.token({ org_id: "org_SyntheticA", org_role: "org:member" }),
    ),
    fixture.env,
  );
  const v2 = await authenticateSession(
    authRequest(
      fixture.token({ v: 2, o: { id: "org_SyntheticA", rol: "member" } }),
    ),
    fixture.env,
  );
  const other = await authenticateSession(
    authRequest(fixture.token({ v: 2, o: { id: "org_SyntheticB" } })),
    fixture.env,
  );
  const personal = await authenticateSession(
    authRequest(fixture.token()),
    fixture.env,
  );
  assert.ok(v1.ok && v2.ok && other.ok && personal.ok);
  if (!v1.ok || !v2.ok || !other.ok || !personal.ok) return;
  assert.equal(v1.principal.scope.kind, "organization");
  assert.equal(v1.principal.scope.key, v2.principal.scope.key);
  assert.equal(
    sameVerifiedScope(v1.principal, other.principal.scope.key),
    false,
  );
  assert.equal(
    sameVerifiedScope(v1.principal, personal.principal.scope.key),
    false,
  );
});
test("forged signatures and unsafe header algorithms/key references are rejected", async () => {
  const foreign = signingFixture();
  const tokens = [foreign.token(), fixture.token().slice(0, -8) + "AAAAAAAA"];
  for (const header of [
    { alg: "none" },
    { alg: "HS256" },
    { typ: "at+jwt" },
    { kid: "" },
    { kid: "x".repeat(129) },
    { jku: "https://evil.example/keys" },
    { x5u: "https://evil.example/cert" },
    { jwk: {} },
    { crit: [] },
    { cat: "m2m" },
  ])
    tokens.push(fixture.token({}, header));
  for (const token of tokens)
    assert.deepEqual(
      await authenticateSession(authRequest(token), fixture.env),
      { ok: false, status: 401, error: "authentication_invalid" },
    );
});
test("issuer, audience, party, expiry, future dates, IDs and session state are enforced", async () => {
  const now = Math.floor(Date.now() / 1000);
  for (const claims of [
    { iss: "https://evil.example" },
    { aud: "wrong" },
    { azp: "https://adastra.global" },
    { azp: null },
    { exp: now - 1 },
    { nbf: now + 60 },
    { iat: now + 60 },
    { iat: now - 301 },
    { iat: now - 2, exp: now + 400 },
    { exp: now },
    { exp: String(now + 50) },
    { nbf: null },
    { sub: "admin" },
    { sid: "session" },
    { sts: "pending" },
    { sts: "revoked" },
    { act: { sub: "user_Other" } },
  ])
    assert.equal(
      (
        await authenticateSession(
          authRequest(fixture.token(claims)),
          fixture.env,
        )
      ).ok,
      false,
    );
});
test("malformed, mixed and unknown organization claim versions fail closed", async () => {
  for (const claims of [
    { v: 3 },
    { v: 2, o: null },
    { v: 2, o: [] },
    { v: 2, o: {} },
    { v: 2, o: { id: "other" } },
    { v: 2, o: { id: "org_SyntheticA" }, org_id: "org_SyntheticB" },
    { o: { id: "org_SyntheticA" } },
    { org_id: null },
    { org_id: "user_SyntheticA" },
    { org_role: "org:admin" },
  ])
    assert.equal(
      (
        await authenticateSession(
          authRequest(fixture.token(claims)),
          fixture.env,
        )
      ).ok,
      false,
    );
});
test("different pinned keys with the same kid do not reuse another verifier's key", async () => {
  const other = signingFixture();
  assert.equal(
    (await authenticateSession(authRequest(other.token()), other.env)).ok,
    true,
  );
  assert.equal(
    (await authenticateSession(authRequest(fixture.token()), other.env)).ok,
    false,
  );
  assert.equal(
    (await authenticateSession(authRequest(fixture.token()), fixture.env)).ok,
    true,
  );
});
test("cookie-only, malformed, oversized and missing bearer tokens cannot authenticate", async () => {
  assert.deepEqual(await authenticateSession(authRequest(), fixture.env), {
    ok: false,
    status: 401,
    error: "authentication_required",
  });
  assert.equal(
    (
      await authenticateSession(
        authRequest(undefined, { cookie: `__session=${fixture.token()}` }),
        fixture.env,
      )
    ).ok,
    false,
  );
  for (const token of ["x", "x".repeat(12001), "a.b.c"])
    assert.equal(
      (await authenticateSession(authRequest(token), fixture.env)).ok,
      false,
    );
  assert.deepEqual(
    await authenticateSession(authRequest(fixture.token()), {}),
    { ok: false, status: 503, error: "authentication_unavailable" },
  );
});
test("handshake redacts identity, cannot enable access, and ignores forged tenant/role headers", async () => {
  const token = fixture.token({
    tenantId: "other",
    role: "admin",
    public_metadata: { tenantId: "other" },
  });
  const response = await sessionHandshake(
    authRequest(token, { "x-tenant-id": "other", "x-role": "admin" }),
    fixture.env,
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    authenticated: true,
    scopeType: "personal",
    customerAccess: false,
    providerQaAccepted: false,
  });
  assert.match(response.headers.get("cache-control")!, /no-store/);
  assert.match(response.headers.get("x-robots-tag")!, /noindex/);
  assert.match(response.headers.get("vary")!, /Authorization/);
});
test(
  "a stalled or endlessly empty handshake body is bounded and cannot authenticate",
  { timeout: 3000 },
  async () => {
    const original = authRequest(fixture.token());
    for (const body of [
      new ReadableStream({}),
      new ReadableStream({
        pull(controller) {
          controller.enqueue(new Uint8Array());
        },
      }),
    ]) {
      const request = new Request(original.url, {
        method: "POST",
        headers: original.headers,
        body,
        duplex: "half",
      } as RequestInit);
      assert.equal((await sessionHandshake(request, fixture.env)).status, 400);
    }
  },
);
test("handshake rejects cross-site origin, query/body fields and non-POST methods", async () => {
  assert.equal(
    (
      await sessionHandshake(
        authRequest(fixture.token(), { origin: "https://evil.example" }),
        fixture.env,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await sessionHandshake(
        authRequest(fixture.token(), { "sec-fetch-site": "cross-site" }),
        fixture.env,
      )
    ).status,
    403,
  );
  const request = authRequest(fixture.token());
  assert.equal(
    (
      await sessionHandshake(
        new Request(request.url + "?tenantId=other", {
          method: "POST",
          headers: request.headers,
        }),
        fixture.env,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await sessionHandshake(
        new Request(request.url, {
          method: "POST",
          headers: request.headers,
          body: JSON.stringify({ tenantId: "other", role: "admin" }),
        }),
        fixture.env,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await sessionHandshake(
        new Request(request.url, { headers: request.headers }),
        fixture.env,
      )
    ).status,
    405,
  );
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array());
      controller.enqueue(new TextEncoder().encode('{"tenantId":"other"}'));
      controller.close();
    },
  });
  assert.equal(
    (
      await sessionHandshake(
        new Request(request.url, {
          method: "POST",
          headers: request.headers,
          body,
          duplex: "half",
        } as RequestInit),
        fixture.env,
      )
    ).status,
    400,
  );
});
test("scope checks expire and cannot be used as a perpetual authorization", async (t) => {
  const result = await authenticateSession(
    authRequest(fixture.token()),
    fixture.env,
  );
  assert.ok(result.ok);
  if (!result.ok) return;
  t.mock.method(Date, "now", () => (result.principal.expiresAt + 1) * 1000);
  assert.equal(
    sameVerifiedScope(result.principal, result.principal.scope.key),
    false,
  );
});
test("access metadata can never claim public activation or leak key material", () => {
  const status = accessStatus(fixture.env);
  assert.deepEqual(parseAccessStatus(status), status);
  for (const key of [
    "customerAccess",
    "providerQaAccepted",
    "liveChat",
    "persistence",
    "privilegedActions",
  ])
    assert.equal(parseAccessStatus({ ...status, [key]: true }), null);
  assert.equal(parseAccessStatus({ ...status, token: "private" }), null);
  assert.equal(parseAccessStatus({ ...status, sessionBoundary: "live" }), null);
  assert.ok(!JSON.stringify(status).includes("PUBLIC KEY"));
});
