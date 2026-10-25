<!-- generated from transcript.jsonl turn 1 (sha256 e3c089202b436c43d8840e399a492f5cc6937a2a10d94f0d8dcf0b9b758f8979); do not edit -->
# Run
Task: Review the Gemini-only teleprompter implementation plan.
Run: 2026-10-22-0618-teleprompter-review; stage: design-review; format: peer-review.

# Role
You are the author submitting a concrete design for blind peer review. You are not implementing code.

# Shared context
# Shared context

Approved Gemini-only design review. Public build specification supplied in prompt; no private audio or secrets. The user wants a separate working app. Model-list HTTP 200 includes gemini-3.5-transcribe-live and gemini-3.5-flash-lite; this is not proof of generation quota.

## Notes

# Private memory
# Private memory — gemini

Fresh CLI invocations; no resumed sessions.

## Memory

# Transcript slice
No previous debate turns.

# Design inputs
Design review for an original Gemini-only live sales teleprompter, separate project /Users/abdulaziz/Desktop/live-sales-teleprompter. No Claude and no Vaniger account. First delivery: local single-user Chrome browser companion, mic + selected remote call-tab audio, editable product playbook and prospect brief, automatic language detection and configurable coaching language. TypeScript strict vanilla browser + Node local server; no framework required; minimal runtime dependencies. No source copying. Server keeps API key; loopback binding and exact Host/Origin validation; one-use short session token before local WebSocket sends audio. Bounded data and prompt sizes. No raw audio/transcript logs or persistence; explicit opt-in export only. Rehearsal mode default; real calls require participant notice/consent and proper provider data arrangement. Never claim provider zero retention.
Verified Google docs: gemini-3.5-transcribe-live accepts TEXT output with 16-bit little endian mono PCM/16kHz (~100ms chunks); serverContent.interimInputTranscription and inputTranscription are partial vs final. Two source-bound live sockets are needed because live STT has no speaker diarization or word timing. Dedicated STT has a 10-minute limit: renew before limit, buffer bounded audio, source epochs, drain finalized old transcript without duplicate coaching and mark any gaps. getDisplayMedia requires a video track; never encode/send screen video, and test rather than assume stopping video preserves audio. Gemini text coaching initial model gemini-3.5-flash-lite, bounded recent transcript/playbook, short validated response/category/follow-up/source IDs. Trigger on finalized remote turns with cooldown and maximum outstanding one generation; abort obsolete generations and check epochs/revisions/expiry before showing. Pause/stop all owned tracks/worklets/websockets/request controllers, invalidate epochs. External call does not stop when coaching stops. PiP only feature detected. Privacy: unpaid terms generally allow improvement/human review and prohibit sensitive/personal/confidential inputs (regional differences); use synthetic/non-sensitive rehearsals. Paid terms exclude improvement but may retain abuse logs. No billing activation. Estimate ~0.009 USD/audio-minute per STT stream, so ~1.08 USD per hour for two continuous streams plus coaching, not guaranteed/free unlimited. Model-list test succeeded, actual inference quota not yet tested. Need deterministic fixture tests + synthetic minimal real provider smoke + manual two-party browser call >10min for release validation. Do not present mock output as live. UI quiet paper/ink serif/sans, square controls, keyboard accessible; technical telemetry debug-only; capture/connection state always visible.

# Turn instruction
Produce a concise implementable proposal, at most 600 words, including specific session lifecycle, safe rollover, client/server security, generation freshness and acceptance tests. End with Author's notes flagging uncertainty. Do not use tools, inspect files, invoke commands, research or request credentials. Answer only from this supplied context. No JSON contract required; optional context-delta/private-delta fences for NEW notes only, not repeated main content.
