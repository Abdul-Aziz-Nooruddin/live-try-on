import * as THREE from 'three';
import type { TorsoRigState } from '@livetry/tryon-core';

export class ThreeTryonRenderer {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;

  // Background video plane
  private videoTexture: THREE.VideoTexture | null = null;
  private videoMesh: THREE.Mesh | null = null;

  // 3D Garment Mesh Group
  private garmentGroup: THREE.Group;
  private torsoMesh: THREE.Mesh | null = null;
  private leftSleeveMesh: THREE.Mesh | null = null;
  private rightSleeveMesh: THREE.Mesh | null = null;
  private collarMesh: THREE.Mesh | null = null;
  private fabricMaterial: THREE.MeshStandardMaterial;

  // Lights
  private ambientLight: THREE.AmbientLight;
  private dirLight: THREE.DirectionalLight;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // 1. Initialize WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(canvas.width || 640, canvas.height || 480, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // 2. Setup Scene & Orthographic Camera in Normalized Screen Space [0..1]
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, 1, 0, 1, -100, 100);
    this.camera.position.z = 10;

    // 3. Lighting for realistic 3D fabric depth
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 0.65);
    this.dirLight.position.set(0.5, 0.2, 5);
    this.scene.add(this.dirLight);

    // 4. Fabric Material (Rich Matte Charcoal Cotton)
    this.fabricMaterial = new THREE.MeshStandardMaterial({
      color: 0x1c1e22,
      roughness: 0.88,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    this.garmentGroup = new THREE.Group();
    this.scene.add(this.garmentGroup);

    this.initBackgroundPlane();
    this.build3DGarmentGeometry();
  }

  private initBackgroundPlane(): void {
    // Background plane in screen space: x from 0 to 1, y from 0 to 1 (inverted Y in Three.js)
    const geom = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      depthTest: true,
      depthWrite: false
    });
    this.videoMesh = new THREE.Mesh(geom, mat);
    // Position at screen center (0.5, 0.5) and far behind (z = -10)
    this.videoMesh.position.set(0.5, 0.5, -10);
    this.videoMesh.scale.set(1, -1, 1); // Flip Y to match browser coordinates
    this.scene.add(this.videoMesh);
  }

  private build3DGarmentGeometry(): void {
    // 1. Torso 3D Curved Cylinder (front, sides, and back wrapping around chest)
    const torsoGeom = new THREE.CylinderGeometry(
      0.5, // top radius (shoulder/chest level)
      0.48, // bottom radius (hem level)
      1.0, // height
      32, // radial segments
      24, // height segments
      true // open-ended
    );
    // Flatten in Z so it's an ellipse matching human chest cross-section (depth is ~60% of width)
    torsoGeom.scale(1.0, 1.0, 0.55);

    this.torsoMesh = new THREE.Mesh(torsoGeom, this.fabricMaterial);
    this.torsoMesh.castShadow = true;
    this.torsoMesh.receiveShadow = true;
    this.garmentGroup.add(this.torsoMesh);

    // 2. Left Sleeve 3D Cylinder
    const sleeveGeomL = new THREE.CylinderGeometry(0.22, 0.19, 0.45, 20, 10, true);
    sleeveGeomL.scale(1.0, 1.0, 0.7);
    this.leftSleeveMesh = new THREE.Mesh(sleeveGeomL, this.fabricMaterial);
    this.garmentGroup.add(this.leftSleeveMesh);

    // 3. Right Sleeve 3D Cylinder
    const sleeveGeomR = new THREE.CylinderGeometry(0.22, 0.19, 0.45, 20, 10, true);
    sleeveGeomR.scale(1.0, 1.0, 0.7);
    this.rightSleeveMesh = new THREE.Mesh(sleeveGeomR, this.fabricMaterial);
    this.garmentGroup.add(this.rightSleeveMesh);

    // 4. Ribbed Collar Ring
    const collarGeom = new THREE.TorusGeometry(0.18, 0.025, 12, 32);
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0x24272c,
      roughness: 0.92,
      metalness: 0.02
    });
    this.collarMesh = new THREE.Mesh(collarGeom, collarMat);
    this.collarMesh.rotation.x = Math.PI / 2;
    this.garmentGroup.add(this.collarMesh);
  }

  public updateVideo(video: HTMLVideoElement): void {
    if (!this.videoTexture) {
      this.videoTexture = new THREE.VideoTexture(video);
      this.videoTexture.minFilter = THREE.LinearFilter;
      this.videoTexture.magFilter = THREE.LinearFilter;
      this.videoTexture.format = THREE.RGBAFormat;
      // Mirror horizontally so front camera behaves as a real mirror
      this.videoTexture.wrapS = THREE.RepeatWrapping;
      this.videoTexture.repeat.x = -1;
      this.videoTexture.offset.x = 1;

      if (this.videoMesh) {
        (this.videoMesh.material as THREE.MeshBasicMaterial).map = this.videoTexture;
        (this.videoMesh.material as THREE.MeshBasicMaterial).needsUpdate = true;
      }
    }
  }

  public update3DPose(rig: TorsoRigState | null, opacity = 1.0): void {
    if (!rig || opacity <= 0.01) {
      this.garmentGroup.visible = false;
      return;
    }

    this.garmentGroup.visible = true;

    // Rig geometry in normalized screen coordinates [0..1]
    const shL = rig.shoulderLeft;
    const shR = rig.shoulderRight;
    const shMid = rig.shoulderMid;
    const hipMid = rig.hipMid;
    const neckBase = rig.neckBase;
    const elbL = rig.elbowLeft;
    const elbR = rig.elbowRight;

    const shWidth = Math.sqrt(
      Math.pow(shR[0] - shL[0], 2) + Math.pow(shR[1] - shL[1], 2)
    );
    const torsoHeight = Math.sqrt(
      Math.pow(hipMid[0] - shMid[0], 2) + Math.pow(hipMid[1] - shMid[1], 2)
    );

    // Torso rotation angle
    const angleRad = Math.atan2(hipMid[1] - shMid[1], hipMid[0] - shMid[0]) - Math.PI / 2;
    const yawRad = (rig.estimatedYawDeg * Math.PI) / 180;

    // 1. Position and Scale Torso 3D Cylinder
    if (this.torsoMesh) {
      const torsoCenterY = (neckBase[1] + hipMid[1]) * 0.5;
      const torsoCenterX = (shMid[0] + hipMid[0]) * 0.5;

      this.torsoMesh.position.set(torsoCenterX, torsoCenterY, 0.5);

      const tWidth = shWidth * 1.15;
      const tHeight = torsoHeight * 1.28;
      this.torsoMesh.scale.set(tWidth, tHeight, tWidth * 0.5);

      this.torsoMesh.rotation.set(0, yawRad, angleRad);
    }

    // 2. Position & Orient Collar Ring around Neck Base
    if (this.collarMesh) {
      this.collarMesh.position.set(neckBase[0], neckBase[1] - 0.02, 0.6);
      this.collarMesh.scale.set(shWidth * 0.75, shWidth * 0.6, shWidth * 0.75);
      this.collarMesh.rotation.set(Math.PI / 2 - 0.2, yawRad, angleRad);
    }

    // 3. Left Sleeve: connects screen-left shoulder to elbow
    if (this.leftSleeveMesh) {
      const armVecX = elbL[0] - shL[0];
      const armVecY = elbL[1] - shL[1];
      const armLen = Math.sqrt(armVecX * armVecX + armVecY * armVecY);
      const armAngle = Math.atan2(armVecY, armVecX) - Math.PI / 2;

      const sleeveCenterX = shL[0] + armVecX * 0.35;
      const sleeveCenterY = shL[1] + armVecY * 0.35;

      this.leftSleeveMesh.position.set(sleeveCenterX, sleeveCenterY, 0.5);
      const sRadius = shWidth * 0.38;
      const sLength = Math.max(armLen * 0.7, shWidth * 0.65);
      this.leftSleeveMesh.scale.set(sRadius, sLength, sRadius * 0.7);
      this.leftSleeveMesh.rotation.set(0, yawRad, armAngle);
    }

    // 4. Right Sleeve: connects screen-right shoulder to elbow
    if (this.rightSleeveMesh) {
      const armVecX = elbR[0] - shR[0];
      const armVecY = elbR[1] - shR[1];
      const armLen = Math.sqrt(armVecX * armVecX + armVecY * armVecY);
      const armAngle = Math.atan2(armVecY, armVecX) - Math.PI / 2;

      const sleeveCenterX = shR[0] + armVecX * 0.35;
      const sleeveCenterY = shR[1] + armVecY * 0.35;

      this.rightSleeveMesh.position.set(sleeveCenterX, sleeveCenterY, 0.5);
      const sRadius = shWidth * 0.38;
      const sLength = Math.max(armLen * 0.7, shWidth * 0.65);
      this.rightSleeveMesh.scale.set(sRadius, sLength, sRadius * 0.7);
      this.rightSleeveMesh.rotation.set(0, yawRad, armAngle);
    }

    this.fabricMaterial.opacity = opacity;
    this.fabricMaterial.transparent = opacity < 0.99;
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
  }

  public dispose(): void {
    this.renderer.dispose();
    this.fabricMaterial.dispose();
  }
}
