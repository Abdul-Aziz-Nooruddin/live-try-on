import gsap from 'gsap';
import Lenis from 'lenis';

let globalLenis: Lenis | null = null;

export function getLenis(): Lenis | null {
  return globalLenis;
}

/**
 * Initialize Lenis Kinetic Smooth Scrolling across the storefront
 */
export function initLenis(): Lenis | null {
  if (typeof window === 'undefined') return null;
  if (globalLenis) return globalLenis;

  try {
    globalLenis = new Lenis({
      autoRaf: true,
      smoothWheel: true,
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
    });

    // Handle smooth internal anchor scrolling
    document.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!target) return;
      const href = target.getAttribute('href');
      if (!href || href === '#' || href === '#!') return;
      const elem = document.querySelector(href);
      if (elem && globalLenis) {
        e.preventDefault();
        globalLenis.scrollTo(elem as HTMLElement, { offset: -72, duration: 1.0 });
      }
    });

    console.log('[LiveTry] Lenis kinetic smooth scroll initialized');
  } catch (err) {
    console.warn('[LiveTry] Lenis init skipped in current environment:', err);
  }

  return globalLenis;
}

/**
 * Initialize high-end editorial micro-animations across the site
 */
export function initSiteAnimations() {
  if (typeof window === 'undefined') return;

  // Respect user preference for reduced motion
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  // 1. Hero & Header Gentle Editorial Reveal
  const heroElements = document.querySelectorAll(
    '.hero-headline, .hero-content > p, .btn-text-hero, .hero-split, .brand-wordmark'
  );
  if (heroElements.length > 0) {
    gsap.fromTo(
      heroElements,
      { opacity: 0, y: 18 },
      {
        opacity: 1,
        y: 0,
        duration: 0.75,
        stagger: 0.08,
        ease: 'power2.out',
        clearProps: 'transform'
      }
    );
  }

  // 2. Product & Category Card Image Zoom on Hover
  const cardElements = document.querySelectorAll<HTMLElement>(
    '.product-card, .category-card, .card-link, .ugc-card'
  );
  cardElements.forEach((card) => {
    const img = card.querySelector<HTMLElement>('img, .category-image img, .product-card-img-box img, .card-photo-box img');
    if (!img) return;

    card.addEventListener('mouseenter', () => {
      gsap.to(img, {
        scale: 1.025,
        duration: 0.45,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    });

    card.addEventListener('mouseleave', () => {
      gsap.to(img, {
        scale: 1.0,
        duration: 0.45,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    });
  });

  // 3. Size Box & Swatch Tactile Feedback
  const interactivePills = document.querySelectorAll<HTMLElement>(
    '.size-box, .tryon-swatch, .thumb-btn, .swatch-btn, .filter-chip'
  );
  interactivePills.forEach((pill) => {
    pill.addEventListener('click', () => {
      gsap.fromTo(
        pill,
        { scale: 0.94 },
        { scale: 1.0, duration: 0.22, ease: 'back.out(2)' }
      );
    });
  });

  // 4. Smooth Sticky Nav Border Elevation on Scroll
  const nav = document.querySelector<HTMLElement>('.main-nav');
  if (nav) {
    let hasScrolled = false;
    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY > 20;
      if (scrolled !== hasScrolled) {
        hasScrolled = scrolled;
        gsap.to(nav, {
          borderBottomColor: hasScrolled ? 'var(--stone)' : 'transparent',
          duration: 0.3,
          ease: 'power1.out'
        });
      }
    }, { passive: true });
  }

  // 5. Accordion Expand/Collapse Animation
  const accordions = document.querySelectorAll<HTMLElement>('.accordion-row, .accordion-item');
  accordions.forEach((acc) => {
    const panel = acc.nextElementSibling as HTMLElement | null;
    const icon = acc.querySelector<HTMLElement>('.accordion-icon, span:last-child');
    if (!panel || !panel.classList.contains('accordion-panel')) return;

    acc.addEventListener('click', () => {
      const isOpen = panel.classList.contains('open');
      if (isOpen) {
        gsap.to(panel, {
          height: 0,
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: () => {
            panel.classList.remove('open');
            panel.style.display = 'none';
          }
        });
        if (icon) gsap.to(icon, { rotate: 0, duration: 0.25, ease: 'power2.out' });
      } else {
        panel.style.display = 'block';
        panel.style.height = 'auto';
        const fullHeight = panel.scrollHeight;
        panel.style.height = '0px';
        panel.classList.add('open');

        gsap.to(panel, {
          height: fullHeight,
          opacity: 1,
          duration: 0.35,
          ease: 'power2.out',
          onComplete: () => {
            panel.style.height = 'auto';
          }
        });
        if (icon) gsap.to(icon, { rotate: 45, duration: 0.25, ease: 'power2.out' });
      }
    });
  });
}

/**
 * Universal Site Motion Bootstrap
 */
export function initSiteMotion() {
  initLenis();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initSiteAnimations());
  } else {
    initSiteAnimations();
  }
}

// Auto-run if imported directly
if (typeof window !== 'undefined') {
  initSiteMotion();
}
