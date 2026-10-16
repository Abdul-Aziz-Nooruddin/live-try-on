# 01 — Product Requirements Document (PRD)

Product: **LiveTry** (working name). Version: 1.0 draft. Owner: Abdul Aziz.

## 1. Problem

Online clothing shoppers cannot see how a garment will look on their own body. In a physical shop they try clothes on and check a mirror. Online, they guess, which hurts purchase confidence and causes returns. Small shops cannot afford custom AR or 3D try-on systems.

## 2. Solution

An embeddable plugin that adds a **Try On** button to product pages. Clicking it opens the shopper's camera and shows them, live, wearing the selected garment in place of what they are wearing now. They can move, raise their hands, and turn. Everything runs in the browser on their device.

**What it shows:** how the outfit looks on the person (style, color, length, silhouette).
**What it does not do:** detect, measure, or recommend size or fit.

## 3. Target users

- **Primary customer (buyer):** owners of small online clothing boutiques (India first), selling on Shopify, WooCommerce, or custom sites, with simple catalogs and ordinary product photos.
- **End user (shopper):** mobile-first shoppers, often on mid-range Android phones and mobile data.

## 4. Goals and success metrics

| Goal | Metric | Target (pilot) |
|---|---|---|
| Shoppers actually use it | Try-on start rate (try-on starts / product page views with button) | >= 8% |
| It helps conversion | Add-to-cart rate for sessions with try-on vs without | Measurable uplift; report actual number |
| It reduces regret | Return rate on try-on-assisted orders vs others | Report actual number (no promised target) |
| Works smoothly | Median FPS on mid-range Android | >= 24 |
| Setup is easy | Time from install to first working try-on product | <= 30 minutes |
| Automatic coverage | Share of in-scope catalog items auto-approved | >= 80% |

## 5. Scope

### In scope (v1)
- Live camera try-on of **tops: t-shirts, shirts, kurtas, short dresses, hoodies/sweatshirts**, in front view with hands up, moving, and turning (see rendering limits).
- Automatic catalog ingestion and approval gating.
- Embed script + button; Shopify app; WooCommerce plugin (in that order).
- Shop owner dashboard: catalog status, fix keypoints, enable/disable products, basic analytics.
- Privacy-preserving, on-device processing.

### Out of scope (v1)
- Size or fit recommendation, body measurement.
- Photo capture / photo-based try-on, server-side generative models.
- Sarees, lehengas, dupatta, layered or draped garments, trousers/lower body (v1.5 candidate), shoes, accessories.
- Real cloth physics. Full 360-degree photoreal turning (needs 3D garments; v2 tier).
- Social sharing of try-on images.

## 6. Key user stories

1. As a shopper, I click Try On beside Add to Cart and, after granting camera permission, see myself wearing the garment within 3 seconds of the camera starting.
2. As a shopper, I raise my hands and my hands appear in front of the garment, not hidden behind it.
3. As a shopper, I turn left or right and the garment follows my body orientation; when I turn around, I see the back of the garment (if the shop provided a back image) or a clearly handled fallback.
4. As a shopper, I can switch to another color or product without closing the camera.
5. As a shopper, I can close the camera at any time, and the camera light turns off immediately.
6. As a shop owner, I install the plugin, and my catalog is analyzed automatically; I see which products are approved, which need a fix, and which are unsupported.
7. As a shop owner, I can fix a product by dragging 6-8 keypoints on its image.
8. As a shop owner, I can see how many shoppers used try-on and add-to-cart rates.

## 7. Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | Try On button renders next to Add to Cart via script tag, configurable selector | P0 |
| FR-2 | Camera opens in modal (full-screen on mobile) after consent | P0 |
| FR-3 | Live garment overlay at target FPS using on-device pose + segmentation | P0 |
| FR-4 | Hands/arms render in front of the garment when in front of torso | P0 |
| FR-5 | Orientation handling for turning left/right (+/- 75 deg) and back view | P0 |
| FR-6 | Old-clothing hiding with fill/blend, no hard artifacts on common poses | P0 |
| FR-7 | Variant switching (color/product) without restarting camera | P1 |
| FR-8 | Auto ingestion of catalog images, classification, keypoint detection, gating | P0 |
| FR-9 | Dashboard to review/fix/enable products | P0 |
| FR-10 | Visible disclaimer about look vs size | P0 |
| FR-11 | Adaptive quality: auto-reduce resolution/features to keep FPS | P0 |
| FR-12 | Privacy: zero frame upload, verifiable by network log | P0 |
| FR-13 | Analytics (aggregate, anonymous) | P1 |
| FR-14 | Shopify app, WooCommerce plugin | P1 |
| FR-15 | Optional 3D garment tier for full 360 turning | P2 |

## 8. Edge cases and fallbacks

| Situation | Behavior |
|---|---|
| Camera permission denied | Explain, with how to enable; Try On modal closes cleanly |
| No camera / unsupported browser | Hide the Try On button or show "Not supported on this device" |
| FPS below 15 for 5 seconds | Auto-reduce quality tier; if still low, show a notice |
| Person not fully in frame | Guide overlay: "Step back so your upper body is visible" |
| Multiple people | Track the most central/largest; show a hint |
| Poor lighting | Hint to improve lighting if pose confidence is low |
| Pose lost | Fade the garment out within 300 ms, fade in on reacquire |
| Shopper wearing loose/baggy clothes, hoodies, long hair | Expect lower quality; best-effort masking, no crash |
| Product not approved | No Try On button |

## 9. Non-functional requirements

- **Performance:** see targets in section 4 and `docs/08_TESTING_AND_QA.md`.
- **Size:** widget initial JS <= 150 KB gzipped (excluding models); models lazy-loaded only when Try On is clicked; total model download <= 25 MB, cached via HTTP/Cache Storage.
- **Compatibility:** latest two versions of Chrome, Safari (iOS 16+), Samsung Internet, Edge, Firefox. WebGL2 required.
- **Accessibility:** modal keyboard accessible, Escape closes, ARIA labels, no motion-induced hazards, visible text instructions.
- **Security:** see `docs/06_PRIVACY_AND_SAFETY.md`.
- **Reliability:** widget failure never breaks the host page; all errors are caught and contained.

## 10. Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| 2D warp looks fake ("sticker") | High | Early prototype test with strangers (M0); invest in occlusion, shading, temporal smoothing; fall back to 3D tier for premium shops |
| Low-end phones too slow | Medium-High | Adaptive quality, lighter models, test on real devices early |
| Old clothes show through | High | Fill strategy + garment scale bias; document limits |
| Turning beyond ~35 deg looks wrong with 2D | High | Explicit side/back handling; optional side and back images; 3D tier |
| Auto ingestion pass rate low | Medium | Dashboard fixer; start with 3 supported categories; measure on a real catalog in M2 |
| Shops will not pay | Medium | Pilot with 2 boutiques, measure conversion before building more |
| Privacy/regulatory | Medium | On-device only; consent screen; legal review before launch (India DPDP Act 2023) |

## 11. Release plan

See `docs/07_ROADMAP_AND_TASKS.md`.
