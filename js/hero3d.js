/**
 * hero3d.js
 * Centerpiece 3D do hero, agora carregando um modelo real (.glb) em vez de
 * geometria procedural. O modelo é carregado de forma assíncrona via
 * THREE.GLTFLoader e todos os métodos que manipulam o modelo verificam
 * `this.gem` antes de agir, para nunca lançar erro caso o carregamento
 * ainda não tenha terminado (ou tenha falhado).
 */
export class Hero3D {
  constructor(canvas) {
    this.canvas = canvas;

    // Preferências de acessibilidade / dispositivo
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.isMobile = window.matchMedia('(max-width: 700px)').matches;

    // Estado de interação
    this.mouse = { x: 0, y: 0 };
    this.mouseTarget = { x: 0, y: 0 };
    this.scrollProgress = 0;

    // Referência ao modelo carregado (fica `null` até o GLTFLoader terminar)
    this.gem = null;

    this.clock = new THREE.Clock();
    this._raf = null;

    this._buildScene();
    this._bindEvents();
    this.resize();

    // Renderiza um frame imediatamente (mesmo sem o modelo) para não
    // deixar o canvas em branco enquanto o .glb ainda está baixando.
    this.renderer.render(this.scene, this.camera);

    if (!this.reducedMotion) this._loop();
  }

  /**
   * Monta a cena: renderer, câmera, luzes, chão de sombra e dispara o
   * carregamento assíncrono do modelo .glb.
   */
  _buildScene() {
    // ---- Renderer ----
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

    // ---- Cena e câmera ----
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    this.camera.position.set(0, 0.2, 6.4);
    this._baseCameraZ = 6.4; // usado no scroll (dolly-in)

    // ---- Iluminação profissional ----
    // Luz ambiente: preenche sombras duras sem "achatar" o modelo
    this.ambient = new THREE.AmbientLight(0x404040, 1.1);
    this.scene.add(this.ambient);

    // Luz direcional principal (key light), projeta sombra
    this.keyLight = new THREE.DirectionalLight(0xf5efe6, 1.6);
    this.keyLight.position.set(3, 4, 5);
    this.keyLight.castShadow = !this.isMobile;
    if (this.keyLight.castShadow) {
      this.keyLight.shadow.mapSize.set(1024, 1024);
      this.keyLight.shadow.radius = 6;
      this.keyLight.shadow.camera.near = 0.5;
      this.keyLight.shadow.camera.far = 20;
    }
    this.scene.add(this.keyLight);

    // Luz de contorno (rim light) para destacar as bordas do notebook
    this.rimLight = new THREE.PointLight(0x7fd9c4, 6, 12, 2);
    this.rimLight.position.set(-3, 1.2, 2);
    this.scene.add(this.rimLight);

    // Luz de "varredura": percorre a superfície do modelo periodicamente
    this.sweepLight = new THREE.PointLight(0xffffff, 0, 8, 2);
    this.sweepLight.position.set(0, 0, 3);
    this.scene.add(this.sweepLight);

    // ---- Sombra de contato (disco sutil sob o modelo) ----
    const shadowGeo = new THREE.CircleGeometry(2.1, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.28
    });
    this.contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.position.y = -1.9;
    this.contactShadow.receiveShadow = true;
    this.scene.add(this.contactShadow);

    // Rotação base aplicada ao modelo assim que ele carrega
    this.baseRotation = { x: 0.4, y: -0.6 };

    // ---- Carregamento do modelo real (.glb) ----
    this._loadModel();
  }

  /**
   * Carrega ./models/notebook.glb via GLTFLoader, centraliza o modelo,
   * normaliza sua escala e ativa sombras em todos os meshes.
   * `this.gem` só é atribuído depois que tudo isso termina, então todo
   * método que usa `this.gem` deve checar `if (!this.gem) return;`.
   */
  _loadModel() {
    const loader = new THREE.GLTFLoader();

    loader.load(
      '/models/notebook.glb',
      (gltf) => {
        const model = gltf.scene;

        console.log(model);
        console.log(new THREE.Box3().setFromObject(model));

        // ---- Ativa sombras em todos os meshes do modelo ----
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        // ---- Centraliza o modelo usando Box3 ----
        // Calcula a caixa delimitadora e desloca o modelo para que seu
        // centro geométrico fique na origem (0, 0, 0).
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.x -= center.x;
        model.position.y -= center.y;
        model.position.z -= center.z;

        // ---- Ajusta escala automaticamente ----
        // Se o modelo for muito grande (ou muito pequeno), normaliza para
        // que sua maior dimensão fique em torno de ~2.4 unidades de cena.
        const size = box.getSize(new THREE.Vector3());
        const maxDimension = Math.max(size.x, size.y, size.z) || 1;
        const targetSize = 2.4;
        const autoScale = targetSize / maxDimension;
        model.scale.setScalar(autoScale);

        // Guarda a escala "base" para usar como referência no scroll
        this._baseScale = autoScale;

        // Rotação inicial (mesma composição visual do gem anterior)
        model.rotation.x = this.baseRotation.x;
        model.rotation.y = this.baseRotation.y;

        this.scene.add(model);

        const helper = new THREE.AxesHelper(5);
        this.scene.add(helper);

        // Só agora `this.gem` passa a existir de fato
        this.gem = model;

        // Garante que scroll/mouse já acumulados sejam aplicados de imediato
        this._applyScroll();
        this._applyMouseImmediate();
      },
      undefined,
      (error) => {
        // Em caso de falha, `this.gem` permanece `null` e todos os métodos
        // que dependem dele simplesmente não fazem nada (sem travar a página).
        console.error('Falha ao carregar ./models/notebook.glb:', error);
      }
    );
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

  /** Called by scroll.js com um progresso 0→1 através do hero fixado (pinned). */
  setScrollProgress(p) {
    this.scrollProgress = p;
    if (this.reducedMotion) this._applyScroll();
  }

  /** Called by effects.js com a posição normalizada do mouse (-1 → 1). */
  setMouse(x, y) {
    this.mouseTarget.x = x;
    this.mouseTarget.y = y;
    if (this.reducedMotion) this._applyMouseImmediate();
  }

  /**
   * Aplica o efeito de scroll: aproxima a câmera (dolly-in), rotaciona
   * o notebook e aumenta levemente sua escala.
   * Protegido contra `this.gem` ainda não existir.
   */
  _applyScroll() {
    if (!this.gem) return;

    const p = this.scrollProgress;

    // Rotaciona o notebook progressivamente
    this.gem.rotation.y = this.baseRotation.y + p * Math.PI * 1.6;
    this.gem.rotation.x = this.baseRotation.x + p * 0.5;

    // Aproxima a câmera do modelo (dolly-in)
    this.camera.position.z = this._baseCameraZ - p * 2.6;

    // Leve flutuação vertical
    this.gem.position.y = Math.sin(p * Math.PI) * 0.35;

    // Aumenta levemente a escala em cima da escala base já normalizada
    const scaleFactor = 1 + p * 0.18;
    this.gem.scale.setScalar(this._baseScale * scaleFactor);

    // Sombra de contato fica mais sutil conforme avança o scroll
    this.contactShadow.material.opacity = 0.28 * (1 - p * 0.4);
  }

  /**
   * Aplica o movimento do mouse instantaneamente (usado quando
   * `prefers-reduced-motion` está ativo, sem interpolação no loop).
   */
  _applyMouseImmediate() {
    if (!this.gem) return;

    this.gem.rotation.y += this.mouseTarget.x * 0.15;
    this.gem.rotation.x += this.mouseTarget.y * 0.1;
    this.camera.position.x = this.mouseTarget.x * 0.3;
    this.camera.position.y = 0.2 - this.mouseTarget.y * 0.2;
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * Loop de animação: interpola o mouse suavemente, reaplica o scroll,
   * inclina o notebook e move a luz de varredura.
   */
  _loop() {
    this._raf = requestAnimationFrame(() => this._loop());
    const t = this.clock.getElapsedTime();

    // Interpolação suave (easing) do mouse em direção ao alvo
    this.mouse.x += (this.mouseTarget.x - this.mouse.x) * 0.06;
    this.mouse.y += (this.mouseTarget.y - this.mouse.y) * 0.06;

    // Reaplica o efeito de scroll a cada frame (câmera, escala, rotação base)
    this._applyScroll();

    // Só manipula o modelo se ele já tiver terminado de carregar
    if (this.gem) {
      this.gem.rotation.y += this.mouse.x * 0.15;
      this.gem.rotation.x += this.mouse.y * 0.1;
      this.gem.rotation.z = Math.sin(t * 0.2) * 0.03; // vida sutil no idle
    }

    // Câmera segue o mouse com suavização
    this.camera.position.x += (this.mouse.x * 0.3 - this.camera.position.x) * 0.08;
    this.camera.position.y += ((0.2 - this.mouse.y * 0.2) - this.camera.position.y) * 0.08;
    this.camera.lookAt(0, 0, 0);

    // Luz de varredura: percorre a cena a cada ~7s, com fade in/out
    const sweepCycle = (t % 7) / 7;
    const sweepAngle = sweepCycle * Math.PI * 2;
    this.sweepLight.position.set(Math.cos(sweepAngle) * 3, Math.sin(sweepAngle) * 2, 2.5);
    this.sweepLight.intensity = Math.max(0, Math.sin(sweepCycle * Math.PI)) * 5;

    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Libera recursos. Como o modelo é um GLTF (não uma geometria única),
   * percorremos seus meshes e liberamos geometry/material individualmente,
   * em vez de chamar `this.gem.geometry.dispose()`.
   */
  dispose() {
    if (this._raf) cancelAnimationFrame(this._raf);

    if (this.gem) {
      this.gem.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();

          if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((mat) => {
              // Libera texturas eventualmente associadas ao material
              Object.keys(mat).forEach((key) => {
                const value = mat[key];
                if (value && value.isTexture) value.dispose();
              });
              mat.dispose();
            });
          }
        }
      });
    }

    if (this.contactShadow) {
      this.contactShadow.geometry.dispose();
      this.contactShadow.material.dispose();
    }

    this.renderer.dispose();
  }
}