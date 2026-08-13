// Estado y comportamiento del protagonista jugable (Hero): movimiento, salto,
// empujón, y reacción al contacto con enemigos (invulnerabilidad + empujón).
// this.x es una coordenada de MUNDO (el nivel es más ancho que el canvas);
// draw() resta cameraX para saber dónde pintarlo en pantalla.
const Player = {
  x: 200,
  height: 155,
  hipFraction: 0.60,
  facing: 'right',   // 'right' | 'left'
  vy: 0,             // velocidad vertical (salto)
  jumpOffset: 0,     // 0 = en el suelo, negativo = en el aire
  grounded: true,
  dashVX: 0,         // velocidad horizontal extra (empujón o retroceso al recibir daño)
  isWalking: false,
  invulnerableUntil: 0,
  health: CONFIG.HERO_MAX_HEALTH,
  bracelets: 0,

  jump() {
    if (this.grounded) {
      this.vy = CONFIG.JUMP_VELOCITY;
      this.grounded = false;
    }
  },

  dash() {
    this.dashVX = (this.facing === 'right' ? 1 : -1) * CONFIG.DASH_BURST;
  },

  // Lo llama la colisión con un enemigo cuando el contacto NO es un pisotón:
  // empuje horizontal + pequeño salto hacia atrás + invulnerabilidad breve
  // + pérdida de un tramo de vida (p.ej. un golpe de jabalí = 20%).
  hurt(now, knockbackDir) {
    if (now < this.invulnerableUntil) return;
    this.dashVX = knockbackDir * CONFIG.HERO_KNOCKBACK;
    this.vy = CONFIG.JUMP_VELOCITY * 0.45;
    this.grounded = false;
    this.invulnerableUntil = now + CONFIG.HERO_INVULN_MS;
    this.health = Math.max(0, this.health - CONFIG.HERO_DAMAGE_PER_HIT);
  },

  addBracelets(amount) {
    this.bracelets += amount;
  },

  isInvulnerable(now) {
    return now < this.invulnerableUntil;
  },

  update() {
    // --- movimiento horizontal (A / D) ---
    let moveX = 0;
    if (Input.keys.d) { moveX += CONFIG.SPEED; this.facing = 'right'; }
    if (Input.keys.a) { moveX -= CONFIG.SPEED; this.facing = 'left'; }

    this.x += moveX + this.dashVX;
    if (this.dashVX !== 0) {
      this.dashVX *= CONFIG.DASH_DECAY;
      if (Math.abs(this.dashVX) < 0.3) this.dashVX = 0;
    }

    const maxX = CONFIG.LEVEL_WIDTH - CONFIG.MARGIN_X;
    this.x = Math.max(CONFIG.MARGIN_X, Math.min(maxX, this.x));

    // --- salto (gravedad simple) ---
    this.vy += CONFIG.GRAVITY;
    this.jumpOffset += this.vy;
    if (this.jumpOffset >= 0) {
      this.jumpOffset = 0;
      this.vy = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }

    this.isWalking = this.grounded && moveX !== 0;
  },

  // cameraX es opcional (por defecto 0): la cinemática inicial no hace scroll,
  // así que Hero se dibuja directamente en su posición de mundo = pantalla.
  draw(ctx, t, groundY, cameraX = 0) {
    const now = performance.now();
    const flicker = this.isInvulnerable(now) && Math.floor(t / 80) % 2 === 0;
    const jumping = !this.grounded;
    // en el aire prima la pose de salto; en el suelo, si se está moviendo,
    // se usa el ciclo real de 8 frames en vez del truco procedural de piernas
    const usingWalkFrames = !jumping && this.isWalking && ASSETS.heroWalk.length > 0;

    let img;
    if (jumping) {
      img = ASSETS.heroJump;
    } else if (usingWalkFrames) {
      const idx = Math.floor(t / CONFIG.HERO_WALK_FRAME_MS) % ASSETS.heroWalk.length;
      img = ASSETS.heroWalk[idx];
    } else {
      img = ASSETS.hero;
    }

    const box = getBox(img, this.x - cameraX, groundY + this.jumpOffset, this.height);

    ctx.save();
    if (flicker) ctx.globalAlpha = 0.4;
    if (this.facing === 'right') {
      // el sprite mira de forma natural hacia la izquierda (igual la pose de
      // salto y los frames de andar), así que se voltea al ir hacia la
      // derecha (y no al revés)
      const centerX = box.x + box.w / 2;
      ctx.translate(centerX, 0);
      ctx.scale(-1, 1);
      ctx.translate(-centerX, 0);
    }
    if (jumping || usingWalkFrames) {
      ctx.drawImage(img, box.x, box.y, box.w, box.h);
    } else {
      // parado: pequeño balanceo de "respiración", sin animación de piernas
      drawWalking(ctx, img, box, this.hipFraction, t, false, true);
    }
    ctx.restore();

    this._box = box; // se guarda para anclar diálogos por encima de su cabeza
    return box;
  }
};
