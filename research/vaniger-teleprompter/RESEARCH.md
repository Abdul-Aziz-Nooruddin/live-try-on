# Vaniger live AI teleprompter — REA investigation

Date: 2026-10-22 (UTC). Status: public-site investigation complete within the boundary below; authenticated call behavior and private backend remain unverified.

## Conclusion

Vaniger publicly describes a sales assistant that combines prospect context with an ongoing conversation to show short talking points and objection-handling suggestions. We can design an original system for that function without copying its branding, source, private prompts, or backend. The central implementation risk is reliably acquiring **both sides of the call**, not drawing a teleprompter card.

The proposed reconstruction is a separate audio/coaching product, not a change to LiveTry's camera/WebRTC try-on engine. See [WORKFLOW_DRAFT.md](WORKFLOW_DRAFT.md) for design-review input, not an implemented or benchmarked product.

## Method and authority

- Read the official [REA skill](https://github.com/morluto/rea/blob/main/.agents/skills/reverse-engineer-anything/SKILL.md), its runtime-observation and connection-recovery references, and browser-scenario contract.
- Used the actual `rea-agents@6.7.0` CLI, not just an REA-inspired checklist. No REA MCP tool was attached to this session; the documented CLI fallback was used.
- Audited the MIT license, published version, maintenance signals and production bundle impact before acquisition; recorded in `tryon-docs/docs/CHANGELOG_DECISIONS.md`.
- Ran disposable, headless Google Chrome scenarios. No account created; no credentials entered; no microphone/camera permission granted; no call placed; no private API replay or auth bypass attempted.
- Kept complete REA Evidence, declared inputs, and readable derived extracts in `evidence/`. Shell-derived extracts are not independent REA Evidence records.
- Independently fetched the homepage, public privacy policy and public terms. Policy statements describe what the company says, not independently audited infrastructure.
- No global MCP setup, agent configuration edits, native disassembler installation, or application dependency changes.

## REA Evidence index

| ID | Source | What was captured | Limitations |
|---|---|---|---|
| E1: `ev_41b7b3811a8248f5b130a5a4ab656f20f390eb2b935d52c2e2173684f0d8b3ce` | `evidence/public-site-capture.json` | Homepage DOM, accessibility, network metadata; initial page and settle completed | FAQ click timed out after 10 seconds; remaining login actions were cancelled. No claim those actions succeeded. |
| E2: `ev_f9529f267ffa89bc23a3441f288b9f1f3c402d7df677f108182e760beb18ea37` | `evidence/login-capture.json` | Separate direct navigation to `/login`, final DOM/accessibility and network metadata; both steps completed | No form submission or authenticated application. Some requests still in flight at capture end. |

Both results identify `rea-playwright-browser-scenario`, confidence `observed`, authority `controlled-replay`, Chromium `156.0.8078.47`, and browser cleanup `terminated-owned-process`.

The complete evidence explicitly limits attribution: no request initiator stacks, event receipt order is not causality, no observed host architecture/platform, and artifact identity unavailable. Network bodies/headers, screenshots, history, and storage were not requested. An absence in unrequested data is not evidence of absence. Reported capture elapsed time is **not teleprompter inference latency**.

Readable extracts:
- `evidence/homepage-settle.txt`: public accessibility tree.
- `evidence/homepage-settle.html`: public DOM including framework/integration markers.
- `evidence/capture-summary.json`: action outcomes and evidence limitations.
- `evidence/login-final.txt`: email/password, Google login and signup interface.
- `evidence/login-summary.json`: direct-login outcomes and cleanup.

## Findings ledger

| Finding | Classification | Source / boundary | Confidence and residual unknown |
|---|---|---|---|
| Public product description includes live, context-aware suggestions based on prospect and conversation | Observed public claim | E1, `homepage-settle.txt`, product section | High confidence in the claim's presence; efficacy not tested |
| Landing page shows an illustrative price objection and three short suggestions | Observed marketing UI | E1, homepage text/DOM | High; not evidence a real transcription/model call generated them |
| Public UI shows listening status, elapsed time, mute/end-call controls | Observed marketing UI | E1, `Vaniger live call widget` region | High; controls' real calling semantics not tested |
| `See Live Coaching` points to `/login`; login requests account credentials | Observed link and login interface | E1 link destination; E2 | High; no authenticated call surface inspected |
| Homepage uses Next.js/React delivery | Observed frontend markers | E1 DOM contains `/_next/static/`, `self.__next_f`, React server-component metadata | High for this public frontend, not a complete stack inventory |
| Public page contains `TelnyxProvider`, `telnyx-remote-audio`, `telnyx-local-audio` | Observed integration markers | E1 DOM | High for markers; suggests a telephony integration but does not prove an active media route |
| Supported providers include Supabase, Telnyx, Twilio, Deepgram, Google Gemini and Groq | Published policy disclosure | https://www.vaniger.com/privacy, §§3–4 | Policy explicitly says code support does not mean each provider is enabled per customer/deployment |
| Prospect, company, transcript, summary, campaign and customer-provided context may feed live inference | Published policy disclosure | Privacy §3; terms §5 | Confirms disclosed categories, not the exact prompt format or retrieval algorithm |
| Normal calling experience is recorded and may be transcribed | Published policy disclosure | Privacy §3; terms §4 | Do not copy as our default retention policy |
| Redacted/de-identified transcripts may be used to improve/train Vaniger systems | Published policy disclosure | Privacy §3 | Policy does not assert whether Gemini/Groq train on transmitted data; our provider terms need separate verification |
| Sub-second latency | Advertised, unverified performance claim | Homepage FAQ structured data / feature list | No call, timings, network trace of live coaching, or percentile measurement obtained |
| Audio → transcription → contextual generation → screen is a plausible implementation family | Inference / independent design | Product claims + disclosed provider categories | Not a recovered private architecture; precise transport, models, prompts, scheduling and storage remain unknown |

## Investigation checklist

- **Answered:** What functional experience is publicly advertised? Live suggestions, objection handling, prospect context, call-side UI.
- **Answered:** What can we inspect without an account? Public homepage and login; metadata and policy disclosures.
- **Partially answered:** Which technologies are involved? Frontend and Telnyx markers observed; several providers disclosed, no active call path verified.
- **Unresolved:** Exact STT/LLM model versions, system prompt, trigger cadence, speaker routing, retention settings per provider, and real end-to-end latency.
- **Unresolved:** Authenticated suggestion behavior, corrections, stale-result handling and quality on real objections. Requires a user-authorized test account/session or a supplied sanitized recording/HAR from a controlled test; never share account passwords in chat.
- **Ready for design review:** Original functional implementation options, risks and acceptance criteria in `WORKFLOW_DRAFT.md`.

## Technical references used for our design options

1. [MDN: getDisplayMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia): audio is optional and source/browser/OS dependent; video cannot be false; user activation and a fresh permission prompt are required. A successful call can still return no audio track.
2. [MDN: Document Picture-in-Picture](https://developer.mozilla.org/en-US/docs/Web/API/Document_Picture-in-Picture_API): arbitrary HTML can appear in an always-on-top window, but support is limited; it cannot outlive its opener and its position cannot be set by the site.
3. [Deepgram: interim results](https://developers.deepgram.com/docs/interim-results): interim recognition can change; finalized segment events are distinct.
4. [Deepgram: endpointing and interim results](https://developers.deepgram.com/docs/understand-endpointing-interim-results): aggregate finalized segments into an utterance; `is_final` is not the same as `speech_final`. These are API capabilities, not proof Vaniger uses these settings.
5. [REA browser scenario contract](https://github.com/morluto/rea/blob/main/docs/browser-scenario-contract.md): declarative action and capture boundaries, temporary profile ownership, partial results and cleanup semantics.

## Reproduction

From the repository root, with the existing Chrome executable:

```sh
npm_config_ignore_scripts=true npm_config_omit=optional \
  npm exec --yes --package=rea-agents@6.7.0 -- \
  rea capture-browser-scenario \
  research/vaniger-teleprompter/evidence/login-scenario.json \
  --format json
```

Homepage scenario input is also saved. Do not repeat its timed-out click unchanged and assume it will recover. REA can exit successfully while individual actions fail; always inspect step status and completeness.

## Workspace validation

`pnpm -r exec tsc --noEmit` exited 0. Log: `evidence/workspace-typecheck.log`.

This validates the existing workspace typecheck only, not a teleprompter implementation. No app code was changed in this investigation. The workspace had extensive pre-existing changes; they were preserved.
