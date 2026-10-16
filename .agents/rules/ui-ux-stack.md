# UI/UX and Frontend Stack Rules (Mandatory)

All coding and design work in this repository must strictly adhere to the stack constraints and rules defined in `tryon-docs/docs/09_UI_UX_STACK.md`.

## 1. Surface Isolation & Architectural Boundaries

### Surface 1: Widget (`packages/widget`)
- **Strict Budget:** Core bundle must NOT exceed **150 KB gzipped** (excluding ML models).
- **Environment:** Must run isolated inside a **Shadow DOM** on third-party host pages. Must never alter or break the host page.
- **Forbidden in Widget:**
  - ❌ **NO React**
  - ❌ **NO GSAP**
  - ❌ **NO Framer Motion / Motion (full package)**
  - ❌ **NO Lenis** (scroll hijacking is strictly prohibited)
  - ❌ **NO Three.js** in Tier 1 (Tier 1 uses raw WebGL2)
- **Approved Stack:**
  - Vanilla TypeScript (strict)
  - Preact (optional only if vanilla becomes unwieldy; ~3 KB)
  - Motion's micro `animate` function only (if CSS transitions/Web Animations API are insufficient; verify gzipped cost first)
  - `focus-trap` for modal accessibility
  - `vite` for building library bundle
  - Internalized 1 Euro filter algorithm in `packages/tryon-core` (no bulky external runtime)
  - `tweakpane` strictly in dev playground, **never** in production bundle

### Surface 2: Vision & Rendering
- **MediaPipe:** `@mediapipe/tasks-vision` (Pose Landmarker, Image Segmenter) with GPU delegate where supported, WASM fallback.
- **Rendering:** Raw WebGL2 for Tier 1 2D skinned mesh warp. Three.js is restricted to Tier 2 3D garments.

### Surface 3: Shop-Owner Dashboard (`apps/dashboard`)
- **Stack:** Next.js (React), TypeScript strict.
- **Styling & UI:** Tailwind CSS, `shadcn/ui` (copy-in components), Radix Primitives, Lucide icons.
- **Animation:** `motion` (subtle/functional only), `@formkit/auto-animate`. ❌ **NO Lenis**.
- **Data & Forms:** TanStack Table, Recharts, react-hook-form, Zod (schemas shared via `packages/shared-types`).
- **Keypoint Editor:** Canvas-based using `react-konva` + `use-gesture`. Must not use DOM nodes for draggable keypoints.

### Surface 4: Marketing Site (`apps/marketing`)
- Standalone app. May use Lenis for smooth scroll (disabled under `prefers-reduced-motion`), GSAP + ScrollTrigger (commercial license verified), Magic UI, dotLottie. Lighthouse mobile performance score must remain >= 85.

### Surface 5: Testing
- Unit: Vitest (`packages/tryon-core`)
- E2E / Privacy Audit: Playwright with simulated camera feed (`--use-file-for-fake-video-capture`).

---

## 2. Dependency Policy (Enforced Before Any Installation)
Before adding any new dependency:
1. Verify repository existence, activity, and maintenance health.
2. Verify commercial license compatibility (MIT, Apache 2.0, BSD). Flag proprietary/dual licenses (e.g. GSAP).
3. Measure gzipped bundle impact.
4. Record the entry in `tryon-docs/docs/CHANGELOG_DECISIONS.md`.
5. Strictly reject dependencies that load remote external scripts or transmit telemetry.

---

## 3. Mandatory UX & Product Principles
1. **Disclaimer:** "Shows how it looks, not how it fits." must be visibly placed near the try-on view.
2. **First Useful Frame:** Camera preview within 1s of permission; garment within 3s.
3. **One-Thumb Mobile UX:** Full-screen modal on mobile; essential controls bottom-aligned; Add to Cart / Try On buttons accessible.
4. **Camera Lifecycle:** Zero frames leave the device. Camera tracks must terminate immediately when modal is closed or tab is hidden > 10s.
5. **Quality Gating:** Never show Try On button for products not marked `approved`.
