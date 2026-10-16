# 06 — Privacy and Safety

Not legal advice. Have a qualified lawyer review before launch (India: Digital Personal Data Protection Act, 2023; also consider GDPR if serving EU shoppers).

## 1. Principle

The shopper's camera video is the most sensitive data in the product. **It never leaves the device.** All inference and rendering are local. This is both a legal safeguard and the main sales point to shops and shoppers.

## 2. Rules (enforced by tests)

1. No camera frame, mask, landmark data, or image derived from video is uploaded, sent via any network request (fetch, XHR, WebSocket, beacon, image pixel), or written to persistent storage.
2. Camera starts only after the user clicks Try On **and** accepts a consent screen.
3. The consent screen states, in plain language: what the camera is used for, that video stays on the device, that nothing is recorded or saved, and that this shows how clothes look, not size.
4. Camera tracks stop immediately on close, tab hide (> 10 s), navigation, or error.
5. No screenshots/recording features in v1.
6. Analytics are aggregate, anonymous, and contain no identifiers that persist across sessions. No cookies set by the widget.
7. Models and assets are fetched from LiveTry CDN with checksums; no third-party trackers.

## 3. Verification

- Automated e2e test (Playwright with a fake camera device) runs a 60 s session and records all network requests; the test fails if any request body or URL contains image-like data (blob/dataURL/base64 > 2 KB, `image/*` or `video/*` content types) or any request goes to an origin outside the allowed list.
- A static check forbids use of `canvas.toDataURL`, `toBlob`, `MediaRecorder`, `ImageCapture.takePhoto`, and `localStorage/IndexedDB` writes in camera-related code, with documented exceptions for asset/model caching (Cache Storage for **assets and models only**).
- Manual privacy review checklist before each release.

## 4. Data stored server-side

Only shop-owned data: product metadata, product images, derived garment assets, aggregate analytics. No shopper PII. If the Shopify/Woo integration exposes customer data through webhooks, ignore and do not store it.

## 5. Security

- Widget in Shadow DOM, strict CSP-compatible (no inline eval, no remote scripts besides the CDN and model files).
- Subresource Integrity or checksum verification for model files.
- API: HTTPS only, HSTS, input validation, rate limiting, shop-scoped tokens, per-shop `allowed_origins`.
- Dashboard: standard OWASP protections, CSRF protection, role-based access (owner/staff).
- Secrets in a secrets manager, never in the repo.
- Dependency scanning in CI.

## 6. User-facing safety

- Do not display body-shaming or evaluative language. The product shows clothes on the person, never comments on their body.
- Minors: the widget does not collect age; shops decide where to enable it. The consent text is simple, and nothing is stored.
- Accessibility: instructions available as text; no flashing content; respects `prefers-reduced-motion` for fades.

## 7. Copy (starting text, refine with UX writing)

Consent screen:
> **Try this on using your camera**
> Your camera is used only to show this item on you, live. Nothing is recorded, saved, or sent anywhere — everything stays on your device. This shows how it looks, not how it fits.
> [Start camera] [Not now]

In-view reminder: "Shows how it looks, not how it fits."
