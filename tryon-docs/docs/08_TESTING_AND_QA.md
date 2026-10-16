# 08 — Testing and QA

## 1. Test layers

| Layer | Tooling | What it covers |
|---|---|---|
| Unit | Vitest (TS), pytest (Python) | Math in `tryon-core` (rig, skinning weights, yaw, filters), API validation, keypoint geometry checks |
| Fixture/regression | Custom harness running the vision+render pipeline on recorded videos | Deterministic metrics per frame (jitter, anchor error, occlusion rates) |
| Integration | Playwright with fake camera (`--use-file-for-fake-video-capture`) | Button injection, consent, modal, camera lifecycle, no network uploads |
| Visual regression | Image diffs on selected frames from fixtures | Catches rendering regressions; tolerances documented |
| Ingestion eval | Labeled `/fixtures/catalog-eval` | Classification accuracy, keypoint error, auto-approval and false-approval rates |
| Real-device | Manual + scripted on device matrix | FPS, thermal throttling, permission flows |
| Privacy | Playwright network audit | No frame/derived data leaves the device (see doc 06) |
| Accessibility | axe-core + manual | Modal focus trap, keyboard, labels |

## 2. Device matrix (minimum)

| Class | Example | Targets |
|---|---|---|
| Low-end Android | ~₹8-10k phone, 4 GB RAM | Works; >= 15 FPS acceptable with Low tier |
| Mid-range Android | Snapdragon 7-series class | >= 24 FPS median |
| High-end Android | Recent flagship | >= 30 FPS |
| iPhone | iPhone 12 or newer (Safari iOS 16+) | >= 30 FPS |
| Laptop | Typical integrated-GPU laptop, Chrome/Edge/Firefox/Safari | >= 30 FPS |

Record device, browser version, tier chosen, median and p5 FPS, per-stage ms, and thermal behavior after 5 minutes.

## 3. Fixture set

Record with consent, store in `/fixtures` (git-lfs), each 10-20 s, 720p 30 fps:
1. `still-front`
2. `arms-up-down`
3. `hands-over-chest`
4. `turn-left-90`, `turn-right-90`
5. `turn-360`
6. `walk-sway` (side-to-side movement)
7. `lowlight`
8. `loose-clothes` (hoodie) and `fitted-clothes`
9. `two-people-background`

Cover at least 6 different people (varied skin tones, hair, body shapes, clothing colors) and both mirrored and non-mirrored phone cameras. Document consent for each.

## 4. Metrics and how to compute them

- **Anchor error (R-2):** distance between garment shoulder anchors and pose shoulder landmarks, normalized by shoulder width.
- **Jitter (R-3):** RMS of frame-to-frame anchor displacement on `still-front`.
- **Hand-over-garment (R-4):** labeled hand mask for 30 sample frames per fixture (manual or assisted labeling); compute the share of hand pixels drawn above the garment.
- **Old clothes visible (R-6):** pixels classified as old-clothes by the segmenter within the garment mask, per frame.
- **Yaw smoothness (R-5):** number of garment-view switches per 360-turn fixture (expected: a small, fixed number); popping measured as frame-to-frame image difference spikes.
- **FPS:** measured via `requestAnimationFrame` timestamps and per-stage `performance.now()` marks.

## 5. Human evaluation (R-8 and later)

- 8+ participants who have not seen the product, mix of ages and phones.
- Script: they try 3 garments, then answer: "Does this look like clothing on you?", "Would this help you decide to buy?", "What looks wrong?" (free text), score 1-5.
- Report mean scores, percent answering yes, and the top 5 complaints. Include raw notes.

## 6. CI gates

- Lint, type-check, unit tests on every commit.
- Fixture regression with tolerance bands on every PR touching `tryon-core`, `vision`, or `render`.
- Bundle size check (widget core <= 150 KB gzipped).
- Privacy network audit on every PR to main.
- Ingestion eval on changes to ML code (nightly acceptable).

## 7. Bug severity

- **S1:** privacy violation, camera stays on, host page broken. Fix immediately, block release.
- **S2:** try-on unusable on a supported device, crashes.
- **S3:** visible artifact in common scenario.
- **S4:** cosmetic.
