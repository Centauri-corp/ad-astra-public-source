# AD ASTRA: one release source

The owner selected public PR #36 (`codex/cinematic-website-rebuild-20261110`) as the release source. The California canary through `3ddef0d2e787f0ce8f466dd96e73aed0e0475977` is reconciled into that history, not deployed over it. Existing branch history is retained; no force push or history rewrite is required. The protected internal companion remains PR #45 at `62c28c6687b66d16d94b737479385cac79d633c6`; it is not copied into the public repository.

The canary's unique California page and subscription-status proxy are retained. Existing PR #36 implementations supersede overlapping older manifests, prompt identity, routing, build checks and home page. The proxy now requires matching production environment, current source/runtime release readiness and complete bounded provider status before reporting availability. A preview or paused source makes no provider request and cannot claim paid enrollment. Provider flags do not grant a customer entitlement or authorize a charge.

The separate interactive-workspace branch's `apps/customer-workspace` tree matches this candidate byte for byte. Its content is already represented; re-merging an older CI definition would remove newer checks. Older divergent branches require feature-level comparison, not blind bulk merging. A remote branch inventory is saved with the LStra review evidence. This is not a claim that inaccessible chats, drives, or every historical proposal have been retrieved or accepted.

## Chronological promotion order

1. Select and reconcile the public source; retain private source boundaries and California functionality. Regenerate source fingerprints. Keep the older `work` path out of new automated releases.
2. Pass source, access-denial, production-source, visual, responsive, accessibility and isolated-workspace CI on the exact resulting commit. Keep the protected cinematic deployment a preview.
3. Deploy/read back the reviewed internal bridge and Catalyst companion with protected configuration. Correct GitHub Environment permissions and branch restrictions. Do not invent or expose credentials, or substitute owner metadata smoke tests for customer isolation.
4. Run authenticated synthetic two-tenant and customer sign-in/recovery/expiry/logout/authorization acceptance. Verify sandbox checkout, signed webhook, entitlement, bounded AI delivery, cancellation/revocation and CRM acknowledgement. The public checkout and billing-portal journey still needs real wiring and acceptance; a connected Stripe account is insufficient.
5. Obtain Tahira's independent approval for the new exact public candidate and the paired internal candidate. Preserve existing valid internal approval; never apply an approval for an older public SHA to a new one. Bind rights, approved routes, search properties and each supported region to real evidence.
6. Obtain scoped final release authorization, stage a production build without assigning the domain, pass real integration acceptance and rollback checks, and manually promote that tested build. Only then enable the accepted customer/billing/CRM/indexing scope. AGI/ASI remain research directions, not public capabilities.

Selection of PR #36 is source-governance authorization, not an independent approval, charging authorization, or acceptance of missing provider evidence. Plus US$12/month and Pro US$29/month are approved for preparation only; Team/Enterprise remain inquiry-only. The existing hourly release watch reports material changes and does not autonomously deploy, charge, message, or index.

`git.deploymentEnabled=false` remains in both observed branches. The Vercel project was requested to disable automatic custom-domain assignment and ignore Git builds from `work`; these controls do not revoke other accounts' manual CLI/API deployment powers. This candidate's production-source guard additionally rejects wrong/unknown branches, unpinned commits and wrong team/project. There is no claim of an account-wide manual-deployment lock. Do not pause the entire Vercel project: that would interrupt the currently serving website.

## Release-path compatibility

An exact SHA supplied as Vercel's Git ref is accepted only when it equals the platform's actual `VERCEL_GIT_COMMIT_SHA`. The selected branch is also accepted; the `work` branch and unknown refs remain rejected. This syntactic source check does not verify a GitHub review: the release operator must separately verify PR36's exact head, CI and independent approval before running any secret-bearing production build.

Team identity accepts `VERCEL_ORG_ID` (CLI), `VERCEL_TEAM_ID`, or the non-secret scoped `AD_ASTRA_RELEASE_TEAM_ID`; project identity accepts `VERCEL_PROJECT_ID` or `AD_ASTRA_RELEASE_PROJECT_ID`. Every supplied identifier must match the verified project/team. Missing or conflicting identity fails closed. Never infer that a missing CLI variable means the Vercel account is wrong, or treat an operator-configured identifier as independent provider proof. The authenticated release operator verifies the actual team/project before deployment. Production Redis acceptance is unchanged.

Hosted Chromium installation now uses the pinned Ubuntu 24.04 runner and separate, three-minute system-dependency/browser steps. Browser download connection time is bounded. No browser assertion, route, test, scan or acceptance requirement is skipped. A dependency failure is explicit failed CI, not a pass or a silent fallback to local results.

The bounded run exposed the actual infrastructure error: `Temporary failure resolving 'azure.archive.ubuntu.com'` before browser QA. Hosted-runner setup now replaces Ubuntu's Azure mirror indirection with the official HTTPS archive/security endpoints. It preserves suites, components, signing keys, TLS and package verification. The repair is restricted to disposable GitHub-hosted Linux runners; it never changes the developer's machine or any production host. A subsequent hosted result, not this source edit, establishes that installation and QA succeeded.

The marketing visual publication and the customer revenue launch remain separate decisions. A noindex website with paused customer capabilities is not a paid-customer launch. No source-only fix accepts media rights, regional availability, indexing ownership, tenant QA, charges or CRM writes.
