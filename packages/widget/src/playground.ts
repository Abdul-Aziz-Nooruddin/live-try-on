import { Pane } from 'tweakpane';
import { CameraManager } from './camera/camera-manager.js';
import { VisionPipeline, type VisionFrameResult } from './vision/vision-pipeline.js';
import { BodyRigTracker, generateGarmentMesh } from '@livetry/tryon-core';
import { WebGLTryonRenderer } from './render/webgl-renderer.js';
import type { GarmentAsset } from '@livetry/shared-types';

// DOM elements
const webglCanvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
const debugCanvas = document.getElementById('debug-canvas') as HTMLCanvasElement;
const videoElement = document.getElementById('webcam-video') as HTMLVideoElement;
const consentOverlay = document.getElementById('consent-overlay') as HTMLDivElement;
const btnStartCamera = document.getElementById('btn-start-camera') as HTMLButtonElement;
const btnStopCamera = document.getElementById('btn-stop-camera') as HTMLButtonElement;
const statusDot = document.getElementById('status-dot') as HTMLDivElement;
const statusText = document.getElementById('status-text') as HTMLSpanElement;

// Telemetry DOM
const metricFps = document.getElementById('metric-fps') as HTMLDivElement;
const metricLatency = document.getElementById('metric-latency') as HTMLDivElement;
const metricJitter = document.getElementById('metric-jitter') as HTMLDivElement;
const metricYaw = document.getElementById('metric-yaw') as HTMLDivElement;

// Tweakpane parameters (dev-time tuning)
const PARAMS = {
  shoulderEase: 0.06,
  minCutoff: 1.2,
  beta: 0.008,
  garmentOpacity: 1.0,
  showDebugSkeleton: true,
  simulateHandsOcclusion: true
};

let cameraManager: CameraManager | null = null;
let visionPipeline: VisionPipeline | null = null;
let rigTracker: BodyRigTracker | null = null;
let renderer: WebGLTryonRenderer | null = null;
let gl: WebGL2RenderingContext | null = null;
let debugCtx: CanvasRenderingContext2D | null = null;

// Telemetry state
let frameCount = 0;
let lastFpsUpdate = performance.now();
let rollingFps = 0;
let lastAnchorX = 0;
let lastAnchorY = 0;
let jitterAccum = 0;
let jitterCount = 0;
let isLoopRunning = false;

async function bootstrap() {
  // 1. Initialize WebGL2 context
  gl = webglCanvas.getContext('webgl2', { alpha: false, premultipliedAlpha: false });
  if (!gl) {
    alert('WebGL2 not supported on this device/browser');
    return;
  }
  debugCtx = debugCanvas.getContext('2d');

  renderer = new WebGLTryonRenderer(gl);
  rigTracker = new BodyRigTracker({
    shoulderEaseFraction: PARAMS.shoulderEase,
    filterMinCutoff: PARAMS.minCutoff,
    filterBeta: PARAMS.beta
  });

  // 2. Fetch canonical sample garment asset & keypoints
  try {
    statusText.textContent = 'Loading garment asset...';
    const res = await fetch('/fixtures/sample-tshirt.json');
    const asset: GarmentAsset = await res.json();

    // Generate mesh from keypoints & load cutout texture
    const mesh = generateGarmentMesh(asset.keypoints.front, { gridCols: 16, gridRows: 20 });
    renderer.setGarmentMesh(mesh, asset.physical.lengthToWidthRatio);
    await renderer.loadGarmentTexture(asset.images.front.url);
    statusText.textContent = 'Ready (Awaiting camera)';
    statusDot.className = 'status-dot';
  } catch (err) {
    console.error('Failed to load sample garment fixture:', err);
    statusText.textContent = 'Error loading fixture';
  }

  // 3. Setup Tweakpane dev panel
  setupDevPanel();

  // 4. Hook Camera Start
  btnStartCamera.addEventListener('click', async () => {
    try {
      consentOverlay.style.opacity = '0';
      setTimeout(() => {
        consentOverlay.style.display = 'none';
      }, 300);

      statusText.textContent = 'Starting camera & vision...';
      statusDot.className = 'status-dot loading';

      await startTryonSession();
    } catch (err) {
      console.error('Permission denied or error:', err);
      consentOverlay.style.display = 'flex';
      consentOverlay.style.opacity = '1';
      alert('Camera access denied. Please allow camera permissions to test virtual try-on.');
      statusText.textContent = 'Camera blocked';
    }
  });

  btnStopCamera.addEventListener('click', () => {
    stopTryonSession();
  });
}

function setupDevPanel() {
  const container = document.getElementById('tweakpane-container');
  if (!container) return;

  const pane = new Pane({ container, title: 'LiveTry Tuning' });

  pane.addBinding(PARAMS, 'shoulderEase', { min: 0.0, max: 0.15, step: 0.01, label: 'Shoulder Ease' })
    .on('change', () => {
      rebuildTracker();
    });

  const filterFolder = pane.addFolder({ title: 'OneEuro Smoothing' });
  filterFolder.addBinding(PARAMS, 'minCutoff', { min: 0.1, max: 4.0, step: 0.1, label: 'Min Cutoff (Hz)' })
    .on('change', () => rebuildTracker());
  filterFolder.addBinding(PARAMS, 'beta', { min: 0.001, max: 0.05, step: 0.001, label: 'Beta Speed' })
    .on('change', () => rebuildTracker());

  pane.addBinding(PARAMS, 'garmentOpacity', { min: 0.0, max: 1.0, step: 0.05, label: 'Garment Opacity' });
  pane.addBinding(PARAMS, 'showDebugSkeleton', { label: 'Debug Skeleton' });
}

function rebuildTracker() {
  rigTracker = new BodyRigTracker({
    shoulderEaseFraction: PARAMS.shoulderEase,
    filterMinCutoff: PARAMS.minCutoff,
    filterBeta: PARAMS.beta
  });
}

async function startTryonSession() {
  // Initialize camera
  cameraManager = new CameraManager(videoElement, {
    preferredFacingMode: 'user',
    targetResolution: { width: 640, height: 480 },
    onStreamStopped: () => {
      stopTryonSession();
    }
  });

  await cameraManager.start();

  // Resize canvases to match video resolution
  const vw = videoElement.videoWidth || 640;
  const vh = videoElement.videoHeight || 480;
  webglCanvas.width = vw;
  webglCanvas.height = vh;
  debugCanvas.width = vw;
  debugCanvas.height = vh;

  // Initialize MediaPipe pipeline
  statusText.textContent = 'Initializing MediaPipe...';
  visionPipeline = new VisionPipeline({
    useGpu: true,
    enableSegmentation: true,
    onModelLoaded: () => {
      statusText.textContent = 'Live tracking active';
      statusDot.className = 'status-dot';
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
  consentOverlay.style.display = 'flex';
  consentOverlay.style.opacity = '1';
  statusText.textContent = 'Camera disconnected';
  statusDot.className = 'status-dot loading';
}

function renderLoop(timestamp: number) {
  if (!isLoopRunning || !videoElement || !cameraManager?.isActive()) {
    return;
  }

  const frameStart = performance.now();

  // 1. Vision inference
  const visionResult: VisionFrameResult | null = visionPipeline?.processFrame(videoElement, timestamp) ?? null;

  // 2. Body Rig update
  let rigState = null;
  if (visionResult?.landmarks && rigTracker) {
    rigState = rigTracker.update(visionResult.landmarks, timestamp * 0.001);
  }

  // 3. WebGL render
  if (renderer && gl) {
    renderer.render(videoElement, rigState, PARAMS.garmentOpacity);
  }

  // 4. Debug overlay
  if (debugCtx) {
    debugCtx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);
    if (PARAMS.showDebugSkeleton && visionResult?.landmarks) {
      drawDebugSkeleton(debugCtx, visionResult.landmarks, rigState);
    }
  }

  // 5. Update Telemetry
  updateTelemetry(frameStart, rigState);

  requestAnimationFrame(renderLoop);
}

function drawDebugSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: { x: number; y: number }[],
  rig: ReturnType<BodyRigTracker['update']> | null
) {
  const w = debugCanvas.width;
  const h = debugCanvas.height;

  // Draw upper body key points (11, 12: shoulders; 23, 24: hips)
  ctx.fillStyle = '#10b981';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;

  const pointsToDraw = [11, 12, 13, 14, 15, 16, 23, 24];
  for (const idx of pointsToDraw) {
    const pt = landmarks[idx];
    if (pt) {
      ctx.beginPath();
      ctx.arc(pt.x * w, pt.y * h, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw shoulder & torso lines
  if (rig) {
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(rig.shoulderLeft[0] * w, rig.shoulderLeft[1] * h);
    ctx.lineTo(rig.shoulderRight[0] * w, rig.shoulderRight[1] * h);
    ctx.stroke();

    ctx.strokeStyle = '#a855f7';
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
    rollingFps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
    metricFps.textContent = `${rollingFps}`;
    metricLatency.textContent = `${Math.round(latency)} ms`;
    frameCount = 0;
    lastFpsUpdate = now;
  }

  if (rig) {
    metricYaw.textContent = `${Math.round(rig.estimatedYawDeg)}°`;

    // Anchor jitter RMS calculation
    const anchorX = rig.shoulderMid[0] * debugCanvas.width;
    const anchorY = rig.shoulderMid[1] * debugCanvas.height;
    if (lastAnchorX !== 0) {
      const dist = Math.sqrt(Math.pow(anchorX - lastAnchorX, 2) + Math.pow(anchorY - lastAnchorY, 2));
      jitterAccum += dist * dist;
      jitterCount++;
      if (jitterCount >= 30) {
        const rms = Math.sqrt(jitterAccum / jitterCount);
        metricJitter.textContent = `${rms.toFixed(1)} px`;
        jitterAccum = 0;
        jitterCount = 0;
      }
    }
    lastAnchorX = anchorX;
    lastAnchorY = anchorY;
  }
}

// Start app
bootstrap();
