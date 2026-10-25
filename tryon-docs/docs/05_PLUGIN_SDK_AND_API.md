# 05 — Plugin SDK and API

## 1. Storefront Embedding

```html
<script
  src="https://cdn.livetry.example/widget/v1/livetry.js"
  data-shop-id="SHOP_ID"
  data-product-id-selector="[data-product-id]"
  data-button-anchor=".add-to-cart-button"
  data-button-position="after"
  async></script>
```

### JavaScript Client API

```ts
// Initialize with shop context
window.LiveTry.init({ shopId, productId, variantId?, theme?, locale? });

// Open virtual fitting room
window.LiveTry.open(productId, variantId?);

// Dynamically change variant or garment while streaming
window.LiveTry.setVariant(variantId);

// Close and release camera tracks
window.LiveTry.close();
```

## 2. Backend & Cloud Endpoints

### POST `/api/tryon/token`
Generates a short-lived ephemeral client token for the shopper's active WebRTC session without exposing the store's permanent `DECART_API_KEY`.
- **Response**: `{ "status": "success", "apiKey": "client_tok_...", "expiresIn": 600 }`
- **TTL**: 10 minutes.

### GET `/api/tryon/config`
Reports backend capabilities and active VTON engines:
- **Response**:
  ```json
  {
    "engine": "decart-webrtc",
    "decart_configured": true,
    "models": {
      "realtime": "lucy-vton-latest",
      "local_device": "mps"
    }
  }
  ```

### GET `/v1/products/{id}/tryon-asset`
Returns product metadata, colorways, and clean isolated garment cutout URLs.
