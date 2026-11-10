export type AccessStatus = {
  schema: "ad-astra-access/v1";
  identityProvider: "clerk";
  sessionBoundary: "qa-unconfigured" | "qa-configured";
  customerAccess: false;
  providerQaAccepted: false;
  liveChat: false;
  persistence: false;
  privilegedActions: false;
};

// A status response cannot grant access or override server release decisions.
export function parseAccessStatus(value: unknown): AccessStatus | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).sort().join(",") !==
      "customerAccess,identityProvider,liveChat,persistence,privilegedActions,providerQaAccepted,schema,sessionBoundary" ||
    record.schema !== "ad-astra-access/v1" ||
    record.identityProvider !== "clerk" ||
    !["qa-unconfigured", "qa-configured"].includes(
      String(record.sessionBoundary),
    )
  )
    return null;
  for (const key of [
    "customerAccess",
    "providerQaAccepted",
    "liveChat",
    "persistence",
    "privilegedActions",
  ])
    if (record[key] !== false) return null;
  return record as AccessStatus;
}
