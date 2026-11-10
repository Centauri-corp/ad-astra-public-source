import { privateHeaders } from "@/lib/preview-policy";
function deny() {
  return Response.json(
    { error: "workflow_editing_disabled" },
    { status: 403, headers: privateHeaders },
  );
}
export const POST = deny;
export const PUT = deny;
export const PATCH = deny;
export const DELETE = deny;
