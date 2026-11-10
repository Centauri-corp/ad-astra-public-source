"use client";
import { useState } from "react";
import { parseAccessStatus, type AccessStatus } from "@/lib/access-status";

export function AccessReadiness() {
  const [status, setStatus] = useState<AccessStatus | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "failed">(
    "idle",
  );
  async function check() {
    setStatus(null);
    setState("loading");
    try {
      const response = await fetch("/api/access-status", {
        credentials: "omit",
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      const value = response.ok
        ? parseAccessStatus(await response.json())
        : null;
      if (!value) throw new Error("status_unavailable");
      setStatus(value);
      setState("ready");
    } catch {
      setState("failed");
    }
  }
  return (
    <section className="access-readiness" aria-labelledby="access-title">
      <h3 id="access-title">Customer access readiness</h3>
      <p>
        Server session and tenant-scope checks are implemented for protected QA.
        Customer access is still gated.
      </p>
      <button
        type="button"
        disabled={state === "loading"}
        onClick={() => void check()}
      >
        {state === "loading"
          ? "Checking configuration…"
          : "Check access configuration"}
      </button>
      <p role="status">
        {state === "idle"
          ? "Not checked. No sign-in or provider request is made by this panel."
          : state === "loading"
            ? "Reading server configuration status only…"
            : state === "failed"
              ? "Status unavailable. Customer access remains gated; try again."
              : status?.sessionBoundary === "qa-configured"
                ? "QA verification configured. Provider acceptance and customer access are not approved."
                : "QA verification is not configured. Customer access remains gated."}
      </p>
      <p className="access-boundary">
        Live AI, persistence and privileged actions remain disabled. No tokens,
        account details or tenant identifiers are displayed.
      </p>
    </section>
  );
}
