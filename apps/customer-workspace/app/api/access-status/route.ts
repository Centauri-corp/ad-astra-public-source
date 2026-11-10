import { accessStatus } from "@/server/session";
import { previewEnabled, privateHeaders } from "@/lib/preview-policy";
export const runtime = "nodejs";
export async function GET() {
  return Response.json(
    previewEnabled(process.env)
      ? accessStatus(process.env)
      : { error: "preview_disabled" },
    {
      status: previewEnabled(process.env) ? 200 : 404,
      headers: privateHeaders,
    },
  );
}
