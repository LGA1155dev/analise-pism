/**
 * effects.js
 * All the small, cheap interactions that make the interface feel considered:
 * custom cursor, magnetic buttons, card tilt, ripple, and split-text prep.
 * None of these run a persistent rAF loop of their own except the cursor
 * (which needs one for its lerp) — everything else is event-driven.
 */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

/* ---------------------------------------------------------------- */
/* Custom cursor                                                     */
/* ---------------------------------------------------------------- */
export function initCursor() {
  if (isTouch) return null;
  const cursor = document.getElementById('cursor');
  if (!cursor) return null;

  let target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let pos = { ...target };

  window.addEventListener('mousemove', (e) => {
    target.x = e.clientX;
    target.y = e.clientY;
  });

  document.querySelectorAll('a, button, [data-tilt], [data-magnetic]').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('is-active'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('is-active'));
  });

  function loop() {
    pos.x += (target.x - pos.x) * (reducedMotion ? 1 : 0.18);
    pos.y += (target.y - pos.y) * (reducedMotion ? 1 : 0.18);
    cursor.style.setProperty('--cursor-x', `${pos.x}px`);
    cursor.style.setProperty('--cursor-y', `${pos.y}px`);
    requestAnimationFrame(loop);
  }
  loop();

  return { setMouse: (x, y) => { target.x = x; target.y = y; } };
}

/* ---------------------------------------------------------------- */
/* Magnetic buttons — element eases toward the cursor within range   */
/* ---------------------------------------------------------------- */
export function initMagnetic() {
  if (isTouch || reducedMotion) return;
  document.querySelectorAll('[data-magnetic]').forEach(el => {
    const strength = 0.35;
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const relX = e.clientX - (rect.left + rect.width / 2);
      const relY = e.clientY - (rect.top + rect.height / 2);
      el.style.setProperty('--mx', (relX * strength).toFixed(2));
      el.style.setProperty('--my', (relY * strength).toFixed(2));
    });
    el.addEventListener('mouseleave', () => {
      el.style.setProperty('--mx', 0);
      el.style.setProperty('--my', 0);
    });
  });
}

/* ---------------------------------------------------------------- */
/* Tilt — cards lean subtly toward the cursor position                */
/* ---------------------------------------------------------------- */
export function initTilt() {
  if (isTouch || reducedMotion) return;
  document.querySelectorAll('[data-tilt]').forEach(el => {
    const maxTilt = 6;
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;  // 0..1
      const py = (e.clientY - rect.top) / rect.height;  // 0..1
      const tiltY = (px - 0.5) * maxTilt * 2;
      const tiltX = (0.5 - py) * maxTilt * 2;
      el.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
      el.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
    });
    el.addEventListener('mouseleave', () => {
      el.style.setProperty('--tilt-x', '0deg');
      el.style.setProperty('--tilt-y', '0deg');
    });
  });
}

/* ---------------------------------------------------------------- */
/* Ripple — quick radial fade from the click point on .btn            */
/* ---------------------------------------------------------------- */
export function initRipple() {
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'btn__ripple';
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      btn.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });
  });
}

/* ---------------------------------------------------------------- */
/* Hero spotlight — soft glow that follows the cursor over the hero   */
/* ---------------------------------------------------------------- */
export function initHeroSpotlight(heroSection) {
  if (isTouch) return;
  const spotlight = heroSection.querySelector('.hero__spotlight');
  if (!spotlight) return;
  heroSection.addEventListener('mouseenter', () => spotlight.classList.add('is-active'));
  heroSection.addEventListener('mouseleave', () => spotlight.classList.remove('is-active'));
  heroSection.addEventListener('mousemove', (e) => {
    const rect = heroSection.getBoundingClientRect();
    spotlight.style.setProperty('--x', `${e.clientX - rect.left}px`);
    spotlight.style.setProperty('--y', `${e.clientY - rect.top}px`);
  });
}

/* ---------------------------------------------------------------- */
/* Top scroll progress bar                                           */
/* ---------------------------------------------------------------- */
export function initTopProgress(fillEl) {
  function update() {
    const h = document.documentElement;
    const scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
    fillEl.style.width = `${Math.min(scrolled * 100, 100)}%`;
  }
  window.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  update();
}

/* ---------------------------------------------------------------- */
/* Split text — wraps each word (and optionally each char) in spans  */
/* so GSAP can stagger-reveal them. Runs once, before first paint.   */
/* ---------------------------------------------------------------- */
export function prepareSplitText() {
  document.querySelectorAll('[data-split]').forEach(el => {
    const mode = el.dataset.split || 'words';
    const text = el.textContent.trim();
    el.textContent = '';
    const units = mode === 'chars' ? text.split('') : text.split(/\s+/);
    units.forEach((unit, i) => {
      const wrap = document.createElement('span');
      wrap.className = mode === 'chars' ? 'split-char' : 'split-word';
      wrap.style.marginRight = mode === 'chars' ? '0' : '0.28em';
      wrap.textContent = unit === '' ? '\u00A0' : unit;
      el.appendChild(wrap);
    });
  });

  // Hero title: wrap each word so scroll.js/GSAP can stagger a translateY reveal
  document.querySelectorAll('.hero__title').forEach(el => {
    const html = el.innerHTML;
    // preserve the italic accent span, only split the plain text nodes
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const frag = document.createDocumentFragment();
    temp.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent.trim().split(/\s+/).filter(Boolean).forEach(word => {
          const wordWrap = document.createElement('span');
          wordWrap.className = 'word';
          const inner = document.createElement('span');
          inner.textContent = word + '\u00A0';
          wordWrap.appendChild(inner);
          frag.appendChild(wordWrap);
        });
      } else {
        const wordWrap = document.createElement('span');
        wordWrap.className = 'word';
        const inner = document.createElement('span');
        inner.appendChild(node.cloneNode(true));
        wordWrap.appendChild(inner);
        frag.appendChild(wordWrap);
      }
    });
    el.innerHTML = '';
    el.appendChild(frag);
  });
}

export function playSplitText() {
  if (typeof gsap === 'undefined') return;
  gsap.fromTo('.hero__title .word span',
    { yPercent: 110, opacity: 0 },
    { yPercent: 0, opacity: 1, duration: 1, ease: 'power3.out', stagger: 0.06, delay: 0.15 }
  );
  gsap.fromTo('.hero__subtitle .split-word',
    { yPercent: 60, opacity: 0 },
    { yPercent: 0, opacity: 1, duration: 0.8, ease: 'power3.out', stagger: 0.02, delay: 0.5 }
  );
  gsap.fromTo('.hero__eyebrow', { opacity: 0 }, { opacity: 0.6, duration: 1, delay: 0.9 });
}