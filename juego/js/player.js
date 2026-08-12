// Estado y comportamiento del protagonista jugable (Hero): movimiento, salto y empujón.
const Player = {
  x: 200,
  height: 155,
  hipFraction: 0.60,
  facing: 'right',   // 'right' | 'left'
  vy: 0,             // velocidad vertical (salto)
  jumpOffset: 0,     // 0 = en el suelo, negativo = en el aire
  grounded: true,
  dashVX: 0,         // velocidad horizontal extra del empujón
  isWalking: false,

  jump() {
    if (this.grounded) {
      this.vy = CONFIG.JUMP_VELOCITY;
      this.grounded = false;
    }
  },

  dash() {
    this.dashVX = (this.facing === 'right' ? 1 : -1) * CONFIG.DASH_BURST;
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

    const maxX = CONFIG.CANVAS_W - CONFIG.MARGIN_X;
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

  draw(ctx, t, groundY) {
    const box = getBox(ASSETS.hero, this.x, groundY + this.jumpOffset, this.height);

    ctx.save();
    if (this.facing === 'right') {
      // el sprite mira de forma natural hacia la izquierda, así que se
      // voltea al ir hacia la derecha (y no al revés)
      const centerX = box.x + box.w / 2;
      ctx.translate(centerX, 0);
      ctx.scale(-1, 1);
      ctx.translate(-centerX, 0);
    }
    drawWalking(ctx, ASSETS.hero, box, this.hipFraction, t, this.isWalking, true);
    ctx.restore();

    return box;
  }
};
