# 07 — Roadmap, Milestones, and Task Breakdown

Rule: do not start a milestone until the previous one's acceptance criteria are demonstrated with measurements. Each milestone ends with a demo, a results table, and a known-issues list.

## M0 — Renderer feasibility (target 1-2 weeks)

**Goal:** prove the live overlay can look believable. No backend, no plugin.

Tasks
1. Scaffold monorepo, Vite widget playground page, `tryon-core` package with tests.
2. Webcam capture, MediaPipe Pose Landmarker running live; draw landmarks for debug.
3. Load ONE hand-prepared t-shirt PNG (cut-out) with hand-placed keypoints in a JSON file.
4. Build rig + mesh warp; render via WebGL2 over video; One Euro smoothing.
5. Add clothes/skin segmentation; implement foreground limb layer (hands over garment).
6. Basic old-clothes cover/fill.
7. Basic yaw estimation + front-to-narrow behavior up to 60 degrees.
8. FPS and latency overlay; log metrics to a table.
9. Record 6 fixture videos (still, arms moving, hands over chest, turn left, turn right, 360 turn) from at least 3 different people and 2 phones.

Acceptance
- R-1 (on the available test phone), R-3, R-4 on fixtures.
- **R-8 stranger test:** 8 people shown the demo; report results honestly.
- Written findings: what looks good, what looks fake, FPS by device, recommended next steps.

## M1 — Quality and performance (2-3 weeks)

Tasks
1. Improve fill strategy; measure R-6.
2. Full yaw model with front/back/side blending and hysteresis; R-5.
3. Shading/blend pass; pose-loss fade; failure handling table.
4. Adaptive quality tiers; low-end Android testing.
5. Support 5 categories with category-specific rigs (t-shirt, shirt, kurta, short dress, hoodie), each with hand-made assets.
6. Fixture-based regression tests with stored expected metrics.

Acceptance: R-1 through R-7 on the device matrix in `08_TESTING_AND_QA.md`; R-8 repeated.

## M2 — Ingestion pipeline (3-4 weeks)

Tasks
1. FastAPI service, Postgres schema, queue, storage.
2. Image-type classifier, matting, category classifier.
3. Keypoint detector: baseline model, evaluation harness on `/fixtures/catalog-eval`.
4. Quality checks and status decision.
5. Shopify + generic feed connectors.
6. Asset API endpoints and CDN caching.

Acceptance: on a real 100-product boutique catalog, >= 80% of in-scope items auto-approved, false-approval rate <= 5%, results table delivered.

## M3 — Plugin SDK and dashboard (3 weeks)

Tasks
1. Embeddable script, Shadow DOM UI, consent screen, modal, i18n (en, hi, te).
2. Wire widget to asset API, button gating, variant switching.
3. Dashboard: product grid, keypoint fixer with live mini preview, bulk approve, analytics.
4. Privacy e2e test (network audit) in CI.
5. Demo site with plain HTML integration.

Acceptance: install on a plain HTML site in <= 10 minutes following docs; privacy test passes; bundle size budget met.

## M4 — Shopify app and pilot (3-4 weeks)

Tasks
1. Shopify OAuth, theme app extension, webhooks, billing, GDPR webhooks.
2. WooCommerce plugin (if time permits; otherwise M5).
3. Pilot with 1-2 boutiques; measure try-on start rate, add-to-cart uplift, returns.
4. Fix top issues found in pilot.

Acceptance: pilot report with real numbers; go/no-go recommendation.

## M5 — Hardening and launch (2-3 weeks)

Tasks
1. Security review, load tests on API/CDN, monitoring and alerting.
2. Legal review of privacy text and terms.
3. Docs: shop owner onboarding guide, troubleshooting, FAQ.
4. Pricing and plans.

## M6 — Tier 2 research (optional, after pilot)

3D garment pipeline: asset sourcing options, GLB rigging, cloth sim feasibility on mobile, premium plan design.

## Backlog candidates
- Lower-body garments (trousers, skirts).
- Hand Landmarker for finger-accurate occlusion.
- Multi-garment outfits (top + bottom).
- Background plate for better fill.
- Additional languages.

## Rough timeline

M0 to M1: about 1 month. M2 to M4: about 2.5 months. Plan for slippage. M0 is the decision point; the whole plan depends on its R-8 result.
