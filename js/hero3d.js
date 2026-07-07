/**
 * hero3d.js
 * Procedural, scroll-and-mouse-driven 3D centerpiece for the hero.
 *
 * There is no .glb yet, so the "model" is a low-poly faceted gem built from
 * an IcosahedronGeometry — it reads as a deliberate signature element (facets
 * cut with precision, like the studio's own work) rather than a placeholder
 * sphere. When a real model is ready, drop it in /models/ and see the
 * "SWAP IN A REAL MODEL" note at the bottom of this file.
 */
export class Hero3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.isMobile = window.matchMedia('(max-width: 700px)').matches;

    this.mouse = { x: 0, y: 0 };
    this.mouseTarget = { x: 0, y: 0 };
    this.scrollProgress = 0;
    this.clock = new THREE.Clock();
    this._raf = null;

    this._buildScene();
    this._bindEvents();
    this.resize();

    // Render at least one frame immediately so there's no blank flash
    // while assets/fonts are still settling.
    this.renderer.render(this.scene, this.camera);

    if (!this.reducedMotion) this._loop();
  }

  _buildScene() {
    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.isMobile,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1.5 : 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = renderer;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    this.camera.position.set(0, 0.2, 6.4);

    // ---- Lighting: ambient fill + directional key + mint rim/sweep ----
    this.ambient = new THREE.AmbientLight(0x2a1c1c, 1.1);
    this.scene.add(this.ambient);

    this.keyLight = new THREE.DirectionalLight(0xf5efe6, 1.6);
    this.keyLight.position.set(3, 4, 5);
    this.keyLight.castShadow = !this.isMobile;
    if (this.keyLight.castShadow) {
      this.keyLight.shadow.mapSize.set(1024, 1024);
      this.keyLight.shadow.radius = 6;
    }
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.PointLight(0x7fd9c4, 6, 12, 2);
    this.rimLight.position.set(-3, 1.2, 2);
    this.scene.add(this.rimLight);

    // Light-sweep: a second point light that periodically travels across
    // the gem's surface to catch its facets.
    this.sweepLight = new THREE.PointLight(0xffffff, 0, 8, 2);
    this.sweepLight.position.set(0, 0, 3);
    this.scene.add(this.sweepLight);

    // ---- Signature geometry: faceted gem ----
    const geometry = new THREE.IcosahedronGeometry(1.6, this.isMobile ? 0 : 1);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xb33951,
      flatShading: true,
      metalness: 0.55,
      roughness: 0.22,
      clearcoat: 1,
      clearcoatRoughness: 0.18,
      reflectivity: 0.6
    });
    this.gem = new THREE.Mesh(geometry, material);
    this.gem.castShadow = !this.isMobile;
    this.gem.receiveShadow = false;
    this.scene.add(this.gem);

    // soft contact shadow: a dim, blurred disc under the gem instead of a
    // full ground plane (cheaper, and reads as a soft shadow at a glance)
    const shadowGeo = new THREE.CircleGeometry(2.1, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.28
    });
    this.contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.position.y = -1.9;
    this.scene.add(this.contactShadow);

    this.baseRotation = { x: 0.4, y: -0.6 };
    this.gem.rotation.x = this.baseRotation.x;
    this.gem.rotation.y = this.baseRotation.y;
  }

  _bindEvents() {
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    if (this.reducedMotion) this.renderer.render(this.scene, this.camera);
  }

  /** Called by scroll.js with a 0→1 progress through the pinned hero. */
  setScrollProgress(p) {
    this.scrollProgress = p;
    if (this.reducedMotion) this._applyScroll();
  }

  /** Called by effects.js with normalized mouse position (-1 → 1). */
  setMouse(x, y) {
    this.mouseTarget.x = x;
    this.mouseTarget.y = y;
    if (this.reducedMotion) this._applyMouseImmediate();
  }

  _applyScroll() {
    const p = this.scrollProgress;
    this.gem.rotation.y = this.baseRotation.y + p * Math.PI * 1.6;
    this.gem.rotation.x = this.baseRotation.x + p * 0.5;
    this.camera.position.z = 6.4 - p * 2.6; // dolly in
    this.gem.position.y = -0.1 + Math.sin(p * Math.PI) * 0.35;
    const scale = 1 + p * 0.18;
    this.gem.scale.setScalar(scale);
    this.contactShadow.material.opacity = 0.28 * (1 - p * 0.4);
  }

  _applyMouseImmediate() {
    this.gem.rotation.y += this.mouseTarget.x * 0.15;
    this.gem.rotation.x += this.mouseTarget.y * 0.1;
    this.camera.position.x = this.mouseTarget.x * 0.3;
    this.camera.position.y = 0.2 - this.mouseTarget.y * 0.2;
    this.camera.lookAt(0, 0, 0);
  }

  _loop() {
    this._raf = requestAnimationFrame(() => this._loop());
    const t = this.clock.getElapsedTime();

    // ease mouse toward target for a smooth, weighted feel
    this.mouse.x += (this.mouseTarget.x - this.mouse.x) * 0.06;
    this.mouse.y += (this.mouse.y - this.mouse.y) * 0 + (this.mouseTarget.y - this.mouse.y) * 0.06;

    this._applyScroll();
    this.gem.rotation.y += this.mouse.x * 0.15;
    this.gem.rotation.x += this.mouse.y * 0.1;
    this.gem.rotation.z = Math.sin(t * 0.2) * 0.03; // gentle idle life

    this.camera.position.x += (this.mouse.x * 0.3 - this.camera.position.x) * 0.08;
    this.camera.position.y += ((0.2 - this.mouse.y * 0.2) - this.camera.position.y) * 0.08;
    this.camera.lookAt(0, 0, 0);

    // light sweep: travels across the gem every ~7s, fading in/out
    const sweepCycle = (t % 7) / 7;
    const sweepAngle = sweepCycle * Math.PI * 2;
    this.sweepLight.position.set(Math.cos(sweepAngle) * 3, Math.sin(sweepAngle) * 2, 2.5);
    this.sweepLight.intensity = Math.max(0, Math.sin(sweepCycle * Math.PI)) * 5;

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this.gem.geometry.dispose();
    this.gem.material.dispose();
    this.renderer.dispose();
  }
}

/**
 * SWAP IN A REAL MODEL
 * When you have a .glb (ideally Draco-compressed) drop it in /models/model.glb
 * and replace the "Signature geometry" block in _buildScene() with:
 *
 *   const draco = new THREE.DRACOLoader();
 *   draco.setDecoderPath('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/examples/js/libs/draco/');
 *   const loader = new THREE.GLTFLoader();
 *   loader.setDRACOLoader(draco);
 *   loader.load('/models/model.glb', (gltf) => {
 *     this.gem = gltf.scene;
 *     this.gem.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
 *     this.scene.add(this.gem);
 *   });
 *
 * Everything else (scroll progress, mouse parallax, light sweep) already
 * targets `this.gem`, so it keeps working unchanged. You'll also need to add
 * the GLTFLoader + DRACOLoader `<script>` tags in index.html alongside the
 * core three.min.js include.
 */