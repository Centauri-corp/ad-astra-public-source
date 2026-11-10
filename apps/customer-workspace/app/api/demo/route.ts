import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { setTimeout as delay } from "node:timers/promises";
import { type WorkspaceMessage } from "@/lib/contract";
import { SCENARIOS, scenarioEvents } from "@/lib/scenarios";
import {
  previewEnabled,
  privateHeaders,
  samePreviewOrigin,
} from "@/lib/preview-policy";
import { DemoInputError, readDemoRequest } from "@/lib/demo-request";

export const runtime = "nodejs";
export const maxDuration = 15;
export async function POST(request: Request) {
  if (!previewEnabled(process.env))
    return Response.json(
      { error: "preview_disabled" },
      { status: 404, headers: privateHeaders },
    );
  if (!samePreviewOrigin(request, process.env))
    return Response.json(
      { error: "same_origin_required" },
      { status: 403, headers: privateHeaders },
    );
  let input;
  try {
    input = await readDemoRequest(request);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof DemoInputError ? error.code : "invalid_request",
      },
      {
        status: error instanceof DemoInputError ? error.status : 400,
        headers: privateHeaders,
      },
    );
  }
  const { scenarioId, runId } = input;
  const stream = createUIMessageStream<WorkspaceMessage>({
    execute: async ({ writer }) => {
      writer.write({ type: "start", messageId: runId });
      try {
        for (const event of scenarioEvents(runId, scenarioId)) {
          if (request.signal.aborted) return;
          writer.write({
            type: "data-workflow",
            data: { ...event, at: new Date().toISOString() },
            transient: true,
          });
          if (event.type === "node.running" && event.nodeId === "response") {
            writer.write({ type: "text-start", id: "sample-response" });
            for (const delta of SCENARIOS[scenarioId].answer.match(
              /.{1,32}(?:\s|$)|.{1,32}/gs,
            ) ?? []) {
              if (request.signal.aborted) return;
              writer.write({
                type: "text-delta",
                id: "sample-response",
                delta,
              });
              await delay(28, undefined, { signal: request.signal });
            }
            writer.write({ type: "text-end", id: "sample-response" });
          }
          await delay(event.type.startsWith("node.") ? 145 : 40, undefined, {
            signal: request.signal,
          });
        }
        writer.write({ type: "finish", finishReason: "stop" });
      } catch (error) {
        if (!request.signal.aborted) throw error;
      }
    },
    onError: () =>
      "The sample stream could not be completed. Please try again.",
  });
  return createUIMessageStreamResponse({ stream, headers: privateHeaders });
}
