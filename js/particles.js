/**
 * particles.js
 * A cheap, ambient particle field — not a "wow" effect on its own, just
 * texture. Kept deliberately sparse and slow so it never competes with the
 * hero's 3D centerpiece or costs a meaningful chunk of the frame budget.
 */
export function initParticles(canvas, { count = 46, mobileCount = 16 } = {}) {
  const ctx = canvas.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.matchMedia('(max-width: 700px)').matches;
  const total = isMobile ? mobileCount : count;

  let width, height, dpr;
  let particles = [];
  let mouse = { x: -9999, y: -9999 };
  let raf = null;

  function resize() {
    dpr = Math.min(window.devicePixelRatio, 1.5);
    width = canvas.parentElement.clientWidth;
    height = canvas.parentElement.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seed() {
    particles = Array.from({ length: total }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.6 + 0.4,
      speed: Math.random() * 0.15 + 0.03,
      drift: Math.random() * Math.PI * 2,
      opacity: Math.random() * 0.35 + 0.15
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#7fd9c4';
    for (const p of particles) {
      p.y -= p.speed;
      p.x += Math.sin(p.drift + p.y * 0.01) * 0.15;
      if (p.y < -10) { p.y = height + 10; p.x = Math.random() * width; }

      // subtle mouse repulsion — a hint of interactivity, not a gimmick
      const dx = p.x - mouse.x, dy = p.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 90) {
        const force = (90 - dist) / 90;
        p.x += (dx / (dist || 1)) * force * 1.4;
        p.y += (dy / (dist || 1)) * force * 1.4;
      }

      ctx.globalAlpha = p.opacity;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function loop() {
    draw();
    raf = requestAnimationFrame(loop);
  }

  resize();
  seed();
  window.addEventListener('resize', () => { resize(); seed(); });
  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });

  if (reducedMotion) {
    draw(); // one static frame, no loop
  } else {
    loop();
  }

  return { stop: () => raf && cancelAnimationFrame(raf) };
}