# 09 — UI/UX and Frontend Stack

Which libraries to use on which surface, with GitHub links. **The agent must follow the per-surface rules below and must not add a dependency without first reporting its bundle-size impact, license, and maintenance status (last release date, open-issue health) from the repo itself.**

> Links were compiled from memory, not machine-checked. Before installing anything, open the repo, confirm it exists and is maintained, and check the license for commercial use. Record the result in `docs/CHANGELOG_DECISIONS.md`.

## 0. The governing constraint

The widget has a **150 KB gzipped budget** (excluding ML models), lives in a **Shadow DOM** on third-party sites, and must never break the host page. Therefore:

- **No React, GSAP, Framer Motion/Motion (full), or Lenis in the widget.**
- **Lenis is never used in the widget or the dashboard.** It hijacks scroll and has no purpose inside a camera modal.
- Heavy animation and scroll libraries are allowed only in the marketing site (surface 3).
- Mobile mid-range Android performance outranks visual flair on every surface.

## 1. Widget (tiny, vanilla)

Rules: vanilla TypeScript, or Preact if components are needed. Animations via CSS transitions and the Web Animations API. Respect `prefers-reduced-motion`. All UI inside Shadow DOM.

| Need | Library | GitHub | Notes |
|---|---|---|---|
| Optional component layer | Preact | https://github.com/preactjs/preact | About 3 KB; use only if vanilla gets unwieldy |
| Animation beyond CSS (only if needed) | Motion (use only its small `animate` function; check size first) | https://github.com/motiondivision/motion | Report gzipped cost before adding |
| Modal focus trap | focus-trap | https://github.com/focus-trap/focus-trap | Required for accessibility |
| Build tool | Vite | https://github.com/vitejs/vite | Library mode for the widget bundle |
| Landmark smoothing reference | 1 Euro Filter (reference implementations) | https://github.com/casiez/OneEuroFilter | Port the algorithm into `tryon-core`; do not add as a runtime dependency unless size is trivial |
| Dev-time parameter tuning | Tweakpane | https://github.com/cocopon/tweakpane | **Dev playground only, never in the production bundle.** Expose shoulder offset, filter strength, fade times, thresholds as sliders |

## 2. Vision and rendering (core dependencies)

| Need | Library | GitHub | Notes |
|---|---|---|---|
| Pose, segmentation, hands | MediaPipe | https://github.com/google-ai-edge/mediapipe | Use the Tasks Vision (web) packages; verify current model names and licenses |
| 3D tier (Tier 2 only) | three.js | https://github.com/mrdoob/three.js | Tier 1 uses raw WebGL2; do not import three.js into the Tier 1 widget |

## 3. Shop-owner dashboard (Next.js)

Rules: Next.js + TypeScript. Prefer accessible primitives over custom widgets. Animation is subtle and functional (state changes, list updates), never decorative.

| Need | Library | GitHub | Notes |
|---|---|---|---|
| Styling | Tailwind CSS | https://github.com/tailwindlabs/tailwindcss | Define design tokens (colors, spacing, radii) once |
| Component set | shadcn/ui | https://github.com/shadcn-ui/ui | Copy-in components; own the code |
| Accessible primitives | Radix Primitives | https://github.com/radix-ui/primitives | Underlies shadcn/ui |
| Animation | Motion (formerly Framer Motion) | https://github.com/motiondivision/motion | Dashboard only |
| Simple list/table animation | AutoAnimate | https://github.com/formkit/auto-animate | One-line enter/exit/reorder animations |
| Charts | Recharts | https://github.com/recharts/recharts | Analytics summaries |
| Data table | TanStack Table | https://github.com/TanStack/table | Product grid with filters, sorting, bulk select |
| Forms | react-hook-form | https://github.com/react-hook-form/react-hook-form | |
| Validation | Zod | https://github.com/colinhacks/zod | Share schemas via `packages/shared-types` |
| Icons | Lucide | https://github.com/lucide-icons/lucide | |
| **Keypoint editor canvas** | react-konva | https://github.com/konvajs/react-konva | Draggable keypoints over the garment cut-out; zoom/pan; undo/redo |
| Gestures (pinch/zoom/drag) | use-gesture | https://github.com/pmndrs/use-gesture | For the keypoint editor on touch devices |

The keypoint editor is the dashboard's hardest UI: it must feel smooth with 14+ draggable points, show a live mini-preview of the warp, and work on tablets. Build it on canvas, not DOM nodes.

## 4. Marketing / landing site (separate app)

Rules: separate app in `/apps`, never shared bundle with widget or dashboard. Lighthouse performance score on a mid-range phone must stay >= 85; if effects push it below, remove effects. The hero should be a short real demo video or live demo of the try-on, not decoration.

| Need | Library | GitHub | Notes |
|---|---|---|---|
| Smooth scroll | **Lenis** | https://github.com/darkroomengineering/lenis | Marketing site only; disable under `prefers-reduced-motion` |
| Scroll-triggered animation | GSAP (+ ScrollTrigger) | https://github.com/greensock/GSAP | **Check GSAP's current license terms in the repo before commercial use** |
| Animated component inspiration | Magic UI | https://github.com/magicuidesign/magicui | Copy-in components built on Tailwind + Motion |
| Lightweight vector animations | dotLottie web player | https://github.com/LottieFiles/dotlottie-web | Prefer over lottie-web for size |
| Lottie (alternative) | lottie-web | https://github.com/airbnb/lottie-web | Heavier; use only if dotLottie cannot play an asset |
| Optional 3D hero | react-three-fiber | https://github.com/pmndrs/react-three-fiber | Only if it does not hurt mobile performance |

## 5. Testing tools for UI

| Need | Library | GitHub |
|---|---|---|
| Unit tests (TS) | Vitest | https://github.com/vitest-dev/vitest |
| End-to-end, fake camera, network audit | Playwright | https://github.com/microsoft/playwright |

## 6. UX principles for the widget (the agent must follow)

1. **First useful frame fast:** camera preview visible within 1 s of permission, garment within 3 s (models are lazy-loaded and cached).
2. **One-thumb mobile layout:** full-screen modal on mobile; controls (close, switch variant) reachable at the bottom; Try On button stays visible next to Add to Cart.
3. **Guide, don't scold:** short, friendly instructions ("Step back so your upper body is visible"). Never comment on the shopper's body.
4. **Always show the disclaimer:** "Shows how it looks, not how it fits."
5. **Graceful states:** loading (skeleton + progress), no permission, no camera, low FPS notice, pose lost (garment fades, hint appears). Every state has copy in en/hi/te.
6. **Motion budget:** UI transitions <= 200 ms, no motion that could be mistaken for tracking errors, honor `prefers-reduced-motion`.
7. **Accessibility:** focus trap, Escape closes, visible focus rings, ARIA labels, contrast >= 4.5:1, touch targets >= 44 px.
8. **Theming:** CSS custom properties exposed so shops can match their brand (accent color, radius, font family) without editing code.
9. **Consent first:** the consent screen precedes any camera access (see `06_PRIVACY_AND_SAFETY.md`).

## 7. Dependency policy

- Every new dependency: record name, version, license, gzipped size impact, repo link, last release date in the decision log.
- Widget CI fails if the core bundle exceeds 150 KB gzipped.
- Prefer copy-in/owned code (shadcn/ui, Magic UI) over opaque packages where licensing allows, to avoid lock-in.
- No dependency that loads remote scripts or sends telemetry.
