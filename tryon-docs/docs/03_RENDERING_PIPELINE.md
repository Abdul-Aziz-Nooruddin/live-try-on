# 03 — Real-Time Video-to-Video AI Rendering Pipeline

## 1. Approach in One Sentence
Stream the shopper's live webcam video to a dedicated real-time generative video model (**Decart's `lucy-vton-latest`**) over **WebRTC**, completely substituting the existing clothing with the target garment in-memory while preserving natural human motion, fabric drape, and foreground hand occlusions.

## 2. Why Mesh Warping Was Discarded
Previous iterations attempted 2D/3D geometric landmark warping (via Three.js and MediaPipe Pose). Testing confirmed that geometric mesh warping fails the luxury fashion threshold because:
1. **No Clothing Erasure**: The shopper's underlying high-neck collar, buttons, and sleeves remain fully visible behind the mesh.
2. **Rigid Armour Effect**: A 33-point skeletal rig floats like a flat breastplate rather than bending with the body's curves.
3. **Occlusion Glitches**: 2D canvas alpha clipping punches jagged holes in the cloth when limbs move across the chest.

## 3. The Real-Time Generative Video Pipeline

### Step 1: Client Media Capture & Preflight
- Browser captures user webcam stream at 720p (1280x720) @ 30 FPS.
- Client requests an ephemeral token from `/api/tryon/token`.

### Step 2: WebRTC Peer Connection
- `@decartai/sdk` establishes an encrypted DTLS-SRTP media channel to the cloud inference cluster.
- Video stream is transported with hardware H.264 encoding.

### Step 3: Generative Clothing Substitution
- The foundation model ingests two signals:
  1. **Continuous Video Stream**: The live human video feed.
  2. **Garment Signal**: A clean, isolated product cutout paired with the substitution directive:
     `"Substitute the current top with a [garment title] in [colorway]"`
- The model:
  - Identifies and removes the shopper's current top.
  - Generates realistic fabric weave, seams, wrinkles, and collar drape matching the room's ambient lighting.
  - Automatically preserves skin tone, neck contour, and fingers/hands placed on top of the chest.

### Step 4: Video Presentation
- The remote transformed stream is returned via WebRTC and bound to `<video id="webrtc-stream-video">`.
- Zero canvas overhead, 60 Hz display refresh, <150 ms latency.

## 4. Dynamic Garment & Colorway Updates
When the user clicks a swatch (e.g. Oatmeal or Olive):
- The widget calls `decartEngine.setGarment({ imageUrl, prompt })`.
- Decart updates the conditioning prompt and garment image on the active stream without dropping or reconnecting the WebRTC session.
