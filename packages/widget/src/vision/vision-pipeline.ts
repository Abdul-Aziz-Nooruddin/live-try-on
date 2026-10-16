import {
  FilesetResolver,
  PoseLandmarker,
  ImageSegmenter,
  type PoseLandmarkerResult,
  type ImageSegmenterResult,
  type NormalizedLandmark
} from '@mediapipe/tasks-vision';

export interface VisionFrameResult {
  timestampMs: number;
  landmarks: NormalizedLandmark[] | null;
  worldLandmarks: NormalizedLandmark[] | null;
  poseConfidence: number;
  segmentationMask: Float32Array | Uint8Array | null;
  maskWidth: number;
  maskHeight: number;
}

export interface VisionPipelineOptions {
  useGpu?: boolean;
  enableSegmentation?: boolean;
  onModelLoaded?: () => void;
  onError?: (err: Error) => void;
}

export class VisionPipeline {
  private poseLandmarker: PoseLandmarker | null = null;
  private imageSegmenter: ImageSegmenter | null = null;
  private isProcessing = false;
  private isInitialized = false;
  private options: VisionPipelineOptions;

  constructor(options: VisionPipelineOptions = {}) {
    this.options = {
      useGpu: true,
      enableSegmentation: true,
      ...options
    };
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm'
      );

      const delegate = this.options.useGpu ? 'GPU' : 'CPU';

      // 1. Initialize Pose Landmarker (lite model for low latency)
      try {
        this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputSegmentationMasks: false
        });
      } catch (gpuErr) {
        if (delegate === 'GPU') {
          console.warn('[LiveTry] GPU delegate failed for PoseLandmarker, falling back to CPU:', gpuErr);
          this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
              delegate: 'CPU'
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
            outputSegmentationMasks: false
          });
        } else {
          throw gpuErr;
        }
      }

      // 2. Initialize Multiclass Image Segmenter if requested
      if (this.options.enableSegmentation) {
        try {
          this.imageSegmenter = await ImageSegmenter.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite',
              delegate
            },
            runningMode: 'VIDEO',
            outputCategoryMask: true,
            outputConfidenceMasks: false
          });
        } catch (segmenterErr) {
          console.warn('[LiveTry] Multiclass Segmenter init warning (will continue with pose only):', segmenterErr);
        }
      }

      this.isInitialized = true;
      if (this.options.onModelLoaded) {
        this.options.onModelLoaded();
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (this.options.onError) {
        this.options.onError(error);
      }
      throw error;
    }
  }

  public processFrame(videoElement: HTMLVideoElement, timestampMs: number): VisionFrameResult | null {
    if (!this.isInitialized || !this.poseLandmarker) {
      return null;
    }

    // Pull-based: drop stale frame if previous inference is still executing
    if (this.isProcessing) {
      return null;
    }

    if (videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return null;
    }

    this.isProcessing = true;
    try {
      const poseResult: PoseLandmarkerResult = this.poseLandmarker.detectForVideo(videoElement, timestampMs);

      let landmarks: NormalizedLandmark[] | null = null;
      let worldLandmarks: NormalizedLandmark[] | null = null;
      let poseConfidence = 0;

      if (poseResult.landmarks && poseResult.landmarks.length > 0 && poseResult.landmarks[0]) {
        landmarks = poseResult.landmarks[0];
        worldLandmarks = (poseResult.worldLandmarks && poseResult.worldLandmarks[0]) || null;

        // Compute average visibility/confidence across core upper body points (11, 12, 23, 24)
        const upperIndices = [11, 12, 23, 24];
        let sumVis = 0;
        let count = 0;
        for (const idx of upperIndices) {
          const pt = landmarks[idx];
          if (pt && typeof pt.visibility === 'number') {
            sumVis += pt.visibility;
            count++;
          }
        }
        poseConfidence = count > 0 ? sumVis / count : 1.0;
      }

      let categoryMask: Uint8Array | null = null;
      let maskWidth = 0;
      let maskHeight = 0;

      if (this.imageSegmenter) {
        try {
          const segmentResult: ImageSegmenterResult = this.imageSegmenter.segmentForVideo(videoElement, timestampMs);
          if (segmentResult.categoryMask) {
            maskWidth = segmentResult.categoryMask.width;
            maskHeight = segmentResult.categoryMask.height;
            categoryMask = segmentResult.categoryMask.getAsUint8Array();
          }
        } catch {
          // Segmenter skipped for frame
        }
      }

      return {
        timestampMs,
        landmarks,
        worldLandmarks,
        poseConfidence,
        segmentationMask: categoryMask,
        maskWidth,
        maskHeight
      };
    } catch (err) {
      console.error('[LiveTry] Frame inference error:', err);
      return null;
    } finally {
      this.isProcessing = false;
    }
  }

  public dispose(): void {
    if (this.poseLandmarker) {
      this.poseLandmarker.close();
      this.poseLandmarker = null;
    }
    if (this.imageSegmenter) {
      this.imageSegmenter.close();
      this.imageSegmenter = null;
    }
    this.isInitialized = false;
    this.isProcessing = false;
  }
}
