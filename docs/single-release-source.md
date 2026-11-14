# AD ASTRA controlled release chain

`PR #38` is the only public release candidate. It must contain the selected
`PR #36` base before it can advance. Older branches, including `work`, remain
historical evidence only and may not supply a new deployment or approval.

The machine-readable source of truth is
[`config/production-release-source.json`](../config/production-release-source.json).
The product-family inventory and gate order are bound in
[`config/product-architecture-release-control.json`](../config/product-architecture-release-control.json).
The independent private input remains PR #54 at `c59cbe1…`; it is not copied
into the public source tree.

## Controlled order

1. Reconcile the PR #38 source with PR #36. There must be one descendant
   release chain, no parallel candidate, and one exact candidate SHA.
2. Verify the six product families, public routes, source inventory, visual
   assets, noindex policy and capability boundaries against that SHA.
3. Run CI and create a preview from that same SHA; read the deployment back.
4. Run protected synthetic customer QA: tenant boundaries, sign-in lifecycle,
   entitlements, revocation and no unintended writes.
5. Obtain independent review on the immutable public SHA and retain the
   matching private PR #54 receipt.
6. Obtain final human authorization and stage the exact build with rollback
   evidence. Production promotion is manual and remains disabled otherwise.
7. Enable only individually evidenced customer routes, regions, billing,
   CRM or indexing scopes. Each is a separate decision; none is implied by a
   website preview or a connected provider.

The configuration intentionally keeps customer AI execution, billing, CRM
writes, outbound messaging, global availability and public AGI/ASI claims
disabled. AGI and ASI remain engineering research directions, not products
available to customers.
