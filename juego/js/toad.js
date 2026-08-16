// Sapo mago: primer enemigo del nivel 3, aparece en OfficeScene tras la
// marcha de Big Bross (ver CONFIG.TOAD/officescene.js). Instancia única (no
// una lista como las verduras/hormigas): OfficeScene controla su entrada a
// pie (state='walk' a mano, moviendo Toad.x) y lo deja quieto (state='idle')
// durante el "Croac!"/reacción de Big Bross; en cuanto empieza la fase
// 'freeRoam' llama a Toad.activate(now) y a partir de ahí este módulo lleva
// su propia IA: patrulla cerca de su punto de entrada y, si Hero está a
// tiro, ataca alternando hechizo (bala mágica a distancia) y aliento de
// fuego (daño instantáneo de corto alcance), igual de flojo que una verdura
// (muere de un solo golpe, espada o pisotón).
const Toad = {
  x: 0,
  baseX: 0,
  groundY: 0,
  height: CONFIG.TOAD.HEIGHT,
  scale: 1,
  dir: -1, // mira hacia Hero por defecto (llega desde la derecha, mirando a la izquierda)

  active: false, // true en cuanto empieza la fase 'freeRoam' (ver OfficeScene.handleAction/update)
  alive: true,
  state: 'idle', // idle | walk | cast | firebreath | death
  stateStart: 0,

  nextAttackAt: Infinity,
  attackKind: 'cast', // se alterna cast/firebreath en cada ataque
  attackHit: false,
  bullets: [],

  deathAnimDone: false,
  fadeStart: 0,
  fadeAlpha: 1,

  init(x, groundY) {
    const refH = CONFIG.TOAD.FRAME_SIZES.idle[1];
    this.x = x;
    this.baseX = x;
    this.groundY = groundY;
    this.height = CONFIG.TOAD.HEIGHT;
    this.scale = CONFIG.TOAD.HEIGHT / refH;
    this.dir = -1;
    this.active = false;
    this.alive = true;
    this.state = 'idle';
    this.stateStart = 0;
    this.nextAttackAt = Infinity;
    this.attackKind = 'cast';
    this.attackHit = false;
    this.bullets = [];
    this.deathAnimDone = false;
    this.fadeStart = 0;
    this.fadeAlpha = 1;
  },

  setState(now, state) {
    this.state = state;
    this.stateStart = now;
  },

  // Lo llama OfficeScene en cuanto Big Bross termina de irse: a partir de
  // aquí el sapo patrulla/ataca por su cuenta.
  activate(now) {
    this.active = true;
    this.baseX = this.x;
    this.setState(now, 'idle');
    this.nextAttackAt = now + CONFIG.TOAD.REST_MS;
  },

  update(now, player) {
    if (!this.active) return;
    const C = CONFIG.TOAD;

    if (this.state === 'death') {
      if (!this.deathAnimDone) {
        const cycleMs = C.FRAME_COUNT * C.DEATH_FRAME_MS;
        if (now - this.stateStart >= cycleMs + C.DEATH_HOLD_MS) {
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
      this._updateBullets(now, player);
      return;
    }

    const dist = player.x - this.x;
    if (Math.abs(dist) > 4) this.dir = dist < 0 ? -1 : 1;

    if (this.state === 'cast' || this.state === 'firebreath') {
      const frameMs = this.state === 'cast' ? C.CAST_FRAME_MS : C.FIREBREATH_FRAME_MS;
      const hitFraction = this.state === 'cast' ? C.CAST_HIT_FRACTION : C.FIREBREATH_HIT_FRACTION;
      const cycleMs = C.FRAME_COUNT * frameMs;
      const elapsed = now - this.stateStart;

      if (!this.attackHit && elapsed >= cycleMs * hitFraction) {
        this.attackHit = true;
        if (this.state === 'cast') {
          this._fireBullet(now);
        } else {
          const box = this._box || { x: this.x, y: this.groundY - this.height };
          spawnFireBreath(box.x + (this.dir > 0 ? box.w || 0 : 0), this.groundY - this.height * 0.45, this.dir);
          if (Math.abs(dist) <= C.FIREBREATH_RANGE && !player.isInvulnerable(now)) {
            player.hurt(now, dist < 0 ? -1 : 1);
          }
        }
      }
      if (elapsed >= cycleMs) {
        this.nextAttackAt = now + C.ATTACK_COOLDOWN_MS;
        this.setState(now, 'idle');
      }
      this._updateBullets(now, player);
      return;
    }

    // 'idle' o 'walk': si Hero está a tiro y el cooldown lo permite, ataca
    // (alternando hechizo/fuego); si no, patrulla cerca de su punto de entrada.
    if (Math.abs(dist) <= C.ATTACK_RANGE && now >= this.nextAttackAt) {
      this.attackHit = false;
      this.attackKind = this.attackKind === 'cast' ? 'firebreath' : 'cast';
      this.setState(now, this.attackKind);
      this._updateBullets(now, player);
      return;
    }

    if (this.state === 'idle') {
      if (now - this.stateStart >= C.REST_MS) this.setState(now, 'walk');
      this._updateBullets(now, player);
      return;
    }

    // 'walk': patrulla cerca de baseX, igual que las verduras.
    this.x += C.SPEED * this.dir;
    const off = this.x - this.baseX;
    if (off > C.PATROL_RANGE || off < -C.PATROL_RANGE) {
      this.x = this.baseX + C.PATROL_RANGE * Math.sign(off);
      this.dir *= -1;
      this.setState(now, 'idle');
    }
    this._updateBullets(now, player);
  },

  _fireBullet(now) {
    const box = this._box || getToadBox(now);
    const tipX = box.x + (this.dir > 0 ? box.w : 0);
    const tipY = box.y + box.h * 0.4;
    this.bullets.push({ x: tipX, y: tipY, vx: CONFIG.TOAD.BULLET_SPEED * this.dir, spawnAt: now });
  },

  _updateBullets(now, player) {
    const C = CONFIG.TOAD;
    this.bullets = this.bullets.filter((b) => {
      b.x += b.vx;
      if (now - b.spawnAt >= C.BULLET_LIFETIME_MS) return false;
      if (!player.isInvulnerable(now)) {
        const pBox = getBox(ASSETS.hero, player.x, this.groundY + player.jumpOffset, player.height);
        const hit = b.x >= pBox.x && b.x <= pBox.x + pBox.w && b.y >= pBox.y && b.y <= pBox.y + pBox.h;
        if (hit) {
          player.hurt(now, b.vx < 0 ? -1 : 1);
          return false;
        }
      }
      return true;
    });
  }
};

const TOAD_STATE_ROW = { idle: 0, walk: 1, cast: 2, firebreath: 3, death: 4 };

// Frame actual dentro de la sheet compartida: idle/walk son ciclos en
// bucle; cast/firebreath/death son de una sola pasada (se quedan en el
// último frame al terminar). Devuelve { img, sx, sy, sw, sh } o null si la
// sheet todavía no ha cargado.
function toadFrame(now) {
  const C = CONFIG.TOAD;
  const img = ASSETS.toad;
  if (!img.complete || img.width === 0) return null;

  const state = TOAD_STATE_ROW[Toad.state] !== undefined ? Toad.state : 'idle';
  const frameMs = {
    idle: C.IDLE_FRAME_MS, walk: C.WALK_FRAME_MS, cast: C.CAST_FRAME_MS,
    firebreath: C.FIREBREATH_FRAME_MS, death: C.DEATH_FRAME_MS
  }[state];
  const elapsed = now - Toad.stateStart;

  let idx;
  if (state === 'idle' || state === 'walk') {
    idx = Math.floor(elapsed / frameMs) % C.FRAME_COUNT;
  } else {
    idx = Math.min(C.FRAME_COUNT - 1, Math.floor(elapsed / frameMs));
  }

  const [sw, sh] = C.FRAME_SIZES[state];
  const row = TOAD_STATE_ROW[state];
  return { img, sx: idx * C.CELL_W, sy: row * C.CELL_H, sw, sh };
}

// Caja de colisión en coordenadas de MUNDO (no hay cámara en OfficeScene,
// cameraX siempre 0, pero se mantiene la firma habitual por consistencia).
function getToadBox(now) {
  const f = toadFrame(now);
  if (!f) return { x: Toad.x, y: Toad.groundY - Toad.height, w: 0, h: Toad.height };
  return getScaledBox(f.sw, f.sh, Toad.x, Toad.groundY, Toad.scale);
}

function toadTakeHit(now) {
  if (!Toad.alive || !Toad.active || Toad.state === 'death') return;
  Toad.setState(now, 'death');
  Toad.bullets = [];
  Pickups.spawnHeartAt(Toad.x, Toad.groundY - CONFIG.PICKUP.GROUND_OFFSET, CONFIG.TOAD.HEART_HEAL);
}

function drawToad(ctx, now) {
  if (!Toad.alive && Toad.state !== 'death') return;
  const f = toadFrame(now);
  if (!f) return;

  const box = getScaledBox(f.sw, f.sh, Toad.x, Toad.groundY, Toad.scale);
  Toad._box = box;

  ctx.save();
  if (Toad.state === 'death' && Toad.deathAnimDone) ctx.globalAlpha = Toad.fadeAlpha;
  // el sprite mira de forma natural hacia la DERECHA (igual que el resto de
  // enemigos ya volteados por convención) -> se voltea al mirar a la izquierda
  if (Toad.dir < 0) {
    const c = box.x + box.w / 2;
    ctx.translate(c, 0);
    ctx.scale(-1, 1);
    ctx.translate(-c, 0);
  }
  ctx.drawImage(f.img, f.sx, f.sy, f.sw, f.sh, box.x, box.y, box.w, box.h);
  ctx.restore();

  Toad.bullets.forEach((b) => drawToadBullet(ctx, b));
}

// Bala mágica del hechizo: núcleo azul brillante + estela morada corta hacia
// atrás (de donde viene), a juego con la punta del báculo en la pose 'cast'.
function drawToadBullet(ctx, b) {
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#b98bf0';
  ctx.beginPath();
  ctx.ellipse(b.x - Math.sign(b.vx) * 9, b.y, 9, CONFIG.TOAD.BULLET_RADIUS * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.shadowColor = 'rgba(120,190,255,0.9)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#8fe0ff';
  ctx.beginPath();
  ctx.arc(b.x, b.y, CONFIG.TOAD.BULLET_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Golpe de espada (o puñetazo) del Hero: mismo patrón que checkVeggieSwordHit.
function checkToadSwordHit(now, player) {
  if (!Toad.alive || !Toad.active || Toad.state === 'death') return;
  if (!player.attacking) return;

  const pBox = getBox(ASSETS.hero, player.x, Toad.groundY + player.jumpOffset, player.height);
  const reach = CONFIG.ATTACK.MELEE_REACH;
  const atkBox = player.facing === 'right'
    ? { x: pBox.x, y: pBox.y, w: pBox.w + reach, h: pBox.h }
    : { x: pBox.x - reach, y: pBox.y, w: pBox.w + reach, h: pBox.h };

  if (rectsOverlap(atkBox, getToadBox(now))) toadTakeHit(now);
}

// Pisotón (estilo Mario): igual que checkVeggieCollision/checkAntStomp, pero
// el sapo no hace daño de contacto lateral (solo a distancia), así que un
// contacto no-pisotón simplemente no hace nada (Hero puede acercarse sin
// miedo para rematarlo con la espada).
function checkToadStomp(now, player) {
  if (!Toad.alive || !Toad.active || Toad.state === 'death') return;

  const pBox = getBox(ASSETS.hero, player.x, Toad.groundY + player.jumpOffset, player.height);
  const tBox = getToadBox(now);
  if (!rectsOverlap(pBox, tBox)) return;

  const stomping = player.vy > 0 && (pBox.y + pBox.h) < (tBox.y + tBox.h * 0.55);
  if (stomping) {
    toadTakeHit(now);
    player.vy = CONFIG.STOMP_BOUNCE;
    player.jumpOffset = -1;
    player.grounded = false;
  }
}
