/**
 * scroll.js
 * All GSAP / ScrollTrigger wiring lives here. Kept as small, composable
 * bind* functions so main.js can call only what a given page needs.
 */

gsap.registerPlugin(ScrollTrigger);

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------------------------------------------------------- */
/* Hero: drives the 3D scene + progress bar from scroll position      */
/* ---------------------------------------------------------------- */
export function bindHeroScroll({ heroSection, hero3d, progressFillEl }) {
  ScrollTrigger.create({
    trigger: heroSection,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.4,
    onUpdate: (self) => {
      hero3d.setScrollProgress(self.progress);
      progressFillEl.style.width = `${self.progress * 100}%`;
    }
  });
}

/* ---------------------------------------------------------------- */
/* Generic reveal system driven by data-reveal="type" attributes      */
/*   fade-up (default) · fade-left · fade-right · scale · blur ·      */
/*   mask · none (just fades opacity, for text already split)         */
/* ---------------------------------------------------------------- */
export function bindReveal() {
  const items = gsap.utils.toArray('[data-reveal]');

  // group consecutive siblings that share a parent + type for stagger,
  // so e.g. the three about__stat blocks animate as a sequence
  const groups = new Map();
  items.forEach(el => {
    const key = el.parentElement;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(el);
  });

  groups.forEach((els) => {
    els.forEach((el, i) => {
      const type = el.dataset.reveal || 'fade-up';
      const from = { opacity: 0 };
      const to = { opacity: 1, duration: 0.9, ease: 'power3.out' };

      switch (type) {
        case 'fade-left':
          from.x = -48; to.x = 0; break;
        case 'fade-right':
          from.x = 48; to.x = 0; break;
        case 'scale':
          from.scale = 0.88; to.scale = 1; break;
        case 'blur':
          from.filter = 'blur(14px)'; to.filter = 'blur(0px)'; break;
        case 'mask':
          from.clipPath = 'inset(0 0 100% 0)'; to.clipPath = 'inset(0 0 0% 0)';
          to.duration = 1.1; to.ease = 'power4.inOut'; break;
        case 'fade-up':
        default:
          from.y = 36; to.y = 0; break;
      }

      if (reducedMotion) {
        gsap.set(el, { opacity: 1, x: 0, y: 0, scale: 1, clipPath: 'none', filter: 'none' });
        return;
      }

      gsap.fromTo(el, from, {
        ...to,
        delay: i * 0.08,
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none reverse'
        }
      });
    });
  });
}

/* ---------------------------------------------------------------- */
/* Project cards: staggered clip-path entrance + subtle media parallax*/
/* ---------------------------------------------------------------- */
export function bindProjectCards() {
  const cards = gsap.utils.toArray('.card');
  if (!cards.length) return;

  if (!reducedMotion) {
    gsap.fromTo(cards,
      { opacity: 0, y: 60, clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)' },
      {
        opacity: 1, y: 0, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
        duration: 1, ease: 'power4.out', stagger: 0.12,
        scrollTrigger: { trigger: '.projects__grid', start: 'top 80%', toggleActions: 'play none none reverse' }
      }
    );

    cards.forEach(card => {
      const media = card.querySelector('.card__media');
      gsap.fromTo(media, { yPercent: -8 }, {
        yPercent: 8, ease: 'none',
        scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }
}

/* ---------------------------------------------------------------- */
/* Animated counters — "30+", "10+" etc. count up once in view        */
/* ---------------------------------------------------------------- */
export function bindCounters() {
  document.querySelectorAll('.about__stat-num').forEach(el => {
    const raw = el.textContent.trim();
    const match = raw.match(/[\d.]+/);
    if (!match) return;
    const target = parseFloat(match[0]);
    const suffix = raw.replace(match[0], '');
    if (reducedMotion) return;

    const counter = { val: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        gsap.to(counter, {
          val: target, duration: 1.6, ease: 'power2.out',
          onUpdate: () => {
            const isInt = Number.isInteger(target);
            el.textContent = (isInt ? Math.round(counter.val) : counter.val.toFixed(1)) + suffix;
          }
        });
      }
    });
  });
}

/* ---------------------------------------------------------------- */
/* Nav highlighting — marks the link matching the section in view     */
/* ---------------------------------------------------------------- */
export function bindNavHighlight() {
  const links = document.querySelectorAll('.nav__links a[data-nav]');
  if (!links.length) return;
  links.forEach(link => {
    const section = document.getElementById(link.dataset.nav);
    if (!section) return;
    ScrollTrigger.create({
      trigger: section,
      start: 'top center',
      end: 'bottom center',
      onEnter: () => setActive(link),
      onEnterBack: () => setActive(link)
    });
  });
  function setActive(activeLink) {
    links.forEach(l => l.classList.toggle('is-active', l === activeLink));
  }
}

/* ---------------------------------------------------------------- */
/* Section background mesh drift intensity tied to scroll (cheap)     */
/* ---------------------------------------------------------------- */
export function bindGlassPanels() {
  document.querySelectorAll('.glass-panel').forEach(panel => {
    ScrollTrigger.create({
      trigger: panel,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
      onUpdate: (self) => panel.style.setProperty('--glass-strength', (0.3 + self.progress * 0.7).toFixed(2))
    });
  });
}