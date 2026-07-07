/**
 * main.js
 */

import { Hero3D } from './hero3d.js';
import { initParticles } from './particles.js';

import {
  initCursor,
  initMagnetic,
  initTilt,
  initRipple,
  prepareSplitText,
  playSplitText,
  initHeroSpotlight,
  initTopProgress
} from './effects.js';

import {
  bindHeroScroll,
  bindReveal,
  bindProjectCards,
  bindCounters,
  bindNavHighlight,
  bindGlassPanels,
  bindTextRevealOnScroll,
  bindSvgLineDraw
} from './scroll.js';

const loaderEl = document.getElementById('loader');
const loaderProgressEl = document.getElementById('loaderProgress');
const loaderPctEl = document.getElementById('loaderPct');

const heroSection = document.getElementById('hero');
const heroCanvas = document.getElementById('heroCanvas');
const particlesCanvas = document.getElementById('heroParticles');
const heroProgressFillEl = document.getElementById('heroProgressFill');
const topProgressFillEl = document.getElementById('topProgressFill');

function fakeLoaderStep(pct) {
  if (!loaderProgressEl || !loaderPctEl) return;
  loaderProgressEl.style.width = `${pct}%`;
  loaderPctEl.textContent = `${pct}%`;
}

function hideLoader() {
  if (loaderEl) loaderEl.classList.add('is-hidden');
}

const failsafe = setTimeout(() => {
  console.warn('[main.js] Failsafe acionado.');
  hideLoader();
}, 5000);

try {
  prepareSplitText();
} catch (err) {
  console.error(err);
}

async function init() {

  fakeLoaderStep(15);

  let hero3d = null;

  try {

    if (typeof THREE === 'undefined') {
      throw new Error('Three.js não carregou.');
    }

    hero3d = new Hero3D(heroCanvas);

  } catch (err) {

    console.error(err);

    if (heroCanvas) {
      heroCanvas.style.display = 'none';
    }

  }

  fakeLoaderStep(55);

  try {

    await Promise.race([
      document.fonts.ready,
      new Promise(resolve => setTimeout(resolve, 1500))
    ]);

  } catch (e) {}

  fakeLoaderStep(100);

  try {

    if (particlesCanvas) {
      initParticles(particlesCanvas);
    }

  } catch (e) {
    console.error(e);
  }

  try {

    if (hero3d) {

      bindHeroScroll({
        heroSection,
        hero3d,
        progressFillEl: heroProgressFillEl
      });

    }

    bindReveal();

    // ESSAS DUAS O CLAUDE ESQUECEU
    bindTextRevealOnScroll();
    bindSvgLineDraw();

    bindProjectCards();
    bindCounters();
    bindNavHighlight();
    bindGlassPanels();

  } catch (e) {

    console.error(e);

  }

  try {

    initCursor();
    initMagnetic();
    initTilt();
    initRipple();
    initHeroSpotlight(heroSection);

    if (topProgressFillEl) {
      initTopProgress(topProgressFillEl);
    }

  } catch (e) {

    console.error(e);

  }

  if (hero3d && !window.matchMedia('(hover:none),(pointer:coarse)').matches) {

    window.addEventListener('mousemove', e => {

      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;

      hero3d.setMouse(nx, ny);

    });

  }

  document.body.classList.add('js-ready');

  clearTimeout(failsafe);

  hideLoader();

  try {
    playSplitText();
  } catch (e) {
    console.error(e);
  }

  const form = document.querySelector('.contact__form');

  if (form) {

    form.addEventListener('submit', e => {

      e.preventDefault();

      const btn = form.querySelector('.btn span');

      const original = btn.textContent;

      btn.textContent = 'Mensagem enviada';

      form.reset();

      setTimeout(() => {

        btn.textContent = original;

      }, 2400);

    });

  }

}

init().catch(err => {

  console.error(err);

  clearTimeout(failsafe);

  hideLoader();

});