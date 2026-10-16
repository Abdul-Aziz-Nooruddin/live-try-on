# CHANGELOG_DECISIONS.md

Decision log. The agent appends entries; never delete old ones. Format: date, decision, reason, alternatives considered, who approved.

## 2026-10-16 — Initial decisions (by product owner)

1. **Real-time live try-on only.** No capture-then-render flow, no server-side generative models in the live path. Reason: product owner requirement. Trade-off accepted: visual quality ceiling of a 2D skinned overlay (looks like a high-quality AR filter, not a photograph).
2. **No size or fit detection.** The product shows look only. Reason: out of scope; sizing needs different data. UI states "Shows how it looks, not how it fits."
3. **Plugin for small shops** (script tag first, then Shopify app, then WooCommerce). Not a standalone store.
4. **"Any garment" interpreted as "any supported garment, automatically gated."** Unsupported or low-confidence items do not get a Try On button. Reason: showing broken try-on damages shop trust. Supported v1 categories: t-shirt, shirt, kurta, short dress, hoodie.
5. **Turning:** supported with documented limits. Front/back photos give good results up to ~35 degrees and for back view; side/diagonal are approximations unless 3D assets are provided (Tier 2).
6. **All camera processing on-device.** No frame or derived image leaves the browser.
7. **Hands "touching the outfit"** implemented as occlusion layering (hands above garment). No cloth physics in Tier 1.

## Template for new entries

```
## YYYY-MM-DD — Title
Decision:
Reason / measurements:
Alternatives considered:
Approved by:
```

## 2026-10-16 — UI/UX Stack & Dependency Audit (09_UI_UX_STACK.md)
Decision:
Approved and audited the full UI/UX dependency matrix across isolated surfaces:
- **Widget (`packages/widget`):** Core bundle budget <= 150 KB gzipped. Shadow DOM isolation. NO React, GSAP, or Lenis. Approved dependencies: `@mediapipe/tasks-vision` (Apache-2.0, ~50 KB gzipped client glue), `focus-trap` (MIT, ~3 KB gzipped), `vite` (MIT, build tool), `tweakpane` (MIT, dev playground only). Algorithmic 1 Euro Filter (BSD-3-Clause) natively ported to `packages/tryon-core` without runtime overhead.
- **Shop-Owner Dashboard (`apps/dashboard`):** Next.js 15 (MIT), Tailwind CSS (MIT), Radix Primitives / shadcn/ui (MIT), Motion (MIT, subtle transitions), TanStack Table (MIT), Recharts (MIT), react-hook-form + Zod (MIT), Lucide (ISC), canvas keypoint editor with `react-konva` (MIT) and `@use-gesture/react` (MIT). Strict prohibition of Lenis.
- **Marketing Site (`apps/marketing`):** Lenis (MIT, smooth scroll), GSAP (Standard GreenSock License; flagged for commercial licensing review if club plugins used), `@lottiefiles/dotlottie-web` (MIT).
- **Core Math & Vision (`packages/tryon-core`):** Pure TypeScript; Vitest (MIT) for regression testing.

Reason / measurements:
Guarantees mobile performance, strict privacy, zero host-page interference, and enforces non-negotiable bundle size budget.

Alternatives considered:
Monolithic dependencies (rejected due to bundle bloat); Three.js in Tier 1 (deferred to Tier 2).

Approved by:
LiveTry Architecture & Standing Agent Rules (`.agents/rules/ui-ux-stack.md`).

