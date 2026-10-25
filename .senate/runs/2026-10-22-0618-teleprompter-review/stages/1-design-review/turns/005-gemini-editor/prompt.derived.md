<!-- generated from transcript.jsonl turn 5 (sha256 4ffec6c24e75b050f97e3ff7e1d5083870eb6111877edcb73fd4283bd59533f7); do not edit -->
Run 2026-10-22-0618-teleprompter-review, stage design-review, peer-review.
Role: fresh editor; no prior review participation.
Shared context: Gemini-only local browser teleprompter. Budget exhausted; author revision T4 was skipped. No implementation is tested.
Private memory: none.
Transcript slice:
[T1 author]
# Implementation Proposal: Gemini-Only Live Sales Teleprompter

## 1. Session Lifecycle & Safe Rollover
The application runs as a local single-user Chrome browser companion backed by a strict TypeScript Node local server. Because `gemini-3.5-transcribe-live` enforces a 10-minute session limit and lacks built-in speaker diarization or word timing, two dedicated, source-bound live WebSockets are maintained (Mic and remote call tab via `getDisplayMedia`). 

* **Rollover Protocol:** Prior to the 10-minute mark, the client initializes a parallel secondary WebSocket using source epochs. Audio chunks are buffered safely during rotation, old transcripts are drained without duplicate coaching, and any temporal gaps are explicitly marked in the transcript state.
* **Teardown:** Explicit teardown routines immediately pause and stop all owned MediaStream tracks, AudioWorklet nodes, WebSockets, and AbortControllers. External remote calls persist independently when coaching or capture terminates. PiP mode is supported as a dedicated viewing feature.

## 2. Client/Server Security
* **API Key Protection:** The Gemini API key remains strictly on the Node server. 
* **Transport & Handshake:** The server binds exclusively to loopback and enforces exact `Host`/`Origin` validation. The client acquires a single-use, short-lived session token over HTTP before opening local WebSockets for audio streaming.
* **Data Privacy & Bounding:** Payload and prompt sizes are strictly bounded. Raw audio and transcripts are never logged or persisted to disk; storage is restricted to explicit user opt-in export. Rehearsal mode defaults to synthetic, non-sensitive inputs.

## 3. Generation Freshness & Concurrency Control
Coaching relies on `gemini-3.5-flash-lite`, triggered exclusively upon receiving finalized remote turns (distinguishing interim vs. final transcription inputs).
* **Concurrency Guard:** Maximum of one outstanding generation request at any time, governed by a configurable cooldown period.
* **Freshness Validation:** Out-of-order or obsolete generations are aborted via token cancellation. Before rendering coaching output, the client validates response category, follow-up items, source IDs, and checks current epochs, revisions, and token expiry to discard stale insights.

## 4. Acceptance Tests
Release validation requires three distinct verification tiers:
1. **Deterministic Fixture Tests:** Automated unit tests covering transcript windowing, epoch rollover logic, and concurrency abort mechanics using mock streams.
2. **Synthetic Provider Smoke Tests:** Minimal integration runs verifying WebSocket handshake, token exchange, and structured text response parsing against `gemini-3.5-transcribe-live` and `gemini-3.5-flash-lite`.
3. **Manual Validation:** A live two-party browser call exceeding 10 minutes to verify dual-socket stability, safe rollover execution, UI responsiveness (quiet paper/ink serif/sans theme with square controls), and connection-state visibility.

---

## Author's Notes
* **Quota Uncertainty:** While model-list HTTP 200 confirms model availability (`gemini-3.5-transcribe-live` and `gemini-3.5-flash-lite`), actual runtime inference quota and rate limits remain unverified under continuous dual-stream load (~$1.08/hr estimated baseline cost).
* **Browser Video Track Handling:** The implementation assumes stopping the video track from `getDisplayMedia` preserves audio transmission without encoding screen video; this behavior requires empirical browser-version validation.


[T2 reviewer]
Summary: Proposal for a dual-source live teleprompter addressing Gemini's 10-minute session limits and real-time coaching.

Strengths: Robust epoch-based rollover, token cancellation for stale responses, and secure server-side key management.

Major concerns with concrete fixes: The design assumes stopping `getDisplayMedia` video preserves audio. *Fix:* Request audio-only streams directly via explicit constraints (`audio: true, video: false`) rather than dropping video post-capture.

Minor concerns: Unverified runtime inference quotas under continuous dual-stream load.

Recommendation: Minor revision.


{'recommendation': 'minor_revision', 'confidence': 0.9, 'blocking_concerns': ['Unverified browser behavior for stopped getDisplayMedia video tracks; requires explicit audio-only stream constraints.']}

[T3 reviewer]
Summary: Local browser teleprompter utilizing dual WebSockets for Gemini live transcription and Flash-Lite coaching with 10-minute session rollovers.

Strengths: Robust local API key isolation, strict loopback host validation, token-based request cancellation, and zero raw audio or transcript disk logging.

Major Concerns with Concrete Fixes: Unverified runtime inference costs (~$1.08/hr baseline) and rate limits risk budget exhaustion on paid/unpaid tiers. *Fix:* Implement explicit server-side cost counters and rate limit hard-stops.

Minor Concerns: Empirical browser validation is still required to confirm that dropping `getDisplayMedia` video tracks preserves remote audio capture.

Recommendation: Minor Revision.
{'recommendation': 'minor_revision', 'confidence': 0.9, 'blocking_concerns': ['Unverified runtime inference costs (~$1.08/hr baseline) lack explicit server-side budget tracking and hard-stops.']}

Turn instruction: Issue budget-limited final review in <=150 words with sections Decision; Summary of reviews; Author's response (explicitly no revision); Reasoning (cite turns); Next steps (concrete implementation gates). Do not use tools or claim full review coverage. Decide accept/minor_revision/major_revision/reject. End fenced json {"decision":"minor_revision","revision_deadline_days":0} choosing your actual decision. No optional delta blocks.
