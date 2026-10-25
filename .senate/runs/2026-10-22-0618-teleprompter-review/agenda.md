---
run_id: 2026-10-22-0618-teleprompter-review
task: "separate project and also i want gemini integration not claude and also teh veginer is paid platform thats why i cant afford it and want to develop an entire real time working workflow"
mode: single
status: ready
created_at: 2026-10-22T06:21:48Z
stages:
  - index: 1
    name: design-review
    format: peer-review
    roster:
      - { role: author, cli: gemini }
      - { role: reviewer, cli: gemini }
      - { role: reviewer, cli: gemini }
      - { role: editor, cli: gemini }
    rounds: 1
    budget:
      wall_clock_sec: 600
      total_tokens: 12000
      turn_timeout_sec: 120
    input_bindings: []
    output_bindings:
      - { name: reviewed_design, source: "verdict.md body" }
      - { name: design_decision, source: "fenced-json.decision" }
    checkpoint: none
    composition: []
open_questions: []
---

# Revised agenda — separate Gemini-only live teleprompter

## Confirmed requirements and proposed defaults

The user confirmed a **separate project**, **Gemini rather than Claude**, and an **entire working real-time coaching workflow**, motivated by avoiding Vaniger's subscription. Application destination: `/Users/abdulaziz/Desktop/live-sales-teleprompter`. Do not modify or depend on LiveTry application code. No Vaniger account or payment is needed for the original implementation.

Proposed initial supported environment: Chrome desktop browser calls with microphone + selected call-tab audio, automatic transcription language detection and configurable coaching language. This is a default offered for approval, not a claim the user specified the call platform. Native desktop/phone capture, telephony billing and a full CRM/parallel dialer are separate extensions; do not silently promise them.

## Inputs

- Completed public investigation: `research/vaniger-teleprompter/RESEARCH.md` in the current LiveTry workspace.
- Initial provider-neutral design: `research/vaniger-teleprompter/WORKFLOW_DRAFT.md`; provider and project choices are superseded by the new build specification.
- Current scope and verified Google documentation: `/Users/abdulaziz/Desktop/live-sales-teleprompter/BUILD_SPEC.md`.
- Google source documents linked there, particularly live transcription, pricing and API terms. Do not include real audio, confidential briefs, credentials, environment contents or private repository data in review prompts.

## Why this format

Retain a compact single-stage `peer-review` of the implementation specification. One author submits a concrete proposal, two isolated reviewers identify issues, the author revises once, and a separate editor role decides. One round/five turns; no nested debates or additional rounds.

## Why this roster

**author: gemini; reviewer (capture/latency): gemini; reviewer (privacy/cost): gemini; editor: gemini.** No Claude invocation or application integration. All roles use the same CLI; this is role-separated critique, not independent cross-model consensus. The configured Gemini model must be recorded honestly at invocation time; no unverified model selection is asserted.

The Gemini invocation playbook exists and has been read. On 2026-10-22, `gemini` was absent from PATH, no Gemini CLI OAuth credential file was present, and neither `GEMINI_API_KEY` nor `GOOGLE_API_KEY` was set in the agent shell (values were not printed). Plan/schema readiness is **not runtime readiness**. No review has run. A local Gemini CLI invocation/auth setup is a preflight prerequisite; any acquisition must first be license/maintenance/footprint-audited and isolated, with no automatic global setup or billing changes. Do not substitute Claude if Gemini is unavailable.

Freeze identical pre-review context/memory for both reviewers and run them without seeing each other's replies. No resumed CLI sessions. Shared `agents/gemini.md` must not leak one role's new deltas into the other reviewer's prompt. Use a fresh editor invocation. If isolation cannot be enforced, stop and report the blocker.

## Stage plan

1. **Author submission:** max 600 words covering concrete Gemini API paths, capture and source routing, event contracts, renewal, UI, cost and tests.
2. **Capture/latency reviewer:** max 300 words plus format JSON contract; independent critique of two-source capture, PCM resampling, transcript events, ten-minute renewal and old-result races.
3. **Privacy/cost reviewer:** max 300 words plus format JSON contract; independent critique of unpaid vs paid terms, key isolation, bounded usage, consent, prompt injection and retention claims.
4. **Author revision:** max 650 words with explicit responses to major concerns.
5. **Editor decision:** max 350 words plus format JSON contract; accept/minor_revision/major_revision/reject, concrete remaining blockers and implementation acceptance criteria.

The two reviews are parallel; all other turns sequential. Reserve the final 10% of the 10-minute/12,000-token budget for synthesis. Budget includes prompt and completion estimates and is checked between turns. Follow the peer-review format's output contracts and failure policy. Missing Gemini authentication stops the run rather than silently retrying another provider.

## Required technical decisions

- **Dedicated STT rather than audio-agent misuse:** current Google docs specify `gemini-3.5-transcribe-live`, `TEXT` response modality, 16-bit mono PCM/16 kHz, and distinct interim/final transcript fields. It does not support live diarization or word-level timing. Route two source-bound sessions; never infer a named participant from a mixed remote channel.
- **Ten-minute streaming limit:** design controlled stream renewal and bounded in-memory buffering, reconnect/gap indicators, source epochs and duplicate handling. Test a continuous controlled call longer than ten minutes before claiming continuity. General live-agent limits do not override dedicated transcription limits.
- **Text coaching:** use a configurable Gemini text model (initial candidate `gemini-3.5-flash-lite`), approved playbook and bounded conversation context. Return a short sayable response, optional follow-up and source references. No generated voice, invented pricing or automatic external actions.
- **Real audio capture:** browser microphone permission alone does not capture headset remote audio. Detect missing shared-tab audio; never upload the display video track; test track lifecycle instead of assuming stopping video preserves audio. Call-source support is browser/OS dependent.
- **Freshness:** do not call the coach per interim token. Use finalized meaningful turns, latest-context generation IDs, cancellation and client-side stale rejection. Pause/Stop must be idempotent and terminate all capture/streaming/inference from that session.
- **Cost:** no fixed unlimited-free promise. Google lists free tiers with quotas; published STT estimate is about $0.009/minute/stream, implying roughly $1.08 for two continuously processed streams for one hour before coaching/other costs. Verify actual key/model access and usage; estimates are not enforceable provider billing caps.
- **Provider data handling:** unpaid terms generally allow product improvement/human review and prohibit submission of sensitive/confidential/personal information, with regional differences. Use synthetic/non-sensitive rehearsal data for free-tier tests. Paid terms exclude product improvement but allow limited abuse-monitoring retention. Do not call either mode zero retention. Real prospect processing requires an eligible arrangement and appropriate consent/notices.
- **Delivery:** isolated local app/server, `.env.example`, safe key handling, deterministic tests, real Gemini adapter, honest connection/quota errors, readable prompt UI, optional feature-detected PiP, startup instructions and controlled live verification. No mock result labeled live.

## Approval and readiness

The agenda is structurally ready for the user's revised approval gate. **Do not moderate or claim implementation until the gate is approved.** CLI/auth prerequisites remain explicit. Approval covers the compact design review and subsequent requested application build, not billing activation, arbitrary paid API usage, deployment or recording real prospects. There is no additional automatic post-stage confirmation: return to implementation after a satisfactory review; surface material blockers if found.

Application code can be written and tested with synthetic provider fixtures without a live key, but real Gemini end-to-end validation cannot be claimed until credentials, quota and a controlled audio test are available. The required Gemini CLI review likewise cannot be fabricated when auth is unavailable.

## Open questions

No additional product questionnaire is required before approval of the proposed browser-first defaults. The user can replace those defaults in the approval response. Gemini credentials must be configured locally, never in chat.

## Revisions

- **2026-10-22T06:42:12Z** — User confirmed a separate project, requested Gemini instead of Claude, and emphasized an affordable fully working real-time workflow. Replaced every Claude review role with Gemini; fixed product destination; replaced provider-neutral alternatives with dedicated Gemini live STT + Gemini text coaching; incorporated completed REA research and current Google capability/pricing/terms evidence. Proposed browser-first/auto-language defaults rather than repeating the previous questions. Reduced review budget from 15 minutes/25,000 tokens to 10 minutes/12,000 tokens. Removed the extra post-stage checkpoint. Documented missing Gemini runtime/auth and the mandatory revised approval gate; no debate or paid call has run.
