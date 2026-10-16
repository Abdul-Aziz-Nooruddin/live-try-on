# 02 — Technical Specification

## 1. System overview

Three parts:

1. **Widget (browser SDK)**: injected via script tag. Renders the Try On button, opens the modal, runs the live try-on loop on-device.
2. **Ingestion service (backend)**: reads shop catalogs, prepares garment assets (cut-out, type, keypoints), stores them, serves config to the widget.
3. **Dashboard (web app)**: shop owners review catalog status, fix keypoints, enable products, view aggregate analytics.

```
 Shop site ──script──> Widget ──GET /v1/products/{id}/tryon-asset──> CDN/API
                         │  (camera frames never leave the device)
                         └─ on-device: Pose + Segmentation -> Warp -> Occlusion -> WebGL render

 Shop catalog ──(Shopify/Woo API, feed, crawl)──> Ingestion service ──> Storage (R2/S3) + Postgres
                                                        │
                                                        └─> Dashboard (review/fix/approve)
```

## 2. Repository layout (pnpm monorepo)

```
/apps
  /dashboard        Next.js shop-owner dashboard
  /demo-site        plain HTML demo store + Shopify dev store notes
/packages
  /widget           browser SDK (TypeScript, Vite)
  /tryon-core       pure TS: math, warp, rig, tests (no DOM)
  /shared-types     API/DB types shared across packages
/services
  /ingestion        FastAPI service (Python)
  /ml               model training/eval scripts (keypoints, classifier)
/docs               this documentation set
/fixtures           recorded test videos + expected outputs (git-lfs)
```

## 3. Widget architecture

### 3.1 Modules
- `ui/`: button injection, modal, consent screen, instructions, error states.
- `camera/`: `getUserMedia`, device selection, track lifecycle, front-camera mirroring.
- `vision/`: model loading and inference workers.
  - Pose Landmarker (MediaPipe Tasks Vision), full-body landmarks with segmentation mask output.
  - Image Segmenter, multiclass selfie segmentation (background, hair, body-skin, face-skin, clothes, others) to obtain a **clothes mask** and a **skin mask**.
  - Optional Hand Landmarker for finger-level occlusion in later milestones.
- `tracking/`: temporal smoothing (One Euro filter), pose confidence handling, yaw estimation.
- `rig/`: converts garment keypoints + body landmarks into a skinned mesh.
- `render/`: WebGL2 pipeline, composite shaders.
- `assets/`: garment asset fetch + cache (Cache Storage), decode to textures.
- `telemetry/`: anonymous aggregate events only.
- `adaptive/`: FPS monitor and quality tier controller.

### 3.2 Threading
- Main thread: UI, WebGL rendering.
- Worker(s): model inference using OffscreenCanvas / `createImageBitmap` where supported. If a platform lacks worker GPU inference, run on main thread with reduced resolution.
- Frame pipeline is pull-based: always process the latest frame, drop stale ones (no queue growth).

### 3.3 Quality tiers (adaptive)

| Tier | Inference res | Segmentation | Render res | Features |
|---|---|---|---|---|
| High | 640x480 | pose mask + multiclass every frame | 720p | all |
| Medium | 480x360 | multiclass every 2nd frame (interpolated) | 540p | all |
| Low | 320x240 | multiclass every 3rd frame, pose mask only otherwise | 480p | simplified fill |

Controller measures a rolling 2-second average FPS. Step down if < 20 FPS for 2s; step up only after 10s above 28 FPS.

## 4. Garment asset format

Served by the API per product variant:

```json
{
  "productId": "string",
  "variantId": "string",
  "status": "approved",
  "category": "tshirt | shirt | kurta | dress_short | hoodie",
  "images": {
    "front": { "url": "...png", "width": 1024, "height": 1280 },
    "back":  { "url": "...png or null" },
    "side":  { "url": "...png or null" }
  },
  "keypoints": {
    "front": {
      "neck_left": [x, y], "neck_right": [x, y], "neck_center_bottom": [x, y],
      "shoulder_left": [x, y], "shoulder_right": [x, y],
      "sleeve_left_end_top": [x, y], "sleeve_left_end_bottom": [x, y],
      "sleeve_right_end_top": [x, y], "sleeve_right_end_bottom": [x, y],
      "armpit_left": [x, y], "armpit_right": [x, y],
      "hem_left": [x, y], "hem_right": [x, y], "hem_center": [x, y]
    },
    "back": { "...same set or null" }
  },
  "physical": { "lengthToWidthRatio": 1.28, "sleeveType": "short|long|sleeveless" },
  "shading": { "meanLuminance": 0.52 },
  "version": 3
}
```

All coordinates are normalized 0..1 in image space. PNGs have alpha cut-outs, premultiplied alpha disabled, max 1024 px long edge, WebP with alpha is acceptable.

## 5. Ingestion service

See `docs/04_CATALOG_INGESTION.md`.

## 6. Backend API (summary; details in `docs/05_PLUGIN_SDK_AND_API.md`)

- `GET /v1/products/{externalId}/tryon-asset?shop={shopId}` (public, cached)
- `POST /v1/ingest/sync` (shop-authenticated)
- `PATCH /v1/products/{id}/keypoints` (dashboard)
- `POST /v1/events` (anonymous analytics batch)

## 7. Data model (Postgres)

- `shops(id, name, platform, api_credentials_ref, allowed_origins[], plan, created_at)`
- `products(id, shop_id, external_id, title, url, status, category, confidence, created_at, updated_at)`
- `product_variants(id, product_id, external_variant_id, color, image_urls[], asset_version)`
- `garment_assets(id, variant_id, front_url, back_url, side_url, keypoints_json, physical_json, version, source, created_at)`
- `ingestion_jobs(id, shop_id, status, stats_json, started_at, finished_at)`
- `events_daily(shop_id, product_id, date, views, tryon_starts, tryon_secs_total, add_to_cart_after_tryon)` (aggregates only)

Status enum: `pending | processing | approved | needs_review | unsupported | disabled | error`.

## 8. Infrastructure

- Object storage + CDN for assets and model files (Cloudflare R2 + CDN suggested for low cost).
- Ingestion workers on CPU where possible; GPU only for batch matting/keypoint inference, run on demand (Modal/RunPod/own), never in the shopper's live path.
- Postgres (managed), Redis queue.
- CI: lint, unit tests, build, bundle-size check, fixture-based vision regression.

## 9. Browser requirements

WebGL2, `getUserMedia`, WASM SIMD recommended, OffscreenCanvas optional. Detect and report unsupported features, never crash.

## 10. Open technical questions (the agent must investigate and report in M0/M1)

1. Does MediaPipe Pose + multiclass segmentation meet FPS on target low-end Android with the GPU delegate? What is the measured fallback with WASM?
2. How accurate is yaw estimation from pose landmarks + face visibility between 30 and 90 degrees, and where does it break?
3. Best old-clothing fill strategy under a 4 ms/frame budget (blur-fill, nearest-background sampling, skin-tone fill with feathering). Measure visual artifact rate on fixtures.
4. Garment keypoint detector choice and fine-tuning data (DeepFashion2 is the starting point; verify license for commercial use before relying on it).
