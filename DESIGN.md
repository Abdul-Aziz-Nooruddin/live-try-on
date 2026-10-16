# DESIGN.md — Storefront and Try-On Design System

Applies to: the demo storefront (`apps/demo-site`), the Try On modal and widget UI, and (with the noted exceptions) the dashboard and marketing site.

**The brief in one sentence:** it must look like a normal, well-made fashion retailer. Quiet, editorial, photo-led. The try-on feature is one calm button on the product page, not a design theme.

If a screenshot of any page could be mistaken for a SaaS landing page or an AI-generated template, the design has failed. Redo it.

---

## 1. Anti-patterns (hard "do not" list)

1. **No gradients.** Not on backgrounds, buttons, text, borders, overlays, or image scrims. Use flat colors. CI check: grep for `gradient` in CSS/TSX fails the build (exception: none).
2. **No purple, indigo, violet, or blue as a brand or accent color.** No default Tailwind palette colors (`indigo-500`, `violet-600`, `blue-600`, etc.). All colors come from tokens in section 3.
3. **No glassmorphism, backdrop blur cards, glow shadows, neon outlines, or floating blobs.**
4. **No large rounded cards.** Corner radius is 0 for images, buttons, cards, and modals; 2 px for form inputs only.
5. **No emoji or sparkle icons.** One consistent thin line icon set (Lucide, 1.5 px stroke).
6. **No hero "pill" badge** (e.g. "✨ New collection") above a centered headline.
7. **No three-column "feature cards" with colored icon circles.**
8. **No hype copy:** "Elevate your style", "Discover the future of fashion", "Unleash", "Seamless". Write like a shop: short, concrete.
9. **No dark mode in the storefront (v1).** Fashion retail is light, photo-led.
10. **No AI-generated people, faces, or fake product photography.** Use the owner's photos, or flat neutral placeholders (section 9).
11. **No decorative motion:** no parallax, no floating elements, no text that animates letter by letter, no infinite loops.
12. **No more than two typefaces and one accent color** on the whole site.

---

## 2. Feel and references (patterns, not copies)

Conventions of mainstream fashion retail, done carefully: warm off-white pages, black text, large photography, small uppercase navigation, sparse buttons, generous white space, hairline borders, grid-first layouts. Think of the restraint of well-known minimalist apparel sites, not of tech product pages.

Words to design by: **quiet, confident, tactile, editorial, uncluttered.**

---

## 3. Design tokens

### 3.1 Color

| Token | Hex | Use |
|---|---|---|
| `--paper` | `#F7F4EF` | Page background |
| `--white` | `#FFFFFF` | Modals, drawers, input fills, product image backing |
| `--sand` | `#ECE7DF` | Alternate sections, image placeholders, skeletons |
| `--stone` | `#D9D2C7` | Hairline borders, dividers |
| `--taupe` | `#6B655C` | Secondary text, captions (contrast 5.2:1 on paper) |
| `--ink` | `#141311` | Primary text, primary buttons |
| `--charcoal` | `#2B2926` | Hover state for ink, footer background |
| `--clay` | `#A24A33` | The only accent: sale prices, small highlights, "low stock" |
| `--moss` | `#3E5B45` | Success / in-stock confirmations |
| `--brick` | `#9B2C2C` | Errors |
| `--scrim` | `rgba(20,19,17,0.45)` | Flat overlay behind modals/drawers (no blur, no gradient) |
| `--chip` | `rgba(20,19,17,0.72)` | Flat label chips over camera/photos |

Rules: body text is `--ink` on `--paper`/`--white`. Never use `--clay` for large areas. Verify contrast with a checker; minimum 4.5:1 for text, 3:1 for UI borders and icons.

### 3.2 Typography

| Role | Font | Fallback stack | Notes |
|---|---|---|---|
| Display / headings | **Cormorant Garamond** (500, 600; italic for rare emphasis) | `"Cormorant Garamond", Georgia, "Times New Roman", serif` | Use at 28 px and above only; too thin below that |
| UI / body | **Hanken Grotesk** (400, 500, 600) | `"Hanken Grotesk", "Helvetica Neue", Arial, sans-serif` | All navigation, buttons, prices, forms |
| Hindi | Noto Sans Devanagari | after body stack | For i18n |
| Telugu | Noto Sans Telugu | after body stack | For i18n |

Both Google Fonts, free for commercial use. Self-host with `font-display: swap`, preload the two used weights, subset Latin.

Type scale (desktop / mobile):

| Style | Size / line height | Font, weight | Case / tracking |
|---|---|---|---|
| Display | 72/76 / 44/48 | Cormorant 500 | Normal, -0.01em |
| H1 | 48/54 / 34/40 | Cormorant 500 | Normal |
| H2 | 36/42 / 28/34 | Cormorant 500 | Normal |
| H3 | 28/34 / 24/30 | Cormorant 500 | Normal |
| H4 | 18/26 / 17/24 | Hanken 600 | Normal |
| Body | 16/26 | Hanken 400 | Normal |
| Body small | 14/22 | Hanken 400 | Normal |
| Label / eyebrow / nav | 12/16 | Hanken 500 | UPPERCASE, +0.12em |
| Price | 15/20 | Hanken 500 | Tabular numerals |
| Button | 13/16 | Hanken 600 | UPPERCASE, +0.1em |

Line length: body copy max 65 characters. Product names in cards: sentence case, max two lines, 14 px Hanken 500.

### 3.3 Spacing, grid, radius, elevation

- Base unit 4 px. Scale: 4, 8, 12, 16, 24, 32, 40, 56, 72, 96.
- Section vertical spacing: 96 px desktop / 56 px mobile.
- Container: max 1440 px; side padding 40 (desktop), 24 (tablet), 16 (mobile).
- Breakpoints: 390 (mobile reference), 768, 1024, 1280, 1440.
- Product grid: 4 columns desktop, 3 at 1024, 2 on mobile. Column gap 24 (mobile 12). Row gap 48 (mobile 32).
- Radius: 0 everywhere; inputs 2 px.
- Elevation: **none.** Separation comes from 1 px `--stone` borders, background change (`--paper` vs `--white` vs `--sand`), and the flat scrim. No drop shadows except a single `0 1px 0 var(--stone)` underline on sticky headers when scrolled.

### 3.4 Motion

- Duration 150 ms (hover/press), 250 ms (drawers, accordions, modals), 400 ms (image crossfade).
- Easing: `cubic-bezier(0.2, 0, 0, 1)`.
- Allowed: opacity and small translate for drawers/modals/accordions, image swap on card hover, soft fade-in of the garment in try-on.
- Respect `prefers-reduced-motion`: replace all motion with instant state changes.
- Smooth scroll libraries (Lenis etc.) are **not** used on the storefront.

### 3.5 Iconography

Lucide line icons, 1.5 px stroke, 20 px default, `--ink`. Icons needed: search, user, heart, bag, menu, close, chevron-down/right/left, plus, minus, camera (try-on), ruler (size guide), truck, refresh (returns), check, info, filter, grid, map-pin.

---

## 4. Components

### 4.1 Header (all pages)
- **Announcement bar:** `--ink` background, `--paper` text, label style, 36 px high. One message, optional dismiss. Example: "Free shipping over ₹1,999. Easy 7-day returns."
- **Main bar:** 72 px desktop / 56 px mobile, `--paper` background, `--stone` bottom hairline when page is scrolled.
- Desktop layout: left = primary nav (Women, Men, Kids, New, Sale) in label style; center = wordmark (display serif, uppercase, +0.18em tracking, text only until the owner supplies a logo); right = Search, Account, Wishlist, Bag (with count in a small ink circle, 16 px).
- Mobile: hamburger left, wordmark center, bag right; search lives inside the menu drawer and as an icon in a second row only on collection pages.
- **Mega menu** (desktop hover/focus): full-width `--white` panel under the header, 4-5 text columns of links (label headings + sentence-case links), one editorial image (3:4, 280 px wide) on the right. 250 ms fade. Keyboard accessible.
- Sticky on scroll-up, hides on scroll-down (mobile), always visible on PDP desktop.

### 4.2 Footer
`--charcoal` background, `--paper` text. Columns: Shop, Help (Shipping & returns, Size guide, FAQ, Contact), Company (About, Lookbook), Newsletter (single email field + "Subscribe" button). Bottom row: payment method text/logos in grayscale, social links as text, legal links, copyright. No gradients, no large logos.

### 4.3 Buttons

| Variant | Style |
|---|---|
| Primary | `--ink` fill, `--paper` text, 52 px high (48 mobile), full-width in forms and product panel; hover `--charcoal`; focus: 2 px `--ink` outline, 2 px offset |
| Secondary | Transparent, 1 px `--ink` border, `--ink` text; hover fills `--ink` with `--paper` text |
| Text link | Label style, underline 1 px with 4 px offset; hover thickens underline |
| Disabled | `--sand` fill, `--taupe` text, no hover |

Loading state: text replaced by a 16 px thin spinner (stroke `--paper`/`--ink`), button width unchanged.

### 4.4 Form fields
52 px high, `--white` fill, 1 px `--stone` border, 2 px radius, label above (label style, `--taupe`), hover border `--taupe`, focus border `--ink` + 1 px inner ring, error border `--brick` with message below (14 px). Floating labels are not used.

### 4.5 Product card
- Image: 3:4 ratio, `--sand` backing while loading, `object-fit: cover`. On hover (desktop) crossfade to the second image over 400 ms. On mobile: swipeable only on PDP, not in cards.
- Top-left label (not a pill): text on `--white` background, 24 px high, label style. Values: `New`, `Sale`, `Sold out`.
- Top-right: wishlist heart (line, 32 px hit area 44 px), visible on hover on desktop, always on mobile.
- Below image (12 px gap): product name (14 px / 500), price (15 px / 500; sale: price in `--clay` plus original price struck through in `--taupe`), color count in `--taupe` ("3 colours").
- If the product is try-on approved: a small camera icon plus "Try on" in label style, `--taupe`, in the bottom row of the card. Static, no animation. It is informational only (clicking the card goes to PDP).
- No shadows, no borders, no rounded corners, no zoom on hover.

### 4.6 Size selector
Row of square buttons 48 x 48 px, 1 px `--stone` border, `--ink` text. Selected: `--ink` fill, `--paper` text. Unavailable: text `--taupe`, diagonal hairline strike through the box, not selectable. "Size guide" text link with ruler icon aligned right of the label row. Never preselect a size.

### 4.7 Color swatches
24 px circles with 1 px `--stone` border; selected has a 2 px `--ink` ring with 2 px gap. Selected color name shown as text beside the label ("Colour: Olive").

### 4.8 Accordion
Hairline top/bottom borders, label-style heading, plus/minus icon right, 250 ms height transition, one or multiple open.

### 4.9 Drawer and modal
Drawer: right side, 440 px wide desktop / full width mobile, `--white`, scrim behind (`--scrim`), close icon top-right, focus-trapped. Modal: centered, `--white`, no radius, scrim behind. Both close on Escape and scrim click (except Try On consent step: only via buttons).

### 4.10 Other
- Breadcrumbs: label style, `--taupe`, `/` separators.
- Filter chips: 1 px `--stone` border, square, 36 px high; active chip `--ink` fill.
- Pagination: "Load more" secondary button with "Showing 24 of 118" caption (preferred) over numbered pages.
- Toasts: bottom-center, `--ink` fill, `--paper` text, 4 s, no icons except check.
- Skeletons: flat `--sand` blocks, no shimmer gradient (use a gentle 1.2 s opacity pulse between 100% and 60%).
- Empty states: one line of display serif, one sentence, one button. No illustrations.

---

## 5. Page inventory

### Core shopping
1. Home
2. Collection / category listing (also used for New, Sale, search results)
3. Product detail page (PDP) — **contains Try On**
4. Search overlay + search results
5. Cart (drawer + full page)
6. Checkout (information, shipping, payment, review) + order confirmation

### Account
7. Login / register (+ forgot / reset password)
8. Account: overview, orders list, order detail with tracking, addresses, profile
9. Wishlist

### Content and help
10. Lookbook / editorial (optional, v1.1)
11. About
12. Contact (+ store locator if the shop has stores)
13. FAQ
14. Shipping and returns
15. Size guide (page + modal used by PDP)
16. Legal: privacy, terms, cookie notice
17. 404, 500, maintenance

### Try-on surfaces (part of the widget, see section 7)
18. Consent step, camera permission states, loading, live view, error states

### Transactional emails
Order confirmation, shipping confirmation, password reset. Same tokens: `--paper` background, serif heading, single ink button, no images except product thumbnails.

### Shop-owner dashboard
Separate app (see `docs/04_CATALOG_INGESTION.md` and `docs/09_UI_UX_STACK.md`). Uses the same tokens with these allowances: denser spacing, `--white` panels on `--paper`, status badges in `--moss`/`--clay`/`--brick`. Still no gradients or blue/purple.

---

## 6. Page specifications

### 6.1 Home
Sections in order:
1. Announcement bar + header.
2. **Hero:** one full-bleed photograph, 80 vh desktop / 70 vh mobile. One headline in Display serif, white, bottom-left, with a single text-link button ("Shop the new season"). Legibility: choose imagery with a calm area for text; if needed, a flat 20% `--scrim` over the whole image (no gradient). No carousel, no auto-advance.
3. **Category entry:** 3 large image tiles (Women, Men, Kids) in one row (stacked on mobile), 4:5 ratio, label below each in H3 serif with a "Shop" text link.
4. **New arrivals:** section heading (H2) + "View all" text link; horizontal scroll-snap row of product cards (4 visible desktop, 1.4 visible mobile), arrow buttons on desktop only.
5. **Editorial split:** 50/50 image and text. Text: eyebrow label, H2 (e.g. the edit's name), 2-3 lines of copy, one text link. Alternates side on later blocks.
6. **Featured collection:** 4 x 2 product grid.
7. **Try-on explainer (small strip):** `--sand` background, one row, 3 short steps with line icons: "Open your camera" / "Pick an item" / "See it on you". One line below: "Shows how it looks, not how it fits." One text link: "Try it on any product marked with the camera icon." This is the only place try-on is promoted on the home page. Keep it modest.
8. Newsletter (single field) and footer.

### 6.2 Collection / listing
- Page header: breadcrumb, H1 (collection name), one line of description (optional), product count.
- Toolbar (sticky under header): left "Filters" button (opens drawer on mobile; left rail on desktop), right "Sort" dropdown and grid toggle (2/3/4 columns).
- Filters: Category, Size (square buttons), Colour (swatches), Price (min-max inputs or two sliders, flat style), Availability, **Try on available** (checkbox, optional). Active filters appear as removable chips above the grid with "Clear all".
- Grid: product cards (4.5). Load more button with count.
- Empty result: "Nothing matches those filters." + "Clear filters" button.
- Skeleton: 8 flat cards while loading.

### 6.3 Product detail page (PDP)

**Desktop layout (12-col):**
- Left (cols 1-7): image gallery. Vertical thumbnail strip (64 px) at the far left, main image 3:4 large; scrolling stack variant is acceptable (all images stacked full width, 2-up on 1280+). Click opens a full-screen zoom viewer with pinch/zoom on touch. Include a back-view image where the shop has one (this also feeds try-on back view).
- Right (cols 8-12): sticky info panel, top to bottom:
  1. Breadcrumb.
  2. Product name (H2 serif).
  3. Price (sale price in `--clay` plus struck original).
  4. Short one-line descriptor (taupe, optional).
  5. **Colour** label + swatches.
  6. **Size** label + size selector + "Size guide" link.
  7. Low-stock note (`--clay`, 14 px) only when real.
  8. **Add to bag** (primary, full width).
  9. **Try on** (secondary, full width, camera icon left of label "Try on"). Directly below Add to bag, same height, same width. Only rendered when the product's try-on status is `approved`.
  10. "Buy now" is not shown by default (use the platform's accelerated checkout only if the shop enables it; it takes the third position as a text link).
  11. Wishlist (heart + "Save") as a text link.
  12. Delivery and returns line with truck icon ("Free delivery over ₹1,999. Returns within 7 days.").
  13. Accordions: Description, Composition and care, Delivery and returns, Size and fit notes (the shop's measurements, not an AI size guess).
- Below: "Complete the look" / "You may also like" row (4 cards), reviews section if enabled, recently viewed.

**Mobile:**
- Gallery as swipeable full-width carousel with dot indicator (small, ink dots), 3:4.
- Info below the gallery. **Sticky bottom bar** after scrolling past the buttons: `--white`, hairline top border, [Try on (square icon button, 52 px)] [Add to bag (flex 1)].

**Try on placement rationale:** placed directly beside the purchase action as requested. It is secondary in visual weight so it does not compete with Add to bag. A/B test its position (above vs below) once the pilot has traffic.

**States:**
- No size selected, Add to bag clicked: inline message under size row ("Select a size"), no modal.
- Sold out: Add to bag becomes disabled "Sold out" plus "Notify me" text link; Try on remains available.
- Try on unavailable: button not rendered (no disabled ghost button).

### 6.4 Search
- Overlay: opens from header search; full-width panel below header, `--white`. Large input (Display-size placeholder, 28 px), under it "Popular searches" as text links and 4 suggested product cards after 2 characters typed (live results).
- Results page: same template as collection; heading "Results for “query”" and count; no results state suggests popular collections.

### 6.5 Cart
- **Drawer** (opens on add to bag): items list (64 x 85 px thumbnail 3:4, name, colour/size in taupe, quantity stepper, remove text link, price), subtotal, free-shipping progress line (text plus a thin 2 px flat `--ink` bar on `--stone`, no gradient), "Checkout" primary button, "View bag" text link.
- **Cart page:** 2 columns: items (left), summary sticky (right) with subtotal, estimated shipping, discount code field, total, Checkout button. Empty state: serif line "Your bag is empty." + "Continue shopping" button.

### 6.6 Checkout
- Single-page, three accordion steps (Contact and delivery, Shipping method, Payment) with order summary sticky on the right desktop, collapsed summary at top on mobile.
- Minimal chrome: header reduced to wordmark and "Back to bag"; no mega menu, no footer links except policies.
- Guest checkout default; "Have an account? Log in" text link.
- Validation inline; payment via the platform (Razorpay for India) in an embedded or redirected flow styled with tokens as far as the provider allows.
- Order confirmation: H1 "Thank you, {first name}.", order number, summary, delivery estimate, "Continue shopping" button, optional account creation prompt (single password field).

### 6.7 Login / register
Two-column on desktop (form left, one editorial photo right); form only on mobile. Tabs "Sign in" / "Create account" (underline tabs, not pills). Social sign-in buttons are secondary style with text only (no brand-colored blocks). Forgot password flow: single email field + confirmation message.

### 6.8 Account
- Left nav (desktop) / top segmented text links (mobile): Overview, Orders, Addresses, Profile, Wishlist, Sign out.
- Orders list: table-like rows (order number, date, status label, total, "View" link). Order detail: items, status timeline (simple vertical list with check icons, no colors beyond `--moss` for complete), tracking link, invoice download, "Return an item" button if eligible.
- Addresses: cards with 1 px border, "Edit" / "Delete" text links, "Add address" secondary button.

### 6.9 Wishlist
Collection-style grid with a "Move to bag" secondary button under each card and a remove (x) icon. Empty state in serif with "Explore new arrivals".

### 6.10 About, Contact, FAQ, Shipping and returns, Size guide, Legal
- All use a narrow content column (max 720 px), H1 serif, body text 16/26, section headings H3 serif, `--stone` dividers.
- About: one wide photo, short story, 3 plain value statements (text only, no icon cards).
- Contact: form (name, email, order number optional, message) + store details and hours; map embed only if the owner has a physical store.
- FAQ: accordions grouped by topic.
- Size guide: table(s) with `--stone` hairline rows, sticky first column on mobile, unit toggle (cm / in), "How to measure" with a simple line illustration (single-stroke, `--ink`). Opens as a right drawer from the PDP; also available as a page.
- Legal: plain long-form text, table of contents links at top.

### 6.11 404 / 500 / maintenance
Centered: one-line H1 serif ("We can't find that page."), one sentence, a "Back to home" primary button and a search field. No illustrations, no jokes.

---

## 7. Try-on UI

The try-on UI inherits the storefront tokens (light, flat, serif/sans). It must feel like part of the shop. The developer telemetry panel and Tweakpane controls seen in the M0 playground are **dev-only** (visible only with `?debug=1`), never part of the shopper UI.

### 7.1 Entry
Button on PDP (see 6.3): secondary style, camera icon (20 px) + "Try on". Label is translatable (en / hi / te).

### 7.2 Consent step (first click only per session)
Modal, `--white`, 480 px wide (full-screen on mobile). Content:
- H3 serif: "Try this on using your camera"
- Body: "Your camera is used only to show this item on you, live. Nothing is recorded, saved, or sent anywhere. Everything stays on your device."
- Secondary line (taupe): "Shows how it looks, not how it fits."
- Buttons: [Start camera] primary, [Not now] text link.

### 7.3 Live view

**Desktop:** large modal (max 1080 x 720), two columns.
- Left (about 60%): **camera stage**, portrait 3:4, `#000` backing, mirrored feed (front camera). Overlays (flat chips only): top-left status chip ("Live" with 6 px `--moss` dot) using `--chip` background; top-right close button (44 px, `--chip` background, white icon); bottom-center colour swatch row (white-ringed 28 px circles on a `--chip` bar) to switch colours without leaving; guidance text chip appears top-center when needed.
- Right (about 40%, `--white`): product name (H3 serif), price, colour name, **size selector** (so the shopper can still choose a size to buy; copy reminds it is not detected), **Add to bag** (primary), "View full details" text link, and the disclaimer line "Shows how it looks, not how it fits." at the bottom in taupe.

**Mobile:** full-screen camera stage edge to edge. Overlays: close (top-right), guidance chip (top), colour swatches (bottom bar above a safe area), and a bottom sheet handle that expands a compact panel with name, size selector, and Add to bag. Camera flip button (icon) top-left on devices with multiple cameras.

No gradients over the video. Text over video always sits on a `--chip` flat chip.

### 7.4 States and copy

| State | Visual | Copy |
|---|---|---|
| Loading models (first time) | Stage `--sand`, thin 2 px determinate bar if progress known, else slow opacity pulse | "Getting ready…" (under 3 s target) |
| Permission prompt pending | Stage `--sand`, centered text | "Allow camera access to continue." |
| Permission denied | Centered message + button | "Camera access is off. Turn it on in your browser settings, then try again." [Try again] |
| No camera found | Message | "We couldn't find a camera on this device." [Close] |
| Not supported | Message | "Try on isn't available on this browser." [Close] |
| Guidance | Chip top-center | "Step back so your upper body is visible." |
| Low light | Chip | "Move somewhere brighter for a better result." |
| Pose lost | Garment fades out over 300 ms, chip appears | "We can't see you. Move back into view." |
| Turning too far (side/back approximations) | Small chip, bottom-left, fades after 3 s | "Side and back views are approximate." |
| Error | Message | "Something went wrong. Please try again." [Retry] [Close] |

### 7.5 Behavior rules
- Camera stops when the modal closes or the tab is hidden more than 10 seconds.
- Switching colour keeps the camera running; garment crossfades in 250 ms.
- Add to bag from inside the modal closes nothing; shows a toast ("Added to bag") and updates the cart count.
- Focus is trapped in the modal; Escape closes it (after consent step).

---

## 8. Voice and microcopy

- Short, concrete, calm. Sentence case for headings and buttons text in source (buttons render uppercase via CSS).
- Prices: currency symbol first, thousands separators, no decimals unless needed (₹1,999). Currency configurable per shop; default ₹.
- Product copy: material, cut, fit notes, care. No adjectives like "stunning" or "must-have".
- Error messages say what happened and what to do next.
- Never comment on the shopper's body. Never use evaluative language in try-on ("Looks great!" is not allowed).

---

## 9. Imagery

- Product images: 3:4, minimum 1200 px on the long side, delivered as AVIF/WebP with JPEG fallback, lazy-loaded below the fold, explicit width/height to prevent layout shift.
- Order of PDP images: front, back, detail, on-model, flat. The try-on pipeline reads the front and back flat/mannequin images (see `docs/04_CATALOG_INGESTION.md`).
- Until the owner supplies photography: use flat `--sand` rectangles at the correct ratio with a small taupe label ("Product image 3:4"). **Do not** generate or download stock faces, and do not use gradient placeholder art.
- Photography direction to give the shop owner: natural light, neutral background, consistent framing across the catalog, garment fills about 70% of the frame, no hands or accessories covering the garment.

---

## 10. Accessibility and performance

- WCAG 2.1 AA minimum: contrast, focus visibility, keyboard operation for every menu, drawer, and modal; ARIA labels for icon buttons; semantic landmarks.
- Touch targets at least 44 x 44 px.
- Alt text for all product images ("Olive linen shirt, front view").
- Respect `prefers-reduced-motion` and `prefers-contrast`.
- Performance targets on a mid-range Android over 4G: LCP <= 2.5 s on home and PDP, CLS <= 0.1, JS for the storefront shell <= 170 KB gzipped (excluding the try-on widget, which loads only on click).
- Fonts: at most 4 font files loaded on first paint.

---

## 11. Build instructions for the agent

1. Implement tokens first as CSS custom properties in one file (`tokens.css`), and map Tailwind theme values to them. **Disable** Tailwind's default palette so default blue/indigo/violet classes cannot be used.
2. Build components (section 4) in a living style page at `/styleguide` before building pages.
3. Build pages in this order: PDP (with the try-on entry and modal), Collection, Home, Cart, Checkout, Account, content pages.
4. Add the CI checks: no `gradient` in CSS/TSX, no color literals outside `tokens.css`, no Tailwind default palette classes, Lighthouse budget, axe-core accessibility pass.
5. Visual QA: capture screenshots at 390, 768, 1280, and 1440 px for every page and attach them to the milestone report.

**Self-review checklist (every page, before reporting done):**
- [ ] Zero gradients; zero blue/purple.
- [ ] At most two typefaces and one accent color.
- [ ] Radius 0 on cards, buttons, images.
- [ ] No shadows (except the single sticky header hairline).
- [ ] Squint test: the page reads as photo, text, white space, a few buttons.
- [ ] Copy has no hype words.
- [ ] Try-on appears only as the PDP button, the optional card label, the home explainer strip, and the modal.
- [ ] Mobile layout checked at 390 px width with one hand reachable controls.
- [ ] If this page were shown next to a SaaS template, it would not be confused with it.
