# AGENTS.md — Standing Agent Instructions

This repository contains **LiveTry**, an embeddable, real-time in-browser virtual clothing try-on system powered by **Real-Time Video-to-Video AI Streaming (Anywhere / Decart Lucy VTON WebRTC Architecture)**.

Before starting any design, architecture, or coding task, every agent MUST:
1. Load and follow `tryon-docs/AGENT_RULES.md`.
2. Strictly enforce `.agents/rules/ui-ux-stack.md` and `tryon-docs/docs/09_UI_UX_STACK.md` across all surface boundaries.
3. Verify dependencies (license, maintenance, bundle size) before installation and record them in `tryon-docs/docs/CHANGELOG_DECISIONS.md`.
4. Follow the Real-Time Video-to-Video AI workflow: camera frames stream directly to `lucy-vton-latest` over WebRTC (<150ms latency, ~15–30 FPS), delivering dynamic cloth drape, collar hugging, and native hand/limb occlusion.
5. Strictly adhere to privacy requirements: all sessions use ephemeral client tokens, and zero camera frames are permanently retained on disk or used for model training.
6. Strictly enforce `DESIGN.md`. All UI must look like a high-end editorial fashion retailer (flat colors, tokens, no gradients, no purple/blue, radius 0, no glassmorphism, no SaaS templates, Cormorant Garamond + Hanken Grotesk, telemetry visible only with ?debug=1).
