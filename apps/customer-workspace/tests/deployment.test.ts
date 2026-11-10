import { test } from "node:test";
import assert from "node:assert/strict";
import {
  previewOrigin,
  previewEnabled,
  samePreviewOrigin,
} from "../lib/preview-policy.ts";
import { deploymentStatus } from "../lib/deployment-status.ts";
const provider = {
  VERCEL: "1",
  VERCEL_ENV: "preview",
  VERCEL_URL: "ad-astra-preview-123.vercel.app",
  AD_ASTRA_WORKSPACE_PREVIEW: "true",
};
test("hosted preview trusts only its validated provider deployment hostname", () => {
  assert.equal(
    previewOrigin(provider),
    "https://ad-astra-preview-123.vercel.app",
  );
  assert.equal(previewEnabled(provider), true);
  for (const changes of [
    { VERCEL: "0" },
    { VERCEL_ENV: "production" },
    { VERCEL_ENV: "development" },
    { VERCEL_URL: "evil.example" },
    { VERCEL_URL: "https://preview.vercel.app" },
    { VERCEL_URL: "preview.vercel.app/other" },
    { VERCEL_URL: "user@preview.vercel.app" },
    { VERCEL_URL: "preview.vercel.app:443" },
    { VERCEL_URL: "-preview.vercel.app" },
    { VERCEL_URL: "preview.vercel.app.evil.example" },
    { AD_ASTRA_WORKSPACE_ORIGIN: "" },
    { AD_ASTRA_WORKSPACE_ORIGIN: "https://evil.example" },
  ])
    assert.equal(previewEnabled({ ...provider, ...changes }), false);
  assert.equal(
    previewEnabled({ ...provider, AD_ASTRA_WORKSPACE_PREVIEW: "false" }),
    false,
  );
});
test("an explicit valid QA origin takes precedence and request headers cannot select an origin", () => {
  const env = {
    ...provider,
    AD_ASTRA_WORKSPACE_ORIGIN: "https://explicit.vercel.app",
  };
  assert.equal(previewOrigin(env), env.AD_ASTRA_WORKSPACE_ORIGIN);
  const request = (origin: string) =>
    new Request("https://ad-astra-preview-123.vercel.app/api/demo", {
      headers: {
        origin,
        host: "evil.example",
        "x-forwarded-host": "evil.example",
        "x-ad-astra-preview": "workflow-v1",
      },
    });
  assert.equal(
    samePreviewOrigin(request("https://evil.example"), provider),
    false,
  );
  assert.equal(
    samePreviewOrigin(
      request("https://ad-astra-preview-123.vercel.app"),
      provider,
    ),
    true,
  );
});
test("public build metadata has an exact source SHA or null and never grants customer access", () => {
  const sha = "a".repeat(40);
  const metadata = deploymentStatus({ VERCEL_GIT_COMMIT_SHA: sha });
  assert.equal(metadata.sourceCommit, sha);
  for (const value of [
    "main",
    sha + "x",
    "<script>",
    "https://evil.example",
    "",
  ])
    assert.equal(
      deploymentStatus({ VERCEL_GIT_COMMIT_SHA: value }).sourceCommit,
      null,
    );
  assert.equal(deploymentStatus({}).sourceCommit, null);
  for (const key of [
    "customerAccess",
    "providerQaAccepted",
    "liveChat",
    "crmWrites",
    "billing",
  ] as const)
    assert.equal(metadata[key], false);
  assert.equal(metadata.basis, "synthetic-scenarios-only");
});
