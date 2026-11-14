# Ad Astra neural companion

The shared public shell mounts Astra Polaris once. Its first-party Three.js
sculpture moves from the homepage into a small companion dock on supported
public pages. Soft navigation preserves the same canvas and in-memory visit;
page-specific controllers are disposed before replacement and mounted on entry.
Account, sign-in, billing and private workspace documents retain native routing.

The visible layer follows actual application states: idle, listening, requesting,
responding, speaking and error. Ambient sculpture motion is decorative. It does
not expose model reasoning, infer emotions, or imply sentience. Customers choose
warm, clear or concise communication. Response quality and entitlement remain
the responsibility of the existing server gateway.

## Identity and engine

An anonymous visit loads no identity SDK and starts no engine request. The
customer can explicitly check their signed-in access. The adapter reuses the
existing Clerk application and verifies the session through `/api/session`.
A DOM flag or optional boolean restore hint never grants access. Session, user
and organization changes invalidate the verified scope, abort work and clear
question, answer and context. Tokens are obtained just in time and remain out of
browser storage. The existing `/api/ask` server checks identity, tenant, access,
budget and release status for every request; the UI cannot override them.

Successful responses require the existing ordered SSE protocol and completion
event. Only completed text is displayed or spoken. Cancellation, timeout and
stale-account responses cannot populate the current conversation. A request
already accepted by the engine can still consume capacity after cancellation.

## Voice and context

Dictation and playback use supported on-device English services only. There is
no cloud fallback, recording upload or automatic speech-pack download. Voice
conversation requires an explicit action. Natural dictation completion can send
the question, then a completed answer can be spoken; natural playback completion
can start the next listening turn while that same opt-in mode remains active.
Stop, failure, account change, timeout or a hidden document ends this mode.
Rate and pitch stay within the voice adapter's 0.8–1.2 bounds. Unsupported devices
keep the text experience. Actual browser/device speech support must be checked
separately from synthetic local acceptance.

Conversation context is opt-in and in memory only: at most two bounded turns,
composed within the gateway's 4,000-character question limit. Disabling context
clears it. A new account scope resets both context and its opt-in choice. Native
page departure clears the conversation; it is never persisted to storage.

## Motion and verification

Reduced motion, data saving, hidden documents, offscreen heroes and explicit
pause stop the applicable decorative motion. Runtime preference changes and
WebGL failure preserve readable still artwork. Scene and route controllers
dispose rendering resources, observers, timers and requests.

`scripts/audit-companion.cjs` verifies browser navigation, scene identity and
synthetic engine/voice/account flows. Synthetic fixtures do not establish live
provider, tenant, payment, CRM or customer acceptance. Source CI, the exact
candidate preview, independent review and protected customer acceptance remain
separate release evidence; this implementation grants no production permission.
