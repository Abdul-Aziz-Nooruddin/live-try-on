# AGENT_RULES.md

Standing rules for any coding agent working in this repository. If your tool supports workspace or project rules, load this file there as well.

## 1. Core Architecture & Scope
1. **Real-Time Video-to-Video AI Engine**: LiveTry uses a low-latency WebRTC streaming architecture powered by Decart's `lucy-vton-latest` foundation model (`@decartai/sdk`), matching the commercial benchmark set by Anywhere (`tryanywear.ai`).
2. **Generative Clothing Substitution**: Live try-on performs instruction-guided video inpainting using the `"Substitute the current top with [garment description]"` formula, completely replacing the shopper's current outfit, hugging the neck and collar accurately, and handling natural hand/finger occlusion.
3. **Dual Operation**:
   - **Live Video Streaming Mode**: WebRTC peer stream at 720p @ 15–30 FPS (<150ms latency) for fluid interactive posing.
   - **Editorial 4K Snapshot Mode**: Generative high-resolution still capture on button press.

## 2. Privacy & Ephemeral Data Handling
4. **Zero Persistent Storage**: Real-time video frames streamed during WebRTC sessions exist strictly in GPU VRAM and are processed ephemerally. Zero camera frames, video clips, or shopper biometrics are ever written to disk, stored, or used for model training.
5. **Ephemeral Client Tokens**: Master API keys remain on the server; the browser widget requests short-lived (10-minute TTL) ephemeral tokens via `/api/tryon/token`.
6. **Explicit Consent**: The webcam is never accessed automatically. Camera access requires an explicit user click on the "Try On" button and consent screen.
7. **Immediate Cut-Off**: Stop all camera media tracks immediately when the modal closes or if the browser tab becomes hidden.

## 3. Code Quality & Standards
8. **TypeScript Strict Mode**: Zero TypeScript errors allowed. Run `pnpm -r exec tsc --noEmit` before concluding any task.
9. **No Unused Code or Dead Overlays**: Do not mix obsolete 2D/3D mesh sticker deformation or manual canvas alpha-clipping with the neural video stream.
10. **Clean Modular Surfaces**:
    - `packages/widget`: Vanilla TypeScript, Shadow DOM isolation, zero bloated frameworks.
    - `packages/tryon-core`: Core engine client, WebRTC peer connection manager, session lifecycle.
    - `packages/local-vton-server`: FastAPI token minting proxy and configuration provider.
    - `apps/demo-site`: Luxury apparel PDP embedding the widget.

## 4. Editorial Design System (`DESIGN.md`)
11. **Quiet Luxury Aesthetics**: Strictly enforce `DESIGN.md`. Warm off-white (`--paper`), rich ink (`--ink`), hairline stone borders (`--stone`), Cormorant Garamond display font, Hanken Grotesk body font, zero border-radii (`border-radius: 0`), zero gradients, zero purple/blue SaaS styles.
12. **Honest Copy**: The try-on interface always states: *"Shows how it looks, not how it fits."*
