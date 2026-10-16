# 03 — Real-Time Rendering Pipeline

This is the most important and riskiest document. It defines exactly how the live try-on works, what it can do, and its limits. The agent must implement it incrementally and measure at each step.

## 1. Approach in one sentence

Track the body with on-device pose and segmentation, build a **skinned 2D mesh** of the garment image whose control points are driven by body landmarks, composite it over the live video with **occlusion layers** (arms/hands in front of the cloth), and **hide the old clothing** using the clothes mask plus fill. No generative models.

## 2. Per-frame pipeline

```
1  Grab latest camera frame (drop stale frames)
2  Pose Landmarker -> 33 landmarks (x,y,z,visibility) + person mask
3  Segmenter -> clothes mask, skin mask, hair mask, background mask
4  Smooth landmarks (One Euro filter), compute confidence
5  Estimate body orientation (yaw) and facing (front/back)
6  Choose garment view (front / back / side blend) from yaw
7  Build/update garment skinned mesh from landmarks
8  Compute layer order and occlusion masks (arms/hands in front)
9  Hide old clothing (fill layer)
10 Composite: video -> fill -> garment -> foreground limbs/hands -> output
11 Update FPS controller, telemetry (aggregate only)
```

Target total budget per frame at 30 FPS = 33 ms: inference <= 18 ms (GPU), mesh+layering <= 3 ms CPU, render <= 6 ms GPU.

## 3. Body model from landmarks

Use MediaPipe pose landmarks. Key points: shoulders (11, 12), elbows (13, 14), wrists (15, 16), hips (23, 24), nose (0), ears (7, 8), eyes (2, 5).

Derived quantities (all smoothed):
- `shoulderMid`, `hipMid`, `torsoVec = hipMid - shoulderMid`, `torsoLength`.
- `shoulderWidth = |L_shoulder - R_shoulder|` in image space.
- Torso rotation in image plane: angle of shoulder line.
- Body scale `s = shoulderWidth` (normalized by camera distance automatically).

## 4. Garment rig

For each garment keypoint set define **bones**:

- Torso bone: from garment `neck_center` to garment `hem_center`, with width bones at shoulder and hem.
- Left/right sleeve bones: from garment shoulder keypoint to sleeve end midpoint. For long sleeves, two segments (shoulder-elbow, elbow-wrist) matching the body's upper and lower arm.

Mapping:
- Garment shoulder keypoints -> body shoulder landmarks, with a small outward offset (garment shoulder seam sits slightly outside the joint; start with 6% of shoulderWidth, tune).
- Garment sleeve end -> along the body upper arm (short sleeves) or forearm (long sleeves) at a distance proportional to garment sleeve-length ratio, **not** forced to the body's wrist. This keeps the true sleeve length visible.
- Garment hem -> placed below shoulders at distance `garmentLengthRatio * torsoLength` where `garmentLengthRatio = garment (neck-to-hem length) / garment (shoulder width)` scaled by body shoulder width. The garment keeps its true proportions; a long kurta will correctly hang past the hips.
- Garment width at hem follows the body torso width plus a garment-specific ease measured from the image (loose shirts stay loose).

Skinning:
- Triangulate the garment cut-out into a mesh (approx 400-800 triangles, grid + contour vertices).
- Compute per-vertex weights to bones (distance-based softmax, normalized). Linear blend skinning in a vertex shader.
- Precompute weights at asset load, not per frame.

## 5. Orientation, turning, and back view

Estimate yaw `theta` (degrees; 0 = facing camera, +/- 90 = side, 180 = facing away).

Signals:
1. Ratio `shoulderWidth_observed / shoulderWidth_reference` approximates `|cos(theta)|` (reference captured during the first stable front-facing frames, or from torso length ratio).
2. Landmark z-difference between left and right shoulders gives the sign of rotation (verify empirically; document reliability).
3. Facing detection: face landmarks (nose, eyes, ears) visibility. Face visible -> front hemisphere; face not visible and ears/shoulders visible -> back hemisphere.

Behavior:

| Yaw range | Rendering |
|---|---|
| 0 to +/- 35 | Front image, horizontally compressed by about `cos(theta)` with perspective-like skew, normal rendering |
| 35 to 75 | If a `side` image exists: cross-fade front -> side. Otherwise: front image compressed further with edge darkening and sleeve occlusion cues; mark quality "reduced" |
| 75 to 105 | Edge-on: if side image exists show it; otherwise show a thin silhouette from the compressed front with fade-out to avoid an obviously wrong sheet-like look |
| 105 to 180 | Back image if available (with its own keypoints). If not available, show a back fallback: mirrored front with neckline raised, flagged "estimated back" and a small on-screen note ("Back view estimated") |

Cross-fades must be time-smoothed (150-250 ms) to avoid popping. Hysteresis of 8 degrees to prevent flicker at thresholds.

**Honest limit:** with only front/back product photos, side and diagonal views are approximations. Full-fidelity turning requires 3D garment assets (Tier 2, see section 10).

## 6. Hands and occlusion ("touching the outfit")

Goal: when the hands/arms are in front of the torso, they appear on top of the garment.

Layering:
1. Base: live video.
2. Fill layer: hides old clothing.
3. Garment layer: skinned mesh.
4. Foreground limb layer: arm/hand pixels drawn **over** the garment where the limb is in front.

Deciding "limb in front":
- Use pose z (depth) per wrist/elbow relative to shoulders/hips: if wrist z is less than torso z by a margin (closer to the camera), treat the forearm/hand as foreground.
- Use skin mask (hand and forearm skin pixels) intersected with a dilated region around the wrist-elbow segment. If the sleeve is short, the garment sleeve covers the upper arm but the exposed forearm and hand are foreground.
- For long sleeves, the forearm region is covered by the garment sleeve; only the hand (skin pixels beyond the sleeve end) is foreground.
- When the arm is raised above the shoulder or to the side (not overlapping the torso), no special handling is required; the garment sleeve follows the arm bones.

Smoothing: temporal filter on the foreground mask (EMA with alpha 0.6) and feathered edges (2-3 px) to avoid shimmering.

Optional (M4): Hand Landmarker for finer finger boundaries.

**Honest limit:** the cloth does not wrinkle or deform when touched; it simply appears under the hand. No physics in Tier 1.

## 7. Hiding the old clothing

Inputs: clothes mask (from multiclass segmentation), skin mask, background estimate.

Strategy (implement in this order, measure each):
1. **Cover first:** render the new garment slightly larger than the body's current clothes silhouette when plausible (limited, to avoid distorting the look), so the new garment covers most of the old one.
2. **Fill leftover clothes pixels** (old-clothes pixels not covered by the new garment):
   a. Classify by neighbors: if neighbors are mostly background -> sample background color from nearby background pixels with blur fill.
   b. If neighbors are mostly skin (e.g., switching from long sleeve to short sleeve) -> fill with locally sampled skin tone, with subtle shading gradient and edge feathering.
3. **Optional** background plate: during the first seconds, if the user stays still, build a background model of the non-person area to improve fill (do not require this from the user).
4. Never leave the old clothes' print/colors visible through the new garment. The garment layer is fully opaque inside its mask.

Document artifacts and measure the "old clothes visible" pixel rate on fixtures.

**Honest limit:** switching from a bulkier outfit to a smaller one (hoodie -> sleeveless) exposes body areas that must be invented; expect visible artifacts. Use feathering and subtle blur; never claim photorealism.

## 8. Shading and visual blending

- Match garment brightness to the scene: compute the mean luminance of the person's torso region (non-clothes, e.g., face/skin) vs the garment's stored `meanLuminance`; apply a gentle gain (clamped 0.8-1.2).
- Add a soft shading pass: multiply garment by a low-frequency lighting map derived from the video's luminance gradient across the torso (optional, behind a quality tier).
- Edge feathering 1-2 px, subtle contact shadow near the neck and under the arms (small, tunable).
- Temporal stabilization: One Euro filter on all rig parameters; clamp per-frame mesh vertex displacement to avoid jitter spikes.

## 9. Failure handling

| Condition | Behavior |
|---|---|
| Landmark confidence < 0.5 for 5 frames | Fade garment out in 300 ms, show hint |
| Pose jump (teleport) > threshold | Reset smoothing state |
| Torso partially out of frame | Show garment only for visible part if shoulders visible; else hint |
| Very fast motion | Keep last-good mesh up to 100 ms, then fade |
| FPS drop | Adaptive tier step-down (see `02_TECHNICAL_SPEC.md`) |

## 10. Tier 2: 3D garments (future, for full 360 turning and cloth motion)

- Garment as rigged GLB with simple cloth simulation or secondary-motion bones.
- 3D body pose from pose world landmarks (and optionally a body mesh model) to drive the rig.
- Assets from 3D scanning, CLO3D/Browzwear exports, or experimental image-to-3D (treat as unreliable).
- Premium plan for shops that supply 3D assets. Do not start before Tier 1 pilot results.

## 11. Acceptance criteria (rendering)

| ID | Criterion | Measure |
|---|---|---|
| R-1 | Live FPS on mid-range Android | >= 24 median, >= 18 p5 over a 60 s session |
| R-2 | Garment follows torso motion | Mean landmark-to-garment-anchor error <= 3% of shoulder width on fixture videos |
| R-3 | Jitter at rest | Garment anchor jitter <= 1 px RMS when the person stands still |
| R-4 | Hands in front of garment | On the "hands-over-chest" fixture, >= 95% of hand pixels render above the garment |
| R-5 | Yaw coverage | Smooth garment behavior through +/- 75 deg without popping; back view switches with hysteresis |
| R-6 | Old clothes visible through garment | <= 1% of garment area on front-facing fixtures |
| R-7 | Pose loss recovery | Garment reappears within 300 ms of landmark reacquisition |
| R-8 | Stranger test | 5 of 8 untested people say the result is "believable enough to help me decide" (M0/M1 gate) |

R-8 is the product gate. If it fails, stop and report options (improve visuals, move to Tier 2, or reconsider scope).
