# AGENT_RULES.md

Standing rules for any coding agent working in this repository. If your tool supports workspace or project rules, load this file there as well.

## Scope and honesty
1. Build only what `/docs` specifies. Out-of-scope items are listed in `MASTER_PROMPT.md` section 4.
2. Never claim a test, benchmark, or device result you did not actually run. Report measured numbers.
3. If a target cannot be met, stop and report: measured value, target, and 2-3 options with trade-offs. Record the decision in `docs/CHANGELOG_DECISIONS.md`.
4. Never fabricate model names, API endpoints, or library features. If unsure, check the official documentation and cite the page in the decision log.

## Privacy (hard rules)
5. No camera frame, mask, landmark stream, or any image derived from video may be sent over the network, written to disk, or stored in localStorage/IndexedDB.
6. Camera access only after a user click on Try On and an explicit in-page consent screen.
7. Stop all camera tracks immediately when the modal closes or the tab is hidden for more than 10 seconds.
8. Analytics events contain no images, no landmark coordinates, no persistent identifiers beyond an anonymous per-session id. See `docs/06_PRIVACY_AND_SAFETY.md`.

## Code quality
9. TypeScript strict mode. No `any` without a comment explaining why.
10. Every module that does math on landmarks or meshes has unit tests with fixed fixtures.
11. Rendering and vision code must be deterministic when fed recorded fixture videos (seeded, no wall-clock dependence besides frame timestamps).
12. Performance-critical loops allocate no per-frame objects where avoidable. Reuse buffers and typed arrays.
13. Every PR/commit is small, builds, and passes lint and tests.

## Workflow
14. Work milestone by milestone (`docs/07_ROADMAP_AND_TASKS.md`). Do not begin the next milestone until the current one's acceptance criteria are demonstrated with measurements.
15. After each milestone, update `docs/CHANGELOG_DECISIONS.md` and list known issues.
16. Ask the user a question only when blocked. Offer a recommended default with the question.

## UX rules
17. The UI always states "Shows how it looks, not how it fits." near the try-on view.
18. Never show a Try On button for a product whose ingestion status is not `approved`.
19. Degrade gracefully: no camera, denied permission, unsupported browser, low FPS. Each has a defined message and fallback (see PRD section 8).
20. Before every designing or coding task, consult and strictly enforce `docs/09_UI_UX_STACK.md`. Never cross surface boundaries (e.g. no React, GSAP, or Lenis in the widget) and log all vetted dependencies in `docs/CHANGELOG_DECISIONS.md`.
