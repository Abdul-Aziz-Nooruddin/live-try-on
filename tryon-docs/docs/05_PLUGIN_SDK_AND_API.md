# 05 — Plugin SDK and API

## 1. Embedding (generic site)

```html
<script
  src="https://cdn.livetry.example/widget/v1/livetry.js"
  data-shop-id="SHOP_ID"
  data-product-id-selector="[data-product-id]"
  data-button-anchor=".add-to-cart-button"
  data-button-position="after"
  async></script>
```

Attributes:

| Attribute | Meaning |
|---|---|
| `data-shop-id` | Shop identifier (public) |
| `data-product-id` | Alternative: set product id directly on the script tag for a single product page |
| `data-product-id-selector` | CSS selector whose attribute/text gives the external product id |
| `data-button-anchor` | CSS selector of the element next to which the Try On button is inserted (Add to Cart) |
| `data-button-position` | `before` or `after` the anchor |
| `data-theme` | `light`, `dark`, or `auto` |
| `data-locale` | `en`, `hi`, `te` (extendable) |

JS API:

```ts
window.LiveTry.init({ shopId, productId, variantId?, theme?, locale? })
window.LiveTry.open(productId, variantId?)
window.LiveTry.close()
window.LiveTry.setVariant(variantId)
window.LiveTry.on('start' | 'stop' | 'fps-drop' | 'error', handler)
```

Behavior rules:
- The widget first calls the asset endpoint; **the button is only inserted if the product is `approved`**.
- Models and heavy code load lazily after the first click.
- All widget code is wrapped in try/catch boundaries; a failure never breaks the host page. Use Shadow DOM for UI to avoid CSS conflicts.
- If the host's Content Security Policy blocks the widget, log a clear console message and do nothing else.

## 2. Public API (read, cacheable)

### GET `/v1/products/{externalId}/tryon-asset`
Query: `shop={shopId}&variant={variantId}`
Returns the garment asset JSON from `02_TECHNICAL_SPEC.md` section 4, or:
- `404` product unknown
- `409` product not approved (`{status}`)
Caching: `Cache-Control: public, max-age=300, stale-while-revalidate=86400`, with `ETag` by asset version.
Origin check: `Origin` must be in the shop's `allowed_origins`; CORS configured accordingly.

### GET `/v1/models/manifest`
Returns model file URLs, sizes, checksums (SHA-256) and versions. Widget verifies checksums before use.

### POST `/v1/events`
Batch of anonymous aggregate events:

```json
{
  "shopId": "string",
  "sessionId": "random per-page-session id, not persisted",
  "events": [
    { "t": "button_view", "productId": "..." },
    { "t": "tryon_start", "productId": "..." },
    { "t": "tryon_end", "productId": "...", "durationSec": 41, "medianFps": 26, "tier": "medium" },
    { "t": "variant_switch", "productId": "..." }
  ]
}
```

Rejected if payload contains unknown keys. **No images, landmarks, or personal data.** The add-to-cart attribution is done by the host page calling `LiveTry.reportAddToCart(productId)` (optional) or via Shopify app events.

## 3. Authenticated API (dashboard and ingestion)

Auth: shop-scoped API tokens (dashboard via session auth; Shopify via OAuth).

- `POST /v1/ingest/sync` start a full sync for the shop.
- `GET /v1/products?status=&category=&q=&page=`
- `GET /v1/products/{id}`
- `PATCH /v1/products/{id}` update status (`approved|disabled|unsupported`), category.
- `PUT /v1/products/{id}/keypoints` update keypoints (validates geometry; bumps asset version).
- `POST /v1/products/{id}/images` upload front/back/side image; triggers reprocess.
- `GET /v1/analytics/summary?from=&to=` aggregates only.

Rate limits: 60 req/min per shop token; 600 req/min per IP on public asset endpoint (CDN absorbs most).

## 4. Shopify app

- Theme App Extension (app embed block) injects the script and places the Try On button without editing theme code.
- OAuth install flow; webhooks for product create/update/delete; GDPR webhooks (customers/data_request, redact; shop/redact) implemented even though no shopper data is stored.
- Billing via Shopify Billing API.
- Dashboard embedded in Shopify admin (App Bridge).

## 5. WooCommerce plugin

- PHP plugin: settings page for Shop ID, hooks `woocommerce_after_add_to_cart_button` to print the button/script, and syncs products via REST.
- Follows WordPress coding standards, escapes output, nonce-protected admin actions.

## 6. Versioning

- Widget served at `/widget/v1/`; breaking changes only in `/v2/`. Asset JSON has a `schemaVersion` field; widget refuses unknown major versions gracefully.
