import { createDecartClient, models } from "@decartai/sdk";
import type { RealTimeClient, ConnectionState } from "@decartai/sdk";
export { createDecartClient, models };
export type { RealTimeClient, ConnectionState };

export interface DecartEngineConfig {
  apiKey?: string;
  tokenProvider?: () => Promise<string>;
  modelName?: string;
  mirror?: "auto" | boolean;
  resolution?: "720p" | "1080p";
  speed?: "fast";
  preferredVideoCodec?: "h264" | "vp8" | "vp9";
}

export interface DecartGarmentInput {
  imageUrl: string | Blob;
  prompt: string;
}

export interface DecartSessionCallbacks {
  onRemoteStream: (stream: MediaStream) => void;
  onConnectionChange?: (state: ConnectionState) => void;
  onError?: (error: Error) => void;
  onGenerationTick?: (seconds: number) => void;
}

/**
 * Resolves any garment input (Decart file ref, data URL, blob, or URL path)
 * into a valid Decart image input (file_... reference ID or JPEG data URL).
 */
async function resolveGarmentImageInput(imageUrl: string | Blob, maxDim = 768): Promise<string | null> {
  if (!imageUrl) return null;

  // 1. Direct Decart cloud file reference (fastest & most reliable)
  if (typeof imageUrl === "string" && imageUrl.startsWith("file_")) {
    return imageUrl;
  }

  // 2. Direct data URL
  if (typeof imageUrl === "string" && imageUrl.startsWith("data:")) {
    return imageUrl;
  }

  // 3. Image URL or Blob: Fetch blob to bypass any CORS restrictions on <img>
  try {
    let blob: Blob;
    if (typeof imageUrl === "string") {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      blob = await res.blob();
    } else {
      blob = imageUrl;
    }

    return new Promise<string | null>((resolve) => {
      const objectUrl = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        try {
          URL.revokeObjectURL(objectUrl);
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(null);
            return;
          }

          // Paint solid white background to avoid transparent PNG cutouts turning black
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);

          // Draw garment image
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
          resolve(dataUrl);
        } catch (err) {
          console.warn("[Decart VTON Engine] Canvas processing error:", err);
          resolve(null);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        console.warn("[Decart VTON Engine] Image decode error:", imageUrl);
        resolve(null);
      };

      img.src = objectUrl;
    });
  } catch (err) {
    console.warn("[Decart VTON Engine] Failed to fetch garment image:", imageUrl, err);
    return null;
  }
}

// In-memory cache for resolved garment Data URLs to avoid repeated canvas re-renders
const GARMENT_DATA_URL_CACHE = new Map<string, string>();

async function getGarmentDataUrl(imageUrl: string | Blob): Promise<string | null> {
  if (!imageUrl) return null;
  if (typeof imageUrl === "string" && imageUrl.startsWith("data:")) {
    return imageUrl;
  }
  if (typeof imageUrl === "string" && GARMENT_DATA_URL_CACHE.has(imageUrl)) {
    const cached = GARMENT_DATA_URL_CACHE.get(imageUrl)!;
    console.log(`[Decart VTON Engine] Reusing cached garment Data URL for: ${imageUrl}`);
    return cached;
  }
  const dataUrl = await resolveGarmentImageInput(imageUrl);
  if (dataUrl && typeof imageUrl === "string") {
    GARMENT_DATA_URL_CACHE.set(imageUrl, dataUrl);
  }
  return dataUrl;
}

export class DecartRealtimeVtonEngine {
  private client: ReturnType<typeof createDecartClient> | null = null;
  private activeSession: RealTimeClient | null = null;
  private connectedModel: string | null = null;
  private config: DecartEngineConfig;

  constructor(config: DecartEngineConfig = {}) {
    this.config = config;
  }

  public getActiveModel(): string | null {
    return this.connectedModel;
  }

  public setApiKey(apiKey: string) {
    this.config.apiKey = apiKey;
    this.client = null;
  }

  private getClient(): ReturnType<typeof createDecartClient> {
    if (this.client) {
      return this.client;
    }

    if (this.config.tokenProvider) {
      this.client = createDecartClient({
        apiKeyProvider: this.config.tokenProvider,
      });
    } else if (this.config.apiKey) {
      this.client = createDecartClient({
        apiKey: this.config.apiKey,
      });
    } else {
      throw new Error(
        "DecartRealtimeVtonEngine requires either an apiKey or a tokenProvider."
      );
    }

    return this.client;
  }

  /**
   * Connect a live webcam stream to Decart's Lucy VTON model via WebRTC
   * using the official Anywhere substitution prompt formula.
   */
  public async startStream(
    stream: MediaStream,
    garment: DecartGarmentInput | string,
    callbacks: DecartSessionCallbacks
  ): Promise<RealTimeClient> {
    this.stopStream();
    this.client = null; // Always ensure a completely fresh client instance

    const client = this.getClient();
    const rawImageUrl = typeof garment === "string" ? garment : garment.imageUrl;
    const promptText =
      typeof garment === "string"
        ? `Substitute only the shirt. Replace the clothing with ${garment}. Preserve the exact person’s face, head, hair, skin tone, neck, hands, body proportions, and background completely identical to the live camera stream without alteration. Do not modify or replace the person.`
        : garment.prompt;

    // Resolve garment input (generates high-fidelity white-backed JPEG data URL for neural conditioning)
    console.log("[Decart VTON Engine] Resolving garment reference input:", rawImageUrl);
    const garmentImageInput = await getGarmentDataUrl(rawImageUrl);
    if (garmentImageInput) {
      const sizeKb = Math.round((garmentImageInput.length * 3) / 4 / 1024);
      console.log(`[Decart VTON Engine] Garment image prepared: ~${sizeKb} KB`);
    } else {
      console.warn("[Decart VTON Engine] Warning: Could not resolve garment image input");
    }

    // STRICT VTON MODEL REGISTRY:
    // Only use dedicated Virtual Try-On models (lucy-vton-3.6 canonical, lucy-vton-latest, lucy-vton-3.5).
    // Prioritizing canonical lucy-vton-3.6 prevents alias queue stalls.
    // NEVER fall back to generative world models like "lucy-2.5" which hallucinate synthetic faces and forest scenes!
    const candidateModels = [
      (this.config.modelName || "lucy-vton-3.6"),
      "lucy-vton-3.6",
      "lucy-vton-latest",
      "lucy-vton-3.5",
    ].filter((m, i, arr) => arr.indexOf(m) === i);

    let session: RealTimeClient | null = null;
    let lastError: any = null;

    const tryConnectWithModel = async (modelName: string): Promise<RealTimeClient> => {
      console.log(`[Decart VTON Engine] Dialing WebRTC with dedicated VTON model: "${modelName}"...`);
      const model = models.realtime(modelName as any);

      return new Promise<RealTimeClient>(async (resolve, reject) => {
        let currentSession: RealTimeClient | null = null;
        let timeoutHandle: any = null;
        let isDone = false;

        const cleanupTimer = () => {
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
            timeoutHandle = null;
          }
        };

        try {
          const connectOpts: any = {
            model,
            mirror: this.config.mirror ?? false,
            resolution: this.config.resolution ?? "720p",
            preferredVideoCodec: this.config.preferredVideoCodec ?? "h264",
            initialState: {
              prompt: {
                text: promptText,
                enhance: false,
              },
              ...(garmentImageInput ? { image: garmentImageInput } : {}),
            },
            onRemoteStream: (remoteStream: MediaStream) => {
              console.log(`[Decart VTON Engine] Remote transformed video track arrived for ${modelName}!`, {
                id: remoteStream.id,
                videoTracks: remoteStream.getVideoTracks().length,
              });
              if (!isDone) {
                isDone = true;
                cleanupTimer();
                resolve(currentSession!);
              }
              callbacks.onRemoteStream(remoteStream);
            },
            onConnectionChange: (state: any) => {
              console.log(`[Decart VTON Engine] Connection state (${modelName}): ${state}`);
              callbacks.onConnectionChange?.(state);
            },
          };

          if (this.config.speed) {
            connectOpts.speed = this.config.speed;
          }

          currentSession = await client.realtime.connect(stream, connectOpts);

          // Listen for early disconnection or credit errors during negotiation
          currentSession.on("error", (err: any) => {
            console.warn(`[Decart VTON Engine] Session error (${modelName}):`, err);
            if (!isDone) {
              isDone = true;
              cleanupTimer();
              reject(err instanceof Error ? err : new Error(String(err?.message || err)));
            }
          });

          currentSession.on("sessionEnded", (reason: any) => {
            console.warn(`[Decart VTON Engine] Session ended (${modelName}):`, reason);
            if (!isDone) {
              isDone = true;
              cleanupTimer();
              reject(new Error(`Decart session ended: ${reason}`));
            }
          });

          // Timeout: Allow 25 seconds for Decart GPU worker to synthesize first keyframe
          timeoutHandle = setTimeout(() => {
            if (!isDone) {
              isDone = true;
              console.warn(`[Decart VTON Engine] Model "${modelName}" timed out waiting for remote video track.`);
              try {
                currentSession?.disconnect();
              } catch (_) {}
              reject(new Error(`Model "${modelName}" timed out waiting for remote video track`));
            }
          }, 25000);

        } catch (err) {
          cleanupTimer();
          if (!isDone) {
            isDone = true;
            reject(err);
          }
        }
      });
    };

    for (const modelName of candidateModels) {
      try {
        session = await tryConnectWithModel(modelName);
        this.connectedModel = modelName;
        console.log(`[Decart VTON Engine] Successfully connected and streaming with model: "${modelName}"`);
        break;
      } catch (err: any) {
        console.warn(`[Decart VTON Engine] Candidate model "${modelName}" did not stream:`, err?.message || err);
        lastError = err;
      }
    }

    if (!session) {
      throw lastError || new Error("Failed to connect to Decart WebRTC with any available model.");
    }

    // Attach lifecycle and observability listeners
    session.on("generationTick", (tick) => {
      callbacks.onGenerationTick?.(tick.seconds);
    });

    session.on("generationEnded", (ended) => {
      console.warn("[Decart VTON Engine] Generation ended:", ended);
      if (ended && typeof ended === "object" && (ended as any).reason === "insufficient_credits") {
        callbacks.onError?.(new Error("Insufficient credits on active Decart key. Rotating key..."));
      }
    });

    session.on("sessionEnded", (reason) => {
      console.warn("[Decart VTON Engine] Session ended:", reason);
      callbacks.onError?.(new Error(`Decart session ended: ${reason}`));
    });

    session.on("error", (err) => {
      console.error("[Decart VTON Engine] Error:", err);
      callbacks.onError?.(new Error(err.message || "Decart WebRTC error"));
    });

    this.activeSession = session;
    return session;
  }

  /**
   * Dynamically update the garment image or style prompt on the fly
   */
  public async setGarment(garment: DecartGarmentInput | string): Promise<void> {
    if (!this.activeSession) {
      console.warn("[Decart VTON Engine] Cannot set garment: No active session");
      return;
    }

    const rawImageUrl = typeof garment === "string" ? garment : garment.imageUrl;
    const promptText =
      typeof garment === "string"
        ? `Change the shirt to ${garment}`
        : garment.prompt;

    const garmentImageInput = await getGarmentDataUrl(rawImageUrl);

    console.log(`[Decart VTON Engine] Updating garment on the fly: "${promptText}"`);
    try {
      await this.activeSession.set({
        prompt: promptText,
        ...(garmentImageInput ? { image: garmentImageInput } : {}),
        enhance: false,
      });
      console.log("[Decart VTON Engine] Garment swap acknowledged!");
    } catch (err) {
      console.error("[Decart VTON Engine] Failed to swap garment on the fly:", err);
    }
  }

  public isStreaming(): boolean {
    return this.activeSession !== null && this.activeSession.isConnected();
  }

  public stopStream(): void {
    if (this.activeSession) {
      try {
        this.activeSession.disconnect();
      } catch (e) {
        console.warn("Error disconnecting Decart session:", e);
      }
      this.activeSession = null;
      this.connectedModel = null;
    }
    this.client = null;
  }
}

