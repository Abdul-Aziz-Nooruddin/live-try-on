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
  private garmentMesh: THREE.Mesh | null = null;
  private origVertices: Float32Array | null = null;
  private isModelLoaded = false;

  // Anatomical Depth Occluder for the neck
  private neckOccluder: THREE.Mesh;

  // Skin tone patch for erasing underlying collars
  private skinPatchMesh: THREE.Mesh;
  private skinPatchMaterial: THREE.MeshBasicMaterial;

  // Offscreen sampler for dynamic skin tone extraction
  private sampleCanvas: HTMLCanvasElement;
  private sampleCtx: CanvasRenderingContext2D | null;

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

    // 3. Editorial Studio Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 1.35);
    this.scene.add(ambient);

    // Key light: angled from front-top-right
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

    // 4. Anatomical Neck Depth Occluder
    // Invisible mesh that writes to depth buffer, allowing neck to go through collar hole
    const neckGeo = new THREE.CylinderGeometry(40, 48, 120, 32);
    const neckMat = new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: true
    });
    this.neckOccluder = new THREE.Mesh(neckGeo, neckMat);
    this.neckOccluder.renderOrder = 0;
    this.neckOccluder.visible = false;
    this.scene.add(this.neckOccluder);

    // 5. Collar-Erasing Skin Tone Patch
    // Sits in throat hollow to seamlessly hide polo collars or high undershirts
    const skinGeo = new THREE.PlaneGeometry(80, 80);
    this.skinPatchMaterial = new THREE.MeshBasicMaterial({
      color: 0xd2a688, // Default neutral skin tone, updated dynamically
      transparent: true,
      opacity: 0.92,
      depthWrite: false
    });
    this.skinPatchMesh = new THREE.Mesh(skinGeo, this.skinPatchMaterial);
    this.skinPatchMesh.renderOrder = 0; // Behind front collar, over video
    this.skinPatchMesh.visible = false;
    this.scene.add(this.skinPatchMesh);

    // 6. 3D Garment Group
    this.garmentGroup = new THREE.Group();
    this.garmentGroup.renderOrder = 1;
    this.scene.add(this.garmentGroup);

    // 7. Offscreen sampler for dynamic skin tone calibration
    this.sampleCanvas = document.createElement('canvas');
    this.sampleCanvas.width = 16;
    this.sampleCanvas.height = 16;
    this.sampleCtx = this.sampleCanvas.getContext('2d', { willReadFrequently: true });

    this.load3DGarmentModel();
  }

  private load3DGarmentModel(): void {
    const texLoader = new THREE.TextureLoader();
    const cottonTex = texLoader.load('/fixtures/cotton_texture.jpg');
    cottonTex.wrapS = THREE.RepeatWrapping;
    cottonTex.wrapT = THREE.RepeatWrapping;
    cottonTex.repeat.set(2.5, 2.5);

    const loader = new GLTFLoader();
    loader.load(
      '/fixtures/shirt_baked.glb',
      (gltf) => {
        this.garment3D = gltf.scene;

        this.garment3D.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            this.garmentMesh = mesh;

            // Cache original vertex positions for dynamic skeletal sleeve deformation
            const posAttr = mesh.geometry.attributes.position as THREE.BufferAttribute | undefined;
            if (posAttr) {
              this.origVertices = new Float32Array(posAttr.array);
            }

            mesh.material = new THREE.MeshStandardMaterial({
              color: 0x2b2926, // Editorial Charcoal Cotton
              map: cottonTex,
              roughness: 0.80,
              metalness: 0.04,
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

  public setColor(hex: string | number): void {
    if (!this.garmentMesh) return;
    const mat = this.garmentMesh.material as THREE.MeshStandardMaterial;
    if (mat) {
      mat.color.set(hex);
      mat.needsUpdate = true;
    }
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

  /**
   * Sample live video skin tone around the chin/jaw to seamlessly erase underlying collars
   */
  public updateSkinTone(video: HTMLVideoElement, chinNormX: number, chinNormY: number): void {
    if (!this.sampleCtx || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

    try {
      const vx = Math.max(0, Math.min(1, chinNormX)) * video.videoWidth;
      const vy = Math.max(0, Math.min(1, chinNormY)) * video.videoHeight;

      // Sample a 16x16 patch right at the lower chin/jaw
      this.sampleCtx.drawImage(video, vx - 8, vy - 8, 16, 16, 0, 0, 16, 16);
      const imgData = this.sampleCtx.getImageData(0, 0, 16, 16).data;

      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < imgData.length; i += 4) {
        const rVal = imgData[i] ?? 0;
        const gVal = imgData[i + 1] ?? 0;
        const bVal = imgData[i + 2] ?? 0;
        // Exclude extreme highlights or dark shadows
        const brightness = (rVal + gVal + bVal) / 3;
        if (brightness > 40 && brightness < 235) {
          r += rVal;
          g += gVal;
          b += bVal;
          count++;
        }
      }

      if (count > 0) {
        const avgR = (r / count) / 255;
        const avgG = (g / count) / 255;
        const avgB = (b / count) / 255;
        this.skinPatchMaterial.color.setRGB(avgR, avgG, avgB);
      }
    } catch {
      // Cross-origin or readback skip
    }
  }

  /**
   * Dynamic Skeletal Sleeve Deformation:
   * Smoothly bends the 3D sleeves in real time to match the user's actual upper arm angles
   */
  private applySleeveDeformation(
    leftArmAngle: number,
    rightArmAngle: number
  ): void {
    if (!this.garmentMesh || !this.origVertices) return;

    const posAttr = this.garmentMesh.geometry.attributes.position as THREE.BufferAttribute;
    const pos = posAttr.array as Float32Array;
    const orig = this.origVertices;
    const vertexCount = posAttr.count;

    const cosL = Math.cos(leftArmAngle);
    const sinL = Math.sin(leftArmAngle);
    const cosR = Math.cos(rightArmAngle);
    const sinR = Math.sin(rightArmAngle);

    // Sleeve shoulder pivots in model space (meters)
    const pivotLX = -0.22;
    const pivotRX = 0.22;
    const pivotY = 0.14;

    for (let i = 0; i < vertexCount; i++) {
      const idx = i * 3;
      const ox = orig[idx] ?? 0;
      const oy = orig[idx + 1] ?? 0;
      const oz = orig[idx + 2] ?? 0;

      if (ox < -0.19) {
        // Left Sleeve (model -X): calculate blend weight from armpit seam out to cuff
        const weight = Math.min(1.0, Math.max(0.0, (-ox - 0.19) / 0.05));
        const dx = ox - pivotLX;
        const dy = oy - pivotY;

        const rotX = pivotLX + (dx * cosL - dy * sinL);
        const rotY = pivotY + (dx * sinL + dy * cosL);

        pos[idx] = ox + (rotX - ox) * weight;
        pos[idx + 1] = oy + (rotY - oy) * weight;
        pos[idx + 2] = oz;
      } else if (ox > 0.19) {
        // Right Sleeve (model +X): calculate blend weight from armpit seam out to cuff
        const weight = Math.min(1.0, Math.max(0.0, (ox - 0.19) / 0.05));
        const dx = ox - pivotRX;
        const dy = oy - pivotY;

        const rotX = pivotRX + (dx * cosR - dy * sinR);
        const rotY = pivotY + (dx * sinR + dy * cosR);

        pos[idx] = ox + (rotX - ox) * weight;
        pos[idx + 1] = oy + (rotY - oy) * weight;
        pos[idx + 2] = oz;
      } else {
        // Torso remains undistorted
        pos[idx] = ox;
        pos[idx + 1] = oy;
        pos[idx + 2] = oz;
      }
    }

    posAttr.needsUpdate = true;
    this.garmentMesh.geometry.computeVertexNormals();
  }

  public update3DPose(rig: TorsoRigState | null, opacity = 1.0): void {
    if (!rig || opacity <= 0.01 || !this.garment3D || !this.isModelLoaded) {
      this.garmentGroup.visible = false;
      this.neckOccluder.visible = false;
      this.skinPatchMesh.visible = false;
      return;
    }

    this.garmentGroup.visible = true;

    // Convert rig points to pixel coordinates
    const shL_x = this.toPixelX(rig.shoulderLeft[0]);
    const shL_y = this.toPixelY(rig.shoulderLeft[1]);

    const shR_x = this.toPixelX(rig.shoulderRight[0]);
    const shR_y = this.toPixelY(rig.shoulderRight[1]);

    const shDx = shR_x - shL_x;
    const shDy = shR_y - shL_y;
    const shWidth = Math.hypot(shDx, shDy);

    // Roll angle matches shoulder line tilt
    const rollAngle = Math.atan2(shDy, shDx);

    // 3D Yaw angle (turning left/right)
    const yawRad = (rig.estimatedYawDeg * Math.PI) / 180;

    // --- 1. Precision Tailored 3D Scale Calibration ---
    // In shirt_baked.glb:
    // Distance between shoulder seam tips = 0.477m
    // Total model torso height (shoulder to hem) = 0.493m
    // Shoulder seam line Y = +0.141m
    // Front collar dip Y = +0.051m
    // Back collar top Y = +0.256m
    const tailoredShWidth = shWidth * 1.05;
    const scaleX = tailoredShWidth / 0.477;
    const scaleY = scaleX; // Uniform proportional scaling prevents unnatural elongation
    const scaleZ = scaleX * 0.72;

    this.garment3D.scale.set(scaleX, scaleY, scaleZ);

    // --- 2. Precision Anatomical Positioning ---
    // Center horizontally between the shoulders
    const posX = (shL_x + shR_x) * 0.5;

    // The shoulder seam line (y = +0.141 in model space) aligns directly with the user's physical shoulder line
    const shoulderMidY = (shL_y + shR_y) * 0.5;
    const posY = shoulderMidY - (0.141 * scaleY);
    const posZ = 10; // Upper body plane

    this.garment3D.position.set(posX, posY, posZ);
    this.garment3D.rotation.set(0, yawRad, rollAngle);

    // --- 3. Dynamic Skeletal Sleeve Deformation ---
    const elbL_x = this.toPixelX(rig.elbowLeft[0]);
    const elbL_y = this.toPixelY(rig.elbowLeft[1]);
    const elbR_x = this.toPixelX(rig.elbowRight[0]);
    const elbR_y = this.toPixelY(rig.elbowRight[1]);

    const dL_x = elbL_x - shL_x;
    const dL_y = elbL_y - shL_y;
    const rawLeftArmAngle = Math.atan2(dL_y, dL_x) + Math.PI / 2 - rollAngle;

    const dR_x = elbR_x - shR_x;
    const dR_y = elbR_y - shR_y;
    const rawRightArmAngle = Math.atan2(dR_y, dR_x) - Math.PI / 2 - rollAngle;

    const leftArmAngle = Math.max(-0.65, Math.min(0.65, rawLeftArmAngle * 0.55));
    const rightArmAngle = Math.max(-0.65, Math.min(0.65, rawRightArmAngle * 0.55));

    this.applySleeveDeformation(leftArmAngle, rightArmAngle);

    // Collar and neck remain cleanly rendered by the 3D model geometry without intrusive cutouts
    this.neckOccluder.visible = false;
    this.skinPatchMesh.visible = false;

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
