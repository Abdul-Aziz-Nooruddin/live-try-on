# 01 — Product Requirements Document (PRD)

## 1. Product Summary
**LiveTry** is an embeddable, real-time in-browser virtual clothing try-on system designed for luxury e-commerce fashion brands. It enables shoppers on a product detail page (PDP) to open their webcam and immediately see themselves wearing the apparel item in **live, continuous video** at ~15–30 FPS, powered by the same **Real-Time Video-to-Video AI** architecture used by commercial industry leaders such as Anywhere (`tryanywear.ai`).

## 2. Key Problem Solved
Traditional try-on systems either:
1. Require uploading a static photo and waiting 30–60 seconds for a single picture (high friction, boring, unengaging).
2. Use primitive 2D/3D AR sticker overlays, which look like floating rigid cutouts, fail to erase the shopper's existing collar/sleeves, and lack fabric realism.

LiveTry solves this by streaming the live camera feed through a generative video foundation model (**Decart's `lucy-vton-latest` via WebRTC**), delivering:
- **Instant Outfit Substitution**: Completely erases the shopper's existing top and replaces it with the selected garment.
- **Dynamic Fabric Drape**: Real creases, seams, and cloth folds that flex naturally as the shopper moves and turns.
- **Natural Depth & Occlusion**: Hands, fingers, and arms seamlessly occlude the cloth when placed in front of the chest.
- **Instant Color Swapping**: Switching colors (e.g. Charcoal to Oatmeal) updates the live video stream instantly.

## 3. Target User Experience
1. **Shopper on PDP**:
   - Sees product photos, selects size, and clicks "Try On".
2. **Consent & Camera Connection**:
   - Explicit consent modal appears: *"Shows how it looks, not how it fits. Everything is ephemeral."*
   - On click "Start Camera", a low-latency WebRTC connection (<150ms) is established.
3. **Live Try-On Viewport**:
   - The primary video viewport displays the live transformed stream at 720p @ 15–30 FPS.
   - The shopper can turn, inspect fabric drape, and raise their hands without visual glitches.
4. **Color & Style Swapping**:
   - Clicking swatch pills instantly updates the target garment without disconnecting.
5. **High-Res Editorial Capture**:
   - Clicking "Save Photo" takes a high-resolution snapshot ready for saving or sharing.
6. **Direct Purchase**:
   - Shopper selects size and clicks "Add to Bag", updating the checkout cart.

## 4. Technical Constraints & Budgets
- **Framerate**: 15–30 FPS.
- **Stream Latency**: Sub-150ms roundtrip.
- **Resolution**: 1280x720 (720p) video stream.
- **Client Footprint**: Lightweight WebRTC client (`@decartai/sdk`) under 150 KB gzipped, zero heavy client-side ML models required.
- **Privacy**: Ephemeral tokens only. Zero frames saved to persistent disk.
