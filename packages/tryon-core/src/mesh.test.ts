import { describe, it, expect } from 'vitest';
import { generateGarmentMesh } from './mesh.js';
import type { GarmentKeypointsFront } from '@livetry/shared-types';

describe('generateGarmentMesh', () => {
  const sampleKeypoints: GarmentKeypointsFront = {
    neck_left: [0.42, 0.08],
    neck_right: [0.58, 0.08],
    neck_center_bottom: [0.50, 0.16],
    shoulder_left: [0.24, 0.12],
    shoulder_right: [0.76, 0.12],
    sleeve_left_end_top: [0.06, 0.28],
    sleeve_left_end_bottom: [0.18, 0.38],
    sleeve_right_end_top: [0.94, 0.28],
    sleeve_right_end_bottom: [0.82, 0.38],
    armpit_left: [0.26, 0.36],
    armpit_right: [0.74, 0.36],
    hem_left: [0.28, 0.95],
    hem_right: [0.72, 0.95],
    hem_center: [0.50, 0.95]
  };

  it('generates a valid indexed triangle mesh with normalized skinning weights', () => {
    const mesh = generateGarmentMesh(sampleKeypoints, { gridCols: 4, gridRows: 4 });

    // Grid (4 cols, 4 rows) => 25 vertices, 16 quads => 32 triangles (96 indices)
    expect(mesh.vertexCount).toBe(25);
    expect(mesh.triangleCount).toBe(32);
    expect(mesh.indices.length).toBe(96);

    // Verify bone weights sum to 1.0 for every vertex
    for (let i = 0; i < mesh.vertexCount; i++) {
      const w0 = mesh.boneWeights[i * 4];
      const w1 = mesh.boneWeights[i * 4 + 1];
      const w2 = mesh.boneWeights[i * 4 + 2];
      const w3 = mesh.boneWeights[i * 4 + 3];
      const sum = (w0 ?? 0) + (w1 ?? 0) + (w2 ?? 0) + (w3 ?? 0);
      expect(sum).toBeCloseTo(1.0, 4);
    }
  });
});
