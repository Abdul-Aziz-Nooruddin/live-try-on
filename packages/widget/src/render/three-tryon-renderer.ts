import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { TorsoRigState } from '@livetry/tryon-core';

export class ThreeTryonRenderer {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;

  private width = 640;
  private height = 480;

  // 3D Garment Hierarchy
  private garmentGroup: THREE.Group;
  private garment3D: THREE.Group | null = null;
  private isModelLoaded = false;

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

    // 3. Editorial Studio Lighting to bring out 3D fabric folds and normal maps
    const ambient = new THREE.AmbientLight(0xffffff, 1.4);
    this.scene.add(ambient);

    // Directional key light from front-top-right to sculpt chest curvature and folds
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.95);
    keyLight.position.set(150, 250, 350);
    this.scene.add(keyLight);

    // Soft fill light from front-left
    const fillLight = new THREE.DirectionalLight(0xf5f3ee, 0.55);
    fillLight.position.set(-150, -50, 200);
    this.scene.add(fillLight);

    // Subtle back rim light for silhouette separation
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
    rimLight.position.set(0, 200, -200);
    this.scene.add(rimLight);

    this.garmentGroup = new THREE.Group();
    this.scene.add(this.garmentGroup);

    this.load3DGarmentModel();
  }

  private load3DGarmentModel(): void {
    const loader = new GLTFLoader();
    loader.load(
      '/fixtures/shirt_baked.glb',
      (gltf) => {
        this.garment3D = gltf.scene;

        // Apply high-end editorial charcoal cotton PBR material, preserving normal & AO maps
        this.garment3D.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const origMat = mesh.material as THREE.MeshStandardMaterial;

            mesh.material = new THREE.MeshStandardMaterial({
              color: 0x242528, // Editorial Deep Charcoal Cotton
              roughness: 0.86,
              metalness: 0.02,
              normalMap: origMat?.normalMap ?? null,
              normalScale: new THREE.Vector2(2.0, 2.0),
              aoMap: origMat?.aoMap ?? null,
              aoMapIntensity: 1.3,
              side: THREE.DoubleSide
            });
          }
        });

        this.garmentGroup.add(this.garment3D);
        this.isModelLoaded = true;
      },
      undefined,
      (err) => {
        console.error('[LiveTry] Failed to load 3D garment model:', err);
      }
    );
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
    if (!rig || opacity <= 0.01 || !this.garment3D || !this.isModelLoaded) {
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

    const shDx = shR_x - shL_x;
    const shDy = shR_y - shL_y;
    const shWidth = Math.hypot(shDx, shDy);

    // Torso length from suprasternal notch to mid-hip
    const torsoHeight = Math.hypot(hip_x - neck_x, hip_y - neck_y);

    // Torso 2D roll angle (shoulder tilt)
    const rollAngle = Math.atan2(shDy, shDx);

    // 3D Yaw angle (turning left/right)
    const yawRad = (rig.estimatedYawDeg * Math.PI) / 180;

    // --- 3D Scale Calibration ---
    // The GLB model native bounds:
    // Natural width ~ 0.55m, natural height ~ 0.61m, natural collar Y ~ +0.22m
    const targetWidth = shWidth * 1.32; // Boxy streetwear tailoring
    const scaleX = targetWidth / 0.55;
    const targetHeight = Math.max(torsoHeight * 1.30, shWidth * 1.40);
    const scaleY = targetHeight / 0.61;
    const scaleZ = scaleX * 0.88; // Anatomical torso depth ratio

    this.garment3D.scale.set(scaleX, scaleY, scaleZ);

    // --- 3D Positioning ---
    // In model space, the collar opening is at y ~ +0.22.
    // We anchor the collar exactly at neckBase (suprasternal notch) to cover real collars.
    const collarModelOffsetY = 0.22 * scaleY;

    // Position center of model so collar aligns with neckBase
    const posX = neck_x;
    const posY = neck_y - collarModelOffsetY;
    const posZ = 30; // slightly in front of video plane

    this.garment3D.position.set(posX, posY, posZ);

    // --- 3D Rotations ---
    // Apply yaw (turning) and roll (shoulder slope/tilt)
    this.garment3D.rotation.set(0, yawRad, rollAngle);

    // Material opacity
    this.garment3D.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
        mat.opacity = opacity;
        mat.transparent = opacity < 0.99;
      }
    });
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.renderer.dispose();
  }
}
