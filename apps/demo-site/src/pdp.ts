import { DecartRealtimeVtonEngine } from '@livetry/tryon-core';
import gsap from 'gsap';
import { getLenis } from './site-motion';

const lenis = {
  stop: () => getLenis()?.stop(),
  start: () => getLenis()?.start()
};

interface GarmentVariant {
  id: string;
  name: string;
  hex: number;
  image: string;
  gallery: string[];
  prompt: string;
}

interface CatalogSwatch {
  id: string;
  name: string;
  hex: string;
}

interface CatalogItem {
  id: string;
  title: string;
  breadcrumb: string;
  price: string;
  originalPrice?: string;
  description: string;
  fabric: string;
  swatches?: CatalogSwatch[];
  variant: GarmentVariant;
}

const ITEM_CATALOG: Record<string, CatalogItem> = {
  'silk-blouse': {
    id: 'silk-blouse',
    title: 'Relaxed Silk Crepe Blouse',
    breadcrumb: 'Home / Women / Blouses',
    price: '₹3,490',
    description: 'Cut from fluid 18 momme mulberry silk crepe with a soft relaxed silhouette, dropped shoulder drape, and refined French seams.',
    fabric: '100% Mulberry Silk Crepe • Ivory Bone • Dry Clean Only • Made in Como, Italy',
    swatches: [
      { id: 'ivory', name: 'Ivory Bone', hex: '#f5f3ee' },
      { id: 'mist', name: 'Mist White', hex: '#e8e6e1' }
    ],
    variant: {
      id: 'silk-blouse',
      name: 'Ivory Bone',
      hex: 0xf5f3ee,
      image: '/fixtures/women-silk-blouse.jpg',
      gallery: [
        '/fixtures/women-silk-blouse.jpg',
        '/fixtures/women-silk-blouse-collar.jpg',
        '/fixtures/women-silk-blouse-drape.jpg',
        '/fixtures/women-silk-blouse-texture.jpg'
      ],
      prompt: 'Substitute the current top with this crisp pure white mulberry silk crepe relaxed blouse from the reference image, matching its color, material, and fit.'
    }
  },
  'linen-shirt': {
    id: 'linen-shirt',
    title: 'Studio Oversized Linen Shirt',
    breadcrumb: 'Home / Women / Shirts',
    price: '₹2,890',
    originalPrice: '₹3,490',
    description: 'Spun from artisanal French flax linen, pre-washed for effortless softness with an easy camp collar and relaxed boxy drape.',
    fabric: '100% French Flax Linen • Terracotta Blush • Cold Gentle Wash • Made in Portugal',
    swatches: [
      { id: 'terracotta', name: 'Terracotta Blush', hex: '#c47b6a' },
      { id: 'flax', name: 'Raw Flax', hex: '#e2d8ce' }
    ],
    variant: {
      id: 'linen-shirt',
      name: 'Terracotta Blush',
      hex: 0xc47b6a,
      image: '/fixtures/women-linen-shirt.jpg',
      gallery: [
        '/fixtures/women-linen-shirt.jpg',
        '/fixtures/women-linen-shirt-collar.jpg',
        '/fixtures/women-linen-shirt-drape.jpg',
        '/fixtures/women-linen-shirt-texture.jpg'
      ],
      prompt: 'Substitute the current top with this relaxed terracotta blush oversized French linen studio shirt with open camp collar from the reference image, matching its color, material, and fit.'
    }
  },
  'merino-knit': {
    id: 'merino-knit',
    title: 'Ribbed Merino Wool Knit Top',
    breadcrumb: 'Home / Women / Knitwear',
    price: '₹3,890',
    description: 'Finely spun 19.5-micron extrafine merino wool in a delicate ribbed gauge with an elegant boatneck collar and long clean sleeves.',
    fabric: '100% Extrafine Merino Wool • Soft Camel • Hand Wash Cold • Made in Biella, Italy',
    swatches: [
      { id: 'camel', name: 'Soft Camel', hex: '#c8a782' },
      { id: 'oat', name: 'Oat Melange', hex: '#e3ded8' }
    ],
    variant: {
      id: 'merino-knit',
      name: 'Soft Camel',
      hex: 0xc8a782,
      image: '/fixtures/women-merino-knit.jpg',
      gallery: [
        '/fixtures/women-merino-knit.jpg',
        '/fixtures/women-merino-knit-collar.jpg',
        '/fixtures/women-merino-knit-drape.jpg',
        '/fixtures/women-merino-knit-texture.jpg'
      ],
      prompt: 'Substitute the current top with this soft camel oat ribbed merino wool knit wide boatneck top from the reference image, matching its color, material, and fit.'
    }
  },
  'poplin-shirt': {
    id: 'poplin-shirt',
    title: 'Relaxed Giza Poplin Shirt',
    breadcrumb: 'Home / Men / Shirts',
    price: '₹2,690',
    description: 'Tailored from crisp 120s two-ply Egyptian Giza cotton poplin. Clean point collar, mother-of-pearl buttons, and structured drape.',
    fabric: '100% Giza Cotton Poplin • Chalk White • Machine Wash 30°C • Made in Kyoto, Japan',
    swatches: [
      { id: 'white', name: 'Chalk White', hex: '#ffffff' },
      { id: 'sky', name: 'Light Sky', hex: '#d2dce6' }
    ],
    variant: {
      id: 'poplin-shirt',
      name: 'Chalk White',
      hex: 0xf9f9f8,
      image: '/fixtures/men-poplin-shirt.jpg',
      gallery: [
        '/fixtures/men-poplin-shirt.jpg',
        '/fixtures/men-poplin-shirt-collar.jpg',
        '/fixtures/men-poplin-shirt-drape.jpg',
        '/fixtures/men-poplin-shirt-texture.jpg'
      ],
      prompt: 'Substitute the current top with this crisp chalk white relaxed button-down poplin shirt with clean point collar from the reference image, matching its color, material, and fit.'
    }
  },
  'linen-kurta': {
    id: 'linen-kurta',
    title: 'Linen Studio Kurta Tunic',
    breadcrumb: 'Home / Men / Shirts',
    price: '₹2,490',
    originalPrice: '₹3,400',
    description: 'Crafted from textured hand-spun flax linen featuring a clean mandarin collar, hidden horn button placket, and relaxed vented hem.',
    fabric: '100% Hand-Spun Flax Linen • Natural Oatmeal • Cold Gentle Wash • Made in Jaipur, India',
    swatches: [
      { id: 'oatmeal', name: 'Natural Oatmeal', hex: '#dcd6cc' },
      { id: 'slate', name: 'Charcoal Flax', hex: '#3d3c39' }
    ],
    variant: {
      id: 'linen-kurta',
      name: 'Natural Oatmeal',
      hex: 0xdcd6cc,
      image: '/fixtures/linen-studio-kurta.jpg',
      gallery: [
        '/fixtures/linen-studio-kurta.jpg',
        '/fixtures/linen-studio-kurta-collar.jpg',
        '/fixtures/linen-studio-kurta-drape.jpg',
        '/fixtures/linen-studio-kurta-texture.jpg'
      ],
      prompt: 'Substitute the current top with this natural oatmeal flax linen mandarin collar studio kurta tunic from the reference image, matching its color, material, and fit.'
    }
  },
  'overshirt': {
    id: 'overshirt',
    title: 'Structured Twill Overshirt',
    breadcrumb: 'Home / Men / Outerwear',
    price: '₹4,290',
    description: 'Heavyweight 340gsm Japanese cotton twill garment-dyed in slate indigo. Features dual utilitarian chest flap pockets and reinforced stitching.',
    fabric: '100% Heavyweight Cotton Twill (340gsm) • Slate Indigo • Garment Dyed • Made in Okayama, Japan',
    swatches: [
      { id: 'indigo', name: 'Slate Indigo', hex: '#3d4954' },
      { id: 'charcoal', name: 'Deep Charcoal', hex: '#262627' }
    ],
    variant: {
      id: 'overshirt',
      name: 'Slate Indigo',
      hex: 0x3d4954,
      image: '/fixtures/men-overshirt.jpg',
      gallery: [
        '/fixtures/men-overshirt.jpg',
        '/fixtures/men-overshirt-collar.jpg',
        '/fixtures/men-overshirt-drape.jpg',
        '/fixtures/men-overshirt-texture.jpg'
      ],
      prompt: 'Substitute the current top with this structured slate indigo washed cotton twill button-up overshirt with dual flap pockets from the reference image, matching its color, material, and fit.'
    }
  }
};

const GARMENT_VARIANTS: Record<'charcoal' | 'oatmeal' | 'olive', GarmentVariant> = {
  charcoal: {
    id: 'charcoal',
    name: 'Charcoal',
    hex: 0x222326,
    image: '/fixtures/charcoal-front.jpg',
    gallery: [
      '/fixtures/charcoal-front.jpg',
      '/fixtures/tshirt-side.jpg',
      '/fixtures/tshirt-back.jpg',
      '/fixtures/tshirt-collar.jpg'
    ],
    prompt: "Substitute the current top with this relaxed boxy washed charcoal black heavy cotton crewneck t-shirt from the reference image, matching its color, material, and fit."
  },
  oatmeal: {
    id: 'oatmeal',
    name: 'Oatmeal',
    hex: 0xe2ded7,
    image: '/fixtures/oatmeal-tshirt.jpg',
    gallery: [
      '/fixtures/oatmeal-tshirt.jpg',
      '/fixtures/oatmeal-side.jpg',
      '/fixtures/oatmeal-back.jpg',
      '/fixtures/oatmeal-collar.jpg'
    ],
    prompt: "Substitute the current top with this relaxed boxy oatmeal beige heavy cotton crewneck t-shirt from the reference image, matching its color, material, and fit."
  },
  olive: {
    id: 'olive',
    name: 'Olive',
    hex: 0x4b4b3b,
    image: '/fixtures/olive-tshirt.jpg',
    gallery: [
      '/fixtures/olive-tshirt.jpg',
      '/fixtures/olive-side.jpg',
      '/fixtures/olive-back.jpg',
      '/fixtures/olive-collar.jpg'
    ],
    prompt: "Substitute the current top with this relaxed boxy muted olive green heavy cotton crewneck t-shirt from the reference image, matching its color, material, and fit."
  }
};

function getInitialActiveGarment(): GarmentVariant {
  if (typeof window !== 'undefined') {
    try {
      const p = new URLSearchParams(window.location.search);
      const it = p.get('item');
      if (it && ITEM_CATALOG[it]) {
        return ITEM_CATALOG[it].variant;
      }
      const col = p.get('color') as keyof typeof GARMENT_VARIANTS;
      if (col && GARMENT_VARIANTS[col]) {
        return GARMENT_VARIANTS[col];
      }
    } catch (_) {}
  }
  return GARMENT_VARIANTS.charcoal;
}

let activeColor: GarmentVariant = getInitialActiveGarment();
let selectedSize = 'M';
let bagCount = 0;

const bagCountBadges = document.querySelectorAll('.bag-count');

function setupGalleryThumbnails() {
  const thumbBtns = document.querySelectorAll<HTMLButtonElement>('.thumb-btn');
  const mainImg = (document.getElementById('main-product-img') || document.querySelector('.main-image-viewport img')) as HTMLImageElement;
  if (!mainImg) return;

  thumbBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      thumbBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const newSrc = btn.getAttribute('data-img');
      if (newSrc) {
        mainImg.style.opacity = '0.3';
        mainImg.src = newSrc;
        setTimeout(() => {
          mainImg.style.opacity = '1';
        }, 60);
      }
    });
  });
}

function updateGalleryForVariant(variant: GarmentVariant) {
  const thumbBtns = document.querySelectorAll<HTMLButtonElement>('.thumb-btn');
  const mainImg = (document.getElementById('main-product-img') || document.querySelector('.main-image-viewport img')) as HTMLImageElement;

  thumbBtns.forEach((btn, index) => {
    const imgSrc = variant.gallery[index] || variant.image;
    btn.setAttribute('data-img', imgSrc);
    const imgEl = btn.querySelector('img');
    if (imgEl) {
      imgEl.src = imgSrc;
      imgEl.alt = `${variant.name} T-Shirt View ${index + 1}`;
    }
    if (index === 0) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  if (mainImg) {
    mainImg.style.opacity = '0.3';
    mainImg.src = variant.image;
    setTimeout(() => {
      mainImg.style.opacity = '1';
    }, 60);
  }
}

function setupColorSelection() {
  const allColorButtons = document.querySelectorAll('[data-color]');

  allColorButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const colorKey = (btn.getAttribute('data-color') || 'charcoal') as keyof typeof GARMENT_VARIANTS;
      const variant = GARMENT_VARIANTS[colorKey];
      if (!variant) return;

      activeColor = variant;
      const pdpColorEl = document.querySelector('.option-title');
      if (pdpColorEl && pdpColorEl.textContent?.includes('Colour:')) {
        pdpColorEl.textContent = `Colour: ${activeColor.name}`;
      }

      // Sync active classes across all swatch buttons
      document.querySelectorAll('[data-color]').forEach((b) => {
        if (b.getAttribute('data-color') === colorKey) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });

      // Update both the main image AND all sidebar thumbnails
      updateGalleryForVariant(activeColor);

      // Cleanly sync URL state without index.html
      try {
        const p = new URLSearchParams(window.location.search);
        const it = p.get('item');
        const q: string[] = [];
        if (it) q.push(`item=${encodeURIComponent(it)}`);
        q.push(`color=${encodeURIComponent(colorKey)}`);
        window.history.replaceState(null, '', `/?${q.join('&')}`);
      } catch (_) {}
    });
  });
}

function setupSizeSelection() {
  const sizeBoxes = document.querySelectorAll('.size-box');
  sizeBoxes.forEach((box) => {
    box.addEventListener('click', () => {
      const chosenSize = box.textContent?.trim() || 'M';
      selectedSize = chosenSize;

      document.querySelectorAll('.size-box').forEach((b) => {
        if (b.textContent?.trim() === chosenSize) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });

      const lowStockNote = document.querySelector('.low-stock-note');
      if (lowStockNote) {
        lowStockNote.textContent = `Only 3 left in size ${selectedSize}`;
      }
    });
  });
}

let pdpQuantity = 0;

function animateBagBadge() {
  bagCountBadges.forEach((badge) => {
    badge.textContent = String(bagCount);
    gsap.fromTo(
      badge,
      { scale: 1.5, color: '#A24A33' },
      { scale: 1.0, color: '', duration: 0.45, ease: 'back.out(2)' }
    );
  });
}

function animateNumberRoll(el: HTMLElement, newNum: number, direction: 'up' | 'down') {
  const currentY = direction === 'up' ? -18 : 18;
  const enterY = direction === 'up' ? 18 : -18;

  gsap.to(el, {
    y: currentY,
    opacity: 0,
    duration: 0.13,
    ease: 'power2.in',
    onComplete: () => {
      el.textContent = String(newNum);
      gsap.fromTo(
        el,
        { y: enterY, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.22, ease: 'back.out(1.8)' }
      );
    }
  });
}

function setupBagQuantityStepper() {
  const btnAdd = document.getElementById('pdp-add-to-bag');
  const stepper = document.getElementById('pdp-stepper');
  const btnMinus = document.getElementById('pdp-qty-minus');
  const btnPlus = document.getElementById('pdp-qty-plus');
  const qtyNumEl = document.getElementById('pdp-qty-num');
  const lowStockNote = document.querySelector('.low-stock-note');

  if (!btnAdd || !stepper || !btnMinus || !btnPlus || !qtyNumEl) return;

  // Add to Bag -> Morph into Animated Stepper
  btnAdd.addEventListener('click', (e) => {
    e.preventDefault();
    if (pdpQuantity === 0) {
      pdpQuantity = 1;
      bagCount++;
      animateBagBadge();
      qtyNumEl.textContent = String(pdpQuantity);

      // GSAP Entrance Timeline: Button slides up/out while stepper reveals
      const tl = gsap.timeline();
      tl.to(btnAdd, {
        y: -30,
        opacity: 0,
        scale: 0.96,
        duration: 0.22,
        ease: 'power2.in',
        onComplete: () => {
          btnAdd.style.pointerEvents = 'none';
          stepper.style.display = 'flex';
          stepper.style.pointerEvents = 'auto';
        }
      })
      .fromTo(stepper, 
        { opacity: 0, scale: 0.95 }, 
        { opacity: 1, scale: 1, duration: 0.24, ease: 'power2.out' },
        '-=0.06'
      )
      .fromTo(btnMinus, 
        { x: -20, opacity: 0 }, 
        { x: 0, opacity: 1, duration: 0.22, ease: 'power2.out' }, 
        '<0.04'
      )
      .fromTo('.stepper-center', 
        { y: 16, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 0.24, ease: 'back.out(1.8)' }, 
        '<0.04'
      )
      .fromTo(btnPlus, 
        { x: 20, opacity: 0 }, 
        { x: 0, opacity: 1, duration: 0.22, ease: 'power2.out' }, 
        '<0.04'
      );
    }
  });

  // Increment (+)
  btnPlus.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Check low stock limit (3 items)
    if (pdpQuantity >= 3) {
      gsap.fromTo(
        stepper,
        { x: -4 },
        { x: 0, duration: 0.35, ease: 'elastic.out(1, 0.3)' }
      );
      if (lowStockNote) {
        gsap.fromTo(
          lowStockNote,
          { color: 'var(--brick)', scale: 1.05 },
          { color: 'var(--clay)', scale: 1.0, duration: 0.4 }
        );
      }
      return;
    }

    pdpQuantity++;
    bagCount++;
    animateBagBadge();

    // Micro-tap animation on plus button
    gsap.fromTo(
      btnPlus,
      { scale: 0.85 },
      { scale: 1, duration: 0.2, ease: 'power1.out' }
    );

    animateNumberRoll(qtyNumEl, pdpQuantity, 'up');
  });

  // Decrement (-)
  btnMinus.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (pdpQuantity > 1) {
      pdpQuantity--;
      bagCount = Math.max(0, bagCount - 1);
      animateBagBadge();

      // Micro-tap animation on minus button
      gsap.fromTo(
        btnMinus,
        { scale: 0.85 },
        { scale: 1, duration: 0.2, ease: 'power1.out' }
      );

      animateNumberRoll(qtyNumEl, pdpQuantity, 'down');
    } else if (pdpQuantity === 1) {
      // Return back to "Add to Bag"
      pdpQuantity = 0;
      bagCount = Math.max(0, bagCount - 1);
      animateBagBadge();

      const tl = gsap.timeline();
      tl.to(stepper, {
        opacity: 0,
        scale: 0.95,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
          stepper.style.display = 'none';
          stepper.style.pointerEvents = 'none';
          btnAdd.style.pointerEvents = 'auto';
        }
      })
      .fromTo(btnAdd, 
        { y: 20, opacity: 0, scale: 0.96 }, 
        { y: 0, opacity: 1, scale: 1, duration: 0.28, ease: 'power2.out' }, 
        '-=0.06'
      );
    }
  });
}

// Lightbox & Pan/Zoom State
let lightboxScale = 1.0;
let lightboxTranslateX = 0;
let lightboxTranslateY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let activeGalleryImages: string[] = [];
let activeGalleryIndex = 0;

function applyLightboxTransform() {
  const lightboxImg = document.getElementById('lightbox-img') as HTMLImageElement;
  if (!lightboxImg) return;
  lightboxImg.style.transform = `translate(${lightboxTranslateX}px, ${lightboxTranslateY}px) scale(${lightboxScale})`;
  if (isDragging) {
    lightboxImg.classList.add('grabbing');
  } else {
    lightboxImg.classList.remove('grabbing');
  }
}

function openLightbox(imgSrc: string, title: string = 'Classic Heavyweight Boxy Tee', images: string[] = [], startIndex: number = 0) {
  const modal = document.getElementById('image-lightbox');
  const lightboxImg = document.getElementById('lightbox-img') as HTMLImageElement;
  const titleEl = document.querySelector('.lightbox-product-title');
  const counterEl = document.getElementById('lightbox-counter');
  const thumbsContainer = document.getElementById('lightbox-thumbs');

  if (!modal || !lightboxImg) return;

  activeGalleryImages = images.length > 0 ? images : [imgSrc];
  activeGalleryIndex = startIndex;

  if (titleEl) titleEl.textContent = title;
  lightboxImg.src = activeGalleryImages[activeGalleryIndex] || imgSrc;

  // Reset zoom & pan
  lightboxScale = 1.0;
  lightboxTranslateX = 0;
  lightboxTranslateY = 0;
  applyLightboxTransform();

  // Render thumbnail strip inside lightbox
  if (thumbsContainer) {
    thumbsContainer.innerHTML = '';
    if (activeGalleryImages.length > 1) {
      activeGalleryImages.forEach((src, idx) => {
        const thumbBtn = document.createElement('button');
        thumbBtn.className = `lightbox-thumb-btn ${idx === activeGalleryIndex ? 'active' : ''}`;
        thumbBtn.innerHTML = `<img src="${src}" alt="Thumb ${idx + 1}" />`;
        thumbBtn.addEventListener('click', () => {
          activeGalleryIndex = idx;
          lightboxImg.src = src;
          lightboxScale = 1.0;
          lightboxTranslateX = 0;
          lightboxTranslateY = 0;
          applyLightboxTransform();
          thumbsContainer.querySelectorAll('.lightbox-thumb-btn').forEach((b, i) => {
            b.classList.toggle('active', i === idx);
          });
          if (counterEl) counterEl.textContent = `${idx + 1} / ${activeGalleryImages.length}`;
        });
        thumbsContainer.appendChild(thumbBtn);
      });
    }
  }

  if (counterEl) {
    counterEl.textContent = activeGalleryImages.length > 1
      ? `${activeGalleryIndex + 1} / ${activeGalleryImages.length}`
      : '1 / 1';
  }

  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  lenis?.stop();
}

function closeLightbox() {
  const modal = document.getElementById('image-lightbox');
  if (!modal) return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  lenis?.start();
}

function setupImageZoomAndLightbox() {
  const mainViewport = document.getElementById('main-viewport-container') || document.querySelector('.main-image-viewport');
  const mainImg = (document.getElementById('main-product-img') || document.querySelector('.main-image-viewport img')) as HTMLImageElement;
  const stage = document.getElementById('lightbox-stage');
  const lightboxImg = document.getElementById('lightbox-img') as HTMLImageElement;
  const zoomInBtn = document.getElementById('zoom-in-btn');
  const zoomOutBtn = document.getElementById('zoom-out-btn');
  const zoomResetBtn = document.getElementById('zoom-reset-btn');
  const closeBtn = document.getElementById('lightbox-close-btn');
  const backdrop = document.getElementById('lightbox-backdrop');

  // Open on main image viewport click
  mainViewport?.addEventListener('click', () => {
    const currentSrc = mainImg?.src || activeColor.image;
    const initialIdx = Math.max(0, activeColor.gallery.indexOf(currentSrc));
    openLightbox(currentSrc, `Classic Heavyweight Boxy Tee — ${activeColor.name}`, activeColor.gallery, initialIdx);
  });

  // Zoom In button
  zoomInBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    lightboxScale = Math.min(lightboxScale + 0.35, 4.0);
    applyLightboxTransform();
  });

  // Zoom Out button
  zoomOutBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    lightboxScale = Math.max(lightboxScale - 0.35, 0.7);
    if (lightboxScale <= 1.0) {
      lightboxTranslateX = 0;
      lightboxTranslateY = 0;
    }
    applyLightboxTransform();
  });

  // Reset button
  zoomResetBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    lightboxScale = 1.0;
    lightboxTranslateX = 0;
    lightboxTranslateY = 0;
    applyLightboxTransform();
  });

  // Close triggers
  closeBtn?.addEventListener('click', closeLightbox);
  backdrop?.addEventListener('click', closeLightbox);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });

  // Mouse wheel / trackpad pinch zoom
  stage?.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
    lightboxScale = Math.min(Math.max(lightboxScale * zoomFactor, 0.7), 4.5);
    if (lightboxScale <= 1.0) {
      lightboxTranslateX = 0;
      lightboxTranslateY = 0;
    }
    applyLightboxTransform();
  }, { passive: false });

  // Double click to toggle zoom
  lightboxImg?.addEventListener('dblclick', (e) => {
    e.preventDefault();
    if (lightboxScale > 1.1) {
      lightboxScale = 1.0;
      lightboxTranslateX = 0;
      lightboxTranslateY = 0;
    } else {
      lightboxScale = 2.2;
    }
    applyLightboxTransform();
  });

  // Click and drag to pan
  stage?.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isDragging = true;
    dragStartX = e.clientX - lightboxTranslateX;
    dragStartY = e.clientY - lightboxTranslateY;
    applyLightboxTransform();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    lightboxTranslateX = e.clientX - dragStartX;
    lightboxTranslateY = e.clientY - dragStartY;
    applyLightboxTransform();
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      applyLightboxTransform();
    }
  });
}

function setupUGCInteractions() {
  // UGC Image click to enlarge
  const ugcImgWraps = document.querySelectorAll<HTMLElement>('.ugc-img-wrap');
  ugcImgWraps.forEach((wrap) => {
    wrap.addEventListener('click', () => {
      const img = wrap.querySelector('img');
      const src = wrap.getAttribute('data-enlarge') || img?.src;
      const card = wrap.closest('.ugc-card');
      const colorTag = card?.querySelector('.ugc-color-tag')?.textContent || '';
      const author = card?.querySelector('.ugc-author')?.textContent || 'Community Look';
      if (src) {
        openLightbox(src, `${author} — ${colorTag}`, [src], 0);
      }
    });
  });

  // UGC "View Color" buttons
  const ugcShopButtons = document.querySelectorAll<HTMLButtonElement>('.ugc-shop-btn');
  ugcShopButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetColor = btn.getAttribute('data-color') as keyof typeof GARMENT_VARIANTS;
      if (targetColor && GARMENT_VARIANTS[targetColor]) {
        const swatch = document.querySelector<HTMLButtonElement>(`[data-color="${targetColor}"]`);
        if (swatch) {
          swatch.click();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    });
  });
}

function initPDP() {
  console.log('[LiveTry PDP] Initializing storefront interactivity...');

  // 1. Synchronize product from URL parameter FIRST so all components bind to the right item
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const itemParam = urlParams.get('item');
    const colorParam = urlParams.get('color') as keyof typeof GARMENT_VARIANTS;

    if (itemParam && ITEM_CATALOG[itemParam]) {
      const item = ITEM_CATALOG[itemParam];
      activeColor = item.variant;

      const breadcrumbEl = document.querySelector('.breadcrumb');
      if (breadcrumbEl) breadcrumbEl.textContent = item.breadcrumb;

      const titleEl = document.querySelector('.product-title');
      if (titleEl) titleEl.textContent = item.title;

      const priceEl = document.querySelector('.product-price');
      if (priceEl) priceEl.textContent = item.price;

      const descEl = document.querySelector('.product-desc');
      if (descEl) descEl.textContent = item.description;

      const optionTitle = document.querySelector('.option-title');
      if (optionTitle) optionTitle.textContent = `Colour: ${item.variant.name}`;

      const mainImg = document.getElementById('main-product-img') as HTMLImageElement;
      if (mainImg) mainImg.src = item.variant.image;

      // Update PDP color swatches row
      const swatchesRow = document.querySelector('.swatches-row');
      if (swatchesRow && item.swatches) {
        swatchesRow.innerHTML = item.swatches.map((s, idx) => `
          <button class="swatch-circle ${idx === 0 ? 'active' : ''}" style="background-color: ${s.hex};" aria-label="${s.name}" title="${s.name}"></button>
        `).join('');
      }

      // Update Try-On modal swatches
      const modalSwatches = document.querySelector('.tryon-swatches');
      if (modalSwatches && item.swatches) {
        modalSwatches.innerHTML = item.swatches.map((s, idx) => `
          <button class="tryon-swatch ${idx === 0 ? 'active' : ''}" style="background-color: ${s.hex}; color: #121110;" title="${s.name}">${s.name}</button>
        `).join('');
      }

      // Update Try-On modal title
      const modalTitle = document.querySelector('.tryon-title');
      if (modalTitle) modalTitle.textContent = `Live Try-On: ${item.title}`;

      // CRITICAL: Update gallery thumbnails with the 4 genuine views of this item!
      updateGalleryForVariant(activeColor);

      document.title = `${item.title} — Studio Aelia`;
    } else if (colorParam && GARMENT_VARIANTS[colorParam]) {
      const swatch = document.querySelector<HTMLButtonElement>(`[data-color="${colorParam}"]`);
      if (swatch) {
        swatch.click();
      }
    } else {
      // Initial gallery sync for default color (Charcoal)
      updateGalleryForVariant(activeColor);
    }

    // Clean URL in browser address bar immediately so index.html is never shown
    try {
      const q: string[] = [];
      if (itemParam) q.push(`item=${encodeURIComponent(itemParam)}`);
      if (colorParam) q.push(`color=${encodeURIComponent(colorParam)}`);
      const cleanSearch = q.length > 0 ? `?${q.join('&')}` : '?studio';
      window.history.replaceState(null, '', `/${cleanSearch}${window.location.hash}`);
    } catch (_) {}

    // Support deep-linking to lightbox via ?lightbox=1
    if (urlParams.get('lightbox') === '1') {
      setTimeout(() => {
        document.getElementById('main-viewport-container')?.click();
      }, 150);
    }
  } catch (err) {
    console.error('[LiveTry] URL param deep-linking error:', err);
  }

  // 2. Setup interactive components with the synchronized product
  try { setupGalleryThumbnails(); } catch (err) { console.error('[LiveTry] Failed to setup gallery thumbnails:', err); }
  try { setupColorSelection(); } catch (err) { console.error('[LiveTry] Failed to setup color selection:', err); }
  try { setupSizeSelection(); } catch (err) { console.error('[LiveTry] Failed to setup size selection:', err); }
  try { setupImageZoomAndLightbox(); } catch (err) { console.error('[LiveTry] Failed to setup lightbox:', err); }
  try { setupUGCInteractions(); } catch (err) { console.error('[LiveTry] Failed to setup UGC interactions:', err); }

  // Live Try-On Real-Time WebRTC Implementation
  try { setupTryOnFeature(); } catch (err) { console.error('[LiveTry] Failed to setup try-on feature:', err); }

  // Animated Bag Quantity Stepper (GSAP micro-interactions)
  try {
    setupBagQuantityStepper();
  } catch (err) {
    console.error('[LiveTry] Failed to bind Add to Bag Stepper:', err);
  }

  // Pre-warm Decart token and all garment assets in background immediately so startTryOn has 0 wait
  try {
    prewarmGarments();
  } catch (_) {}

  console.log('[LiveTry PDP] All storefront buttons and event listeners initialized successfully.');
}

// Live Try-On Real-Time WebRTC State & Handlers
let localMediaStream: MediaStream | null = null;
let isTryOnActive = false;
let isStartingTryOn = false;
let tryonRetryCount = 0;
let _backendAvailable = typeof window !== 'undefined' && !window.location.hostname.includes('.hf.space') && !window.location.hostname.includes('github.io');
let cachedToken: string | null = null;
let cachedTokenPromise: Promise<string> | null = null;

function prefetchDecartToken() {
  if (cachedToken) return;
  if (!cachedTokenPromise) {
    console.log('[LiveTry Token] Pre-fetching ephemeral Decart client token in background...');
    cachedTokenPromise = fetchDecartToken(false).then((token) => {
      cachedToken = token;
      cachedTokenPromise = null;
      return token;
    }).catch((err) => {
      console.warn('[LiveTry Token] Prefetch notice:', err);
      cachedTokenPromise = null;
      return '';
    });
  }
}

function prewarmGarments() {
  prefetchDecartToken();
  const allImages = [
    '/fixtures/women-silk-blouse.jpg',
    '/fixtures/women-linen-shirt.jpg',
    '/fixtures/women-merino-knit.jpg',
    '/fixtures/men-poplin-shirt.jpg',
    '/fixtures/linen-studio-kurta.jpg',
    '/fixtures/men-overshirt.jpg',
    '/fixtures/charcoal-front.jpg',
    '/fixtures/oatmeal-tshirt.jpg',
    '/fixtures/olive-tshirt.jpg'
  ];
  if (activeColor?.image) {
    tryonEngine.prewarm(activeColor.image).catch(() => {});
  }
  setTimeout(() => {
    allImages.forEach(img => tryonEngine.prewarm(img).catch(() => {}));
  }, 200);
}

async function getDecartToken(rotate = false): Promise<string> {
  if (!rotate && cachedToken) {
    const token = cachedToken;
    cachedToken = null; // Consume token
    return token;
  }
  if (!rotate && cachedTokenPromise) {
    try {
      const token = await cachedTokenPromise;
      if (token) return token;
    } catch {}
  }
  return fetchDecartToken(rotate);
}

// Keys injected at build time from VITE_DECART_API_KEYS in .env — never hardcoded in source.
// Format in .env:  VITE_DECART_API_KEYS=dct_key1,dct_key2,dct_key3
const _rawEnvKeys = (import.meta as any).env?.VITE_DECART_API_KEYS || '';
const _DECART_KEY_POOL: string[] = String(_rawEnvKeys)
  .split(',')
  .map((k: string) => k.trim())
  .filter((k: string) => k.startsWith('dct_'));
let _keyPoolIndex = 0;

async function fetchDecartToken(rotate = false): Promise<string> {
  // Primary: route through backend only if backend is active (skip on static spaces for 0ms overhead)
  if (_backendAvailable) {
    try {
      const res = await fetch('/api/tryon/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rotate })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.apiKey) {
          console.log(`[LiveTry Token] Minted ephemeral token via backend (Key #${data.key_index || 1}/${data.total_keys || '?'})`);
          return data.apiKey;
        }
      } else {
        _backendAvailable = false;
      }
    } catch {
      _backendAvailable = false;
    }
  }

  // Fallback: use keys from VITE_DECART_API_KEYS env var (static / no-backend deploy)
  if (_DECART_KEY_POOL.length === 0) {
    throw new Error('No Decart API keys configured. Set VITE_DECART_API_KEYS in .env and rebuild, or configure backend DECART_API_KEY.');
  }
  if (rotate) {
    _keyPoolIndex = (_keyPoolIndex + 1) % _DECART_KEY_POOL.length;
  }
  const key: string = _DECART_KEY_POOL[_keyPoolIndex] || '';
  if (!key) {
    throw new Error('No active Decart API key available');
  }
  console.log(`[LiveTry Token] Minting token directly via env key #${_keyPoolIndex + 1}/${_DECART_KEY_POOL.length}`);
  const headers: Record<string, string> = {
    'X-API-KEY': key,
    'Content-Type': 'application/json'
  };
  const res = await fetch('https://api.decart.ai/v1/client/tokens', {
    method: 'POST',
    headers,
    body: '{}'
  });
  if (!res.ok) {
    _keyPoolIndex = (_keyPoolIndex + 1) % _DECART_KEY_POOL.length;
    throw new Error(`Decart token mint failed (${res.status})`);
  }
  const data = await res.json();
  if (data.apiKey) return data.apiKey;
  throw new Error(data.message || 'Decart returned no apiKey');
}

const tryonEngine = new DecartRealtimeVtonEngine({
  tokenProvider: async () => getDecartToken(false),
  mirror: false, // Mirrored via hardware CSS transform: scaleX(-1) on video element
  modelName: 'lucy-vton-latest',
  speed: 'fast' // High-priority compute tier for minimum latency & instant cold-starts
});

function syncTryonModalSwatches(colorId: string) {
  const swatches = document.querySelectorAll<HTMLButtonElement>('.tryon-swatch');
  swatches.forEach((swatch) => {
    if (swatch.getAttribute('data-tryon-color') === colorId) {
      swatch.classList.add('active');
    } else {
      swatch.classList.remove('active');
    }
  });
}

async function startTryOn() {
  const modal = document.getElementById('tryon-modal');
  const videoEl = document.getElementById('tryon-video') as HTMLVideoElement;
  const loader = document.getElementById('tryon-loader');
  const loaderText = document.getElementById('tryon-loader-text');
  const statusDot = document.getElementById('tryon-status-dot');
  const statusText = document.getElementById('tryon-status-text');
  const telemetryEl = document.getElementById('tryon-telemetry');

  if (!modal || !videoEl) return;
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  lenis?.stop();

  // Sync swatches inside modal to match current activeColor
  syncTryonModalSwatches(activeColor.id);

  const isDebug = new URLSearchParams(window.location.search).get('debug') === '1';
  if (telemetryEl) {
    if (isDebug) {
      telemetryEl.classList.add('debug-visible');
    } else {
      telemetryEl.classList.remove('debug-visible');
    }
  }

  // Ensure default wide-angle view on mobile
  const viewportWrap = document.getElementById('tryon-viewport-wrap');
  if (window.innerWidth <= 768 && viewportWrap) {
    viewportWrap.classList.remove('fit-cover');
    viewportWrap.style.setProperty('--tryon-zoom', '0.95');
    document.getElementById('tryon-zoom-out-btn')?.classList.add('active');
    document.getElementById('tryon-zoom-in-btn')?.classList.remove('active');
  }

  if (loader) loader.classList.remove('hidden');
  if (loaderText) loaderText.textContent = 'Requesting camera access...';
  if (statusText) statusText.textContent = 'Requesting Camera';

  if (isStartingTryOn) return;
  isStartingTryOn = true;

  let synthTimer: any = null;
  let elapsedSeconds = 0;

  // 1. Acquire Camera Stream
    try {
      if (!localMediaStream || !localMediaStream.active) {
        const isMobile = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const videoConstraints: MediaTrackConstraints = {
          facingMode: 'user',
          frameRate: { ideal: 30, min: 24 }
        };

        if (isMobile) {
          // Mobile portrait: Request vertical orientation so camera HAL does not center-crop
          videoConstraints.width = { ideal: 720 };
          videoConstraints.height = { ideal: 1280 };
          videoConstraints.aspectRatio = { ideal: 9 / 16 };
        } else {
          videoConstraints.width = { ideal: 1280, max: 1280 };
          videoConstraints.height = { ideal: 720, max: 720 };
          videoConstraints.aspectRatio = { ideal: 16 / 9 };
        }

        localMediaStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: videoConstraints
        });

        // Ensure mobile camera is pulled back to maximum wide angle (disable hardware single-person selfie crop)
        const [track] = localMediaStream.getVideoTracks();
        if (track && typeof (track as any).getCapabilities === 'function') {
          try {
            const caps = (track as any).getCapabilities();
            if (caps && caps.zoom) {
              const minZoom = caps.zoom.min ?? 1;
              await (track as any).applyConstraints({
                advanced: [{ zoom: minZoom }]
              }).catch(() => {});
            }
          } catch (_) {}
        }
      }
    } catch (camErr: any) {
      console.error('[TryOn] Camera access error:', camErr);
      if (loaderText) {
        loaderText.textContent = `Camera permission error: ${camErr.name === 'NotAllowedError' ? 'Access denied' : camErr.message}. Please allow camera access.`;
      }
      if (statusText) statusText.textContent = 'Camera Blocked';
      return;
    }

    // Keep stream strictly video-only to prevent Chrome audio autoplay blocks
    videoEl.muted = true;
    videoEl.defaultMuted = true;
    videoEl.playsInline = true;
    videoEl.autoplay = true;

    // Immediately display the user's authentic camera feed
    videoEl.srcObject = localMediaStream;
    await videoEl.play().catch(() => {});

    if (loaderText) loaderText.textContent = 'Connecting Decart Lucy VTON WebRTC...';
    if (statusText) statusText.textContent = 'Connecting WebRTC';

    // Live elapsed timer for clear feedback
    synthTimer = setInterval(() => {
      elapsedSeconds++;
      if (loader && !loader.classList.contains('hidden') && loaderText) {
        if (elapsedSeconds < 6) {
          loaderText.textContent = `Connecting Lucy VTON inference worker... (${elapsedSeconds}s)`;
        } else if (elapsedSeconds < 14) {
          loaderText.textContent = `Connecting Decart Lucy VTON neural pipeline... (${elapsedSeconds}s)`;
        } else {
          loaderText.textContent = `Synthesizing real-time virtual try-on stream... (${elapsedSeconds}s)`;
        }
      }
    }, 1000);

    // 2. Dial Decart Lucy VTON Real-Time WebRTC Pipeline
    try {
      await tryonEngine.startStream(
        localMediaStream,
        {
          imageUrl: activeColor.image,
          prompt: activeColor.prompt
        },
        {
          onRemoteStream: (remoteStream) => {
            const videoTracks = remoteStream.getVideoTracks();
            console.log('[TryOn] Remote Lucy VTON stream received! Video tracks:', videoTracks.length);

            if (videoTracks.length === 0) {
              console.warn('[TryOn] Remote stream has no video tracks yet, waiting for track publication...');
              return;
            }

            if (synthTimer) clearInterval(synthTimer);

            const videoTrack = videoTracks[0];
            if (!videoTrack) {
              console.warn('[TryOn] Remote stream has no valid video track');
              return;
            }

            console.log('[TryOn] Video track state:', {
              id: videoTrack.id,
              enabled: videoTrack.enabled,
              muted: videoTrack.muted,
              readyState: videoTrack.readyState
            });

            // Instruct WebRTC jitter buffer to drain frames with minimum playout latency
            try {
              if ('contentHint' in videoTrack) {
                (videoTrack as any).contentHint = 'motion';
              }
            } catch (_) {}

            // Clean binding to video element without interrupting playback pipeline
            videoEl.muted = true;
            videoEl.defaultMuted = true;
            videoEl.playsInline = true;
            videoEl.autoplay = true;

            if (videoEl.srcObject !== remoteStream) {
              videoEl.srcObject = remoteStream;
            }

            let hasRevealedFrame = false;
            const revealTransformedStream = () => {
              if (hasRevealedFrame) return;
              hasRevealedFrame = true;
              console.log('[TryOn] First transformed video frame visually rendered! Resolution:', videoEl.videoWidth, 'x', videoEl.videoHeight);
              const modelLabel = tryonEngine.getActiveModel() || 'Lucy VTON';
              if (loader) loader.classList.add('hidden');
              if (statusDot) statusDot.classList.add('live');
              if (statusText) statusText.textContent = 'Live AI Try-On';
              if (telemetryEl) {
                telemetryEl.textContent = `Decart ${modelLabel} 30 FPS • Active • RTT <150ms`;
              }
            };

            const schedulePresentationCheck = () => {
              if ('requestVideoFrameCallback' in videoEl) {
                (videoEl as any).requestVideoFrameCallback(() => {
                  revealTransformedStream();
                });
              } else {
                setTimeout(revealTransformedStream, 350);
              }
            };

            const startPlayback = () => {
              videoEl.play().then(() => {
                schedulePresentationCheck();
              }).catch((err) => {
                console.warn('[TryOn] Play notice, retrying muted:', err);
                videoEl.muted = true;
                videoEl.play().then(schedulePresentationCheck).catch(() => {});
              });
            };

            if (videoTrack.muted) {
              console.log('[TryOn] Video track muted initially, awaiting first keyframe...');
              videoTrack.onunmute = () => {
                console.log('[TryOn] Video track unmuted! Starting playback...');
                startPlayback();
              };
            } else {
              startPlayback();
            }

            videoEl.onplaying = () => {
              schedulePresentationCheck();
            };

            startPlayback();
          },
          onConnectionChange: (state) => {
            console.log('[TryOn] Connection state:', state);
            if (statusText && state !== 'connected') {
              statusText.textContent = state;
            }
            if (state === 'connected') {
              if (statusDot) statusDot.classList.add('live');
              if (statusText) statusText.textContent = 'Streaming WebRTC';
            } else if (state === 'reconnecting') {
              if (statusDot) statusDot.classList.remove('live');
              if (loaderText) loaderText.textContent = 'Reconnecting Decart Lucy VTON...';
            }
          },
          onGenerationTick: (seconds) => {
            const modelLabel = tryonEngine.getActiveModel() || 'Lucy VTON';
            if (loader) loader.classList.add('hidden');
            if (statusDot) statusDot.classList.add('live');
            if (statusText) statusText.textContent = 'Live AI Try-On';
            if (telemetryEl) {
              telemetryEl.textContent = `Decart ${modelLabel} 30 FPS • Synthesizing (${seconds}s) • RTT <150ms`;
            }
          },
          onError: (err) => {
            console.error('[TryOn] Engine error:', err);
            if (synthTimer) clearInterval(synthTimer);
            if (loaderText) loaderText.textContent = `Streaming notice: ${err.message}`;
            if (err.message?.includes('credits') || err.message?.includes('session_limit') || err.message?.includes('Session ended')) {
              console.log('[TryOn] Token issue detected, forcing key rotation...');
              fetchDecartToken(true).then(() => {
                if (modal.classList.contains('active')) {
                  setTimeout(() => startTryOn(), 1000);
                }
              }).catch(() => {});
            }
          }
        }
      );

      isTryOnActive = true;
      tryonRetryCount = 0; // Successful connection resets retry counter
    } catch (streamErr: any) {
      if (synthTimer) clearInterval(synthTimer);
      console.warn('[TryOn] Lucy VTON stream error:', streamErr);

      if (tryonRetryCount < 1) {
        tryonRetryCount++;
        if (loaderText) loaderText.textContent = 'Reconnecting Decart Lucy VTON...';
        if (statusText) statusText.textContent = 'Reconnecting';
        fetchDecartToken(true).then(() => {
          if (modal.classList.contains('active')) {
            setTimeout(() => startTryOn(), 1200);
          }
        }).catch((err) => {
          console.error('[TryOn] Token rotation failed during reconnect:', err);
          if (loaderText) loaderText.textContent = `Virtual try-on error: ${err.message || 'Connection failed'}. Click to retry.`;
          if (statusText) statusText.textContent = 'Error';
          if (statusDot) statusDot.classList.remove('live');
        });
      } else {
        // Stop infinite loop and give user clean actionable feedback
        if (loaderText) {
          loaderText.textContent = 'Virtual try-on session temporarily paused. Click "Try On Live" to reconnect.';
        }
        if (statusText) statusText.textContent = 'Paused';
        if (statusDot) statusDot.classList.remove('live');
      }
    } finally {
      isStartingTryOn = false;
    }
}

function stopTryOn() {
  const modal = document.getElementById('tryon-modal');
  const videoEl = document.getElementById('tryon-video') as HTMLVideoElement;
  const statusDot = document.getElementById('tryon-status-dot');
  const statusText = document.getElementById('tryon-status-text');

  tryonEngine.stopStream();
  if (localMediaStream) {
    localMediaStream.getTracks().forEach((track) => track.stop());
    localMediaStream = null;
  }
  if (videoEl) videoEl.srcObject = null;

  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
  if (statusDot) statusDot.classList.remove('live');
  if (statusText) statusText.textContent = 'Ready';
  document.body.style.overflow = '';
  lenis?.start();
  isTryOnActive = false;
  isStartingTryOn = false;
  tryonRetryCount = 0;
}

function captureSnapshot() {
  const videoEl = document.getElementById('tryon-video') as HTMLVideoElement;
  if (!videoEl || !videoEl.videoWidth) return;

  const canvas = document.createElement('canvas');
  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Mirror snapshot to match mirror display
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

  const snapshotUrl = canvas.toDataURL('image/jpeg', 0.92);
  openLightbox(snapshotUrl, `Live Try-On Snapshot — ${activeColor.name}`, [snapshotUrl], 0);
}

function setupTryOnFeature() {
  const tryOnBtns = document.querySelectorAll<HTMLButtonElement>('#pdp-try-on, .btn-try-on, [data-action="try-on"]');
  const closeBtn = document.getElementById('tryon-close-btn');
  const backdrop = document.getElementById('tryon-backdrop');
  const snapshotBtn = document.getElementById('tryon-snapshot-btn');
  const bagBtn = document.getElementById('tryon-bag-btn');

  tryOnBtns.forEach((btn) => {
    btn.disabled = false;
    btn.removeAttribute('aria-disabled');
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
    btn.style.pointerEvents = 'auto';
    btn.title = 'Start Live Video-to-Video Virtual Try-On';
    btn.addEventListener('click', startTryOn);
    // Instant pre-warm when cursor hovers over or fingers touch button
    btn.addEventListener('pointerenter', () => {
      prefetchDecartToken();
      if (activeColor?.image) tryonEngine.prewarm(activeColor.image).catch(() => {});
    });
  });

  closeBtn?.addEventListener('click', stopTryOn);
  backdrop?.addEventListener('click', stopTryOn);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isTryOnActive) {
      stopTryOn();
    }
  });

  // Modal Garment Swatch Switching
  const modalSwatches = document.querySelectorAll<HTMLButtonElement>('.tryon-swatch');
  modalSwatches.forEach((swatch) => {
    swatch.addEventListener('click', () => {
      const colorId = swatch.getAttribute('data-tryon-color') as keyof typeof GARMENT_VARIANTS;
      if (colorId && GARMENT_VARIANTS[colorId]) {
        // Trigger main PDP swatch sync
        const pdpSwatch = document.querySelector<HTMLButtonElement>(`[data-color="${colorId}"]`);
        if (pdpSwatch) pdpSwatch.click();

        syncTryonModalSwatches(colorId);

        // Update live Decart session on the fly without stopping video!
        if (isTryOnActive) {
          tryonEngine.setGarment({
            imageUrl: GARMENT_VARIANTS[colorId].image,
            prompt: GARMENT_VARIANTS[colorId].prompt
          });
        }
      }
    });
  });

  snapshotBtn?.addEventListener('click', captureSnapshot);

  bagBtn?.addEventListener('click', () => {
    const btnAdd = document.getElementById('pdp-add-to-bag');
    const btnPlus = document.getElementById('pdp-qty-plus');
    if (pdpQuantity === 0 && btnAdd) {
      btnAdd.click();
    } else if (btnPlus) {
      btnPlus.click();
    } else {
      bagCount++;
      animateBagBadge();
    }
    if (bagBtn) {
      const orig = bagBtn.innerHTML;
      bagBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:6px"><polyline points="20 6 9 17 4 12"></polyline></svg>Added';
      setTimeout(() => {
        bagBtn.innerHTML = orig;
      }, 1500);
    }
  });

  // Viewport Zoom / Framing controls (Wide View vs Fill)
  const zoomOutBtn = document.getElementById('tryon-zoom-out-btn');
  const zoomInBtn = document.getElementById('tryon-zoom-in-btn');
  const viewportWrap = document.getElementById('tryon-viewport-wrap');

  const setZoomMode = (mode: 'wide' | 'fill') => {
    if (!viewportWrap) return;
    if (mode === 'wide') {
      viewportWrap.classList.remove('fit-cover');
      viewportWrap.style.setProperty('--tryon-zoom', '0.95');
      zoomOutBtn?.classList.add('active');
      zoomInBtn?.classList.remove('active');
    } else {
      viewportWrap.classList.add('fit-cover');
      viewportWrap.style.setProperty('--tryon-zoom', '1');
      zoomInBtn?.classList.add('active');
      zoomOutBtn?.classList.remove('active');
    }
  };

  zoomOutBtn?.addEventListener('click', () => setZoomMode('wide'));
  zoomInBtn?.addEventListener('click', () => setZoomMode('fill'));

  // Default to Wide on mobile so the outfit and upper body are fully visible
  if (window.innerWidth <= 768) {
    setZoomMode('wide');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initPDP());
} else {
  initPDP();
}
export { GARMENT_VARIANTS, activeColor };

