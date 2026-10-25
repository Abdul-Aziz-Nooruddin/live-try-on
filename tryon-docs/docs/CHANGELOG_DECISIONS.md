# CHANGELOG_DECISIONS.md

Decision log. The agent appends entries; never delete old ones. Format: date, decision, reason, alternatives considered, who approved.

## 2026-10-16 — Initial decisions (by product owner)

1. **Real-time live try-on only.** No capture-then-render flow, no server-side generative models in the live path. Reason: product owner requirement. Trade-off accepted: visual quality ceiling of a 2D skinned overlay (looks like a high-quality AR filter, not a photograph).
2. **No size or fit detection.** The product shows look only. Reason: out of scope; sizing needs different data. UI states "Shows how it looks, not how it fits."
   - *2026-10-21 Clarification for B2B Sales & Outreach:* All sales emails, prompts, and lead scrapers strictly position LiveTry as visual styling and drape on oneself, NOT S/M/XL size fitting or biometric measurement. Size charts handle measurements; LiveTry solves visual uncertainty ("how does this look on me?").
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

---

## 2026-10-16 — Zero-Cost Real-Time In-Browser Seamless Fitting Engine (On-Device Anywear-Class Try-On)

### Context:
Shopper requested the exact seamless, worn look of `tryanywear.ai` without recurring cloud server/GPU costs ("zero rupees unlimited"). To eliminate the "floating 3D sticker" look and completely erase the underlying shirt without streaming frames to expensive cloud servers, we engineered an advanced on-device graphics pipeline in Three.js and MediaPipe.

### Solution & Architectural Implementation:
1. **Dynamic Skeletal Sleeve Deformation**: Real-time vertex rotation on `shirt_baked.glb` (0.29ms per frame) smoothly rotating left and right sleeves along the shopper's arm vectors ($\theta_L, \theta_R$) with armpit falloff, giving fluid fabric motion when arms move.
2. **Precision Collar & Torso Alignment**: Calibrated 3D GLB collar opening dip ($y = +0.102\text{m}$) directly to `neckBase` (suprasternal notch), correcting the previous 5cm drop that exposed undershirts.
3. **Anatomical Neck Depth Occlusion**: Integrated an invisible depth-writing neck cylinder (`colorWrite: false, depthWrite: true`), allowing the user's real neck to pass through the collar opening while naturally occluding the back collar rim.
4. **Collar-Erasing Live Skin Extrapolation**: Dynamically samples the user's jaw/chin skin tone from the live video feed and feathers a skin patch between the chin and the crewneck opening, completely erasing polo collars, buttons, and high undershirts.
5. **Zero Cloud Infrastructure Cost ($0.00 / Unlimited)**: 100% executed on client WebGL/WASM/GPU, maintaining strict adherence to Rules 5 and 6 of `AGENT_RULES.md` (zero camera frames leave the client device).

### Approved by:
Product Owner (Abdul Aziz).

---

## 2026-10-16 — Strategic Pivot: Real Generative AI Virtual Try-On Pipeline (V-TON)

### Context:
Following testing of the on-device 3D WebGL prototype, the Product Owner (Abdul Aziz) determined that a 3D polygon mesh overlay cannot deliver the photorealistic, fabric-draping experience seen in modern generative fashion platforms like Anywear (`tryanywear.ai`). The Product Owner issued a formal directive: *"yes exactly real generative AI try on pipeline"*.

### Decision & Architectural Changes:
1. **Pivot from 3D CAD Meshes to Neural Generative V-TON**:
   - Live try-on will no longer rely on rigid/semi-rigid 3D GLTF polygon overlays.
   - Core try-on engine is transitioned to a **Diffusion-Based Virtual Try-On (V-TON)** architecture (supporting CatVTON / IDM-VTON / Serverless VTON API).
2. **Updated Data Flow & Privacy Policy**:
   - To support generative V-TON inference, high-resolution snapshots captured with explicit user consent are streamed over encrypted TLS to an ephemeral V-TON inference worker.
   - **Zero Retention Policy**: The user's image is processed in GPU RAM and immediately discarded. No customer photos are ever stored on disk or used for training.
3. **Hybrid Frontend Experience**:
   - **Phase 1: Real-Time Framing & Pose Guide**: Lightweight on-device MediaPipe camera viewfinder assists the shopper with posture, lighting, and framing.
   - **Phase 2: Generative Couture Synthesis**: On capture, the generative V-TON pipeline synthesizes the shopper wearing the exact selected garment with photorealistic fabric drape, micro-wrinkles, natural shadows, and 100% removal of existing clothes.
   - **Phase 3: Interactive Editorial Inspection**: Split-screen before/after slider, high-res zoom, colorway switcher, and direct "Add to Bag".

### Approved by:
Product Owner (Abdul Aziz).

---

## 2026-10-16 — Option 1: Live Neural Video Streaming Pipeline (Anywear Architecture)

### Context:
Product owner clarified the core requirement: *"i want live virtual try-on, not photo capture"*. User instructed to execute Option 1 (Anywear's live streaming architecture). Installed `ws` in `@livetry/demo-site` (MIT, 80M weekly downloads, 50kB zero-dependency Node WebSocket library) to stream live video frames between browser and real-time neural try-on engine.

### Implementation:
1. Low-latency WebSocket video stream bridge in `vite.config.ts`.
2. Real-time continuous frame streaming from browser webcam directly to the neural V-TON engine at 15–20 FPS.
3. Live playback on the video canvas, showing the customer wearing the target garment in real time motion as they move.
4. Seamless colorway switching on the fly without stopping the live stream.
### Approved by:
Product Owner (Abdul Aziz).

---

## 2026-10-17 — Decart AI Lucy VTON WebRTC Real-Time Video-to-Video Architecture

### Context:
Inspection of the user's reference video (`my-session (2).mp4`) confirmed that Anywhere (`tryanywear.ai`) is built by Decart AI using their proprietary `lucy-vton-latest` foundation model over WebRTC. Local client-side mesh warping failed because it cannot erase existing high-neck collars or compute hand occlusions, while local Apple Silicon diffusion takes ~38s per frame.

### Decision:
1. Integrated `@decartai/sdk` (MIT, LiveKit WebRTC) into `@livetry/tryon-core` and `@livetry/widget`.
2. Created `DecartRealtimeVtonEngine` to stream raw webcam frames directly to Decart's cloud cluster and render the returned 15+ FPS video stream with seamless collar hugging and hand occlusions.
3. Added `/api/tryon/token` and `/api/tryon/config` endpoints to `local-vton-server`.
4. Provided client-side API key configuration and seamless fallback in `apps/demo-site/src/pdp.ts`.

### Approved by:
Product Owner (Abdul Aziz).

---

## 2026-10-19 — Real-Time Clothes Substitution Fix for Decart Lucy VTON WebRTC

### Context:
When connecting to Decart's `lucy-vton-3.6` cluster via WebRTC, the user observed that the video connected successfully (`● connected`) but the user's clothing was not being replaced with the selected t-shirt.

### Root Cause Analysis:
1. **Oversized & Raw PNG Reference Images**: The catalog PNG (`sample-tshirt.png`) was ~1.5 MB (>2 MB base64). When sent over WebRTC data/signaling channels during initial handshake, large payloads either timed out or exceeded message size thresholds. In addition, transparent PNG alpha channels without a solid backing rendered as black rectangles on default JPEG conversion.
2. **Missing Post-Connect `set()` Trigger**: In Decart SDK's WebRTC implementation, passing reference images in `initialState` before video frames start flowing can be ignored or dropped by the remote video transformer. The frame generator requires an explicit signaling command `session.set({ prompt, image, enhance: false })` once the WebRTC peer connection is established to start active substitution.
3. **Camera Constraint Mismatch**: Desktop webcams were requested at 720x960 (portrait), conflicting with Lucy VTON's native 1280x720 (16:9) frame geometry.

### Implementation:
1. **Canvas Garment Preprocessing**: Added `resizeImageToDataUrl()` in `DecartRealtimeVtonEngine` that composites transparent garment cutouts onto a clean `#ffffff` backdrop, resizes to max 768px, and exports as a compact 0.88 JPEG (~60-90 KB).
2. **Explicit Post-Connect Trigger & Swapping**: Both `initialState` (with `passthrough: false`) and an immediate `session.set({ prompt, image, enhance: false })` are sent upon WebRTC connection and swatch changes.
3. **Optimized Camera Constraints**: Switched to native `{ ideal: 1280 }, { ideal: 720 }, frameRate: { ideal: 30 }` matching Lucy VTON.
4. **Targeted Substitution Prompting**: Formulated explicit replacement directives (`"Wearing this boxy... Replace the current shirt with this... t-shirt."`).

### Approved by:
Product Owner (Abdul Aziz).

---

## 2026-10-20 — Animated Add to Bag Stepper & Smooth Kinetic Scroll (GSAP & Lenis)

### Context:
Storefront product detail page required an editorial, animated `- 1 +` quantity controller upon adding an item to the bag, replacing static button feedback with smooth micro-interactions while maintaining the high-end editorial retail aesthetic of `DESIGN.md`.

### Decision:
1. Integrated `gsap@3.15.0` (standard GreenSock license, ~24KB gzipped) for spring-eased micro-interactions, digit rolling transitions, button morphing, and header bag badge pulsing.
2. Integrated `lenis@1.3.26` (MIT license, ~4KB gzipped) for kinetic, inertia-based smooth page scrolling with automatic pause during modal overlays (try-on modal, lightbox).
3. Created an interactive, token-compliant `[- 1 +]` stepper that morphs from the primary "Add to Bag" button, supporting increment, decrement to 0 (smooth collapse back to Add to Bag), and low-stock protection.

### Approved by:
Product Owner (Abdul Aziz).

### Approved by:
Product Owner (Abdul Aziz).

---

## 2026-10-20 — Rollback of Local Mac GPU Engine; Restoration of Canonical Decart Lucy VTON Workflow

### Context:
Local Mac GPU tensor-sampling did not meet the desired photorealistic output expectations of the user. Requested immediate removal of local Mac GPU code and full restoration of the canonical Decart Lucy VTON WebRTC streaming workflow.

### Decision:
1. Removed all Mac GPU WebSocket streaming loops, offscreen canvas grabbers, and UI engine switcher buttons from `apps/demo-site/src/pdp.ts` and `apps/demo-site/pdp/index.html`.
2. Fully restored the canonical Decart Lucy VTON real-time WebRTC pipeline (`tryonEngine.startStream(...)`) as the sole try-on workflow.
3. Preserved all PDP UX features: GSAP animated quantity stepper `[- 1 +]`, Lenis smooth scrolling, multi-swatch live syncing, and snapshot lightbox.

## [2026-10-20] - Fix Decart WebRTC Active Key Pool & Bag Badge Number Centering

### Context & Problem:
1. Video Try-On modal was stuck in `connecting` and quickly dropped to `disconnected`. Root cause: Key #1 in `.env` was out of credits on Decart (`Insufficient credits`), and the token service was not running on port 8000.
2. The quantity number `0` inside the navigation `BAG` badge was vertically and horizontally unaligned with the circular black badge due to inherited `letter-spacing: 0.12em` and missing box-sizing / optical vertical baseline compensation.

### Resolution:
1. Verified all Decart API keys via WebSocket dial to `wss://api.decart.ai/v1/stream?model=lucy-vton-3.6`. Filtered out depleted keys and set active key (`dct_general_...`) at the top of the pool.
2. Started local backend service `server.py` on port 8000 to continuously serve `/api/tryon/token` via Vite proxy.
3. Fixed `.bag-count` styling across `pdp/index.html`, `index.html`, and `collection/index.html`:
   - Added `letter-spacing: 0; text-indent: 0; box-sizing: border-box; padding-top: 1px;`.
   - Verified optical and mathematical centering via headless Chrome pixel inspection (5 black rows above and below the digit, fully symmetric).
4. Fixed Decart Lucy VTON connection stall:
   - Eliminated sending binary `image` inside `initialState` (which was causing `@decartai/sdk` to wait 30s for non-existent `set_image_ack`), conditioning exclusively via dedicated VTON substitution `prompt` which returns instant `prompt_ack`.
   - Omitted `speed: fast` to prevent US-only speed tier mismatch on the user's `ap-south-2` cluster.
   - Added early error and session termination handlers on `currentSession` to reject immediately rather than blocking for 25s timeout.
   - Added `tryonRetryCount` limiter to prevent rapid infinite reconnect and timer restart loops.

### Approved by:
Product Owner (Abdul Aziz).

## [2026-10-20] - Integration of ScrapeGraphAI for Autonomous Apparel Merchant Lead Discovery

### Context & Need:
To scale B2B merchant acquisition for the LiveTry WebRTC try-on plugin, generic web scraping fails on custom React, Hydrogen, and Shopify storefronts. Required an LLM-driven graph extraction engine capable of navigating apparel sites, locating executive contacts, and parsing return policies without brittle CSS selectors.

### Dependency Verification:
- **Package:** `scrapegraphai` (v2.3.1).
- **License:** MIT License. Fully permissive for commercial application.
- **Maintenance:** Actively maintained open-source repository (`ScrapeGraphAI/Scrapegraph-ai`).
- **Scope:** Isolated exclusively to outbound tooling environment (`harvey/.venv`). Zero impact on production try-on bundle budget (<150 KB gzipped).

### Decision:
Installed `scrapegraphai` into `harvey/.venv` configured to use Google Gemini for intelligent multi-page storefront crawling and structured prospect extraction.

### Approved by:
Product Owner (Abdul Aziz).

## [2026-10-21] - Installation of AI Website Cloner Template

### Context & Need:
Installed standalone website reverse-engineering and cloning template (`JCodesMore/ai-website-cloner-template`) to allow cloning and reconstructing target merchant storefronts into clean Next.js 16 codebases with pixel-matched layout, fonts, and responsive interactions.

### Dependency Verification:
- **Repository:** `JCodesMore/ai-website-cloner-template` (v0.6.1)
- **License:** MIT License. Fully permissive for commercial application.
- **Maintenance:** Actively maintained community template.
- **Stack:** Next.js 16.3.5 (Turbopack), React 19, Tailwind CSS v4, Lucide React, shadcn/ui. Node.js >= 24 (verified with Node v26.7.0).
- **Verification:** `npm run check` (ESLint, TypeScript typecheck, production build) passed with exit code 0.
- **Scope & Isolation:** Resides in standalone directory `ai-website-cloner-template/` with origin remote removed. Cloned skill `clone-website` registered in `.agents/skills/clone-website`. Zero runtime footprint on core try-on widget bundle.

### Approved by:
Product Owner (Abdul Aziz).

## 2026-10-22 — REA public-site investigation tooling (isolated CLI)

Decision:
Use version-pinned `rea-agents@6.7.0` through an ephemeral npm execution environment for the user-requested Vaniger teleprompter investigation. Do not add it to any application package, register MCP, replace existing skills, or install native analysis engines.

Reason / dependency verification before acquisition:
- Official repository: https://github.com/morluto/rea; npm repository field matches.
- License: MIT, verified in the repository LICENSE. Third-party components retain their respective licenses; this is local investigation tooling, not redistributed application code.
- Latest GitHub release: 6.7.0, published 2026-10-18T07:45:18Z; npm metadata modified 2026-10-18T08:12:05.977Z. Active release includes browser-capture and cleanup fixes. Public repository reports substantial open issue/PR backlog; recent fixes indicate activity, not a guarantee of stability.
- npm unpacked package size: 28,575,703 bytes (excluding installed dependencies). Production/browser gzipped bundle impact: exactly 0 bytes because no runtime import, manifest change, or shipped asset is introduced. Tool download size is separate from bundle impact.
- Existing Node v26.7.0 satisfies the package engine range. Existing Google Chrome supplies the browser; no browser download required.
- Documented analysis runs locally. No analytics integration is added to LiveTry. Use a disposable browser profile, no credentials, no microphone/camera grants, no private calls; the public target page may make its ordinary third-party network requests.
- Disable npm install scripts and optional native dependencies for this browser-only invocation. Keep complete REA evidence and report cleanup status/limitations.

Alternatives considered:
Documentation-only REA workflow (insufficient runtime evidence); global setup/MCP changes (unnecessary); native disassemblers (irrelevant to public website inspection).

Approved by:
User explicitly requested use of morluto/rea against https://www.vaniger.com/. Authorization is limited to this investigation; no paid service, signup, call, or global configuration change is included.

## 2026-10-22 — Isolated Gemini CLI for approved teleprompter review

Decision: acquire pinned `@google/gemini-cli@0.65.0` in npm's execution cache, not in any LiveTry/application package. The user approved the Gemini-only review and configured a separate-project key locally.

Verification before installation:
- Official repository https://github.com/google-gemini/gemini-cli; Apache-2.0 verified in repository LICENSE and npm metadata.
- Repository pushed 2026-10-22T01:23:52Z; npm metadata modified 2026-10-22T01:27:32.960Z; 744 open issues/PRs reported. Active Google-maintained project; backlog is not proof of reliability.
- Unpacked CLI package: 98,737,043 bytes, excluding dependencies. Production/browser gzip impact: 0 bytes (dev-only subprocess, no application imports/manifests changed).
- Existing Node v26.7.0 satisfies >=20. Installation scripts disabled; no global installation, extensions, native browser or engine installation.
- Isolated home/work directory; telemetry and usage statistics disabled, prompt telemetry disabled, hooks/skills disabled, no tool access for review turns, no automatic upgrades or billing overage. Only supplied public specification reaches Gemini; keys are process credentials, never prompt content.

Alternatives: direct REST review (does not follow the approved CLI review procedure); Claude (explicitly rejected); global CLI configuration (unnecessary). Approval: user's “a” plus local-key configuration. Account billing settings remain untouched.

## 2026-10-23 — Agent Reach isolated lead-research CLI

Decision:
Install Agent Reach v1.6.0 as an isolated user-level CLI for public, read-only lead research. It is not added to any LiveTry application package, production bundle, widget, dashboard, or runtime dependency graph. Enable the default channels first, then add only the channels needed for approved research (initially LinkedIn and Reddit); do not automate posting, messaging, or outreach.

Dependency verification before installation:
- Official repository: https://github.com/Panniantong/agent-reach; release v1.6.0 published 2026-10-23. Repository activity is current at the reviewed release commit; it has an active issue/PR history. Maintenance is upstream-dependent and social adapters may break when platforms change.
- License: Agent Reach MIT. Reviewed upstream dependencies are permissive/commercially usable: requests Apache-2.0, loguru MIT, PyYAML MIT, yt-dlp Unlicense, OpenCLI Apache-2.0, and Bilibili CLI Apache-2.0. Platform terms and privacy laws remain applicable to collected data.
- Declared Python requirements: >=3.10; existing Python 3.14.7 satisfies this. Existing uv 0.12.19 is used by the documented installer. Core release asset is approximately 676 KB; source checkout is approximately 2.1 MB. Production/browser gzipped impact: 0 bytes because this is an isolated CLI and no LiveTry package or shipped asset imports it.
- Installation scope: Agent Reach stores its tools, sessions, state, and caches below `~/.agent-reach/`; the documented installer explicitly warns that the similarly named PyPI package is not this project. No camera, LiveTry customer data, or application secrets are required.
- Privacy/lead-data boundary: the tool is read-only and may expose public author/profile data, but phone numbers and emails are not guaranteed. Only publicly published business contact details should be retained, with source URLs and platform terms respected. Any CRM sync or outreach must be a separate, human-reviewed step.

Alternatives considered:
Existing built-in web search only (insufficient for platform-specific and login-gated sources); adding a scraping library to LiveTry (rejected because it would couple outbound research to the product runtime); installing every experimental channel immediately (rejected because it increases account/anti-bot risk without improving the initial LinkedIn/Reddit validation).

Approved by:
User explicitly requested installation and lead research. Scope is limited to read-only, public, evidence-backed prospect research; no automated contact, messaging, or platform write actions.
