# Ad Astra voice and engine-event increment

## Credential decision and scope

The owner authorized reuse of the existing Ad Astra credentials. Configuration metadata confirms an existing sensitive `OPENAI_API_KEY` entry for the established Vercel project's Production and Preview environments. No secret was decrypted, copied to this workspace, recreated or written to source. Metadata presence is not proof that the credential works or that a customer release is accepted.

This increment retains the existing provider, model, sign-in, budget and source-release boundaries. It adds request-lifecycle events, a guarded customer conversation interface, optional device-local dictation/playback and visual activity integration. It does not enable the public launch, billing, CRM, outreach, indexing, paid speech services or a new model.

## Implemented flow

The existing signed-in `/platform/` workspace contains the controlled 3D scene and conversation panel. The authenticated server remains authoritative; a visible browser panel or manipulated DOM never grants model access.

`verified account -> explicit question -> existing /api/ask authentication/release/quota checks -> accepted/requesting events -> bounded model request -> answer/completed events -> text result -> optional local voice playback`

The existing JSON API remains compatible. Requests explicitly accepting `text/event-stream` receive a bounded lifecycle stream only **after** authentication, source-release checks and durable quota/budget reservation. Early denials remain JSON errors. Events contain a server-generated request ID, monotonic sequence, timestamp and limited event data. They do not expose prompts, provider credentials, tool traces or hidden reasoning. Token-by-token model streaming is not introduced: the existing provider response is validated before the answer event.

The client rejects wrong IDs, sequence gaps, unexpected transitions, stale/future events, unknown fields, premature EOF, malformed UTF-8 and oversized streams. It does not retry model requests automatically and does not publish or speak an answer until stream completion is verified. Provider errors, missing sessions and closed-release responses produce no invented answer. Responses render as text, not HTML.

The 3D node-lighting state follows actual application callbacks: microphone start, authenticated request activity, response receipt and local voice playback. It is a visual representation of observable activity, not a brain scan or view into reasoning. Motion and frame scheduling continue to respect pause, reduced-motion, hidden/offscreen state and teardown.

## Voice boundaries

- Dictation starts only from an explicit customer action, in a secure context, where `SpeechRecognition.available` confirms an installed on-device English pack and `processLocally=true` is supported.
- There is no cloud-recognition fallback, automatic speech-pack download, always-listening mode or automatic prompt submission. Dictated text remains editable until the customer sends it.
- Playback starts only on request for a completed answer. It selects only an English voice advertised by the browser as `localService=true`; otherwise text remains available.
- Stop cancels recognition, playback and the local request. Dictation is limited to 30 seconds; playback is limited to two minutes. Page hiding and teardown stop activities; late callbacks are ignored.
- No audio is recorded into application storage or sent to a speech API. Device/browser service behavior still requires representative-device privacy and acceptance testing.

Voice support is intentionally optional and browser-dependent. This is not an OpenAI Realtime/WebRTC integration or a claim that every device supports offline dictation. A future approved cloud-voice option requires separate privacy, retention, metering, cost and release decisions. No such service was silently enabled.

## Cancellation and accounting

Client cancellation aborts fetch; a server-side connection-close signal aborts the one in-flight provider request where possible. A provider may already have accepted work, so cancellation does not promise zero cost. Existing quota/budget reservations are not automatically refunded, and an uncertain outcome is not replayed. The existing idempotency header is retained; this change does not claim a new durable replay-deduplication implementation.

## Verification and remaining launch evidence

Source tests use synthetic JWTs, an in-memory accepted-release fixture, mocked budget/provider responses and fake device speech services. No production source flags are changed by tests. Browser tests explicitly inject synthetic identity, engine events and speech APIs; they are not live customer sign-in, actual microphone or provider acceptance receipts. The public marketing routes still expose neither a live prompt form nor microphone activation.

Required before production: exact-candidate independent review; approved deployment/source read-back; real sign-in/recovery/logout/expiry and two-tenant authorization QA; entitlement/billing acceptance; live protected model and cancellation checks; representative mobile/desktop speech/privacy/accessibility/performance review; final release authorization and controlled promotion of the tested build. The API's existing public-source launch flags remain false. Customer subscription entitlements and tenant membership are not implemented by this visual/event increment.

GitHub authentication and organization-app access must be restored before this source can enter repository review. Reusing an existing OpenAI credential does not resolve that separate publishing boundary.

## Reference reel

The supplied Facebook reel URL returned a Facebook HTML shell, not inspectable video content. The clip was not watched and no visual or motion details were inferred or copied. Upload the clip if its motion should guide a subsequent art pass; rights approval remains separate.

All source and review evidence remain under the LStra project folder. No external production release or CRM/billing activation is claimed.
