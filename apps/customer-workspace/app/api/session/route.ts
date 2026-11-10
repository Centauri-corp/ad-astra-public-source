import { sessionHandshake } from "@/server/session-handler";
export const runtime = "nodejs";
export const maxDuration = 5;
export async function POST(request: Request) {
  return sessionHandshake(request, process.env);
}
