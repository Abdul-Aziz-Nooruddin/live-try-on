import { Pane } from 'tweakpane';
import { CameraManager } from './camera/camera-manager.js';
import { VisionPipeline, type VisionFrameResult } from './vision/vision-pipeline.js';
import { BodyRigTracker, generateGarmentMesh } from '@livetry/tryon-core';
import { WebGLTryonRenderer } from './render/webgl-renderer.js';
import type { GarmentAsset } from '@livetry/shared-types';

// DOM Elements
const tryonModalScrim = document.getElementById('tryon-modal-scrim') as HTMLDivElement;
const consentModal = document.getElementById('consent-modal') as HTMLDivElement;
const liveModal = document.getElementById('live-modal') as HTMLDivElement;
const btnOpenTryOn = document.getElementById('btn-open-try-on') as HTMLButtonElement;
const btnStartCamera = document.getElementById('btn-start-camera') as HTMLButtonElement;
const btnNotNow = document.getElementById('btn-not-now') as HTMLButtonElement;
const btnCloseCamera = document.getElementById('btn-close-camera') as HTMLButtonElement;

const webglCanvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
const debugCanvas = document.getElementById('debug-canvas') as HTMLCanvasElement;
const videoElement = document.getElementById('webcam-video') as HTMLVideoElement;
const cameraStatusText = document.getElementById('camera-status-text') as HTMLSpanElement;

// Dev telemetry elements (?debug=1)
const devTelemetryDock = document.getElementById('dev-telemetry') as HTMLDivElement;
const devFps = document.getElementById('dev-fps') as HTMLSpanElement;
const devLatency = document.getElementById('dev-latency') as HTMLSpanElement;
const devJitter = document.getElementById('dev-jitter') as HTMLSpanElement;
const devYaw = document.getElementById('dev-yaw') as HTMLSpanElement;
const devTweakpaneContainer = document.getElementById('dev-tweakpane') as HTMLDivElement;

const isDebugMode = typeof window !== 'undefined' && window.location.search.includes('debug=1');

// Parameters for dev tuning
const PARAMS = {
  shoulderEase: 0.06,
  minCutoff: 1.2,
  beta: 0.008,
  garmentOpacity: 1.0,
  showDebugSkeleton: isDebugMode
};

let cameraManager: CameraManager | null = null;
let visionPipeline: VisionPipeline | null = null;
let rigTracker: BodyRigTracker | null = null;
let renderer: WebGLTryonRenderer | null = null;
let gl: WebGL2RenderingContext | null = null;
let debugCtx: CanvasRenderingContext2D | null = null;

// Telemetry counters
let frameCount = 0;
let lastFpsUpdate = performance.now();
let lastAnchorX = 0;
let lastAnchorY = 0;
let jitterAccum = 0;
let jitterCount = 0;
let isLoopRunning = false;

async function bootstrap() {
  if (isDebugMode && devTelemetryDock) {
    devTelemetryDock.classList.add('show-debug');
    setupDevPanel();
  }

  // 1. Initialize WebGL2 context
  gl = webglCanvas.getContext('webgl2', { alpha: false, premultipliedAlpha: false });
  if (!gl) {
    console.error('WebGL2 not supported');
    return;
  }
  debugCtx = debugCanvas.getContext('2d');

  renderer = new WebGLTryonRenderer(gl);
  rigTracker = new BodyRigTracker({
    shoulderEaseFraction: PARAMS.shoulderEase,
    filterMinCutoff: PARAMS.minCutoff,
    filterBeta: PARAMS.beta
  });

  // 2. Load sample garment fixture
  try {
    const res = await fetch('/fixtures/sample-tshirt.json');
    const asset: GarmentAsset = await res.json();
    const mesh = generateGarmentMesh(asset.keypoints.front, { gridCols: 16, gridRows: 20 });
    renderer.setGarmentMesh(mesh, asset.physical.lengthToWidthRatio);
    await renderer.loadGarmentTexture(asset.images.front.url);
  } catch (err) {
    console.error('Error preloading garment asset:', err);
  }

  // 3. Setup PDP interaction & Try On Modal events
  setupEvents();
}

function setupEvents() {
  // Open Try On flow
  btnOpenTryOn?.addEventListener('click', () => {
    tryonModalScrim.classList.add('open');
    consentModal.style.display = 'flex';
    liveModal.classList.remove('open');
  });

  // Not now / dismiss
  btnNotNow?.addEventListener('click', () => {
    closeModal();
  });

  // Start Camera after consent
  btnStartCamera?.addEventListener('click', async () => {
    try {
      consentModal.style.display = 'none';
      liveModal.classList.add('open');
      cameraStatusText.textContent = 'Starting...';

      await startTryonSession();
    } catch (err) {
      console.error('Camera permission denied or failed:', err);
      alert('Camera access is off. Turn it on in your browser settings, then try again.');
      closeModal();
    }
  });

  // Close live camera
  btnCloseCamera?.addEventListener('click', () => {
    closeModal();
  });

  // Escape key closes modal (after consent step)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && tryonModalScrim.classList.contains('open')) {
      closeModal();
    }
  });
}

function closeModal() {
  stopTryonSession();
  tryonModalScrim.classList.remove('open');
  consentModal.style.display = 'none';
  liveModal.classList.remove('open');
}

function setupDevPanel() {
  if (!devTweakpaneContainer) return;
  const pane = new Pane({ container: devTweakpaneContainer, title: 'Dev Controls' });

  pane.addBinding(PARAMS, 'shoulderEase', { min: 0.0, max: 0.15, step: 0.01, label: 'Shoulder Ease' })
    .on('change', () => rebuildTracker());

  pane.addBinding(PARAMS, 'minCutoff', { min: 0.1, max: 4.0, step: 0.1, label: 'Filter Cutoff' })
    .on('change', () => rebuildTracker());

  pane.addBinding(PARAMS, 'beta', { min: 0.001, max: 0.05, step: 0.001, label: 'Filter Beta' })
    .on('change', () => rebuildTracker());

  pane.addBinding(PARAMS, 'showDebugSkeleton', { label: 'Show Skeleton' });
}

function rebuildTracker() {
  rigTracker = new BodyRigTracker({
    shoulderEaseFraction: PARAMS.shoulderEase,
    filterMinCutoff: PARAMS.minCutoff,
    filterBeta: PARAMS.beta
  });
}

async function startTryonSession() {
  cameraManager = new CameraManager(videoElement, {
    preferredFacingMode: 'user',
    targetResolution: { width: 640, height: 480 },
    onStreamStopped: () => {
      closeModal();
    }
  });

  await cameraManager.start();

  const vw = videoElement.videoWidth || 640;
  const vh = videoElement.videoHeight || 480;
  webglCanvas.width = vw;
  webglCanvas.height = vh;
  debugCanvas.width = vw;
  debugCanvas.height = vh;

  cameraStatusText.textContent = 'Loading vision...';

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

function stopTryonSession() {
  isLoopRunning = false;
  if (cameraManager) {
    cameraManager.stop();
    cameraManager = null;
  }
  if (visionPipeline) {
    visionPipeline.dispose();
    visionPipeline = null;
  }
  if (debugCtx) {
    debugCtx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);
  }
}

function renderLoop(timestamp: number) {
  if (!isLoopRunning || !videoElement || !cameraManager?.isActive()) {
    return;
  }

  const frameStart = performance.now();

  const visionResult: VisionFrameResult | null = visionPipeline?.processFrame(videoElement, timestamp) ?? null;

  let rigState = null;
  if (visionResult?.landmarks && rigTracker) {
    rigState = rigTracker.update(visionResult.landmarks, timestamp * 0.001);
  }

  if (renderer && gl) {
    renderer.render(videoElement, rigState, PARAMS.garmentOpacity);
  }

  if (debugCtx) {
    debugCtx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);
    if (PARAMS.showDebugSkeleton && visionResult?.landmarks) {
      drawDebugSkeleton(debugCtx, visionResult.landmarks, rigState);
    }
  }

  if (isDebugMode) {
    updateTelemetry(frameStart, rigState);
  }

  requestAnimationFrame(renderLoop);
}

function drawDebugSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: { x: number; y: number }[],
  rig: ReturnType<BodyRigTracker['update']> | null
) {
  const w = debugCanvas.width;
  const h = debugCanvas.height;

  ctx.fillStyle = '#3E5B45'; // --moss
  ctx.strokeStyle = '#D9D2C7'; // --stone
  ctx.lineWidth = 1.5;

  const pointsToDraw = [11, 12, 13, 14, 15, 16, 23, 24];
  for (const idx of pointsToDraw) {
    const pt = landmarks[idx];
    if (pt) {
      ctx.beginPath();
      ctx.arc(pt.x * w, pt.y * h, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (rig) {
    ctx.strokeStyle = '#A24A33'; // --clay
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rig.shoulderLeft[0] * w, rig.shoulderLeft[1] * h);
    ctx.lineTo(rig.shoulderRight[0] * w, rig.shoulderRight[1] * h);
    ctx.stroke();

    ctx.strokeStyle = '#6B655C'; // --taupe
    ctx.beginPath();
    ctx.moveTo(rig.shoulderMid[0] * w, rig.shoulderMid[1] * h);
    ctx.lineTo(rig.hipMid[0] * w, rig.hipMid[1] * h);
    ctx.stroke();
  }
}

function updateTelemetry(
  frameStart: number,
  rig: ReturnType<BodyRigTracker['update']> | null
) {
  frameCount++;
  const now = performance.now();
  const latency = now - frameStart;

  if (now - lastFpsUpdate >= 500) {
    const fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
    if (devFps) devFps.textContent = `${fps}`;
    if (devLatency) devLatency.textContent = `${Math.round(latency)} ms`;
    frameCount = 0;
    lastFpsUpdate = now;
  }

  if (rig && devYaw) {
    devYaw.textContent = `${Math.round(rig.estimatedYawDeg)}°`;

    const anchorX = rig.shoulderMid[0] * debugCanvas.width;
    const anchorY = rig.shoulderMid[1] * debugCanvas.height;
    if (lastAnchorX !== 0) {
      const dist = Math.sqrt(Math.pow(anchorX - lastAnchorX, 2) + Math.pow(anchorY - lastAnchorY, 2));
      jitterAccum += dist * dist;
      jitterCount++;
      if (jitterCount >= 30) {
        const rms = Math.sqrt(jitterAccum / jitterCount);
        if (devJitter) devJitter.textContent = `${rms.toFixed(1)} px`;
        jitterAccum = 0;
        jitterCount = 0;
      }
    }
    lastAnchorX = anchorX;
    lastAnchorY = anchorY;
  }
}

bootstrap();
