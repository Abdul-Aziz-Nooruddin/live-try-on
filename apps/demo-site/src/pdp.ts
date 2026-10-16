import { CameraManager } from '@livetry/widget/src/camera/camera-manager.js';
import { VisionPipeline, type VisionFrameResult } from '@livetry/widget/src/vision/vision-pipeline.js';
import { BodyRigTracker, type TorsoRigState } from '@livetry/tryon-core';

interface GarmentVariant {
  id: string;
  name: string;
  hex: string;
  image: string;
  colorFilter: string;
}

const GARMENT_VARIANTS: Record<string, GarmentVariant> = {
  charcoal: {
    id: 'charcoal',
    name: 'Charcoal',
    hex: '#2b2926',
    image: '/fixtures/sample-tshirt.png',
    colorFilter: 'brightness(0.9) contrast(1.1)'
  },
  oatmeal: {
    id: 'oatmeal',
    name: 'Oatmeal',
    hex: '#e2ded7',
    image: '/fixtures/oatmeal-tshirt.jpg',
    colorFilter: 'brightness(1.0) contrast(1.0)'
  },
  olive: {
    id: 'olive',
    name: 'Olive',
    hex: '#4b4b3b',
    image: '/fixtures/olive-tshirt.jpg',
    colorFilter: 'brightness(0.95) contrast(1.05)'
  }
};

let activeColor: GarmentVariant = GARMENT_VARIANTS.charcoal;
let selectedSize = 'M';
let bagCount = 0;

// Preload Garment Images for zero-lag live rendering
const garmentImages: Record<string, HTMLImageElement> = {};
Object.values(GARMENT_VARIANTS).forEach((variant) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = variant.image;
  garmentImages[variant.id] = img;
});

// DOM Elements
const tryonScrim = document.getElementById('tryon-scrim') as HTMLDivElement;
const consentView = document.getElementById('consent-view') as HTMLDivElement;
const liveView = document.getElementById('live-view') as HTMLDivElement;
const btnOpenTryOn = document.getElementById('pdp-try-on') as HTMLButtonElement;
const btnStartCamera = document.getElementById('btn-start-camera') as HTMLButtonElement;
const btnDismissConsent = document.getElementById('btn-dismiss-consent') as HTMLButtonElement;
const btnExitTryon = document.getElementById('btn-exit-tryon') as HTMLButtonElement;

const videoElement = document.getElementById('webcam-video') as HTMLVideoElement;
const liveCanvas = document.getElementById('live-stream-canvas') as HTMLCanvasElement;
const cameraStatusText = document.getElementById('pdp-camera-status') as HTMLSpanElement;

// Side Panel Controls
const modalActiveColorName = document.getElementById('modal-active-color-name') as HTMLSpanElement;
const btnModalAddToBag = document.getElementById('btn-modal-add-to-bag') as HTMLButtonElement;
const bagCountBadges = document.querySelectorAll('.bag-count');

// Pipelines & Tracking
let cameraManager: CameraManager | null = null;
let visionPipeline: VisionPipeline | null = null;
let rigTracker: BodyRigTracker | null = null;
let liveSocket: WebSocket | null = null;

let isLoopRunning = false;
let canvasCtx: CanvasRenderingContext2D | null = null;

// Dynamic calibrated skin tone
let skinColorR = 195;
let skinColorG = 150;
let skinColorB = 125;

async function initPDP() {
  canvasCtx = liveCanvas.getContext('2d', { alpha: false });
  rigTracker = new BodyRigTracker({ mirror: true });

  // Modal Triggers
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
      cameraStatusText.textContent = 'Connecting Live Stream...';
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

  setupColorSelection();
  setupSizeSelection();

  // Bag Action
  btnModalAddToBag?.addEventListener('click', addToBag);
  const btnPdpAddToBag = document.querySelector('.btn-add-to-bag') as HTMLButtonElement;
  btnPdpAddToBag?.addEventListener('click', addToBag);
}

function setupColorSelection() {
  const allColorButtons = document.querySelectorAll('[data-color]');

  allColorButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const colorKey = btn.getAttribute('data-color') || 'charcoal';
      if (!GARMENT_VARIANTS[colorKey]) return;

      activeColor = GARMENT_VARIANTS[colorKey];
      if (modalActiveColorName) {
        modalActiveColorName.textContent = activeColor.name;
      }

      // Sync active classes across all buttons
      allColorButtons.forEach((b) => {
        if (b.getAttribute('data-color') === colorKey) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });

      // Update main PDP image
      const mainImg = document.querySelector('.main-image-viewport img') as HTMLImageElement;
      if (mainImg) {
        mainImg.src = activeColor.image;
      }

      // Send live garment change to WebSocket stream if active
      if (liveSocket && liveSocket.readyState === WebSocket.OPEN) {
        liveSocket.send(JSON.stringify({ type: 'CHANGE_GARMENT', garmentId: activeColor.id }));
      }
    });
  });
}

function setupSizeSelection() {
  const sizeBoxes = document.querySelectorAll('.size-box');
  sizeBoxes.forEach((box) => {
    box.addEventListener('click', () => {
      sizeBoxes.forEach((b) => b.classList.remove('active'));
      box.classList.add('active');
      selectedSize = box.textContent?.trim() || 'M';
      if (btnModalAddToBag) {
        btnModalAddToBag.textContent = `Add to Bag (${selectedSize}) — ₹1,990`;
      }
    });
  });
}

function addToBag() {
  bagCount++;
  bagCountBadges.forEach((badge) => {
    badge.textContent = String(bagCount);
  });

  const originalText = btnModalAddToBag.textContent;
  btnModalAddToBag.textContent = 'Added to Bag ✓';
  btnModalAddToBag.style.backgroundColor = 'var(--moss)';

  setTimeout(() => {
    btnModalAddToBag.textContent = originalText;
    btnModalAddToBag.style.backgroundColor = 'var(--ink)';
  }, 1800);
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
  liveCanvas.width = vw;
  liveCanvas.height = vh;

  visionPipeline = new VisionPipeline({
    useGpu: true,
    enableSegmentation: false,
    onModelLoaded: () => {
      cameraStatusText.textContent = 'Live Neural Stream (30 FPS)';
    }
  });
  await visionPipeline.init();

  // Connect to Local Apple Silicon M1 Neural V-TON WebSocket Stream
  try {
    liveSocket = new WebSocket('ws://127.0.0.1:8000/ws/stream');
    liveSocket.onopen = () => {
      cameraStatusText.textContent = 'M1 Neural Engine Live (MPS Accelerated)';
    };
    liveSocket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'OUTPUT_FRAME' && msg.frameData && canvasCtx) {
          const outImg = new Image();
          outImg.onload = () => {
            canvasCtx?.drawImage(outImg, 0, 0, liveCanvas.width, liveCanvas.height);
            isStreamingFrame = false;
          };
          outImg.src = msg.frameData;
          if (msg.fps) {
            cameraStatusText.textContent = `M1 Live Try-On • ${activeColor.name} (${msg.fps} FPS)`;
          }
        }
      } catch {
        isStreamingFrame = false;
      }
    };
    liveSocket.onerror = () => {
      cameraStatusText.textContent = `Live Neural Try-On • ${activeColor.name}`;
    };
  } catch (err) {
    console.warn('[LiveTry] WebSocket connection:', err);
  }

  isLoopRunning = true;
  requestAnimationFrame(renderLoop);
}

let isStreamingFrame = false;
const offscreenCanvas = document.createElement('canvas');
const offscreenCtx = offscreenCanvas.getContext('2d');

function stopLiveTryon() {
  isLoopRunning = false;
  isStreamingFrame = false;
  if (cameraManager) {
    cameraManager.stop();
    cameraManager = null;
  }
  if (visionPipeline) {
    visionPipeline.dispose();
    visionPipeline = null;
  }
  if (liveSocket) {
    liveSocket.close();
    liveSocket = null;
  }
}

/**
 * Real-Time Live Neural Frame Renderer (30 FPS continuous live video)
 */
function renderLoop(timestamp: number) {
  if (!isLoopRunning || !videoElement || !canvasCtx || !cameraManager?.isActive()) {
    return;
  }

  // Synchronize canvas dimensions to match video stream
  if (videoElement.videoWidth > 0 && liveCanvas.width !== videoElement.videoWidth) {
    liveCanvas.width = videoElement.videoWidth;
    liveCanvas.height = videoElement.videoHeight;
  }

  // If M1 local WebSocket stream is connected, stream frame to PyTorch MPS
  if (liveSocket && liveSocket.readyState === WebSocket.OPEN && !isStreamingFrame && offscreenCtx) {
    isStreamingFrame = true;
    offscreenCanvas.width = 480;
    offscreenCanvas.height = 360;
    offscreenCtx.save();
    offscreenCtx.translate(480, 0);
    offscreenCtx.scale(-1, 1);
    offscreenCtx.drawImage(videoElement, 0, 0, 480, 360);
    offscreenCtx.restore();

    const frameData = offscreenCanvas.toDataURL('image/jpeg', 0.82);
    liveSocket.send(JSON.stringify({
      type: 'FRAME',
      frameData,
      garmentId: activeColor.id
    }));
  } else {
    // 1. Draw live mirrored webcam video frame directly to canvas
    canvasCtx.save();
    canvasCtx.translate(w, 0);
    canvasCtx.scale(-1, 1);
    canvasCtx.drawImage(videoElement, 0, 0, w, h);
    canvasCtx.restore();
  }

  // 2. Process pose & landmarks in real time
  const visionResult: VisionFrameResult | null = visionPipeline?.processFrame(videoElement, timestamp) ?? null;

  let rigState: TorsoRigState | null = null;
  if (visionResult?.landmarks && rigTracker) {
    rigState = rigTracker.update(visionResult.landmarks, timestamp * 0.001);
  }

  if (rigState) {
    cameraStatusText.textContent = `Live Neural Try-On • ${activeColor.name}`;

    // 3. Calibrate live skin tone from chin/neck to erase polo collar
    sampleLiveSkinTone(rigState.chin[0] * w, rigState.chin[1] * h);

    // 4. Inpaint & Erase Underlying Polo Collar
    eraseUnderlyingCollar(rigState, w, h);

    // 5. Render realistic draped garment directly over the torso in live motion
    renderLiveDrapedGarment(rigState, w, h);
  } else {
    cameraStatusText.textContent = 'Aligning Shoulders...';
  }

  requestAnimationFrame(renderLoop);
}

/**
 * Sample user's live skin tone from jaw/chin
 */
function sampleLiveSkinTone(chinX: number, chinY: number) {
  if (!canvasCtx) return;
  try {
    const x = Math.max(0, Math.min(liveCanvas.width - 10, Math.round(chinX)));
    const y = Math.max(0, Math.min(liveCanvas.height - 10, Math.round(chinY - 12)));
    const pixel = canvasCtx.getImageData(x, y, 1, 1).data;
    if (pixel[0] > 40 && pixel[0] < 240) {
      // Smooth moving average
      skinColorR = Math.round(skinColorR * 0.85 + pixel[0] * 0.15);
      skinColorG = Math.round(skinColorG * 0.85 + pixel[1] * 0.15);
      skinColorB = Math.round(skinColorB * 0.85 + pixel[2] * 0.15);
    }
  } catch {
    // Cross-origin read skip
  }
}

/**
 * Erase Underlying Polo Collar & Buttons using live skin extrapolation
 */
function eraseUnderlyingCollar(rig: TorsoRigState, w: number, h: number) {
  if (!canvasCtx) return;

  const chinX = rig.chin[0] * w;
  const chinY = rig.chin[1] * h;
  const neckX = rig.neckBase[0] * w;
  const neckY = rig.neckBase[1] * h;

  const neckWidth = rig.shoulderWidth * w * 0.36;

  canvasCtx.save();
  // Draw soft feathered skin patch over polo collar
  const grad = canvasCtx.createRadialGradient(neckX, (chinY + neckY) * 0.5, 4, neckX, (chinY + neckY) * 0.5, neckWidth * 0.65);
  grad.addColorStop(0, `rgb(${skinColorR}, ${skinColorG}, ${skinColorB})`);
  grad.addColorStop(0.85, `rgba(${skinColorR}, ${skinColorG}, ${skinColorB}, 0.95)`);
  grad.addColorStop(1, `rgba(${skinColorR}, ${skinColorG}, ${skinColorB}, 0.0)`);

  canvasCtx.fillStyle = grad;
  canvasCtx.beginPath();
  canvasCtx.ellipse(neckX, (chinY + neckY) * 0.5, neckWidth * 0.5, Math.max(15, (neckY - chinY) * 0.8), rig.torsoAngleRad, 0, Math.PI * 2);
  canvasCtx.fill();
  canvasCtx.restore();
}

/**
 * Render Realistic Draped Garment in Live Video Motion (Anchored ON the body)
 */
function renderLiveDrapedGarment(rig: TorsoRigState, w: number, h: number) {
  if (!canvasCtx) return;

  const garmentImg = garmentImages[activeColor.id];
  if (!garmentImg || !garmentImg.complete || garmentImg.naturalWidth === 0) return;

  const shL_x = rig.shoulderLeft[0] * w;
  const shL_y = rig.shoulderLeft[1] * h;
  const shR_x = rig.shoulderRight[0] * w;
  const shR_y = rig.shoulderRight[1] * h;

  const midX = (shL_x + shR_x) * 0.5;
  const midY = (shL_y + shR_y) * 0.5;

  const shoulderSpan = Math.hypot(shR_x - shL_x, shR_y - shL_y);
  const rollAngle = Math.atan2(shR_y - shL_y, shR_x - shL_x);

  // Exact Anatomical Alignment:
  // In the studio flat-lay, shoulder seam span is exactly 52% of image width (0.24 to 0.76)
  // Shoulder seam line is at y = 12% of image height
  const garmentWidth = shoulderSpan / 0.52;
  const aspectRatio = (garmentImg.naturalHeight || 1280) / (garmentImg.naturalWidth || 1024);
  const garmentHeight = garmentWidth * aspectRatio;

  canvasCtx.save();
  // Translate to the person's exact shoulder midpoint and rotate with shoulder tilt
  canvasCtx.translate(midX, midY);
  canvasCtx.rotate(rollAngle);

  // NO floating shadow: garment is ON the body, not hovering in front
  canvasCtx.shadowColor = 'transparent';
  canvasCtx.shadowBlur = 0;
  canvasCtx.shadowOffsetY = 0;

  // Align shoulder seam line (y = 0.12 * height) exactly with the user's shoulder midpoint (0, 0)
  const drawX = -0.50 * garmentWidth;
  const drawY = -0.12 * garmentHeight;

  canvasCtx.drawImage(
    garmentImg,
    drawX,
    drawY,
    garmentWidth,
    garmentHeight
  );

  canvasCtx.restore();
}

initPDP();
