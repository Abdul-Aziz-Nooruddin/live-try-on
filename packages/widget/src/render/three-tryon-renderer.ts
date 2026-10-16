import * as THREE from 'three';
import type { TorsoRigState } from '@livetry/tryon-core';

export class ThreeTryonRenderer {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;

  private width = 640;
  private height = 480;

  // 3D Garment Group
  private garmentGroup: THREE.Group;
  private torsoMesh: THREE.Mesh | null = null;
  private shoulderYokeMesh: THREE.Mesh | null = null;
  private leftSleeveMesh: THREE.Mesh | null = null;
  private rightSleeveMesh: THREE.Mesh | null = null;
  private collarMesh: THREE.Mesh | null = null;
  private fabricMaterial: THREE.MeshStandardMaterial;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.width = canvas.width || 640;
    this.height = canvas.height || 480;

    // 1. WebGL Renderer with full alpha transparency so camera video underneath shines through
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0); // 100% transparent background

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
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambient);

    // Key light: angled from front-right above to highlight chest curvature and collar
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
    keyLight.position.set(150, 250, 300);
    this.scene.add(keyLight);

    // Fill light: soft fill from left
    const fillLight = new THREE.DirectionalLight(0xf0ede6, 0.45);
    fillLight.position.set(-150, -80, 200);
    this.scene.add(fillLight);

    // 4. Heavyweight Matte Cotton PBR Material
    this.fabricMaterial = new THREE.MeshStandardMaterial({
      color: 0x232427, // Editorial Deep Charcoal
      roughness: 0.86,
      metalness: 0.03,
      side: THREE.DoubleSide
    });

    this.garmentGroup = new THREE.Group();
    this.scene.add(this.garmentGroup);

    this.build3DGarment();
  }

  private build3DGarment(): void {
    // 1. Main Torso (Chest down to hips): 3D curved elliptical volume
    const torsoGeom = new THREE.CylinderGeometry(0.5, 0.48, 1.0, 36, 16, false);
    torsoGeom.scale(1.0, 1.0, 0.58);
    this.torsoMesh = new THREE.Mesh(torsoGeom, this.fabricMaterial);
    this.garmentGroup.add(this.torsoMesh);

    // 2. Shoulder Yoke: solid curved volume covering clavicles, shoulder line & trapezius
    // This ensures NO gaps on top of shoulders, completely concealing underlying shirts/collars
    const yokeGeom = new THREE.SphereGeometry(0.5, 32, 16);
    yokeGeom.scale(1.0, 0.35, 0.55);
    this.shoulderYokeMesh = new THREE.Mesh(yokeGeom, this.fabricMaterial);
    this.garmentGroup.add(this.shoulderYokeMesh);

    // 3. Left Sleeve: 3D tapered cylinder with volume
    const sleeveGeomL = new THREE.CylinderGeometry(0.24, 0.19, 1.0, 24, 8, false);
    sleeveGeomL.scale(1.0, 1.0, 0.75);
    this.leftSleeveMesh = new THREE.Mesh(sleeveGeomL, this.fabricMaterial);
    this.garmentGroup.add(this.leftSleeveMesh);

    // 4. Right Sleeve: 3D tapered cylinder with volume
    const sleeveGeomR = new THREE.CylinderGeometry(0.24, 0.19, 1.0, 24, 8, false);
    sleeveGeomR.scale(1.0, 1.0, 0.75);
    this.rightSleeveMesh = new THREE.Mesh(sleeveGeomR, this.fabricMaterial);
    this.garmentGroup.add(this.rightSleeveMesh);

    // 5. Ribbed Crewneck Collar: raised torus sitting snugly around base of throat
    const collarGeom = new THREE.TorusGeometry(0.22, 0.042, 16, 40);
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0x1f2022,
      roughness: 0.92,
      metalness: 0.02
    });
    this.collarMesh = new THREE.Mesh(collarGeom, collarMat);
    this.collarMesh.rotation.x = Math.PI / 2;
    this.garmentGroup.add(this.collarMesh);
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
    if (!rig || opacity <= 0.01) {
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

    const neck_x = this.toPixelX(rig.neckBase[0]);
    const neck_y = this.toPixelY(rig.neckBase[1]);

    const hip_x = this.toPixelX(rig.hipMid[0]);
    const hip_y = this.toPixelY(rig.hipMid[1]);

    const elbL_x = this.toPixelX(rig.elbowLeft[0]);
    const elbL_y = this.toPixelY(rig.elbowLeft[1]);

    const elbR_x = this.toPixelX(rig.elbowRight[0]);
    const elbR_y = this.toPixelY(rig.elbowRight[1]);

    const shWidth = Math.hypot(shR_x - shL_x, shR_y - shL_y);
    const torsoHeight = Math.hypot(hip_x - shMid_x, hip_y - shMid_y);

    const torsoAngle = Math.atan2(hip_y - shMid_y, hip_x - shMid_x) + Math.PI / 2;
    const yawRad = (rig.estimatedYawDeg * Math.PI) / 180;

    // 1. Torso Mesh: 3D curved elliptical cylinder spanning chest to hips
    if (this.torsoMesh) {
      const torsoCenterX = (shMid_x + hip_x) * 0.5;
      const torsoCenterY = (neck_y + hip_y) * 0.5;

      this.torsoMesh.position.set(torsoCenterX, torsoCenterY, 30);

      const tWidth = shWidth * 1.22;
      const tHeight = Math.max(torsoHeight * 1.28, shWidth * 1.35);
      const tDepth = shWidth * 0.56;
      this.torsoMesh.scale.set(tWidth, tHeight, tDepth);

      this.torsoMesh.rotation.set(0, yawRad, torsoAngle);
    }

    // 2. Shoulder Yoke: sits right across the clavicles/trapezius to cover underlying collar & shirts
    if (this.shoulderYokeMesh) {
      const yokeX = (shMid_x + neck_x) * 0.5;
      const yokeY = (shMid_y + neck_y) * 0.5;

      this.shoulderYokeMesh.position.set(yokeX, yokeY, 35);
      const yokeWidth = shWidth * 1.32;
      const yokeHeight = shWidth * 0.42;
      const yokeDepth = shWidth * 0.58;
      this.shoulderYokeMesh.scale.set(yokeWidth, yokeHeight, yokeDepth);
      this.shoulderYokeMesh.rotation.set(0, yawRad, torsoAngle);
    }

    // 3. Crewneck Collar: sits high around the suprasternal notch & base of throat
    if (this.collarMesh) {
      this.collarMesh.position.set(neck_x, neck_y, 45);
      const collarRadius = shWidth * 0.72;
      this.collarMesh.scale.set(collarRadius, collarRadius * 0.68, collarRadius);
      this.collarMesh.rotation.set(Math.PI / 2 - 0.12, yawRad, torsoAngle);
    }

    // 4. Left Sleeve: connects screen-left shoulder to elbow
    if (this.leftSleeveMesh) {
      const armDx = elbL_x - shL_x;
      const armDy = elbL_y - shL_y;
      const armLen = Math.hypot(armDx, armDy);
      const armAngle = Math.atan2(armDy, armDx) + Math.PI / 2;

      const sleeveLength = Math.max(armLen * 0.68, shWidth * 0.58);
      const sleeveCenterX = shL_x + armDx * 0.35;
      const sleeveCenterY = shL_y + armDy * 0.35;

      this.leftSleeveMesh.position.set(sleeveCenterX, sleeveCenterY, 32);
      const sleeveRadius = shWidth * 0.42;
      this.leftSleeveMesh.scale.set(sleeveRadius, sleeveLength, sleeveRadius * 0.76);
      this.leftSleeveMesh.rotation.set(0, yawRad, armAngle);
    }

    // 5. Right Sleeve: connects screen-right shoulder to elbow
    if (this.rightSleeveMesh) {
      const armDx = elbR_x - shR_x;
      const armDy = elbR_y - shR_y;
      const armLen = Math.hypot(armDx, armDy);
      const armAngle = Math.atan2(armDy, armDx) + Math.PI / 2;

      const sleeveLength = Math.max(armLen * 0.68, shWidth * 0.58);
      const sleeveCenterX = shR_x + armDx * 0.35;
      const sleeveCenterY = shR_y + armDy * 0.35;

      this.rightSleeveMesh.position.set(sleeveCenterX, sleeveCenterY, 32);
      const sleeveRadius = shWidth * 0.42;
      this.rightSleeveMesh.scale.set(sleeveRadius, sleeveLength, sleeveRadius * 0.76);
      this.rightSleeveMesh.rotation.set(0, yawRad, armAngle);
    }

    this.fabricMaterial.opacity = opacity;
    this.fabricMaterial.transparent = opacity < 0.99;
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.renderer.dispose();
    this.fabricMaterial.dispose();
  }
}
