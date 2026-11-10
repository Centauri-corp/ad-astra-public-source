export function deploymentStatus(
  env: Readonly<Record<string, string | undefined>>,
) {
  const sha = env.VERCEL_GIT_COMMIT_SHA;
  return {
    schema: "ad-astra-preview/v1",
    sourceCommit:
      typeof sha === "string" && /^[a-f0-9]{40}$/.test(sha) ? sha : null,
    basis: "synthetic-scenarios-only",
    customerAccess: false,
    providerQaAccepted: false,
    liveChat: false,
    crmWrites: false,
    billing: false,
  } as const;
}
