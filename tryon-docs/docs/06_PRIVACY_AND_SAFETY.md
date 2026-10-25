# 06 — Privacy and Safety

## 1. Ephemeral In-Memory Processing Principle
The shopper's live webcam video is processed **strictly in-memory (GPU VRAM) on ephemeral WebRTC streams**. Live camera frames are transformed by the generative model in real time and immediately discarded after delivery to the browser screen.

## 2. Hard Privacy Guarantees
1. **Zero Persistent Storage**: Neither the browser widget nor the cloud streaming infrastructure ever saves raw video frames, biometric data, or processed streams to disk or database.
2. **Zero Training on Shopper Data**: Customer streams are completely excluded from AI model training and logging.
3. **Short-Lived Ephemeral Client Tokens**: Permanent store API keys are never exposed in browser bundles. The client requests temporary tokens (10-minute TTL) from `/api/tryon/token`.
4. **Explicit Consent**: Camera access is never activated automatically. The shopper must click "Try On" and grant permission through an explicit consent dialog.
5. **Immediate Stream Cut-Off**: All camera media tracks and WebRTC peer connections terminate immediately when the try-on modal closes or when the user navigates away.

## 3. Shopper Consent Copy
> **Try this on using your camera**  
> Your camera is used only to show this item on you, live. Nothing is recorded, saved, or stored. Everything is processed ephemerally.  
> *Shows how it looks, not how it fits.*  
> `[Start Camera]` `[Not Now]`
