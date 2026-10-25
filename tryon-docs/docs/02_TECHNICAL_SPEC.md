# 02 — Technical Specification

## 1. System Architecture

```
[ Shopper Browser (Webcam) ]
            │
            │  1. Request Ephemeral Client Token (POST /api/tryon/token)
            ▼
[ LiveTry Local/Backend Server ] ──> Mints token via Decart API (DECART_API_KEY)
            │
            │  2. Return Ephemeral Token (10-min TTL)
            ▼
[ Shopper Browser Widget ]
            │
            │  3. WebRTC Peer Connection (720p @ 15–30 FPS)
            │     Conditioning: Garment Image + "Substitute current top with..."
            ▼
[ Decart AI Cloud Cluster (NVIDIA H100s) ]
            │  • Real-time video-to-video foundation model (`lucy-vton-latest`)
            │  • Generative inpainting with cloth physics & hand occlusion
            ▼
[ Returned Transformed WebRTC Stream ]
            │
            ▼
[ `<video id="webrtc-stream-video">` in Primary Viewport ]
```

## 2. Package Boundaries & Roles

### `packages/tryon-core`
- **`DecartRealtimeVtonEngine`**: Manages WebRTC session lifecycle, client tokens, media tracks, and dynamic garment updates.
- **`DecartGarmentInput`**: Standardized garment payload containing the isolated product image URL/Blob and the substitution prompt.
- **`OneEuroFilter`**: Mathematical filter for optional gesture smoothing and UI stabilization.

### `packages/widget`
- **Web Component (`LiveTryWidget`)**: Encapsulates the entire modal, viewport, and controls inside Shadow DOM for total isolation from host store CSS.
- **Video Renderer**: Directly binds the remote WebRTC `MediaStream` to the HTML `<video>` element with hardware GPU acceleration.
- **Colorway Switcher**: Listens for swatch clicks and dispatches `setGarment()` calls without tearing down the WebRTC connection.

### `packages/local-vton-server`
- **FastAPI Server** (`server.py`):
  - `GET /api/tryon/config`: Returns system health, available engines, and active model status.
  - `POST /api/tryon/token`: Securely mints short-lived Decart client tokens using the server's `DECART_API_KEY`.
  - `POST /api/tryon/generate`: Offline single-image inpainting fallback.

## 3. WebRTC Stream Specifications
- **Transport**: LiveKit WebRTC over UDP / DTLS-SRTP.
- **Resolution**: 1280x720 (720p).
- **Target Framerate**: 15–30 FPS.
- **Codec**: H.264 (Baseline/Main) with hardware acceleration.
- **Latency**: <150 ms end-to-end roundtrip.
