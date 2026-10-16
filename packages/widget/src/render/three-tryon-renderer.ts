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

  // Anatomical Depth Occluder for Head & Neck
  // This depth mask makes the user's neck and head physically emerge through the collar hole
  private neckOccluder: THREE.Mesh;

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

    // 4. Neck & Head Depth Occluder
    // Writes to depth buffer only (colorWrite: false). The user's neck blocks the back of the shirt,
    // while the front collar renders in front of the chest!
    const occluderGeom = new THREE.CylinderGeometry(1, 1, 1, 32);
    const occluderMat = new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: true
    });
    this.neckOccluder = new THREE.Mesh(occluderGeom, occluderMat);
    this.neckOccluder.renderOrder = 0;
    this.scene.add(this.neckOccluder);

    // 5. 3D Garment Group
    this.garmentGroup = new THREE.Group();
    this.garmentGroup.renderOrder = 1;
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
              side: THREE.FrontSide // FrontSide ensures inner back wall doesn't occlude the wearer
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
      this.neckOccluder.visible = false;
      return;
    }

    this.garmentGroup.visible = true;
    this.neckOccluder.visible = true;

    // Convert rig points to pixel coordinates
    const shL_x = this.toPixelX(rig.shoulderLeft[0]);
    const shL_y = this.toPixelY(rig.shoulderLeft[1]);

    const shR_x = this.toPixelX(rig.shoulderRight[0]);
    const shR_y = this.toPixelY(rig.shoulderRight[1]);

    const shMid_x = this.toPixelX(rig.shoulderMid[0]);
    const shMid_y = this.toPixelY(rig.shoulderMid[1]);

    const neck_x = this.toPixelX(rig.neckBase[0]);
    const neck_y = this.toPixelY(rig.neckBase[1]);

    const chin_x = this.toPixelX(rig.chin[0]);
    const chin_y = this.toPixelY(rig.chin[1]);

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

    // --- 1. Anatomical 3D Scale Calibration ---
    // In shirt_baked.glb:
    // Distance between shoulder seams = 0.447m
    // Total model height = 0.613m
    // Shoulder seam line is at y = +0.182m
    // Collar top is at y = +0.261m
    const scaleX = (shWidth * 1.08) / 0.447;
    const targetHeight = Math.max(torsoHeight * 1.15, shWidth * 1.25);
    const scaleY = targetHeight / 0.613;
    const scaleZ = scaleX * 0.72; // Anthropometric chest-to-width depth ratio

    this.garment3D.scale.set(scaleX, scaleY, scaleZ);

    // --- 2. Precise Anatomical Alignment ---
    // Align the 3D model's shoulder seams (y = +0.182) directly with the body shoulder line (shMid_y)
    const modelShoulderOffsetY = 0.182 * scaleY;
    const posX = shMid_x;
    const posY = shMid_y - modelShoulderOffsetY;
    const posZ = 0; // Centered at body Z plane

    this.garment3D.position.set(posX, posY, posZ);
    this.garment3D.rotation.set(0, yawRad, rollAngle);

    // --- 3. Head & Neck Depth Occluder Positioning ---
    // Sits at the neck from collar base up through chin.
    // Blocks the inside of the shirt so the user's real neck emerges cleanly through the collar!
    const neckRadius = shWidth * 0.22;
    const neckHeight = Math.max(Math.hypot(chin_x - neck_x, chin_y - neck_y) * 1.8, shWidth * 0.45);
    this.neckOccluder.scale.set(neckRadius, neckHeight, neckRadius);

    const occluderX = (neck_x + chin_x) * 0.5;
    const occluderY = (neck_y + chin_y) * 0.5 + neckHeight * 0.1;
    this.neckOccluder.position.set(occluderX, occluderY, -5); // aligned at neck plane
    this.neckOccluder.rotation.set(0, yawRad, rollAngle);

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
