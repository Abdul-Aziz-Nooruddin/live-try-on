# Handover Brief: Real-Time Virtual Try-On (LiveTry)

## 1. Project Overview & Architecture

### What is LiveTry?
**LiveTry** is an embeddable, real-time in-browser virtual clothing try-on system designed for luxury fashion e-commerce product detail pages (PDPs).

### Repository Structure (pnpm Monorepo)
- **`packages/widget`**: The embeddable client widget. Written in **Vanilla TypeScript** using **Web Components / Shadow DOM** with zero framework dependencies. Adheres strictly to a minimalist luxury editorial aesthetic (`DESIGN.md`: Cormorant Garamond + Hanken Grotesk, flat monochrome tokens, zero rounded borders, zero gradients/glassmorphism).
- **`packages/tryon-core`**: Core framework-agnostic client abstractions (VTON client interfaces, camera managers, pipeline orchestration).
- **`packages/local-vton-server`**: Python 3.11 FastAPI server running on port 8000 with PyTorch, MPS (Apple Silicon Metal) / CUDA support, OpenCV, Diffusers, and WebSockets.
- **`apps/demo-site`**: A realistic luxury apparel e-commerce store running on Vite (port 3000) that embeds the LiveTry widget on its PDP (`http://localhost:3000/pdp/`).
- **`tryon-docs/`**: Complete architecture specifications, rules (`AGENT_RULES.md`), and roadmap milestones.

---

## 2. Current Implementation Status

1. **Build Status**: Fully building with **0 TypeScript errors** across all packages (`pnpm -r exec tsc --noEmit`).
2. **Active Dev Servers**:
   - Demo site: `http://localhost:3000/pdp/` (Vite)
   - Local VTON server: `http://localhost:8000` (FastAPI)
3. **Current Functionality**:
   - The user opens the product page, clicks "Try-On", and the modal opens with live camera access.
   - The modal currently supports a side-by-side split comparison, live camera feed, and a photo try-on button.

---

## 3. The Problem with Current Try-On Quality

When testing our current implementation with a black heavyweight boxy tee over a user wearing a pink-and-white striped polo:
- **Defects Observed**:
  1. The black shirt renders as an unblended, deformed rectangular sticker over the chest.
  2. The user's original striped polo collar, buttons, and neckline remain completely exposed behind/around it.
  3. The sleeves cut off mid-air with sharp edges.
  4. There is no hand/arm occlusion (if a user places a hand on their chest, the shirt is pasted over their hand).
  5. The garment does not react to ambient lighting or realistic cloth physics.
- **Why It Failed**:
  - We attempted local geometric warping (2D/3D landmark mesh deformation via PyTorch/Three.js). Geometric warping only stretches an existing 2D cutout across landmarks; it **cannot** erase the underlying collar/sleeves, understand depth, or invent dynamic fabric folds.
  - Full local diffusion (like CatVTON or SDXL) takes **~38 seconds for a single static image** on local Apple Silicon GPUs. Live video requires **15 to 30 frames per second** (<66ms per frame), which is physically impossible to execute purely locally on a consumer laptop GPU without cloud inference clusters.

---

## 4. The Reference Benchmark: Anywhere (`tryanywear.ai`)

### Video Reference Analyzed
- **File**: `my-session (2).mp4` (tested by the user via the Anywear Chrome extension).
- **Watermark**: `tryanywear.ai · Virtual Try-On in Real Time`.

### What Anywhere Does Right:
1. **Seamless Neckline & Collar Hugging**: Fits snugly around the base of the neck without leaving the underlying collar visible.
2. **True Video-to-Video Synthesis**: Generates realistic cloth folds, seams, and drape that flex in real time as the body moves and turns.
3. **Hand & Foreground Occlusion**: When the user puts their hand over their chest, the fingers and arm naturally occlude the shirt.
4. **Real-Time Framerate**: Operates at **1280x720 at ~15 FPS** with sub-150ms latency.

### How Anywhere Actually Achieves This:
Anywhere is built by **Decart AI**. It does **not** run on the client's laptop.
- The client captures the webcam video feed and streams it over **WebRTC** directly to Decart's cloud GPU cluster (NVIDIA H100s).
- The cluster runs Decart's proprietary **`lucy-vton-latest`** real-time video-to-video foundation model.
- The cloud model performs generative inpainting conditioned on the target garment and streams the synthesized video frames back to the client over WebRTC in real time.
- Decart recently published their official SDK: [`@decartai/sdk`](https://www.npmjs.com/package/@decartai/sdk) (powered by LiveKit WebRTC).

---

## 5. What We Want to Achieve

We want **identical, photorealistic, real-time video virtual try-on** matching Anywhere's quality on our PDP widget.

### The Recommended Target Architecture:
1. **WebRTC Streaming Client**:
   - Integrate `@decartai/sdk` into `@livetry/tryon-core` and `@livetry/widget`.
   - Connect the camera's `MediaStream` directly to the Decart WebRTC session using `models.realtime("lucy-vton-latest")`.
   - Render the returned remote transformed stream directly onto the widget's primary `<video>` element.
2. **Backend Ephemeral Token Generation**:
   - Provide an authenticated endpoint on our server (`/api/tryon/token`) that uses a server-side `DECART_API_KEY` to mint short-lived client tokens so the master key is never exposed in the browser.
3. **Garment Ingestion & Prompting**:
   - Pass the active product image (or garment prompt) to dynamically dress the user in the selected apparel item.
4. **Fallback / Local Mode**:
   - For offline or local testing where an API key is not supplied, implement a proper human-parsing segmentation pipeline (e.g. MediaPipe multiclass body segmentation) to completely mask out the old collar and shirt before rendering.

---

## 6. Open Questions & Room for Agent Suggestions

Incoming agents are encouraged to evaluate and provide suggestions on:
1. **Cloud Streaming Provider Alternatives**: Decart AI (`lucy-vton-latest`) is the exact engine behind `tryanywear.ai`. Are there compelling alternatives to consider (e.g., Fal.ai, Fashn.ai, or self-hosted StreamDiffusion on RunPod/Modal with TensorRT)?
2. **Hybrid Strategy**: How should the system seamlessly handle the transition between a high-speed live WebRTC preview (15 FPS, lower resolution) and an ultra-high-resolution 4K snapshot when the shopper clicks "Save Photo"?
3. **Privacy Compliance**: How best to balance the cloud WebRTC stream with the repository's standing privacy rule ("zero camera frames stored") using ephemeral WebRTC sessions with zero server-side retention.

Feel free to ask the user clarifying questions or propose alternative architectural improvements before beginning implementation.
