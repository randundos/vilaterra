// Estado y comportamiento del protagonista jugable (Hero): movimiento, salto,
// empujón, y reacción al contacto con enemigos (invulnerabilidad + empujón).
// this.x es una coordenada de MUNDO (el nivel es más ancho que el canvas);
// draw() resta cameraX para saber dónde pintarlo en pantalla.
const Player = {
  x: 200,
  height: CONFIG.HERO_HEIGHT_CUTSCENE, // main.js lo reduce al pasar a jugabilidad
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
  shrinking: false,  // true durante la escena en la que Mac lo rocía con agua
  shrinkStart: 0,
  visible: true,     // deja de dibujarse cuando termina de encogerse del todo
  levelWidth: CONFIG.LEVEL_WIDTH, // main.js lo cambia según la zona activa
  hasSword: false,   // true tras recoger la espada en el tramo de hierba

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

  // Lo dispara main.js cuando Mac Arrons empieza a rociarlo con la manguera:
  // a partir de aquí se va encogiendo hasta desaparecer (ver draw()).
  startShrink(now) {
    this.shrinking = true;
    this.shrinkStart = now;
  },

  // 1 = tamaño normal, 0 = ya ha desaparecido del todo.
  shrinkScale(now) {
    if (!this.shrinking) return 1;
    const elapsed = now - this.shrinkStart;
    return Math.max(0, 1 - elapsed / CONFIG.HERO_SHRINK_MS);
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

    const maxX = this.levelWidth - CONFIG.MARGIN_X;
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

    if (!this.visible) return null;

    if (this.shrinking) {
      const scale = this.shrinkScale(now);
      if (scale <= 0) {
        this.visible = false;
        return null;
      }
      // se encoge "hacia los pies": el ancho se centra y el alto se recorta
      // por arriba, para que parezca hundirse en el suelo en vez de flotar
      const img = ASSETS.hero;
      const fullBox = getBox(img, this.x - cameraX, groundY, this.height);
      const w = fullBox.w * scale;
      const h = fullBox.h * scale;
      const x = fullBox.x + (fullBox.w - w) / 2;
      const y = fullBox.y + (fullBox.h - h);
      ctx.save();
      if (this.facing === 'right') {
        const centerX = x + w / 2;
        ctx.translate(centerX, 0);
        ctx.scale(-1, 1);
        ctx.translate(-centerX, 0);
      }
      ctx.drawImage(img, x, y, w, h);
      ctx.restore();
      this._box = { x, y, w, h };
      return this._box;
    }

    const flicker = this.isInvulnerable(now) && Math.floor(t / 80) % 2 === 0;
    const jumping = !this.grounded;
    // el empujón (doble espacio) manda sobre todo lo demás mientras dura:
    // se ve como una patada, tanto en el suelo como en el aire
    const dashing = Math.abs(this.dashVX) > CONFIG.DASH_POSE_THRESHOLD;
    // en el aire (sin empujón) prima la pose de salto; en el suelo, si se
    // está moviendo, se usa el ciclo real de 8 frames en vez del truco
    // procedural de piernas
    const usingWalkFrames = !dashing && !jumping && this.isWalking && ASSETS.heroWalk.length > 0;

    let img;
    let walkFrameIdx = -1;
    if (dashing) {
      img = ASSETS.heroKick;
    } else if (jumping) {
      img = ASSETS.heroJump;
    } else if (usingWalkFrames) {
      const seq = CONFIG.HERO_WALK_SEQUENCE;
      const seqIdx = Math.floor(t / CONFIG.HERO_WALK_FRAME_MS) % seq.length;
      walkFrameIdx = seq[seqIdx];
      img = ASSETS.heroWalk[walkFrameIdx];
    } else {
      // de pie: si ya tiene la espada, se usa directamente la imagen
      // completa armada (no hace falta superponer nada)
      img = this.hasSword ? ASSETS.heroSwordIdle : ASSETS.hero;
    }

    const box = getBox(img, this.x - cameraX, groundY + this.jumpOffset, this.height);

    ctx.save();
    if (flicker) ctx.globalAlpha = 0.4;
    if (this.facing === 'right') {
      // el sprite mira de forma natural hacia la izquierda (igual la pose de
      // salto, la patada y los frames de andar), así que se voltea al ir
      // hacia la derecha (y no al revés)
      const centerX = box.x + box.w / 2;
      ctx.translate(centerX, 0);
      ctx.scale(-1, 1);
      ctx.translate(-centerX, 0);
    }
    if (dashing || jumping || usingWalkFrames) {
      ctx.drawImage(img, box.x, box.y, box.w, box.h);
    } else {
      // parado: pequeño balanceo de "respiración", sin animación de piernas
      drawWalking(ctx, img, box, this.hipFraction, t, false, true);
    }
    // salto y frames de andar no traen la espada dibujada -> se superpone
    // sobre el puño visible de esa pose (la de pie ya usa heroSwordIdle
    // directamente, y en la patada no se muestra para no complicar la pose)
    if (this.hasSword && (jumping || usingWalkFrames)) {
      drawSwordOnPose(ctx, box, jumping, walkFrameIdx);
    }
    ctx.restore();

    this._box = box; // se guarda para anclar diálogos por encima de su cabeza
    return box;
  }
};

// Dibuja la espada suelta sobre el puño de Hero para las poses de salto y
// andar (la de pie ya usa la imagen completa armada). Las coordenadas del
// puño están medidas a mano por frame en CONFIG.HERO_SWORD; se dibuja
// dentro del mismo ctx.save()/restore() que el personaje, así que hereda el
// volteo izquierda/derecha automáticamente.
function drawSwordOnPose(ctx, box, jumping, walkFrameIdx) {
  const S = CONFIG.HERO_SWORD;
  const hand = jumping ? S.JUMP_HAND : S.WALK_HANDS[walkFrameIdx];
  const swordImg = ASSETS.sword;
  if (!hand || !swordImg.complete || swordImg.width === 0) return;

  const swordH = box.h * S.HEIGHT_RATIO;
  const swordW = swordH * (swordImg.width / swordImg.height);

  const handX = box.x + box.w * hand.x;
  const handY = box.y + box.h * hand.y;
  const gripX = swordW * S.GRIP_FRACTION.x;
  const gripY = swordH * S.GRIP_FRACTION.y;

  ctx.drawImage(swordImg, handX - gripX, handY - gripY, swordW, swordH);
}
