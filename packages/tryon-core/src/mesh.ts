import type { GarmentKeypointsFront } from '@livetry/shared-types';

export interface GarmentMeshData {
  vertexCount: number;
  triangleCount: number;
  positions: Float32Array;   // (u, v) in [0..1]
  texCoords: Float32Array;   // (u, v) texture coords
  boneWeights: Float32Array; // 4 bone weights per vertex [wTorso, wLeftSleeve, wRightSleeve, wHem]
  indices: Uint16Array;      // 3 indices per triangle
}

export interface MeshGridConfig {
  gridCols?: number; // default 16
  gridRows?: number; // default 20
}

export function generateGarmentMesh(
  keypoints: GarmentKeypointsFront,
  config: MeshGridConfig = {}
): GarmentMeshData {
  const cols = config.gridCols ?? 16;
  const rows = config.gridRows ?? 20;

  const numVertices = (cols + 1) * (rows + 1);
  const numQuads = cols * rows;
  const numTriangles = numQuads * 2;

  const positions = new Float32Array(numVertices * 2);
  const texCoords = new Float32Array(numVertices * 2);
  const boneWeights = new Float32Array(numVertices * 4);
  const indices = new Uint16Array(numTriangles * 3);

  // Keypoint reference anchors in normalized garment space [0..1]
  const neckCenter: [number, number] = [
    (keypoints.neck_left[0] + keypoints.neck_right[0]) * 0.5,
    (keypoints.neck_left[1] + keypoints.neck_right[1]) * 0.5
  ];
  const hemCenter: [number, number] = [keypoints.hem_center[0], keypoints.hem_center[1]];
  const lSleeve: [number, number] = [keypoints.sleeve_left_end_top[0], keypoints.sleeve_left_end_top[1]];
  const rSleeve: [number, number] = [keypoints.sleeve_right_end_top[0], keypoints.sleeve_right_end_top[1]];

  let vIdx = 0;
  for (let r = 0; r <= rows; r++) {
    const v = r / rows;
    for (let c = 0; c <= cols; c++) {
      const u = c / cols;

      positions[vIdx * 2] = u;
      positions[vIdx * 2 + 1] = v;
      texCoords[vIdx * 2] = u;
      texCoords[vIdx * 2 + 1] = v;

      // Distance to key bone anchors
      const dTorso = distanceToSegment(u, v, neckCenter[0], neckCenter[1], hemCenter[0], hemCenter[1]);
      const dLeftSleeve = distanceSq(u, v, lSleeve[0], lSleeve[1]);
      const dRightSleeve = distanceSq(u, v, rSleeve[0], rSleeve[1]);
      const dHem = distanceSq(u, v, hemCenter[0], hemCenter[1]);

      // Softmax skinning weights
      const k = 12.0;
      const expTorso = Math.exp(-k * dTorso);
      const expLeft = Math.exp(-k * Math.sqrt(dLeftSleeve));
      const expRight = Math.exp(-k * Math.sqrt(dRightSleeve));
      const expHem = Math.exp(-k * Math.sqrt(dHem));

      const sumExp = expTorso + expLeft + expRight + expHem;
      boneWeights[vIdx * 4] = expTorso / sumExp;
      boneWeights[vIdx * 4 + 1] = expLeft / sumExp;
      boneWeights[vIdx * 4 + 2] = expRight / sumExp;
      boneWeights[vIdx * 4 + 3] = expHem / sumExp;

      vIdx++;
    }
  }

  // Triangles
  let tIdx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p0 = r * (cols + 1) + c;
      const p1 = p0 + 1;
      const p2 = (r + 1) * (cols + 1) + c;
      const p3 = p2 + 1;

      // First triangle (p0, p2, p1)
      indices[tIdx++] = p0;
      indices[tIdx++] = p2;
      indices[tIdx++] = p1;

      // Second triangle (p1, p2, p3)
      indices[tIdx++] = p1;
      indices[tIdx++] = p2;
      indices[tIdx++] = p3;
    }
  }

  return {
    vertexCount: numVertices,
    triangleCount: numTriangles,
    positions,
    texCoords,
    boneWeights,
    indices
  };
}

function distanceSq(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
}

function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const l2 = distanceSq(x1, y1, x2, y2);
  if (l2 === 0) return Math.sqrt(distanceSq(px, py, x1, y1));

  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  return Math.sqrt(distanceSq(px, py, projX, projY));
}
