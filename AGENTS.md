# AGENTS.md — Standing Agent Instructions

This repository contains **LiveTry**, an embeddable, real-time in-browser virtual clothing try-on system.

Before starting any design, architecture, or coding task, every agent MUST:
1. Load and follow `tryon-docs/AGENT_RULES.md`.
2. Strictly enforce `.agents/rules/ui-ux-stack.md` and `tryon-docs/docs/09_UI_UX_STACK.md` across all surface boundaries.
3. Verify dependencies (license, maintenance, bundle size) before installation and record them in `tryon-docs/docs/CHANGELOG_DECISIONS.md`.
4. Work milestone by milestone per `tryon-docs/docs/07_ROADMAP_AND_TASKS.md`.
5. Strictly adhere to privacy requirements: zero camera frames, landmarks, or derived images leave the shopper's device.
