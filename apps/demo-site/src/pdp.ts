import { CameraManager } from '@livetry/widget/src/camera/camera-manager.js';
import { VisionPipeline, type VisionFrameResult } from '@livetry/widget/src/vision/vision-pipeline.js';
import { BodyRigTracker, GenerativeVTonClient } from '@livetry/tryon-core';

// Colorway Product Catalog
interface GarmentVariant {
  id: string;
  name: string;
  hex: string;
  image: string;
  description: string;
}

const GARMENT_VARIANTS: Record<string, GarmentVariant> = {
  charcoal: {
    id: 'charcoal',
    name: 'Charcoal',
    hex: '#2b2926',
    image: '/fixtures/sample-tshirt.png',
    description: 'Classic heavyweight boxy tee in washed charcoal organic cotton'
  },
  oatmeal: {
    id: 'oatmeal',
    name: 'Oatmeal',
    hex: '#e2ded7',
    image: '/fixtures/oatmeal-tshirt.jpg',
    description: 'Classic heavyweight boxy tee in natural oatmeal melange organic cotton'
  },
  olive: {
    id: 'olive',
    name: 'Olive',
    hex: '#4b4b3b',
    image: '/fixtures/olive-tshirt.jpg',
    description: 'Classic heavyweight boxy tee in muted olive sage organic cotton'
  }
};

let activeColor: GarmentVariant = GARMENT_VARIANTS.charcoal;
let selectedSize = 'M';
let bagCount = 0;

// DOM Elements
const tryonScrim = document.getElementById('tryon-scrim') as HTMLDivElement;
const consentView = document.getElementById('consent-view') as HTMLDivElement;
const liveView = document.getElementById('live-view') as HTMLDivElement;
const btnOpenTryOn = document.getElementById('pdp-try-on') as HTMLButtonElement;
const btnStartCamera = document.getElementById('btn-start-camera') as HTMLButtonElement;
const btnDismissConsent = document.getElementById('btn-dismiss-consent') as HTMLButtonElement;
const btnExitTryon = document.getElementById('btn-exit-tryon') as HTMLButtonElement;

const videoElement = document.getElementById('webcam-video') as HTMLVideoElement;
const cameraStatusText = document.getElementById('pdp-camera-status') as HTMLSpanElement;

// Shutter & Controls
const btnGenerateTryOn = document.getElementById('btn-generate-tryon') as HTMLButtonElement;
const shutterBar = document.getElementById('viewfinder-shutter-bar') as HTMLDivElement;
const poseGuideSvg = document.getElementById('pose-guide-svg') as SVGElement;

// Generating Overlay
const generatingOverlay = document.getElementById('generating-overlay') as HTMLDivElement;
const generatingStepText = document.getElementById('generating-step-text') as HTMLParagraphElement;
const progressFill = document.getElementById('progress-fill') as HTMLDivElement;

// Result Viewport & Split Slider
const resultViewport = document.getElementById('result-viewport') as HTMLDivElement;
const splitSliderContainer = document.getElementById('split-slider-container') as HTMLDivElement;
const beforeLayer = document.getElementById('before-layer') as HTMLDivElement;
const beforeImg = document.getElementById('before-img') as HTMLImageElement;
const afterImg = document.getElementById('after-img') as HTMLImageElement;
const splitDividerHandle = document.getElementById('split-divider-handle') as HTMLDivElement;
const btnRetake = document.getElementById('btn-retake') as HTMLButtonElement;
const btnDownloadLook = document.getElementById('btn-download-look') as HTMLButtonElement;

// Side Panel Controls
const modalActiveColorName = document.getElementById('modal-active-color-name') as HTMLSpanElement;
const btnModalAddToBag = document.getElementById('btn-modal-add-to-bag') as HTMLButtonElement;
const bagCountBadges = document.querySelectorAll('.bag-count');

// Pipelines & Clients
let cameraManager: CameraManager | null = null;
let visionPipeline: VisionPipeline | null = null;
let rigTracker: BodyRigTracker | null = null;
const vtonClient = new GenerativeVTonClient({ provider: 'neural-simulator' });

let isLoopRunning = false;
let capturedCustomerDataUrl = '';
let generatedResultDataUrl = '';

async function initPDP() {
  rigTracker = new BodyRigTracker({ mirror: true });

  // Hook Modal Triggers
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
      cameraStatusText.textContent = 'Starting camera...';
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

  // Colorway Swatches and Pills synchronization
  setupColorSelection();

  // Size Selection
  setupSizeSelection();

  // Shutter / Generate Try-On Button
  btnGenerateTryOn?.addEventListener('click', () => {
    triggerGenerativeTryOn();
  });

  // Retake Pose Button
  btnRetake?.addEventListener('click', () => {
    resetToViewfinder();
  });

  // Download Look Button
  btnDownloadLook?.addEventListener('click', () => {
    if (!generatedResultDataUrl) return;
    const a = document.createElement('a');
    a.href = generatedResultDataUrl;
    a.download = `Studio-Aelia-TryOn-${activeColor.name}-${selectedSize}.jpg`;
    a.click();
  });

  // Add to Bag Buttons
  btnModalAddToBag?.addEventListener('click', () => {
    addToBag();
  });

  const btnPdpAddToBag = document.querySelector('.btn-add-to-bag') as HTMLButtonElement;
  btnPdpAddToBag?.addEventListener('click', () => {
    addToBag();
  });

  // Interactive Split Slider Dragging
  setupSplitSlider();
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

      // Sync active classes
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

      // If in result view, automatically regenerate with the new colorway
      if (resultViewport.classList.contains('visible') && capturedCustomerDataUrl) {
        triggerGenerativeTryOn(true);
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
  resetToViewfinder();
}

async function startLiveTryon() {
  cameraManager = new CameraManager(videoElement, {
    preferredFacingMode: 'user',
    targetResolution: { width: 640, height: 480 },
    onStreamStopped: () => closeModal()
  });

  await cameraManager.start();

  visionPipeline = new VisionPipeline({
    useGpu: true,
    enableSegmentation: false,
    onModelLoaded: () => {
      cameraStatusText.textContent = 'Generative V-TON Ready';
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

  // Monitor posture alignment
  const visionResult: VisionFrameResult | null = visionPipeline?.processFrame(videoElement, timestamp) ?? null;

  if (visionResult?.landmarks && rigTracker) {
    const rigState = rigTracker.update(visionResult.landmarks, timestamp * 0.001);
    if (rigState?.isFrontFacing) {
      cameraStatusText.textContent = 'Torso Aligned • Ready';
    } else {
      cameraStatusText.textContent = 'Face Camera Directly';
    }
  }

  requestAnimationFrame(renderLoop);
}

// Capture current video frame to base64 data URL with proper horizontal mirroring
function captureVideoFrame(): string {
  const canvas = document.createElement('canvas');
  const w = videoElement.videoWidth || 640;
  const h = videoElement.videoHeight || 480;
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Mirror horizontally so the capture matches the selfie mirror perspective
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(videoElement, 0, 0, w, h);

  return canvas.toDataURL('image/jpeg', 0.95);
}

async function triggerGenerativeTryOn(reuseSnapshot = false) {
  if (!reuseSnapshot) {
    capturedCustomerDataUrl = captureVideoFrame();
    if (!capturedCustomerDataUrl) return;
  }

  // 1. Hide viewfinder controls, display Generating Loading Screen
  shutterBar.style.display = 'none';
  poseGuideSvg.style.display = 'none';
  resultViewport.classList.remove('visible');
  generatingOverlay.classList.add('visible');

  // 2. Animate Editorial Progress Steps
  progressFill.style.width = '15%';
  generatingStepText.textContent = 'Segmenting anatomical torso contours...';

  const t1 = setTimeout(() => {
    progressFill.style.width = '45%';
    generatingStepText.textContent = 'Erasing underlying garments & collar...';
  }, 400);

  const t2 = setTimeout(() => {
    progressFill.style.width = '75%';
    generatingStepText.textContent = `Draping ${activeColor.name} organic combed cotton...`;
  }, 850);

  const t3 = setTimeout(() => {
    progressFill.style.width = '95%';
    generatingStepText.textContent = 'Synthesizing authentic micro-wrinkles & lighting...';
  }, 1200);

  try {
    const result = await vtonClient.runTryOn({
      personImage: capturedCustomerDataUrl,
      garmentImage: activeColor.image,
      garmentDescription: activeColor.description,
      category: 'tops',
      mode: 'quality'
    });

    clearTimeout(t1);
    clearTimeout(t2);
    clearTimeout(t3);

    progressFill.style.width = '100%';
    generatedResultDataUrl = result.outputImageUrl;

    // Display Photorealistic Before / After Result
    beforeImg.src = capturedCustomerDataUrl;
    afterImg.src = generatedResultDataUrl;

    // Reset split slider to 50%
    setSplitPercentage(50);

    setTimeout(() => {
      generatingOverlay.classList.remove('visible');
      resultViewport.classList.add('visible');
      cameraStatusText.textContent = `Photorealistic Try-On (${result.inferenceTimeMs}ms)`;
    }, 200);
  } catch (err) {
    console.error('[LiveTry] Generative try-on error:', err);
    generatingOverlay.classList.remove('visible');
    resetToViewfinder();
    alert('Generative try-on service was interrupted. Please try again.');
  }
}

function resetToViewfinder() {
  resultViewport.classList.remove('visible');
  generatingOverlay.classList.remove('visible');
  shutterBar.style.display = 'flex';
  poseGuideSvg.style.display = 'block';
  cameraStatusText.textContent = 'Generative V-TON Ready';
}

function setSplitPercentage(percent: number) {
  const clamped = Math.max(0, Math.min(100, percent));
  beforeLayer.style.width = `${clamped}%`;
  splitDividerHandle.style.left = `${clamped}%`;
}

function setupSplitSlider() {
  let isDragging = false;

  const updateFromPointer = (clientX: number) => {
    const rect = splitSliderContainer.getBoundingClientRect();
    if (rect.width <= 0) return;
    const offsetX = clientX - rect.left;
    const percent = (offsetX / rect.width) * 100;
    setSplitPercentage(percent);
  };

  splitSliderContainer?.addEventListener('pointerdown', (e) => {
    isDragging = true;
    splitSliderContainer.setPointerCapture(e.pointerId);
    updateFromPointer(e.clientX);
  });

  splitSliderContainer?.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    updateFromPointer(e.clientX);
  });

  splitSliderContainer?.addEventListener('pointerup', (e) => {
    isDragging = false;
    splitSliderContainer.releasePointerCapture(e.pointerId);
  });

  splitSliderContainer?.addEventListener('pointercancel', (e) => {
    isDragging = false;
    splitSliderContainer.releasePointerCapture(e.pointerId);
  });
}

initPDP();
