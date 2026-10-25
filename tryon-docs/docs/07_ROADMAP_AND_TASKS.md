# 07 — Roadmap, Milestones, and Task Breakdown

## M0 — Video-to-Video AI Engine Integration (Completed)
- Integrated `@decartai/sdk` and LiveKit WebRTC peer streaming into `@livetry/tryon-core` and `@livetry/widget`.
- Verified the commercial benchmark architecture of Anywhere (`tryanywear.ai` powered by Decart's `lucy-vton-latest`).
- Formulated the exact substitution directive: `"Substitute the current top with [garment title] in [colorway]"` with `enhance: false`.
- Built backend ephemeral token minting (`POST /api/tryon/token`) and configuration endpoints (`GET /api/tryon/config`).
- Created high-end editorial PDP demo at `http://localhost:3000/pdp/` with dynamic colorway switching (Charcoal, Oatmeal, Olive).

## M1 — Production WebRTC Quality & Latency Optimization (Active)
- Benchmark connection times and transport modes (UDP vs. TCP fallback).
- Add automated network quality preflight checks and bitrate adaptation.
- Implement token auto-rotation (10-minute refresh) during extended shopper sessions.

## M2 — Catalog Ingestion & Automated Garment Masking
- Automated background extraction for e-commerce apparel catalog images (white studio background isolation).
- Generate optimized substitution prompts per garment category (T-shirt, Hoodie, Kurta, Dress).
- Storefront feed connectors for Shopify, WooCommerce, and custom headless stores.

## M3 — High-Resolution Editorial Capture & Hybrid Export
- 1-click 4K generative snapshot capture paired with the live 15 FPS WebRTC preview.
- Split-screen before/after comparison slider with high-res export ("Save Photo" / "Add to Bag").
- Complete Shadow DOM isolation for third-party script embedding.
