export function previewOrigin(
  env: Readonly<Record<string, string | undefined>>,
): string | null {
  const raw = env.AD_ASTRA_WORKSPACE_ORIGIN;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.origin !== raw || url.username || url.password) return null;
    const local =
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    const staged =
      url.protocol === "https:" && url.hostname.endsWith(".vercel.app");
    return local || staged ? raw : null;
  } catch {
    return null;
  }
}
export function previewEnabled(
  env: Readonly<Record<string, string | undefined>>,
): boolean {
  return (
    env.AD_ASTRA_WORKSPACE_PREVIEW === "true" &&
    env.VERCEL_ENV !== "production" &&
    previewOrigin(env) !== null
  );
}
export function samePreviewOrigin(
  request: Request,
  env: Readonly<Record<string, string | undefined>>,
): boolean {
  const origin = previewOrigin(env);
  return (
    origin !== null &&
    request.headers.get("origin") === origin &&
    request.headers.get("sec-fetch-site") !== "cross-site" &&
    request.headers.get("x-ad-astra-preview") === "workflow-v1"
  );
}
export const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff",
};
