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

## 2026-10-16 — Activation of Tier 2: 3D Garment Pipeline (Three.js)
Decision:
Activate Tier 2 3D Garment Pipeline using Three.js and MediaPipe 3D World Landmarks (`poseWorldLandmarks`). Build volumetric 3D garment mesh with realistic torso curvature, depth, sleeve tubes, collar thickness, and PBR lighting, replacing flat 2D texture warping.

Reason / measurements:
Product owner review rejected flat 2D overlay ("i want a 3d not the 2d image just overlaying on screen, it should really look like i am wearing that outfit"). 2D image warping cannot convincingly wrap around the torso and shoulders or react to 3D lighting without volumetric geometry.

Alternatives considered:
1. 2D image mesh with displacement shader: inadequate side/shoulder depth.
2. Full GLB asset pipeline: requires 3D scans / CLO3D files.
3. Three.js volumetric procedural 3D garment: combines 3D mesh wrapping, depth buffers, lighting, and real-time metric landmark tracking.

## 2026-10-16 — Integration of Real 3D GLTF Clothing Asset with Baked Normal & AO Maps
Decision:
Upgraded the 3D rendering pipeline from procedural geometric shapes and 2D texture warping to a real rigged 3D GLTF clothing model (`shirt_baked.glb`) loaded via Three.js `GLTFLoader`. Preserved high-fidelity normal maps for physical fabric wrinkles, creases, and seams, and baked ambient occlusion maps with studio three-point PBR lighting.

Reason / measurements:
User testing and visual verification revealed that 2D image warping looks like a flat sticker pasted on the user ("it is looking like just image of shirt is pasted on me"), while primitive CAD cylinders look like floating blocks. A genuine 3D GLB model provides true volume (front, back, tubular sleeves, ribbed neck band), wraps naturally around the body, and reacts realistically to 3D yaw rotation and light.

Alternatives considered:
1. Skinned 2D plane with displacement map: causes edge tearing and rubbery stretching at the sleeves.
2. Procedural CAD primitives: looks robotic and artificial.
3. GLTF 3D garment asset: delivers authentic physical fabric wrinkles, depth, and seamless fitting around shoulders and neck.

Approved by:
Product Owner (Abdul Aziz).

## 2026-10-16 — Evaluation of Decart AI (Anywear) Real-Time Generative Video Diffusion
Decision / Investigation:
Evaluated shopper reference video (`my-session.mp4`) demonstrating `tryanywear.ai` (Anywear by Decart AI). Documented technical architecture differences between on-device client WebGL/Three.js AR overlays and cloud-hosted real-time Generative Video Diffusion models (Decart's Lucy V-TON / Lucy-5B).

Findings:
1. `tryanywear.ai` does not use client-side 3D WebGL or landmark meshes. It streams the webcam video over WebRTC to Decart's cloud cluster of Nvidia H100s / TPUs.
2. A 5-billion-parameter causal video diffusion model ("Lucy V-TON") redraws every video frame in real time at ~15-20 FPS using diffusion forcing, completely hallucinating the new garment, erasing old clothing, and rendering hand-fabric interactions.
3. This creates photorealistic results, but directly contradicts standing Rule 5 & 6 in `AGENT_RULES.md` (which prohibit transmitting any camera frames off-device) and costs ~$0.15-$0.30 per active minute per shopper in cloud GPU infrastructure.
4. Reported trade-offs and 3 actionable architectural paths to the product owner per Rule 3 of `AGENT_RULES.md`.

Approved by:
Product Owner (Abdul Aziz).

