export interface CameraResolution {
  width: number;
  height: number;
}

export interface CameraManagerOptions {
  preferredFacingMode?: 'user' | 'environment';
  targetResolution?: CameraResolution;
  onPermissionDenied?: (error: Error) => void;
  onStreamStarted?: (stream: MediaStream) => void;
  onStreamStopped?: () => void;
}

export class CameraManager {
  private videoElement: HTMLVideoElement;
  private currentStream: MediaStream | null = null;
  private options: CameraManagerOptions;
  private visibilityTimeout: ReturnType<typeof setTimeout> | null = null;
  private isRunning = false;

  constructor(videoElement: HTMLVideoElement, options: CameraManagerOptions = {}) {
    this.videoElement = videoElement;
    this.options = {
      preferredFacingMode: 'user',
      targetResolution: { width: 640, height: 480 },
      ...options
    };

    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  public async start(): Promise<MediaStream> {
    if (this.isRunning && this.currentStream) {
      return this.currentStream;
    }

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        facingMode: this.options.preferredFacingMode,
        width: { ideal: this.options.targetResolution?.width ?? 640 },
        height: { ideal: this.options.targetResolution?.height ?? 480 }
      }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.currentStream = stream;
      this.videoElement.srcObject = stream;
      this.videoElement.playsInline = true;
      this.videoElement.muted = true;

      // Mirror front-facing camera in CSS
      if (this.options.preferredFacingMode === 'user') {
        this.videoElement.style.transform = 'scaleX(-1)';
      } else {
        this.videoElement.style.transform = 'none';
      }

      await new Promise<void>((resolve) => {
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play().then(() => resolve());
        };
      });

      this.isRunning = true;
      document.addEventListener('visibilitychange', this.handleVisibilityChange);

      if (this.options.onStreamStarted) {
        this.options.onStreamStarted(stream);
      }

      return stream;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (this.options.onPermissionDenied) {
        this.options.onPermissionDenied(error);
      }
      throw error;
    }
  }

  public stop(): void {
    if (this.visibilityTimeout) {
      clearTimeout(this.visibilityTimeout);
      this.visibilityTimeout = null;
    }

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    if (this.currentStream) {
      for (const track of this.currentStream.getTracks()) {
        track.stop();
      }
      this.currentStream = null;
    }

    this.videoElement.srcObject = null;
    this.isRunning = false;

    if (this.options.onStreamStopped) {
      this.options.onStreamStopped();
    }
  }

  public getStream(): MediaStream | null {
    return this.currentStream;
  }

  public isActive(): boolean {
    return this.isRunning && this.currentStream !== null;
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      // Rule 7 & 14: Stop camera immediately if tab is hidden for more than 10 seconds
      this.visibilityTimeout = setTimeout(() => {
        if (document.hidden && this.isRunning) {
          console.warn('[LiveTry] Tab hidden > 10s: Stopping camera stream for privacy.');
          this.stop();
        }
      }, 10000);
    } else {
      if (this.visibilityTimeout) {
        clearTimeout(this.visibilityTimeout);
        this.visibilityTimeout = null;
      }
    }
  }
}
