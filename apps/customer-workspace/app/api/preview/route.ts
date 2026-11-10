import { deploymentStatus } from "@/lib/deployment-status";
import { previewEnabled, privateHeaders } from "@/lib/preview-policy";
export async function GET() {
  const enabled = previewEnabled(process.env);
  return Response.json(
    enabled ? deploymentStatus(process.env) : { error: "preview_disabled" },
    { status: enabled ? 200 : 404, headers: privateHeaders },
  );
}
