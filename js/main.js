/**
 * main.js
 * Orchestration only — no real logic lives here. Load order matters:
 * split text before first paint, then the 3D scene, then everything that
 * depends on layout being final (ScrollTrigger measurements, tilt, etc).
 */
import { Hero3D } from '../hero3d.js';
import { initParticles } from '../particles.js';
import {
  initCursor, initMagnetic, initTilt, initRipple,
  prepareSplitText, playSplitText, initHeroSpotlight, initTopProgress
} from '../effects.js';
import {
  bindHeroScroll, bindReveal, bindProjectCards,
  bindCounters, bindNavHighlight, bindGlassPanels
} from '../scroll.js';

const loaderEl = document.getElementById('loader');
const loaderProgressEl = document.getElementById('loaderProgress');
const loaderPctEl = document.getElementById('loaderPct');

const heroSection = document.getElementById('hero');
const heroCanvas = document.getElementById('heroCanvas');
const particlesCanvas = document.getElementById('heroParticles');
const heroProgressFillEl = document.getElementById('heroProgressFill');
const topProgressFillEl = document.getElementById('topProgressFill');

// Split hero/subtitle text into words up front so there's no layout flash
// once GSAP takes over.
prepareSplitText();

function fakeLoaderStep(pct) {
  loaderProgressEl.style.width = `${pct}%`;
  loaderPctEl.textContent = `${pct}%`;
}

async function init() {
  // There's no frame sequence or model to preload right now — the loader
  // instead waits on webfonts (so type doesn't reflow) and the first WebGL
  // frame, which keeps the same "something real is loading" feel.
  fakeLoaderStep(20);

  const hero3d = new Hero3D(heroCanvas);
  fakeLoaderStep(65);

  await document.fonts.ready.catch(() => {});
  fakeLoaderStep(100);

  initParticles(particlesCanvas);

  bindHeroScroll({ heroSection, hero3d, progressFillEl: heroProgressFillEl });
  bindReveal();
  bindProjectCards();
  bindCounters();
  bindNavHighlight();
  bindGlassPanels();

  const cursor = initCursor();
  initMagnetic();
  initTilt();
  initRipple();
  initHeroSpotlight(heroSection);
  initTopProgress(topProgressFillEl);

  // hero mouse parallax feeds the 3D scene directly
  if (!window.matchMedia('(hover: none), (pointer: coarse)').matches) {
    window.addEventListener('mousemove', (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      hero3d.setMouse(nx, ny);
    });
  }

  document.body.classList.add('js-ready');
  loaderEl.classList.add('is-hidden');
  playSplitText();

  // simple, dependency-free contact form feedback (no backend wired up)
  const form = document.querySelector('.contact__form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('.btn span');
      const original = btn.textContent;
      btn.textContent = 'Mensagem enviada';
      form.reset();
      setTimeout(() => { btn.textContent = original; }, 2400);
    });
  }
}

init();