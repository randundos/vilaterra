// El jabalí: primer enemigo del nivel. Patrulla de lado a lado dentro de su
// zona, y usa las 6 animaciones reales del sprite (idle, move, turn, stop,
// hurt, death). Saltarle encima lo mata (estilo Mario); tocarlo de lado
// empuja y hace "daño" (invulnerabilidad breve) al Hero.
const Boar = {
  x: 0,
  baseX: 0,
  groundY: 0,
  height: CONFIG.BOAR.HEIGHT,
  dir: -1,          // -1 = mirando/andando hacia la izquierda, 1 = derecha
  state: 'idle',    // idle | move | stop | turn | hurt | death
  stateStart: 0,
  alive: true,
  active: false,    // solo patrulla/colisiona una vez ha empezado la jugabilidad
  deathAnimDone: false,
  fadeStart: 0,
  fadeAlpha: 1,

  init(now, groundY) {
    this.baseX = CONFIG.BOAR.SPAWN_X;
    this.x = CONFIG.BOAR.SPAWN_X;
    this.groundY = groundY;
    this.dir = -1;
    this.state = 'idle';
    this.stateStart = now;
    this.alive = true;
    this.active = true;
    this.deathAnimDone = false;
    this.fadeAlpha = 1;
  },

  _setState(now, state) {
    this.state = state;
    this.stateStart = now;
  },

  // Lo llama la comprobación de colisión cuando el Hero le salta encima.
  takeStomp(now) {
    if (!this.alive || this.state === 'hurt' || this.state === 'death') return;
    this._setState(now, 'hurt');
  },

  update(now) {
    if (!this.active) return;

    const C = CONFIG.BOAR;

    if (this.state === 'death') {
      if (!this.deathAnimDone) {
        const framesElapsed = (now - this.stateStart) / C.FRAME_MS;
        if (framesElapsed >= ASSETS.boar.death.length) {
          this.deathAnimDone = true;
          this.fadeStart = now;
        }
      } else {
        const fadeElapsed = now - this.fadeStart;
        this.fadeAlpha = Math.max(0, 1 - fadeElapsed / C.DEATH_FADE_MS);
        if (this.fadeAlpha <= 0) {
          this.alive = false;
          this.active = false; // ya no se actualiza ni se dibuja más
        }
      }
      return;
    }

    switch (this.state) {
      case 'idle':
        if (now - this.stateStart >= C.IDLE_MS) this._setState(now, 'move');
        break;
      case 'move': {
        this.x += C.SPEED * this.dir;
        const dist = this.x - this.baseX;
        if (dist > C.PATROL_RANGE || dist < -C.PATROL_RANGE) {
          this.x = this.baseX + C.PATROL_RANGE * Math.sign(dist);
          this._setState(now, 'stop');
        }
        break;
      }
      case 'stop':
        if (now - this.stateStart >= C.STOP_MS) this._setState(now, 'turn');
        break;
      case 'turn':
        if (now - this.stateStart >= C.TURN_MS) {
          this.dir *= -1;
          this._setState(now, 'move');
        }
        break;
      case 'hurt':
        if (now - this.stateStart >= C.HURT_MS) this._setState(now, 'death');
        break;
      default:
        break;
    }
  },

  // Caja de colisión en coordenadas de MUNDO (sin restar cámara).
  getBox() {
    const frames = ASSETS.boar[this.state] || ASSETS.boar.idle;
    return getBox(frames[0], this.x, this.groundY, this.height);
  },

  draw(ctx, now, t, cameraX) {
    if (!this.active && !this.alive) return;

    const C = CONFIG.BOAR;
    const frames = ASSETS.boar[this.state] || ASSETS.boar.idle;
    const elapsed = now - this.stateStart;
    let idx;
    if (this.state === 'death') {
      idx = Math.min(frames.length - 1, Math.floor(elapsed / C.FRAME_MS));
    } else {
      idx = Math.floor(elapsed / C.FRAME_MS) % frames.length;
    }
    const img = frames[idx];
    const box = getBox(img, this.x - cameraX, this.groundY, this.height);

    ctx.save();
    if (this.state === 'death' && this.deathAnimDone) {
      ctx.globalAlpha = this.fadeAlpha;
    }
    if (this.dir < 0) {
      // el sprite mira de forma natural hacia la derecha -> se voltea al
      // andar hacia la izquierda (comprobado jugando: al revés que Hero/Blai)
      const c = box.x + box.w / 2;
      ctx.translate(c, 0);
      ctx.scale(-1, 1);
      ctx.translate(-c, 0);
    }
    ctx.drawImage(img, box.x, box.y, box.w, box.h);
    ctx.restore();
  }
};

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Comprueba el contacto Hero <-> Boar y resuelve pisotón vs. golpe lateral.
// groundY se pasa desde main.js (es la misma línea de suelo de la jugabilidad).
function checkBoarCollision(now, groundY) {
  if (!Boar.active || !Boar.alive) return;
  if (Boar.state === 'hurt' || Boar.state === 'death') return;
  if (Player.isInvulnerable(now)) return;

  const pBox = getBox(ASSETS.hero, Player.x, groundY + Player.jumpOffset, Player.height);
  const bBox = Boar.getBox();

  if (!rectsOverlap(pBox, bBox)) return;

  const stomping = Player.vy > 0 && (pBox.y + pBox.h) < (bBox.y + bBox.h * 0.55);
  if (stomping) {
    Boar.takeStomp(now);
    Player.vy = CONFIG.STOMP_BOUNCE;
    Player.jumpOffset = -1;
    Player.grounded = false;
  } else {
    const dir = Player.x < Boar.x ? -1 : 1;
    Player.hurt(now, dir);
  }
}
