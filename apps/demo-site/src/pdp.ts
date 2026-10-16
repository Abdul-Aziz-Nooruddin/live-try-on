import { CameraManager } from '@livetry/widget/src/camera/camera-manager.js';
import { VisionPipeline, type VisionFrameResult } from '@livetry/widget/src/vision/vision-pipeline.js';
import { BodyRigTracker } from '@livetry/tryon-core';
import { ThreeTryonRenderer } from '@livetry/widget/src/render/three-tryon-renderer.js';

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
let threeRenderer: ThreeTryonRenderer | null = null;
let isLoopRunning = false;

async function initPDP() {
  threeRenderer = new ThreeTryonRenderer(webglCanvas);
  rigTracker = new BodyRigTracker({ mirror: false });

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
  if (threeRenderer) {
    threeRenderer.resize(vw, vh);
  }

  visionPipeline = new VisionPipeline({
    useGpu: true,
    enableSegmentation: true,
    onModelLoaded: () => {
      cameraStatusText.textContent = 'Live 3D';
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

  if (videoElement.videoWidth > 0 && webglCanvas.width !== videoElement.videoWidth) {
    const vw = videoElement.videoWidth;
    const vh = videoElement.videoHeight;
    webglCanvas.width = vw;
    webglCanvas.height = vh;
    threeRenderer?.resize(vw, vh);
  }

  const visionResult: VisionFrameResult | null = visionPipeline?.processFrame(videoElement, timestamp) ?? null;

  let rigState = null;
  if (visionResult?.landmarks && rigTracker) {
    rigState = rigTracker.update(visionResult.landmarks, timestamp * 0.001);
  }

  if (threeRenderer) {
    if (rigState) {
      threeRenderer.updateSkinTone(videoElement, rigState.chin[0], rigState.chin[1]);
    }
    threeRenderer.update3DPose(rigState, 1.0);
    threeRenderer.render();
  }

  requestAnimationFrame(renderLoop);
}

initPDP();
