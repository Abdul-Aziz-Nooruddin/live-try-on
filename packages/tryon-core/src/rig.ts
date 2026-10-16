import { OneEuroFilter } from './one-euro-filter.js';

export interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface TorsoRigState {
  shoulderLeft: [number, number];   // Screen left shoulder [x, y] in [0..1]
  shoulderRight: [number, number];  // Screen right shoulder [x, y] in [0..1]
  shoulderMid: [number, number];    // Midpoint of shoulders
  hipMid: [number, number];         // Midpoint of hips
  neckBase: [number, number];       // Suprasternal notch / base of neck
  chin: [number, number];           // Chin anchor
  elbowLeft: [number, number];      // Screen left elbow
  elbowRight: [number, number];     // Screen right elbow
  wristLeft: [number, number];      // Screen left wrist
  wristRight: [number, number];     // Screen right wrist
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
  mirror?: boolean;              // Mirror horizontally for selfie camera
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
  private filterLElbowX: OneEuroFilter;
  private filterLElbowY: OneEuroFilter;
  private filterRElbowX: OneEuroFilter;
  private filterRElbowY: OneEuroFilter;
  private filterLWristX: OneEuroFilter;
  private filterLWristY: OneEuroFilter;
  private filterRWristX: OneEuroFilter;
  private filterRWristY: OneEuroFilter;
  private filterNoseX: OneEuroFilter;
  private filterNoseY: OneEuroFilter;
  private baselineShoulderWidth: number | null = null;

  constructor(config: RigConfig = {}) {
    this.config = {
      shoulderEaseFraction: config.shoulderEaseFraction ?? 0.06,
      filterMinCutoff: config.filterMinCutoff ?? 1.2,
      filterBeta: config.filterBeta ?? 0.008,
      mirror: config.mirror ?? true
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
    this.filterLElbowX = new OneEuroFilter(fc);
    this.filterLElbowY = new OneEuroFilter(fc);
    this.filterRElbowX = new OneEuroFilter(fc);
    this.filterRElbowY = new OneEuroFilter(fc);
    this.filterLWristX = new OneEuroFilter(fc);
    this.filterLWristY = new OneEuroFilter(fc);
    this.filterRWristX = new OneEuroFilter(fc);
    this.filterRWristY = new OneEuroFilter(fc);
    this.filterNoseX = new OneEuroFilter(fc);
    this.filterNoseY = new OneEuroFilter(fc);
  }

  private mapX(rawX: number): number {
    return this.config.mirror ? 1.0 - rawX : rawX;
  }

  public update(landmarks: LandmarkPoint[], timestampSec: number): TorsoRigState | null {
    // MediaPipe Pose landmarks indices:
    // 0: nose, 9: mouth left, 10: mouth right
    // 11: left shoulder (person's anatomical left), 12: right shoulder (person's anatomical right)
    // 13: left elbow, 14: right elbow
    // 15: left wrist, 16: right wrist
    // 23: left hip, 24: right hip
    const rawLSh = landmarks[11];
    const rawRSh = landmarks[12];
    const rawLHip = landmarks[23];
    const rawRHip = landmarks[24];
    const rawNose = landmarks[0];
    const rawLElb = landmarks[13];
    const rawRElb = landmarks[14];

    if (!rawLSh || !rawRSh) {
      return null;
    }

    // When mirrored, the person's anatomical left shoulder (11) appears on screen-left (x < 0.5)
    // and anatomical right shoulder (12) appears on screen-right (x > 0.5).
    const rawX_screenLeft = this.config.mirror ? rawLSh.x : rawRSh.x;
    const rawY_screenLeft = this.config.mirror ? rawLSh.y : rawRSh.y;
    const rawX_screenRight = this.config.mirror ? rawRSh.x : rawLSh.x;
    const rawY_screenRight = this.config.mirror ? rawRSh.y : rawLSh.y;

    const dxShInit = rawX_screenRight - rawX_screenLeft;
    const dyShInit = rawY_screenRight - rawY_screenLeft;
    const initialShWidth = Math.max(0.1, Math.hypot(dxShInit, dyShInit));

    // If hips are out of frame (e.g. user sitting in front of laptop webcam), extrapolate them
    const hasHips = rawLHip && rawRHip && ((rawLHip.visibility ?? 1) > 0.15);
    const estimatedTorsoLen = initialShWidth * 1.25;

    const rawX_hipLeft = hasHips ? (this.config.mirror ? rawLHip.x : rawRHip.x) : rawX_screenLeft;
    const rawY_hipLeft = hasHips ? (this.config.mirror ? rawLHip.y : rawRHip.y) : rawY_screenLeft + estimatedTorsoLen;
    const rawX_hipRight = hasHips ? (this.config.mirror ? rawRHip.x : rawLHip.x) : rawX_screenRight;
    const rawY_hipRight = hasHips ? (this.config.mirror ? rawRHip.y : rawLHip.y) : rawY_screenRight + estimatedTorsoLen;

    const rawX_elbLeft = rawLElb ? (this.config.mirror ? rawLElb.x : rawRElb?.x ?? 0) : 0;
    const rawY_elbLeft = rawLElb ? (this.config.mirror ? rawLElb.y : rawRElb?.y ?? 0) : 0;
    const rawX_elbRight = rawRElb ? (this.config.mirror ? rawRElb.x : rawLElb?.x ?? 0) : 0;
    const rawY_elbRight = rawRElb ? (this.config.mirror ? rawRElb.y : rawLElb?.y ?? 0) : 0;

    const rawLWrist = landmarks[15];
    const rawRWrist = landmarks[16];
    const rawX_wristLeft = rawLWrist ? (this.config.mirror ? rawLWrist.x : rawRWrist?.x ?? 0) : 0;
    const rawY_wristLeft = rawLWrist ? (this.config.mirror ? rawLWrist.y : rawRWrist?.y ?? 0) : 0;
    const rawX_wristRight = rawRWrist ? (this.config.mirror ? rawRWrist.x : rawLWrist?.x ?? 0) : 0;
    const rawY_wristRight = rawRWrist ? (this.config.mirror ? rawRWrist.y : rawLWrist?.y ?? 0) : 0;

    // Apply mirror mapping and One Euro filtering
    const sxL = this.filterLShoulderX.filter(this.mapX(rawX_screenLeft), timestampSec);
    const syL = this.filterLShoulderY.filter(rawY_screenLeft, timestampSec);
    const sxR = this.filterRShoulderX.filter(this.mapX(rawX_screenRight), timestampSec);
    const syR = this.filterRShoulderY.filter(rawY_screenRight, timestampSec);

    const hxL = this.filterLHipX.filter(this.mapX(rawX_hipLeft), timestampSec);
    const hyL = this.filterLHipY.filter(rawY_hipLeft, timestampSec);
    const hxR = this.filterRHipX.filter(this.mapX(rawX_hipRight), timestampSec);
    const hyR = this.filterRHipY.filter(rawY_hipRight, timestampSec);

    const exL = this.filterLElbowX.filter(this.mapX(rawX_elbLeft), timestampSec);
    const eyL = this.filterLElbowY.filter(rawY_elbLeft, timestampSec);
    const exR = this.filterRElbowX.filter(this.mapX(rawX_elbRight), timestampSec);
    const eyR = this.filterRElbowY.filter(rawY_elbRight, timestampSec);

    const wxL = this.filterLWristX.filter(this.mapX(rawX_wristLeft), timestampSec);
    const wyL = this.filterLWristY.filter(rawY_wristLeft, timestampSec);
    const wxR = this.filterRWristX.filter(this.mapX(rawX_wristRight), timestampSec);
    const wyR = this.filterRWristY.filter(rawY_wristRight, timestampSec);

    const noseX = rawNose ? this.filterNoseX.filter(this.mapX(rawNose.x), timestampSec) : (sxL + sxR) * 0.5;
    const noseY = rawNose ? this.filterNoseY.filter(rawNose.y, timestampSec) : Math.min(syL, syR) - 0.2;

    // Derived geometry
    const dxSh = sxR - sxL;
    const dySh = syR - syL;
    const rawShoulderWidth = Math.sqrt(dxSh * dxSh + dySh * dySh);

    // Ease offset: outwards along shoulder vector to sit comfortably over joints
    const ease = this.config.shoulderEaseFraction;
    const easedShoulderLeft: [number, number] = [sxL - dxSh * ease, syL - dySh * ease];
    const easedShoulderRight: [number, number] = [sxR + dxSh * ease, syR + dySh * ease];

    const shoulderMid: [number, number] = [(sxL + sxR) * 0.5, (syL + syR) * 0.5];
    const hipMid: [number, number] = [(hxL + hxR) * 0.5, (hyL + hyR) * 0.5];

    const torsoVecX = hipMid[0] - shoulderMid[0];
    const torsoVecY = hipMid[1] - shoulderMid[1];
    const torsoLength = Math.sqrt(torsoVecX * torsoVecX + torsoVecY * torsoVecY);
    const torsoAngleRad = Math.atan2(dySh, dxSh);

    // Anatomical neck base (suprasternal notch):
    // Located between shoulders and chin, approximately 20% of torsoLength above shoulderMid
    const torsoUnitX = torsoLength > 0.001 ? torsoVecX / torsoLength : 0;
    const torsoUnitY = torsoLength > 0.001 ? torsoVecY / torsoLength : 1;

    const neckBase: [number, number] = [
      shoulderMid[0] - torsoUnitX * (torsoLength * 0.20),
      shoulderMid[1] - torsoUnitY * (torsoLength * 0.20)
    ];

    const chin: [number, number] = [
      (shoulderMid[0] + noseX) * 0.5,
      (shoulderMid[1] + noseY) * 0.5
    ];

    // Update baseline shoulder width for yaw computation when front-facing
    if (this.baselineShoulderWidth === null || (rawShoulderWidth > this.baselineShoulderWidth && rawShoulderWidth < torsoLength * 1.5)) {
      this.baselineShoulderWidth = rawShoulderWidth;
    }

    // Yaw estimation:
    const cosYaw = Math.min(1.0, Math.max(0.0, rawShoulderWidth / Math.max(this.baselineShoulderWidth, 1e-4)));
    let yawDeg = Math.acos(cosYaw) * (180 / Math.PI);

    // Z-delta between shoulders
    const lShZ = rawLSh.z ?? 0;
    const rShZ = rawRSh.z ?? 0;
    if (lShZ > rShZ) {
      yawDeg = -yawDeg;
    }

    const noseVis = rawNose?.visibility ?? 0;
    const isFrontFacing = noseVis >= 0.2 || rawShoulderWidth > 0.12;

    // Occlusion: determine if arms/wrists are in front of torso
    const torsoZ = ((rawLSh.z ?? 0) + (rawRSh.z ?? 0) + (rawLHip?.z ?? 0) + (rawRHip?.z ?? 0)) * 0.25;
    const lWrist = landmarks[15];
    const rWrist = landmarks[16];

    const zMargin = 0.05;
    const leftArmInFront = ((lWrist?.z ?? 0) < torsoZ - zMargin) || ((rawLElb?.z ?? 0) < torsoZ - zMargin);
    const rightArmInFront = ((rWrist?.z ?? 0) < torsoZ - zMargin) || ((rawRElb?.z ?? 0) < torsoZ - zMargin);

    const confidence = ((rawLSh.visibility ?? 1) + (rawRSh.visibility ?? 1) + (rawLHip?.visibility ?? 1) + (rawRHip?.visibility ?? 1)) * 0.25;

    return {
      shoulderLeft: easedShoulderLeft,
      shoulderRight: easedShoulderRight,
      shoulderMid,
      hipMid,
      neckBase,
      chin,
      elbowLeft: [exL, eyL],
      elbowRight: [exR, eyR],
      wristLeft: [wxL, wyL],
      wristRight: [wxR, wyR],
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
    this.filterLElbowX.reset();
    this.filterLElbowY.reset();
    this.filterRElbowX.reset();
    this.filterRElbowY.reset();
    this.filterLWristX.reset();
    this.filterLWristY.reset();
    this.filterRWristX.reset();
    this.filterRWristY.reset();
    this.filterNoseX.reset();
    this.filterNoseY.reset();
    this.baselineShoulderWidth = null;
  }
}
