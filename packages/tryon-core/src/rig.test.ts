import { describe, it, expect } from 'vitest';
import { BodyRigTracker, type LandmarkPoint } from './rig.js';

describe('BodyRigTracker', () => {
  it('computes accurate shoulder width, torso length, and yaw from landmarks', () => {
    const tracker = new BodyRigTracker({ shoulderEaseFraction: 0.06 });

    // Fixture front-facing landmarks:
    // Shoulders: left (0.6, 0.3), right (0.4, 0.3)
    // Hips: left (0.58, 0.7), right (0.42, 0.7)
    // Wrists behind torso plane
    const landmarks: LandmarkPoint[] = Array(33).fill({ x: 0.5, y: 0.5, z: 0, visibility: 0.9 });
    landmarks[11] = { x: 0.6, y: 0.3, z: -0.05, visibility: 0.99 }; // left shoulder
    landmarks[12] = { x: 0.4, y: 0.3, z: -0.05, visibility: 0.99 }; // right shoulder
    landmarks[23] = { x: 0.58, y: 0.7, z: 0.0, visibility: 0.99 };  // left hip
    landmarks[24] = { x: 0.42, y: 0.7, z: 0.0, visibility: 0.99 };  // right hip
    landmarks[0] = { x: 0.5, y: 0.15, z: -0.1, visibility: 0.99 };   // nose

    const state = tracker.update(landmarks, 0.0);
    expect(state).not.toBeNull();
    if (!state) return;

    // Shoulder width with +6% ease on each side: 0.2 * 1.12 = 0.224
    expect(state.shoulderWidth).toBeCloseTo(0.224, 2);
    expect(state.torsoLength).toBeCloseTo(0.4, 2);
    expect(state.isFrontFacing).toBe(true);
    expect(state.estimatedYawDeg).toBeCloseTo(0, 1);
  });

  it('detects when arms are in front of torso plane', () => {
    const tracker = new BodyRigTracker();
    const landmarks: LandmarkPoint[] = Array(33).fill({ x: 0.5, y: 0.5, z: 0, visibility: 0.9 });
    landmarks[11] = { x: 0.6, y: 0.3, z: 0.1, visibility: 0.99 };
    landmarks[12] = { x: 0.4, y: 0.3, z: 0.1, visibility: 0.99 };
    landmarks[23] = { x: 0.58, y: 0.7, z: 0.1, visibility: 0.99 };
    landmarks[24] = { x: 0.42, y: 0.7, z: 0.1, visibility: 0.99 };

    // Wrists placed in front (z = -0.2, significantly closer than torso z = 0.1)
    landmarks[15] = { x: 0.52, y: 0.4, z: -0.2, visibility: 0.99 }; // left wrist
    landmarks[16] = { x: 0.48, y: 0.4, z: -0.2, visibility: 0.99 }; // right wrist

    const state = tracker.update(landmarks, 0.033);
    expect(state).not.toBeNull();
    expect(state?.leftArmInFront).toBe(true);
    expect(state?.rightArmInFront).toBe(true);
  });
});
