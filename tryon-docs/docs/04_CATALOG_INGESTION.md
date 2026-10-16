# 04 — Catalog Ingestion

Goal: make **any garment on the shop's website** try-on-ready automatically, with a human fix path when automation is unsure. Items outside supported categories or below confidence are not shown a Try On button.

## 1. Sources

1. **Shopify:** Admin API (products, variants, images) + `products/create|update|delete` webhooks.
2. **WooCommerce:** REST API + webhooks.
3. **Generic:** product feed (CSV/JSON/Google Merchant XML) or a sitemap crawl of product pages (respect robots.txt; shop owner must authorize the crawl).

Each product yields: external id, title, description, URL, variant list, image URLs.

## 2. Pipeline per product variant

```
fetch images
  -> image-type classifier (flat-lay | mannequin | on-model | detail | lifestyle)
  -> choose best candidate for front; look for back/side candidates
  -> garment extraction (background removal / garment segmentation)
  -> category classification (+ confidence)
  -> garment keypoint detection (+ confidence per keypoint)
  -> quality checks
  -> asset packaging (PNG/WebP alpha, keypoints, physical metrics)
  -> status decision (approved | needs_review | unsupported)
```

### 2.1 Image-type classification
Small image classifier or CLIP zero-shot (flat-lay, mannequin, on-model, folded, hanger). Prefer flat-lay or mannequin images for front. On-model images are usable but lower confidence because arms, hair, and pose occlude the garment.

### 2.2 Garment extraction
- Flat-lay/mannequin: high-quality background removal (BiRefNet or SAM-based matting). Output RGBA.
- On-model: garment segmentation (clothing parsing) then cut-out, flagged `source: on_model`. Reject if the garment is occluded by hands/bags/hair for more than a threshold of its area.

### 2.3 Category classification
Categories in v1: `tshirt, shirt, kurta, dress_short, hoodie`. Everything else -> `unsupported`. Use a vision classifier with a confidence score; low confidence -> `needs_review`.

### 2.4 Keypoint detection
Detect the keypoints listed in `02_TECHNICAL_SPEC.md` section 4. Starting point: a landmark model fine-tuned on a DeepFashion2-style dataset. **Verify dataset license and terms for commercial use before shipping a model trained on it.** Plan a small custom-labeled set from real boutique catalogs to fine-tune and evaluate.

### 2.5 Quality checks (reject or flag)
- Garment bounding box occupies < 40% of image, or is cropped by image borders.
- Alpha mask has holes, fragments, or multiple components after cleanup.
- Keypoint geometry invalid: shoulders not roughly symmetric, neck outside garment, hem above armpits, etc.
- Heavy wrinkles/folds detected (high edge density inside garment) -> flag lower confidence.
- Garment is multi-piece or layered (jacket over shirt, set of two) -> `unsupported`.
- Resolution too low (< 400 px on long edge) -> `needs_review`.

### 2.6 Status decision
- `approved`: all checks pass, category confidence >= 0.85, mean keypoint confidence >= 0.8.
- `needs_review`: passes basic checks but any confidence below threshold. Dashboard shows suggested keypoints to fix.
- `unsupported`: category or structure out of v1 scope.
- `error`: pipeline failure; retry with backoff, surface message.

Thresholds are starting values; tune on a labeled evaluation set and record changes in the decision log.

## 3. Variants and colors

Process each variant image separately but **reuse keypoints** across color variants of the same product when silhouettes match (compare mask IoU >= 0.95 after alignment), to save compute and keep consistency.

## 4. Back and side images

Search the image set for back views (classifier "back view") and side views. If found, run the same pipeline and attach as `back` / `side` assets. The shop owner can also upload them in the dashboard.

## 5. Dashboard fix flow

- Grid of products with status badges and filters.
- Product detail: garment cut-out over a checkerboard, draggable keypoints, undo/redo, live **mini preview** of the warp on a stock body silhouette.
- Actions: approve, disable, upload better image, mark unsupported.
- Bulk approve for high-confidence items.
- Audit log of changes (who/when).

## 6. Evaluation set and metrics

Build and maintain `/fixtures/catalog-eval/` with at least 150 labeled garment images from real Indian boutiques (with owners' permission) covering the five categories and varied photography styles.

Track per release:
- Category accuracy.
- Keypoint error (mean normalized distance, per keypoint).
- Auto-approval rate on in-scope items; false-approval rate (approved items that a human rates as bad) — must stay low (target <= 5%).
- Time to process one product.

## 7. Performance and cost

- Target: <= 20 s per product on CPU+small GPU batch; 100-product catalog in under 30 minutes.
- Run heavy models in batch workers; idempotent jobs; retries; dead-letter queue.
- Cache by image content hash to avoid reprocessing.

## 8. Legal and ethical

- Only process images the shop owner has authorized.
- Store only the shop's product images and derived assets. No shopper data in this pipeline.
- Respect robots.txt and platform API terms.
