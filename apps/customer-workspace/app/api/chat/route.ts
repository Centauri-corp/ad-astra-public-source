import { privateHeaders } from "@/lib/preview-policy";
export const runtime = "nodejs";
// Deliberately no provider import, key lookup, fallback or environment switch.
// Real chat needs reviewed identity, tenant, entitlement, budget and usage adapters.
export async function POST() {
  return Response.json(
    { error: "customer_release_not_accepted", available: false },
    { status: 503, headers: privateHeaders },
  );
}
