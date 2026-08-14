// Gusano: segundo enemigo del tramo de hierba (sustituye a la 2a hormiga).
// No dispara: patrulla de lado a lado y de vez en cuando da un saltito (arco
// simple), y hace daño por contacto igual que el jabalí. Se mata saltándole
// encima o con la espada, igual que el resto. Solo hay una imagen por
// estado (sin ciclo de animación propio, a diferencia del jabalí).
const Worm = {
  x: 0,
  baseX: 0,
  groundY: 0,
  height: CONFIG.WORM.HEIGHT,
  dir: 1,           // 1 = hacia la derecha, -1 = hacia la izquierda
  state: 'rest',    // rest | move | hop | hurt | death
  stateStart: 0,
  hopStart: 0,
  nextHopAt: 0,
  alive: true,
  active: false,
  deathAnimDone: false,
  fadeStart: 0,
  fadeAlpha: 1,

  init(now, groundY) {
    this.baseX = CONFIG.WORM.SPAWN_X;
    this.x = CONFIG.WORM.SPAWN_X;
    this.groundY = groundY;
    this.dir = 1;
    this.state = 'rest';
    this.stateStart = now;
    this.nextHopAt = now + CONFIG.WORM.HOP_EVERY_MS;
    this.alive = true;
    this.active = true;
    this.deathAnimDone = false;
    this.fadeAlpha = 1;
  },

  _setState(now, state) {
    this.state = state;
    this.stateStart = now;
  },

  takeHit(now) {
    if (!this.alive || this.state === 'death') return;
    this._setState(now, 'death');
    Pickups.spawnBraceletsAt(
      this.x,
      this.groundY - CONFIG.PICKUP.GROUND_OFFSET,
      CONFIG.WORM.BRACELET_REWARD
    );
  },

  // Caja de colisión en coordenadas de MUNDO (sin restar cámara).
  getBox() {
    const img = this._frameImg();
    return getBox(img, this.x, this.groundY, this.height);
  },

  _frameImg() {
    if (this.state === 'death') return ASSETS.worm.death;
    if (this.state === 'hop') return ASSETS.worm.jump;
    if (this.state === 'move') return ASSETS.worm.move;
    return ASSETS.worm.rest;
  },

  update(now) {
    if (!this.active) return;
    const C = CONFIG.WORM;

    if (this.state === 'death') {
      if (!this.deathAnimDone) {
        if (now - this.stateStart >= C.DEATH_HOLD_MS) {
          this.deathAnimDone = true;
          this.fadeStart = now;
        }
      } else {
        const fadeElapsed = now - this.fadeStart;
        this.fadeAlpha = Math.max(0, 1 - fadeElapsed / C.DEATH_FADE_MS);
        if (this.fadeAlpha <= 0) {
          this.alive = false;
          this.active = false;
        }
      }
      return;
    }

    if (this.state === 'rest') {
      if (now - this.stateStart >= C.REST_MS) this._setState(now, 'move');
      return;
    }

    // 'move' o 'hop': ambos avanzan igual, solo cambia la pose dibujada
    this.x += C.SPEED * this.dir;
    const dist = this.x - this.baseX;
    if (dist > C.PATROL_RANGE || dist < -C.PATROL_RANGE) {
      this.x = this.baseX + C.PATROL_RANGE * Math.sign(dist);
      this.dir *= -1;
      this._setState(now, 'rest'); // pequeña pausa en cada extremo antes de volver
      this.nextHopAt = now + C.HOP_EVERY_MS;
      return;
    }

    if (this.state === 'move' && now >= this.nextHopAt) {
      this._setState(now, 'hop');
      this.hopStart = now;
    } else if (this.state === 'hop' && now - this.hopStart >= C.HOP_MS) {
      this._setState(now, 'move');
      this.nextHopAt = now + C.HOP_EVERY_MS;
    }
  },

  draw(ctx, now, cameraX) {
    if (!this.active && !this.alive) return;

    const img = this._frameImg();
    if (!img.complete || img.width === 0) return;

    // durante el saltito se eleva siguiendo un arco simple (parábola), sin
    // tocar this.x (que ya avanza igual que al andar)
    let hopOffset = 0;
    if (this.state === 'hop') {
      const t = Math.min(1, (now - this.hopStart) / CONFIG.WORM.HOP_MS);
      hopOffset = -Math.sin(t * Math.PI) * CONFIG.WORM.HOP_HEIGHT;
    }

    const box = getBox(img, this.x - cameraX, this.groundY + hopOffset, this.height);

    ctx.save();
    if (this.state === 'death' && this.deathAnimDone) {
      ctx.globalAlpha = this.fadeAlpha;
    }
    if (this.dir < 0) {
      // el sprite mira de forma natural hacia la derecha -> se voltea al
      // andar hacia la izquierda (igual que el jabalí)
      const c = box.x + box.w / 2;
      ctx.translate(c, 0);
      ctx.scale(-1, 1);
      ctx.translate(-c, 0);
    }
    ctx.drawImage(img, box.x, box.y, box.w, box.h);
    ctx.restore();
  }
};

// Comprueba el contacto Hero <-> Worm y resuelve pisotón vs. golpe lateral
// (igual que checkBoarCollision).
function checkWormCollision(now, player, groundY) {
  if (!Worm.active || !Worm.alive) return;
  if (Worm.state === 'death') return;
  if (player.isInvulnerable(now)) return;

  const pBox = getBox(ASSETS.hero, player.x, groundY + player.jumpOffset, player.height);
  const wBox = Worm.getBox();
  if (!rectsOverlap(pBox, wBox)) return;

  const stomping = player.vy > 0 && (pBox.y + pBox.h) < (wBox.y + wBox.h * 0.55);
  if (stomping) {
    Worm.takeHit(now);
    player.vy = CONFIG.STOMP_BOUNCE;
    player.jumpOffset = -1;
    player.grounded = false;
  } else {
    const dir = player.x < Worm.x ? -1 : 1;
    player.hurt(now, dir);
  }
}

// Comprueba si el ataque de Hero (con espada o sin ella) alcanza al gusano;
// lo mata igual que el pisotón (igual que checkBoarSwordHit/checkAntSwordHit).
function checkWormSwordHit(now, player, groundY) {
  if (!Worm.active || !Worm.alive) return;
  if (Worm.state === 'death') return;
  if (!player.attacking) return;

  const pBox = getBox(ASSETS.hero, player.x, groundY + player.jumpOffset, player.height);
  const reach = CONFIG.ATTACK.MELEE_REACH;
  const atkBox = player.facing === 'right'
    ? { x: pBox.x, y: pBox.y, w: pBox.w + reach, h: pBox.h }
    : { x: pBox.x - reach, y: pBox.y, w: pBox.w + reach, h: pBox.h };

  if (rectsOverlap(atkBox, Worm.getBox())) {
    Worm.takeHit(now);
  }
}
