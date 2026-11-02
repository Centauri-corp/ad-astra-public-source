const allowedOrigins = new Set([
  "https://adastra.global",
  "https://www.adastra.global",
  "https://ad-astra-public-git-fix-public-share-c3d21b-zoheb-khan-825ab34d.vercel.app",
]);
const allowedKeys = new Set(["email", "full_name", "company", "consent", "website"]);
const MAX_BODY_BYTES = 4096;

const json = (body: unknown, status = 200, origin = "") => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "Vary": "Origin",
  };
  if (allowedOrigins.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return new Response(JSON.stringify(body), { status, headers });
};

async function readBoundedJson(req: Request) {
  const reader = req.body?.getReader();
  if (!reader) throw new Error("invalid_json");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new Error("body_too_large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const value = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("invalid_body");
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_body") throw error;
    throw new Error("invalid_json");
  }
}

async function hmacHex(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  if (!allowedOrigins.has(origin)) return json({ ok: false, error: "origin_denied" }, 403, origin);

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Max-Age": "600",
        "Vary": "Origin",
      },
    });
  }
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405, origin);
  if (!/^application\/json(?:;|$)/i.test(req.headers.get("content-type") ?? "")) return json({ ok: false, error: "json_required" }, 415, origin);

  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return json({ ok: false, error: "body_too_large" }, 413, origin);

  let body: Record<string, unknown>;
  try {
    body = await readBoundedJson(req);
  } catch (error) {
    const code = error instanceof Error ? error.message : "invalid_json";
    return json({ ok: false, error: code }, code === "body_too_large" ? 413 : 400, origin);
  }
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) return json({ ok: false, error: "invalid_body" }, 400, origin);
  if (typeof body.website === "string" && body.website.trim()) return json({ ok: true }, 200, origin);

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const company = typeof body.company === "string" ? body.company.trim() : "";
  if (!/^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,63}$/i.test(email) || email.length > 254) return json({ ok: false, error: "invalid_email" }, 422, origin);
  if (body.consent !== true) return json({ ok: false, error: "consent_required" }, 422, origin);
  if (fullName.length > 200 || company.length > 200) return json({ ok: false, error: "input_too_long" }, 422, origin);

  const base = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !service) return json({ ok: false, error: "service_unavailable" }, 503, origin);

  const forwarded = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const clientHash = await hmacHex(forwarded || req.headers.get("cf-connecting-ip") || "unknown", service);
  const call = (name: string, payload: Record<string, unknown>) =>
    fetch(`${base}/rest/v1/rpc/${name}`, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(4000),
      headers: { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

  try {
    const limited = await call("astra_public_lead_rate_limit", { p_client_hash: clientHash });
    if (!limited.ok) return json({ ok: false, error: "service_unavailable" }, 503, origin);
    if ((await limited.json()) !== true) return json({ ok: false, error: "rate_limited" }, 429, origin);

    const intake = await call("astra_public_lead_intake", {
      p_email: email,
      p_full_name: fullName || null,
      p_company: company || null,
      p_source: "adastra.global/early-access",
      p_consent_status: "opted_in",
    });
    if (!intake.ok) return json({ ok: false, error: "service_unavailable" }, 503, origin);
    return json({ ok: true, message: "Early access request received." }, 200, origin);
  } catch {
    return json({ ok: false, error: "service_unavailable" }, 503, origin);
  }
});
