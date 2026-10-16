import { OneEuroFilter } from './one-euro-filter.js';

export interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface TorsoRigState {
  shoulderLeft: [number, number];
  shoulderRight: [number, number];
  shoulderMid: [number, number];
  hipMid: [number, number];
  shoulderWidth: number;
  torsoLength: number;
  torsoAngleRad: number;
  estimatedYawDeg: number;
  isFrontFacing: boolean;
  leftArmInFront: boolean;
  rightArmInFront: boolean;
  confidence: number;
}

export interface RigConfig {
  shoulderEaseFraction?: number; // default +6%
  filterMinCutoff?: number;      // OneEuroFilter minCutoff (Hz)
  filterBeta?: number;           // OneEuroFilter beta
}

export class BodyRigTracker {
  private config: Required<RigConfig>;
  // Smoothed filters for key coordinates
  private filterLShoulderX: OneEuroFilter;
  private filterLShoulderY: OneEuroFilter;
  private filterRShoulderX: OneEuroFilter;
  private filterRShoulderY: OneEuroFilter;
  private filterLHipX: OneEuroFilter;
  private filterLHipY: OneEuroFilter;
  private filterRHipX: OneEuroFilter;
  private filterRHipY: OneEuroFilter;
  private baselineShoulderWidth: number | null = null;

  constructor(config: RigConfig = {}) {
    this.config = {
      shoulderEaseFraction: config.shoulderEaseFraction ?? 0.06,
      filterMinCutoff: config.filterMinCutoff ?? 1.2,
      filterBeta: config.filterBeta ?? 0.008
    };

    const fc = { minCutoff: this.config.filterMinCutoff, beta: this.config.filterBeta };
    this.filterLShoulderX = new OneEuroFilter(fc);
    this.filterLShoulderY = new OneEuroFilter(fc);
    this.filterRShoulderX = new OneEuroFilter(fc);
    this.filterRShoulderY = new OneEuroFilter(fc);
    this.filterLHipX = new OneEuroFilter(fc);
    this.filterLHipY = new OneEuroFilter(fc);
    this.filterRHipX = new OneEuroFilter(fc);
    this.filterRHipY = new OneEuroFilter(fc);
  }

  public update(landmarks: LandmarkPoint[], timestampSec: number): TorsoRigState | null {
    // MediaPipe Pose landmarks indices:
    // 0: nose, 7: left ear, 8: right ear
    // 11: left shoulder, 12: right shoulder
    // 13: left elbow, 14: right elbow
    // 15: left wrist, 16: right wrist
    // 23: left hip, 24: right hip
    const lSh = landmarks[11];
    const rSh = landmarks[12];
    const lHip = landmarks[23];
    const rHip = landmarks[24];

    if (!lSh || !rSh || !lHip || !rHip) {
      return null;
    }

    // Filtered coordinates
    const sxL = this.filterLShoulderX.filter(lSh.x, timestampSec);
    const syL = this.filterLShoulderY.filter(lSh.y, timestampSec);
    const sxR = this.filterRShoulderX.filter(rSh.x, timestampSec);
    const syR = this.filterRShoulderY.filter(rSh.y, timestampSec);

    const hxL = this.filterLHipX.filter(lHip.x, timestampSec);
    const hyL = this.filterLHipY.filter(lHip.y, timestampSec);
    const hxR = this.filterRHipX.filter(rHip.x, timestampSec);
    const hyR = this.filterRHipY.filter(rHip.y, timestampSec);

    // Derived geometry
    const dxSh = sxL - sxR;
    const dySh = syL - syR;
    const rawShoulderWidth = Math.sqrt(dxSh * dxSh + dySh * dySh);

    // Ease offset: outwards along shoulder vector
    const ease = this.config.shoulderEaseFraction;
    const easedShoulderLeft: [number, number] = [sxL + dxSh * ease, syL + dySh * ease];
    const easedShoulderRight: [number, number] = [sxR - dxSh * ease, syR - dySh * ease];

    const shoulderMid: [number, number] = [(sxL + sxR) * 0.5, (syL + syR) * 0.5];
    const hipMid: [number, number] = [(hxL + hxR) * 0.5, (hyL + hyR) * 0.5];

    const torsoVecX = hipMid[0] - shoulderMid[0];
    const torsoVecY = hipMid[1] - shoulderMid[1];
    const torsoLength = Math.sqrt(torsoVecX * torsoVecX + torsoVecY * torsoVecY);
    const torsoAngleRad = Math.atan2(dySh, dxSh);

    // Update baseline shoulder width for yaw computation when front-facing
    if (this.baselineShoulderWidth === null || (rawShoulderWidth > this.baselineShoulderWidth && rawShoulderWidth < torsoLength * 1.5)) {
      this.baselineShoulderWidth = rawShoulderWidth;
    }

    // Yaw estimation:
    // Ratio of observed width to reference width approximates |cos(yaw)|
    const cosYaw = Math.min(1.0, Math.max(0.0, rawShoulderWidth / Math.max(this.baselineShoulderWidth, 1e-4)));
    let yawDeg = Math.acos(cosYaw) * (180 / Math.PI);

    // Z-delta between shoulders determines left vs right turn direction
    const lShZ = lSh.z ?? 0;
    const rShZ = rSh.z ?? 0;
    if (lShZ > rShZ) {
      yawDeg = -yawDeg;
    }

    // Facing direction: check nose / ear landmarks
    const nose = landmarks[0];
    const noseVis = nose?.visibility ?? 0;
    const isFrontFacing = noseVis >= 0.4;

    // Occlusion: determine if arms/wrists are in front of torso
    // MediaPipe: lower Z is closer to camera.
    const torsoZ = ((lSh.z ?? 0) + (rSh.z ?? 0) + (lHip.z ?? 0) + (rHip.z ?? 0)) * 0.25;
    const lWrist = landmarks[15];
    const rWrist = landmarks[16];
    const lElbow = landmarks[13];
    const rElbow = landmarks[14];

    // Margin: wrist closer to camera than torso plane
    const zMargin = 0.05;
    const leftArmInFront = ((lWrist?.z ?? 0) < torsoZ - zMargin) || ((lElbow?.z ?? 0) < torsoZ - zMargin);
    const rightArmInFront = ((rWrist?.z ?? 0) < torsoZ - zMargin) || ((rElbow?.z ?? 0) < torsoZ - zMargin);

    const confidence = ((lSh.visibility ?? 1) + (rSh.visibility ?? 1) + (lHip.visibility ?? 1) + (rHip.visibility ?? 1)) * 0.25;

    return {
      shoulderLeft: easedShoulderLeft,
      shoulderRight: easedShoulderRight,
      shoulderMid,
      hipMid,
      shoulderWidth: rawShoulderWidth * (1.0 + 2 * ease),
      torsoLength,
      torsoAngleRad,
      estimatedYawDeg: yawDeg,
      isFrontFacing,
      leftArmInFront,
      rightArmInFront,
      confidence
    };
  }

  public reset(): void {
    this.filterLShoulderX.reset();
    this.filterLShoulderY.reset();
    this.filterRShoulderX.reset();
    this.filterRShoulderY.reset();
    this.filterLHipX.reset();
    this.filterLHipY.reset();
    this.filterRHipX.reset();
    this.filterRHipY.reset();
    this.baselineShoulderWidth = null;
  }
}
