import "server-only";
import { authenticateSession } from "./session.ts";
import {
  previewEnabled,
  privateHeaders,
  samePreviewOrigin,
} from "../lib/preview-policy.ts";

export async function sessionHandshake(
  request: Request,
  env: Readonly<Record<string, string | undefined>>,
): Promise<Response> {
  const reply = (status: number, value: object) =>
    Response.json(value, {
      status,
      headers: { ...privateHeaders, Vary: "Authorization, Origin" },
    });
  if (!previewEnabled(env))
    return reply(404, { authenticated: false, error: "preview_disabled" });
  if (request.method !== "POST")
    return new Response(null, {
      status: 405,
      headers: { ...privateHeaders, Allow: "POST" },
    });
  if (!samePreviewOrigin(request, env))
    return reply(403, { authenticated: false, error: "same_origin_required" });
  if (new URL(request.url).search)
    return reply(400, {
      authenticated: false,
      error: "bodyless_request_required",
    });
  const reader = request.body?.getReader();
  if (reader) {
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      void reader.cancel().catch(() => {});
    }, 1000);
    try {
      for (let count = 0; ; count++) {
        const { done, value } = await reader.read();
        if (timedOut)
          return reply(400, { authenticated: false, error: "invalid_request" });
        if (done) break;
        if (value?.byteLength || count >= 63) {
          await reader.cancel();
          return reply(400, {
            authenticated: false,
            error: "bodyless_request_required",
          });
        }
      }
    } catch {
      return reply(400, { authenticated: false, error: "invalid_request" });
    } finally {
      clearTimeout(timeout);
      reader.releaseLock();
    }
  }
  const result = await authenticateSession(request, env);
  if (!result.ok)
    return reply(result.status, { authenticated: false, error: result.error });
  return reply(200, {
    authenticated: true,
    scopeType: result.principal.scope.kind,
    customerAccess: false,
    providerQaAccepted: false,
  });
}
