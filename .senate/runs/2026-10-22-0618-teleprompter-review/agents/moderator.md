# Moderator governance log

- **incident:preflight-001 / stage:1** — Preserve the user's approval and stall before dispatch. Neither the Gemini executable nor the checked authentication sources are available. Installing a CLI cannot supply the missing user credential. No provider substitution, paid request, fabricated result or repeated approval gate is justified. Resume after local credentials and an audited CLI invocation are available; stage 1 remains unstarted.

- **incident:resume-001 / stage:1** — 2026-10-22T07:07:52.227781+00:00: resume approved stage after safe credential-presence and model-list checks. No completed stages overwritten; budget starts with review dispatch rather than the prior user-auth wait.

- **turn:1** — Built-in CLI system prompt consumed substantial budget. Subsequent review-only calls use a documented custom system prompt retaining safety/tool-denial rules, with terse output limits. No change to approved token cap or provider.

- **turn:4** — Actual parallel CLI usage exceeded the between-turn token cap (including hidden reasoning). Author revision skipped; mandatory budget-limited synthesis only. Do not call this a full five-turn review or hide the overrun. Use older gemini-2.5-flash-lite for synthesis to avoid 3.5 reasoning overhead, same approved provider; record actual model.

- **turn:5 / stage:1** — Synthesis model unavailable (404). No retry/model substitution after the budget-limited synthesis. Applied explicit peer-review fallback major_revision; no model verdict fabricated. Engineering will address concrete minor concerns from T2/T3, validate independently, and disclose incomplete review.
