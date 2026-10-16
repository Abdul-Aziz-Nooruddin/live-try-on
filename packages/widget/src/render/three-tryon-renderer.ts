import * as THREE from 'three';
import type { TorsoRigState } from '@livetry/tryon-core';

export class ThreeTryonRenderer {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;

  private width = 640;
  private height = 480;

  // 3D Garment Mesh & Material
  private garmentGroup: THREE.Group;
  private garmentMesh: THREE.Mesh | null = null;
  private garmentGeometry: THREE.PlaneGeometry | null = null;
  private garmentTexture: THREE.Texture | null = null;
  private fabricMaterial: THREE.MeshStandardMaterial;

  private readonly gridCols = 32;
  private readonly gridRows = 40;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.width = canvas.width || 640;
    this.height = canvas.height || 480;

    // 1. WebGL Renderer with alpha transparency so live camera shines through underneath
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    // 2. Pixel-Space Orthographic Camera (center at 0, 0)
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(
      -this.width / 2,
      this.width / 2,
      this.height / 2,
      -this.height / 2,
      0.1,
      2000
    );
    this.camera.position.set(0, 0, 500);
    this.camera.lookAt(0, 0, 0);

    // 3. Editorial Studio Lighting for 3D Fabric Volume & Folds
    const ambient = new THREE.AmbientLight(0xffffff, 1.3);
    this.scene.add(ambient);

    // Key light: angled from front-right above to highlight chest curvature and collar
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.7);
    keyLight.position.set(100, 200, 300);
    this.scene.add(keyLight);

    // Soft fill from opposite side
    const fillLight = new THREE.DirectionalLight(0xf5f3ee, 0.4);
    fillLight.position.set(-100, -50, 200);
    this.scene.add(fillLight);

    // 4. Load the Photorealistic Editorial Garment Texture
    const textureLoader = new THREE.TextureLoader();
    this.garmentTexture = textureLoader.load('/fixtures/sample-tshirt.png');
    this.garmentTexture.colorSpace = THREE.SRGBColorSpace;
    this.garmentTexture.generateMipmaps = true;
    this.garmentTexture.minFilter = THREE.LinearMipmapLinearFilter;
    this.garmentTexture.magFilter = THREE.LinearFilter;

    // 5. Heavyweight Matte Cotton Material with PBR Lighting
    this.fabricMaterial = new THREE.MeshStandardMaterial({
      map: this.garmentTexture,
      transparent: true,
      alphaTest: 0.05,
      roughness: 0.88,
      metalness: 0.02,
      side: THREE.DoubleSide
    });

    this.garmentGroup = new THREE.Group();
    this.scene.add(this.garmentGroup);

    this.build3DGarment();
  }

  private build3DGarment(): void {
    // 32 x 40 grid mesh allowing smooth 3D organic skinning across chest, sleeves, and collar
    this.garmentGeometry = new THREE.PlaneGeometry(1, 1, this.gridCols, this.gridRows);
    this.garmentMesh = new THREE.Mesh(this.garmentGeometry, this.fabricMaterial);
    this.garmentGroup.add(this.garmentMesh);
  }

  public resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;
    this.width = width;
    this.height = height;

    this.renderer.setSize(width, height, false);

    this.camera.left = -width / 2;
    this.camera.right = width / 2;
    this.camera.top = height / 2;
    this.camera.bottom = -height / 2;
    this.camera.updateProjectionMatrix();
  }

  // Convert normalized [0..1] coordinates to pixel coordinates with center at (0, 0)
  private toPixelX(normX: number): number {
    return (normX - 0.5) * this.width;
  }

  private toPixelY(normY: number): number {
    // Invert Y because Three.js +Y is up, while screen +Y is down
    return (0.5 - normY) * this.height;
  }

  public update3DPose(rig: TorsoRigState | null, opacity = 1.0): void {
    if (!rig || opacity <= 0.01 || !this.garmentGeometry) {
      this.garmentGroup.visible = false;
      return;
    }

    this.garmentGroup.visible = true;

    // Convert rig points to pixel coordinates
    const shL_x = this.toPixelX(rig.shoulderLeft[0]);
    const shL_y = this.toPixelY(rig.shoulderLeft[1]);

    const shR_x = this.toPixelX(rig.shoulderRight[0]);
    const shR_y = this.toPixelY(rig.shoulderRight[1]);

    const shMid_x = this.toPixelX(rig.shoulderMid[0]);
    const shMid_y = this.toPixelY(rig.shoulderMid[1]);

    // Position collar at base of throat to mask underlying shirts/collars
    const neck_x = this.toPixelX(rig.neckBase[0]);
    const neck_y = this.toPixelY(rig.neckBase[1]);

    const hip_x = this.toPixelX(rig.hipMid[0]);
    const hip_y = this.toPixelY(rig.hipMid[1]);

    const elbL_x = this.toPixelX(rig.elbowLeft[0]);
    const elbL_y = this.toPixelY(rig.elbowLeft[1]);

    const elbR_x = this.toPixelX(rig.elbowRight[0]);
    const elbR_y = this.toPixelY(rig.elbowRight[1]);

    const shDx = shR_x - shL_x;
    const shDy = shR_y - shL_y;
    const shWidth = Math.hypot(shDx, shDy);

    const shUnitX = shDx / (shWidth || 1);
    const shUnitY = shDy / (shWidth || 1);

    // Spine vector (from neck down to hips)
    const spineDx = hip_x - neck_x;
    const spineDy = hip_y - neck_y;
    const spineLen = Math.hypot(spineDx, spineDy);
    const spineUnitX = spineDx / (spineLen || 1);
    const spineUnitY = spineDy / (spineLen || 1);

    // Left and right arm vectors (shoulder to elbow)
    const armL_dx = elbL_x - shL_x;
    const armL_dy = elbL_y - shL_y;
    const armL_len = Math.hypot(armL_dx, armL_dy);
    const armL_unitX = armL_dx / (armL_len || 1);
    const armL_unitY = armL_dy / (armL_len || 1);

    const armR_dx = elbR_x - shR_x;
    const armR_dy = elbR_y - shR_y;
    const armR_len = Math.hypot(armR_dx, armR_dy);
    const armR_unitX = armR_dx / (armR_len || 1);
    const armR_unitY = armR_dy / (armR_len || 1);

    const yawRad = (rig.estimatedYawDeg * Math.PI) / 180;
    const cosYaw = Math.cos(yawRad);
    const sinYaw = Math.sin(yawRad);

    const posAttr = this.garmentGeometry.attributes.position;
    const cols = this.gridCols;
    const rows = this.gridRows;

    // Torso center for 3D yaw pivot
    const centerX = (shMid_x + hip_x) * 0.5;
    const centerY = (neck_y + hip_y) * 0.5;

    // Deform the 3D surface vertices according to the body rig
    let vIdx = 0;
    for (let r = 0; r <= rows; r++) {
      const v = r / rows; // 0 = collar/shoulders, 1 = hem

      // Base spine anchor at height fraction v
      const torsoYLen = Math.max(spineLen * 1.25, shWidth * 1.35);
      const curSpineX = neck_x + spineUnitX * (v * torsoYLen);
      const curSpineY = neck_y + spineUnitY * (v * torsoYLen);

      // Torso half-width at this height (editorial boxy cut)
      const halfWidth = (shWidth * 0.5) * 1.22;

      for (let c = 0; c <= cols; c++) {
        const u = c / cols; // 0 = left sleeve, 0.5 = center, 1 = right sleeve

        let px: number;
        let py: number;

        if (u < 0.22) {
          // --- Left Sleeve ---
          // Fraction along the sleeve from shoulder seam to cuff
          const tSleeve = (0.22 - u) / 0.22; // 0 at shoulder, 1 at cuff
          const sleeveReach = Math.max(armL_len * 0.72, shWidth * 0.55);

          // Position along left arm vector
          const alongArmX = shL_x + armL_unitX * (tSleeve * sleeveReach);
          const alongArmY = shL_y + armL_unitY * (tSleeve * sleeveReach);

          // Sleeve thickness perpendicular to arm
          const sleevePerpX = -armL_unitY;
          const sleevePerpY = armL_unitX;
          const sleeveWidth = shWidth * 0.38 * (1.0 - tSleeve * 0.15);
          const sleeveOffset = (v - 0.25) * sleeveWidth;

          px = alongArmX + sleevePerpX * sleeveOffset;
          py = alongArmY + sleevePerpY * sleeveOffset;
        } else if (u > 0.78) {
          // --- Right Sleeve ---
          const tSleeve = (u - 0.78) / 0.22; // 0 at shoulder, 1 at cuff
          const sleeveReach = Math.max(armR_len * 0.72, shWidth * 0.55);

          const alongArmX = shR_x + armR_unitX * (tSleeve * sleeveReach);
          const alongArmY = shR_y + armR_unitY * (tSleeve * sleeveReach);

          const sleevePerpX = armR_unitY;
          const sleevePerpY = -armR_unitX;
          const sleeveWidth = shWidth * 0.38 * (1.0 - tSleeve * 0.15);
          const sleeveOffset = (v - 0.25) * sleeveWidth;

          px = alongArmX + sleevePerpX * sleeveOffset;
          py = alongArmY + sleevePerpY * sleeveOffset;
        } else {
          // --- Main Torso & Shoulders ---
          // Normalized horizontal position across torso: -1 (left) to +1 (right)
          const s = (u - 0.5) / 0.28; // in [-1..1]
          px = curSpineX + shUnitX * (s * halfWidth);
          py = curSpineY + shUnitY * (s * halfWidth);

          // Shoulder slope at top row (clavicle line connecting neck to shoulder joints)
          if (v < 0.2) {
            const slopeFactor = (0.2 - v) / 0.2;
            const trapSlope = Math.abs(s) * (shWidth * 0.12) * slopeFactor;
            px += spineUnitX * trapSlope;
            py += spineUnitY * trapSlope;
          }
        }

        // --- 3D Depth (Z-axis) & Chest Volume Curvature ---
        // Chest profile curves outward along +Z (peaks around mid-chest, v ~ 0.35)
        const vChest = Math.sin(Math.min(v * 1.8, 1.0) * Math.PI);
        // Lateral curve: peaks at center u = 0.5, wraps around ribcage at sides
        const uCurvature = Math.cos((u - 0.5) * Math.PI);
        const depthZ = (shWidth * 0.24) * vChest * Math.max(uCurvature, 0);

        // --- 3D Yaw Rotation around Torso Spine Axis ---
        const relX = px - centerX;
        const rotatedX = centerX + relX * cosYaw - depthZ * sinYaw;
        const rotatedZ = relX * sinYaw + depthZ * cosYaw + 40; // in front of camera feed

        posAttr.setXYZ(vIdx, rotatedX, py, rotatedZ);
        vIdx++;
      }
    }

    posAttr.needsUpdate = true;
    this.garmentGeometry.computeVertexNormals();

    this.fabricMaterial.opacity = opacity;
    this.fabricMaterial.transparent = opacity < 0.99;
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.renderer.dispose();
    this.fabricMaterial.dispose();
    this.garmentTexture?.dispose();
    this.garmentGeometry?.dispose();
  }
}
