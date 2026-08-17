// El jabalí: primer enemigo del nivel. Patrulla de lado a lado dentro de su
// zona, y usa las 6 animaciones reales del sprite (idle, move, turn, stop,
// hurt, death). Se mata saltándole encima (estilo Mario) o golpeándolo con
// el ataque (con espada o sin ella); tocarlo de lado sin atacar empuja y
// hace "daño" (invulnerabilidad breve) al Hero.
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
  hp: CONFIG.BOAR.MAX_HP,
  hpBarVisible: false, // se enseña la barra de vida a partir del primer golpe recibido
  lastSwordHitId: -Infinity, // player.attackStart del último tajo ya contado (evita contar el mismo golpe varias veces)

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
    this.hp = CONFIG.BOAR.MAX_HP;
    this.hpBarVisible = false;
    this.lastSwordHitId = -Infinity;
  },

  _setState(now, state) {
    this.state = state;
    this.stateStart = now;
  },

  // Lo llama la comprobación de colisión (pisotón) o de espada/puños. amount
  // = puntos de vida que quita este golpe (ver meleeDamage/stompDamage en
  // combat.js). Si la deja a 0, entra en la secuencia hurt->death de
  // siempre; si no, solo baja la barra de vida (sin cambiar de estado).
  takeHit(now, amount) {
    if (!this.alive || this.state === 'hurt' || this.state === 'death') return;
    if (!applyEnemyDamage(this, amount)) return;
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
        if (now - this.stateStart >= C.HURT_MS) {
          this._setState(now, 'death');
          // deja las pulseras flotando cerca del suelo, donde el jabalí ha
          // caído; el Hero las recoge al pasar por encima (ver pickups.js)
          Pickups.spawnBraceletsAt(
            this.x,
            this.groundY - CONFIG.PICKUP.GROUND_OFFSET,
            CONFIG.BOAR_BRACELET_REWARD
          );
        }
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

    if (this.hpBarVisible && this.state !== 'death') {
      drawEnemyHealthBar(ctx, box.x + box.w / 2, box.y - CONFIG.ENEMY_HEALTH_BAR.OFFSET_Y, this.hp / CONFIG.BOAR.MAX_HP);
    }
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
    Boar.takeHit(now, stompDamage());
    Player.vy = CONFIG.STOMP_BOUNCE;
    Player.jumpOffset = -1;
    Player.grounded = false;
  } else {
    const dir = Player.x < Boar.x ? -1 : 1;
    Player.hurt(now, dir);
  }
}

// Comprueba si el ataque de Hero (Player.attacking, con espada o sin ella)
// alcanza al jabalí; lo mata igual que el pisotón. El filo se extiende un
// poco más allá de la caja del Hero, hacia el lado al que mira (igual que
// con la hormiga y el tallo de hierba).
function checkBoarSwordHit(now, player, groundY) {
  if (!Boar.active || !Boar.alive) return;
  if (Boar.state === 'hurt' || Boar.state === 'death') return;
  if (!player.attacking) return;
  if (Boar.lastSwordHitId === player.attackStart) return; // este tajo ya ha contado

  const pBox = getBox(ASSETS.hero, player.x, groundY + player.jumpOffset, player.height);
  const reach = CONFIG.ATTACK.MELEE_REACH;
  const atkBox = player.facing === 'right'
    ? { x: pBox.x, y: pBox.y, w: pBox.w + reach, h: pBox.h }
    : { x: pBox.x - reach, y: pBox.y, w: pBox.w + reach, h: pBox.h };

  if (rectsOverlap(atkBox, Boar.getBox())) {
    Boar.lastSwordHitId = player.attackStart;
    Boar.takeHit(now, meleeDamage(player)); // mismo estado hurt -> death que el pisotón
  }
}
