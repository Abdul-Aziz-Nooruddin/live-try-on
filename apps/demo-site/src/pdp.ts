import { CameraManager } from '@livetry/widget/src/camera/camera-manager.js';
import { VisionPipeline, type VisionFrameResult } from '@livetry/widget/src/vision/vision-pipeline.js';
import { BodyRigTracker, generateGarmentMesh } from '@livetry/tryon-core';
import { WebGLTryonRenderer } from '@livetry/widget/src/render/webgl-renderer.js';
import type { GarmentAsset } from '@livetry/shared-types';

// DOM Elements
const tryonScrim = document.getElementById('tryon-scrim') as HTMLDivElement;
const consentView = document.getElementById('consent-view') as HTMLDivElement;
const liveView = document.getElementById('live-view') as HTMLDivElement;
const btnOpenTryOn = document.getElementById('pdp-try-on') as HTMLButtonElement;
const btnStartCamera = document.getElementById('btn-start-camera') as HTMLButtonElement;
const btnDismissConsent = document.getElementById('btn-dismiss-consent') as HTMLButtonElement;
const btnExitTryon = document.getElementById('btn-exit-tryon') as HTMLButtonElement;

const webglCanvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
const videoElement = document.getElementById('webcam-video') as HTMLVideoElement;
const cameraStatusText = document.getElementById('pdp-camera-status') as HTMLSpanElement;

let cameraManager: CameraManager | null = null;
let visionPipeline: VisionPipeline | null = null;
let rigTracker: BodyRigTracker | null = null;
let renderer: WebGLTryonRenderer | null = null;
let gl: WebGL2RenderingContext | null = null;
let isLoopRunning = false;

async function initPDP() {
  gl = webglCanvas.getContext('webgl2', { alpha: false, premultipliedAlpha: false });
  if (gl) {
    renderer = new WebGLTryonRenderer(gl);
    rigTracker = new BodyRigTracker();

    try {
      const res = await fetch('/fixtures/sample-tshirt.json');
      const asset: GarmentAsset = await res.json();
      const mesh = generateGarmentMesh(asset.keypoints.front, { gridCols: 16, gridRows: 20 });
      renderer.setGarmentMesh(mesh, asset.physical.lengthToWidthRatio);
      await renderer.loadGarmentTexture(asset.images.front.url);
    } catch (e) {
      console.error('Failed to load garment asset:', e);
    }
  }

  // Hook PDP Try On Button
  btnOpenTryOn?.addEventListener('click', () => {
    tryonScrim.classList.add('visible');
    consentView.style.display = 'flex';
    liveView.classList.remove('visible');
  });

  btnDismissConsent?.addEventListener('click', () => {
    closeModal();
  });

  btnStartCamera?.addEventListener('click', async () => {
    try {
      consentView.style.display = 'none';
      liveView.classList.add('visible');
      cameraStatusText.textContent = 'Connecting...';
      await startLiveTryon();
    } catch (err) {
      console.error('Camera denied or error:', err);
      alert('Camera access is off. Turn it on in your browser settings, then try again.');
      closeModal();
    }
  });

  btnExitTryon?.addEventListener('click', () => {
    closeModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && tryonScrim.classList.contains('visible')) {
      closeModal();
    }
  });
}

function closeModal() {
  stopLiveTryon();
  tryonScrim.classList.remove('visible');
  consentView.style.display = 'none';
  liveView.classList.remove('visible');
}

async function startLiveTryon() {
  cameraManager = new CameraManager(videoElement, {
    preferredFacingMode: 'user',
    targetResolution: { width: 640, height: 480 },
    onStreamStopped: () => closeModal()
  });

  await cameraManager.start();

  const vw = videoElement.videoWidth || 640;
  const vh = videoElement.videoHeight || 480;
  webglCanvas.width = vw;
  webglCanvas.height = vh;

  visionPipeline = new VisionPipeline({
    useGpu: true,
    enableSegmentation: true,
    onModelLoaded: () => {
      cameraStatusText.textContent = 'Live';
    }
  });
  await visionPipeline.init();

  isLoopRunning = true;
  requestAnimationFrame(renderLoop);
}

function stopLiveTryon() {
  isLoopRunning = false;
  if (cameraManager) {
    cameraManager.stop();
    cameraManager = null;
  }
  if (visionPipeline) {
    visionPipeline.dispose();
    visionPipeline = null;
  }
}

function renderLoop(timestamp: number) {
  if (!isLoopRunning || !videoElement || !cameraManager?.isActive()) {
    return;
  }

  const visionResult: VisionFrameResult | null = visionPipeline?.processFrame(videoElement, timestamp) ?? null;

  let rigState = null;
  if (visionResult?.landmarks && rigTracker) {
    rigState = rigTracker.update(visionResult.landmarks, timestamp * 0.001);
  }

  let hasSeg = false;
  if (visionResult?.segmentationMask && renderer) {
    renderer.updateSegmentationMask(
      visionResult.segmentationMask as Uint8Array,
      visionResult.maskWidth,
      visionResult.maskHeight
    );
    hasSeg = true;
  }

  if (renderer && gl) {
    renderer.render(videoElement, rigState, hasSeg, 1.0);
  }

  requestAnimationFrame(renderLoop);
}

initPDP();
