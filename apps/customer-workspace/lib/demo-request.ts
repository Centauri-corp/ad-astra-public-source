import { isScenario, isUuid, type ScenarioId } from "./contract.ts";
export class DemoInputError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number) {
    super(code);
    this.code = code;
    this.status = status;
  }
}
export async function readDemoRequest(
  request: Request,
): Promise<{ scenarioId: ScenarioId; runId: string }> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    throw new DemoInputError("json_required", 415);
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > 256))
    throw new DemoInputError("body_too_large", 413);
  if (!request.body) throw new DemoInputError("invalid_body", 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 256) {
        await reader.cancel();
        throw new DemoInputError("body_too_large", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  let parsed: unknown;
  try {
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    parsed = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
  } catch {
    throw new DemoInputError("invalid_json", 400);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new DemoInputError("invalid_body", 400);
  const body = parsed as Record<string, unknown>;
  if (
    Object.keys(body).sort().join(",") !== "runId,scenarioId" ||
    !isScenario(body.scenarioId) ||
    !isUuid(body.runId)
  )
    throw new DemoInputError("invalid_scenario", 422);
  return { scenarioId: body.scenarioId, runId: body.runId };
}
