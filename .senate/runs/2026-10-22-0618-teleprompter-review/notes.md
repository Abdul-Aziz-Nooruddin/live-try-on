# Gemini-only teleprompter design review

**Task:** Build a separate Gemini-powered real-time browser-call teleprompter.
**Run:** `.senate/runs/2026-10-22-0618-teleprompter-review/`
**When:** 2026-10-22
**Format:** peer-review, one round (budget-limited)
**Roster:** author/reviewers: Gemini 3.5 Flash-Lite; attempted editor: Gemini 2.5 Flash-Lite. Role-separated, not cross-model consensus.
**Disposition:** completed with format fallback; no full review approval.

## TL;DR

Gemini produced a design and two independent reviews; both reviewers recommended minor revision. Actual CLI input/reasoning usage exceeded the configured token budget while parallel reviews were already in flight, so the author revision was skipped. The editor attempt then failed because that model is unavailable to this account; the run ended with the format's **major_revision fallback**, not a model-generated rejection or approval.

## Decision

No successful editor judgment exists. The fallback means the incomplete review must not be represented as full peer approval. The concrete implementation concerns are source capture lifecycle and explicit usage/rate controls. [T2,T3,T4,T5]

## Why

- The author specified a source-bound dual-transcription pipeline, local key protection, ephemeral session data and stale-result rejection. These are design proposals, not tested claims. [T1]
- The capture reviewer required browser validation, but suggested `getDisplayMedia({audio:true,video:false})`. That suggestion is incorrect: [MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia) says video is required. Engineering must retain the unused display track locally, transmit no video, and terminate all tracks on stop. [T2; independently checked browser API documentation]
- The privacy/cost reviewer required local usage counters and hard cutoffs. These limit our own operations, not guarantee a provider billing ceiling. [T3]
- No author revision ran after the budget threshold. A rejected editor request is not a successful synthesis. [T4,T5]

## Structured outcome

```json
{"decision":"major_revision","revision_deadline_days":0}
```

This is the documented format fallback in the stage verdict. It is **not** attributed to a successful synthesis turn; none exists. T2/T3 each returned `minor_revision` with confidence 0.9.

## What didn't get resolved

Full editorial approval, sustained two-source quota, real microphone/tab browser compatibility, and a controlled call exceeding ten minutes remain unverified. Engineering may address the observed concerns in code and tests, but those tests do not retroactively complete the failed review.

## Process

After the user configured credentials, a Google model-list request succeeded. Four CLI calls were dispatched: one author, two isolated reviewers with frozen contexts, and one attempted editor. No CLI tools ran and no call audio or secrets entered review prompts. The original large CLI system prompt and reasoning contributed to the budget overrun; later calls used a minimal safety-preserving review-only prompt. No provider billing settings changed.

**Failures:** T4 (Gemini, author revision): `budget_exhausted`, not dispatched. T5 (Gemini, editor): `unknown`, zero retries; provider returned model-unavailable 404. The moderator applied the peer-review fallback rather than inventing a verdict. See `agents/moderator.md` entries for T4/T5.

## Action items

- [ ] Implement safe two-source capture without the invalid audio-only display constraint.
- [ ] Add server-enforced duration, request-frequency/count and buffering limits; label monetary totals as estimates.
- [ ] Add controlled Gemini STT/coaching smoke tests and deterministic race/cleanup tests.
- [ ] Keep real-call privacy prerequisites and outstanding manual long-call validation explicit.

## Artifacts

- [Full transcript](transcript.jsonl)
- [Shared context](context.md)
- [Stage disposition](stages/1-design-review/verdict.md)
- [Run state](state.json)
- [Approved agenda](agenda.md)

---

**Budget:** 13,994 reported Gemini tokens across successful calls, exceeding the 12,000 cap due to already-running parallel requests and uncapped reasoning; editor usage unreported. The revision was skipped and no further review rounds were launched. This was not a within-budget full five-turn review.
