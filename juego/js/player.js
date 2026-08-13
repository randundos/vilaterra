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
  dashVX: 0,         // velocidad horizontal extra (solo la usa ya el retroceso al recibir daño)
  jumpsUsed: 0,      // 0 = en el suelo, 1 = ya saltó una vez, 2 = ya gastó el salto doble
  isWalking: false,
  invulnerableUntil: 0,
  health: CONFIG.HERO_MAX_HEALTH,
  bracelets: 0,
  shrinking: false,  // true durante la escena en la que Mac lo rocía con agua
  shrinkStart: 0,
  visible: true,     // deja de dibujarse cuando termina de encogerse del todo
  levelWidth: CONFIG.LEVEL_WIDTH, // main.js lo cambia según la zona activa
  pits: [],          // [{x, width}] tramos de MUNDO sin suelo; main.js lo rellena según la zona activa
  hasSword: false,   // true tras recoger la espada en el tramo de hierba
  attacking: false,  // true durante la pose de ataque (clic izquierdo)
  attackStart: -Infinity,

  // Salto doble real: en el suelo es el salto normal; si ya está en el aire
  // y todavía le queda un salto (jumpsUsed < MAX_JUMPS), esta MISMA llamada
  // (se dispara con la tecla Espacio otra vez) le da un segundo impulso
  // hacia arriba, sin tocar la velocidad horizontal.
  jump() {
    if (this.grounded) {
      this.vy = CONFIG.JUMP_VELOCITY;
      this.grounded = false;
      this.jumpsUsed = 1;
    } else if (this.jumpsUsed < CONFIG.MAX_JUMPS) {
      this.vy = CONFIG.DOUBLE_JUMP_VELOCITY;
      this.jumpsUsed++;
    }
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

  // Lo dispara main.js con el clic izquierdo: con espada es un tajo, sin
  // ella un golpe/puñetazo (sirve igual para romper el tallo de hierba).
  // Un cooldown evita reiniciar la pose a media animación si llegan varios
  // clics seguidos.
  attack(now) {
    if (now - this.attackStart < CONFIG.ATTACK.COOLDOWN_MS) return;
    this.attacking = true;
    this.attackStart = now;
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
    // si está justo encima de un agujero, no hay suelo en el que aterrizar:
    // se deja caer en vez de clavarse a jumpOffset 0 (ver checkPitFall en main.js)
    const overPit = this.pits.some((p) => this.x > p.x && this.x < p.x + p.width);
    if (this.jumpOffset >= 0 && !overPit) {
      this.jumpOffset = 0;
      this.vy = 0;
      this.grounded = true;
      this.jumpsUsed = 0; // vuelve a tener los dos saltos disponibles
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

    if (this.attacking && now - this.attackStart >= CONFIG.ATTACK.DURATION_MS) {
      this.attacking = false;
    }

    const flicker = this.isInvulnerable(now) && Math.floor(t / 80) % 2 === 0;
    const jumping = !this.grounded;
    // el ataque (clic izquierdo) manda sobre todo lo demás mientras dura
    const attacking = this.attacking;
    // en el aire prima la pose de salto; en el suelo, si se está moviendo,
    // se usa el ciclo real de andar
    const usingWalkFrames = !attacking && !jumping && this.isWalking;

    let img;
    if (attacking) {
      // pose frontal ya armada; la sensación de movimiento la da la estela
      // blanca que se dibuja encima (ver drawAttackTrail)
      img = this.hasSword ? ASSETS.heroSwordIdle : ASSETS.hero;
    } else if (jumping) {
      const jumpSet = this.hasSword ? ASSETS.heroJumpSword : ASSETS.heroJump;
      const idx = pickJumpFrame(this.vy);
      img = jumpSet[idx] || (this.hasSword ? ASSETS.heroSwordIdle : ASSETS.hero);
    } else if (usingWalkFrames) {
      const walkSet = this.hasSword ? ASSETS.heroWalkSword : ASSETS.heroWalk;
      // orden natural 0..N-1: los frames alternan zancada/paso-cruzado en
      // ese orden (lo que parecía "al revés" antes era el volteo izq/dcha,
      // ya corregido más arriba, no el orden de los frames)
      const idx = walkSet.length ? Math.floor(t / CONFIG.HERO_WALK_FRAME_MS) % walkSet.length : -1;
      img = walkSet[idx] || (this.hasSword ? ASSETS.heroSwordIdle : ASSETS.hero);
    } else {
      // de pie: si ya tiene la espada, se usa directamente la imagen
      // completa armada (no hace falta superponer nada)
      img = this.hasSword ? ASSETS.heroSwordIdle : ASSETS.hero;
    }

    const box = getBox(img, this.x - cameraX, groundY + this.jumpOffset, this.height);

    // Los frames nuevos de salto y de andar (hero_jump*/hero_walk*) miran de
    // forma natural hacia la DERECHA -> se voltean al ir hacia la izquierda.
    // El resto de poses (de pie, ataque) son las de siempre y miran de
    // forma natural hacia la IZQUIERDA -> se voltean al ir hacia la derecha.
    const naturallyFacesRight = jumping || usingWalkFrames;
    const shouldFlip = naturallyFacesRight ? this.facing === 'left' : this.facing === 'right';

    ctx.save();
    if (flicker) ctx.globalAlpha = 0.4;
    if (shouldFlip) {
      const centerX = box.x + box.w / 2;
      ctx.translate(centerX, 0);
      ctx.scale(-1, 1);
      ctx.translate(-centerX, 0);
    }
    if (attacking || jumping || usingWalkFrames) {
      ctx.drawImage(img, box.x, box.y, box.w, box.h);
    } else {
      // parado: pequeño balanceo de "respiración", sin animación de piernas
      drawWalking(ctx, img, box, this.hipFraction, t, false, true);
    }
    ctx.restore();

    // la estela se dibuja FUERA del ctx.save()/restore() del volteo: así se
    // posiciona directamente en coordenadas de pantalla según this.facing,
    // en vez de heredar el flip (que la habría dejado apuntando hacia el
    // lado equivocado la mitad de las veces)
    if (attacking) {
      drawAttackTrail(ctx, box, now - this.attackStart, this.facing);
    }

    this._box = box; // se guarda para anclar diálogos por encima de su cabeza
    return box;
  }
};

// Elige cuál de los 4 frames de salto mostrar según la velocidad vertical
// actual: 0=justo tras el impulso (muy rápido hacia
// arriba), 1=subiendo, 2=cerca del punto más alto, 3=cayendo. Vale igual
// para el primer salto y para el doble salto (solo cambia lo rápido que se
// pasa por cada fase, según DOUBLE_JUMP_VELOCITY sea más floja).
function pickJumpFrame(vy) {
  if (vy < -11) return 0;
  if (vy < -3) return 1;
  if (vy < 3) return 2;
  return 3;
}

// Estela blanca del ataque (clic izquierdo): como solo tenemos un frame
// frontal estático, la sensación de "tajo de arriba a abajo" la da esta curva
// que recorre la caja del personaje durante la primera parte de
// ATTACK.DURATION_MS y luego se desvanece durante el resto.
// Se dibuja en coordenadas de PANTALLA (fuera del ctx.save()/restore() del
// volteo del personaje) y usa facing para decidir de qué lado sale: siempre
// hacia fuera de la silueta, por delante de Hero, nunca cruzando "hacia
// dentro" del cuerpo.
function drawAttackTrail(ctx, box, elapsedMs, facing) {
  const A = CONFIG.ATTACK;
  const t = Math.min(1, elapsedMs / A.DURATION_MS);
  const sweepT = Math.min(1, t / A.SWEEP_FRACTION);
  const fade = t < A.SWEEP_FRACTION ? 1 : 1 - (t - A.SWEEP_FRACTION) / (1 - A.SWEEP_FRACTION);
  if (fade <= 0) return;

  const dir = facing === 'right' ? 1 : -1;
  const cx = box.x + box.w / 2;
  const innerX = cx + dir * box.w * 0.42; // al borde de la silueta
  const outX = cx + dir * box.w * 0.95;   // bien fuera del cuerpo
  const topY = box.y + box.h * 0.05;
  const botY = box.y + box.h * 0.95;
  const sweepY = topY + (botY - topY) * sweepT;

  ctx.save();
  ctx.globalAlpha = fade;
  ctx.shadowColor = 'rgba(255,255,255,0.95)';
  ctx.shadowBlur = 16;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(innerX, topY);
  ctx.quadraticCurveTo(outX, (topY + sweepY) / 2, innerX, sweepY);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(innerX + dir * 6, topY + 4);
  ctx.quadraticCurveTo(outX + dir * 6, (topY + sweepY) / 2, innerX + dir * 6, sweepY - 4);
  ctx.stroke();
  ctx.restore();
}
