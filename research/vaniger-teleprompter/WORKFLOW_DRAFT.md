# Original live sales teleprompter — workflow draft

Status: **design-review input; not implemented, benchmarked, or approved**.

**2026-10-22 scope revision:** The user selected a separate project and Gemini-only integration. Provider/project alternatives below are historical design input; the current build scope is `/Users/abdulaziz/Desktop/live-sales-teleprompter/BUILD_SPEC.md`. Do not introduce Claude or assume a third-party STT subscription.

This is our proposed design, not a recovered Vaniger backend. Public evidence and limitations: [RESEARCH.md](RESEARCH.md).

## 1. Product scope

A human sales representative conducts the conversation. The assistant listens with appropriate notice/consent and displays a short suggested response and a next question. It does not speak to the prospect, place calls automatically, invent offers, or silently record conversations.

Default proposal: a standalone desktop-browser companion for supported Chromium browser calls. Start with the coaching function, not a complete power dialer/CRM. A dedicated telephony or desktop adapter is a separate scope if the actual calls require it.

Before implementation, confirm the user's call platform(s), languages and project destination. This workspace is LiveTry; do not repurpose its widget, Decart service or try-on core for audio coaching. If developed here, isolate the new surface and follow the existing strict TypeScript, dependency-audit and design-token rules. Do not copy Vaniger's purple/blue/glass UI.

## 2. End-to-end workflow

1. **Prepare a call brief.** The rep selects a product playbook, call objective, language and prospect notes. The playbook contains approved features, current pricing, limitations, proof points and objection responses. Use supplied or authorized prospect data; no automatic scraping of private profiles.
2. **Confirm notice/consent and audio source.** Explain which audio will be processed and by which providers. The user explicitly starts the session. Browser capture permission alone is not prospect consent; required notices and lawful basis depend on jurisdiction/use.
3. **Verify both audio paths.** Acquire rep microphone and the selected call tab's audio separately. Show two input meters and fail clearly if prospect audio is missing. Do not silently present microphone-only mode as a complete call assistant.
4. **Stream transcription.** Send small, bounded audio chunks to a server-side streaming speech-to-text adapter. Retain source/channel identity and timing. Display partial text as provisional; merge finalized segments without duplication.
5. **Maintain conversation state.** Keep a bounded recent-turn window plus a compact running summary: discovery facts, objections, buying stage, answered questions and commitments. Preserve speaker uncertainty; an audio channel is not proof of a specific person's identity in a group call.
6. **Choose when to coach.** Trigger primarily at a prospect turn boundary, a meaningful question/objection, or the rep's explicit request. Do not start one LLM request per transcript token. Silence and unchanged interim text should not generate new advice.
7. **Retrieve approved context.** Select relevant playbook passages and prospect facts before generation. A small playbook does not require a vector database. Every factual product claim must be supported by an approved source or omitted.
8. **Generate a compact suggestion.** Return one sayable response, one optional follow-up question, an objection/category label, supporting source IDs, and the transcript revision used. Prefer a clarifying question when facts are unknown.
9. **Publish only current, valid results.** Validate length and structure; reject unsupported factual claims where detectable. Cancel superseded requests, reject mismatched session/revision IDs and expire stale suggestions. Never let an old price objection overwrite a newer implementation question.
10. **Show a stable teleprompter.** Keep the main response readable in a fixed region, with a small transcript and a reason/source affordance. Support pin, dismiss and manual refresh. Do not constantly reshuffle text while the rep reads it.
11. **Stop and clean up.** Stop all owned media tracks, disconnect audio processing, close streaming connections, cancel model requests and invalidate the session. Clear buffers and default in-memory transcript/summary. A saved recap or CRM update requires an explicit separate opt-in.

## 3. Capture options and constraints

| Option | Suitable first use | Important limits |
|---|---|---|
| Browser companion: microphone + shared call-tab audio | Calls that actually run in a supported Chromium tab | User selects the tab and enables audio. Browser/OS/source support varies; inspect returned audio tracks. |
| Telephony media adapter | Calls placed through a supported provider/in-app dialer | Requires credentials, numbers, media-stream configuration, signed/authenticated events, session binding and telephony compliance. Provider/codec details must be verified before building. |
| Native desktop companion | Zoom/Teams desktop or other native calling software | Needs OS-specific audio capture, permissions, packaging and an overlay strategy. A browser permission request does not guarantee access to desktop-app audio. |
| Microphone-only practice mode | Rehearsal or a clearly labeled single-source demo | Not a substitute for hearing the remote prospect through headphones. |

`getDisplayMedia` requires a video track even when we only want tab audio. Never encode, persist, upload or analyze that display video; only route selected audio. Do not assume stopping the video track preserves shared audio on every platform—test the track lifecycle and stop all tracks when ending capture. No webcam permission is needed.

Use a headset plus echo cancellation where available to reduce remote speech leaking into the rep microphone. Avoid local feedback loops. For one-to-one calls the two source channels can be labeled rep/remote after preflight; group participants need diarization/unknown-speaker handling.

For an always-on-top prompt, feature-detect Document Picture-in-Picture. Offer a regular side-by-side panel when unsupported. Do not promise a universal overlay or that it will be invisible in a full-screen screen share.

## 4. Proposed technical boundaries

- **Client:** strict TypeScript; audio-source selection, AudioWorklet capture/resampling as required, preflight meters, provisional/final transcript view and stable teleprompter UI.
- **Session gateway:** authenticated, short-lived sessions; origin checks, tenant/session binding, rate/concurrency limits, idle/max-duration cutoffs and bounded queues. Long-lived STT/LLM keys stay on the server.
- **Streaming STT adapter:** an initial candidate is Deepgram streaming; selection depends on requested languages, region, accuracy, cost and contractual data handling. Keep a provider interface rather than baking vendor events into the UI.
- **Conversation coordinator:** normalize STT events, sequence/revise transcript segments, detect turn boundaries, maintain bounded context, and schedule/cancel coaching.
- **Coaching adapter:** a low-latency text-generation model with constrained structured output and approved context. Gemini, Groq-hosted models or other providers are options—not a claim about Vaniger's active model. No model/provider is selected yet.
- **Transport:** persistent authenticated WebSocket for live audio and events; sequence numbers and session generations to discard late events. No polling loop for the live path.
- **Persistence:** none for raw audio or full call transcripts by default. Approved product playbooks can be stored separately. Opt-in recap persistence needs a retention/deletion policy and tenant authorization.
- **Offline integrations:** prospect preparation and optional CRM summaries are outside the latency-critical audio/coaching path.

No new runtime dependencies are authorized by this draft. Audit license, release/maintenance health, remote-script/telemetry behavior and bundle impact before each installation.

## 5. Event and scheduling contract (conceptual)

Each normalized transcript event needs: session ID, source/channel, segment ID, monotonic sequence, revision, start/end times, text, and whether the segment is final. Interim revisions replace the same segment; they do not append duplicate sentences. A finalized STT segment is not automatically a complete conversational turn.

Each suggestion needs: session generation, suggestion ID, triggering turn ID and transcript revision, creation/expiry time, category, suggested sentence, optional next question and approved source references. Render text as text, never unsanitized model HTML.

Start with one active generation per session and a latest-pending trigger. Abort outdated work when possible and always check current revision before rendering, even when an upstream abort fails. Bound audio buffers; on backpressure do not accumulate unlimited stale audio. Mark gaps/reconnects visibly rather than fabricating continuity.

Treat prospect speech, pasted notes and retrieved material as untrusted data, not instructions. Never follow a spoken instruction to reveal prompts, keys, private records or ignore playbook restrictions. No autonomous external tools in the MVP's live-generation path.

## 6. UI and lifecycle

States: idle → consent → audio preflight → connecting → listening → paused/degraded → stopping → ended. Permission denial, missing remote audio, network loss and provider quota failure have explicit recovery paths.

Essential controls: start, pause processing, resume, stop, pin/dismiss suggestion, and source selection. In companion mode, **pause/stop coaching does not mute or end the external call**; label this clearly. An in-app dialer can later expose separate call controls.

The listening/processing indicator remains visible, including in the compact view. No hidden background recording. Closing the session stops processing; disconnects must reach a bounded server expiry even if the browser cannot send a final event. Reacquisition after a share track ends requires appropriate user action.

Inside this workspace: use its paper/ink/stone tokens, square corners, Cormorant Garamond headings and Hanken Grotesk body text; keyboard-accessible controls, contrast and restrained live-region announcements. Technical telemetry is developer-only (`?debug=1`), not decorative UI.

## 7. Example output

**Prospect:** “This sounds expensive.”

**Say next:** “Is the concern the available budget, or whether the value would justify the cost?”

**Optional follow-up:** “What would you need to see to evaluate that?”

This asks for clarification without inventing discounts or ROI.

For a LiveTry-specific playbook, preserve the approved positioning: “Shows how it looks, not how it fits.” Never promise size detection, biometric measurement or guaranteed reduction in returns.

## 8. Privacy and security release gates

- Explicit start and appropriate participant notice/consent; no auto-start on page load.
- Disclose remote STT/LLM processing honestly. “No recording saved by us” does not mean “audio never leaves the device.”
- Verify each provider's retention, training, region and deletion terms before making a zero-retention/no-training promise. If terms cannot meet the requirement, select a suitable agreement/provider or evaluate a local option.
- No raw audio/transcript/prompt bodies in logs, analytics, error trackers or tracing by default. Metadata-only performance measurement; redact sensitive values from exceptions.
- Server-side keys; short-lived scoped client session credentials; origin/auth checks and session isolation.
- Uploaded playbooks and prospect notes cannot cross tenant boundaries. Future URL ingestion needs SSRF protections; not needed for a paste/select MVP.
- Test cleanup on every permission failure, track-ended event, stop, navigation and socket disconnect. Do not capture camera video.

## 9. Performance and acceptance tests

Provisional goal, not a measured claim: median ≤1.5 seconds and p95 ≤3 seconds from the end of a meaningful prospect turn to the first usable suggestion under a documented supported configuration. Establish the baseline first. Measure audio/endpointing delay, transcription finalization, queueing, model time and UI delivery separately. Do not adopt the competitor's “sub-second” marketing claim as our benchmark result.

Use synthetic or explicitly authorized test conversations, including:

- Budget vs ROI objection; competitor; timing; authority; implementation/security question; polite rejection/opt-out.
- “Expensive ... actually, price is not the problem” correction; interrupted sentences; overlapping speakers; accents/noise; requested language/code-switching.
- Repeated interim results; multiple finalized segments before turn end; out-of-order and duplicated events.
- Slow old generation finishing after a newer turn; pin/dismiss behavior; absent grounding; spoken prompt injection.
- Missing remote audio, microphone denial, ended share track, network drop, reconnect, quota exhaustion and bounded-buffer overload.
- Stop/close guarantees no additional audio chunks or model work from that session; no raw contents in logs/storage.

A mock/scripted demo must be labeled. Real acceptance requires a configured provider and a controlled two-sided call test. No credentials or live audio were used in this research.

## 10. Implementation order after scope approval

1. Resolve call platform/language and project boundary; complete the design review and provider/privacy selection.
2. Build the isolated session UI and a deterministic transcript-replay test harness.
3. Add consent-driven two-source capture and real streaming STT; test source identity, formatting and cleanup.
4. Add grounded coaching, request cancellation, stale-result rejection and readable prompt behavior.
5. Add a compact/PiP view where supported; run controlled end-to-end latency, quality and privacy tests.
6. Only then consider telephony/desktop adapters, lead enrichment, optional saved recaps or CRM integrations.
