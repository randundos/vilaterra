// Talp (topo): jefe final del tramo de hierba, guarda la boca de la cueva
// (ver CONFIG.SMALL_WORLD.CAVE). Ya no sale del suelo: empieza escondido
// DENTRO de la cueva (CAVE_X) y, al acercarse Hero, camina (WALK) hasta su
// puesto de guardia (GUARD_X), ruge (TAUNT) y a partir de ahí lo persigue de
// verdad: si lo tiene lejos avanza hacia él (WALK de nuevo), y en cuanto lo
// tiene a tiro se para y ataca (ATTACK2) cada CONFIG.TALP.ATTACK_COOLDOWN_MS
// (1,5s) — agresivo, pero sin encadenar golpes sin descanso. Quieto sin nada
// que hacer usa IDLE. Su cuerpo es sólido a su alrededor (ver blockTalpBody)
// pero no por encima (se le puede saltar); aun así hay que derrotarlo
// (pisotón o espada, 6 golpes) para poder cruzar la cueva, porque su propia
// boca tiene una barrera aparte mientras siga vivo (ver cave.js). Al morir
// reproduce el ciclo de DEATH hundiéndose, se queda quieto en el último
// frame y se desvanece, sin dejar ningún agujero.
const Talp = {
  x: 0,
  baseX: 0,
  groundY: 0,
  height: CONFIG.TALP.HEIGHT,
  facing: 'right', // el sprite mira de forma natural hacia la derecha; se voltea al mirar a la izquierda
  state: 'dormant', // dormant | emerge | taunt | idle | move | attack | hurt | death
  stateStart: 0,
  active: false,    // false mientras está "dormant" (dentro de la cueva, sin colisión ni dibujo)
  hitsTaken: 0,
  nextAttackAt: 0,
  attackHit: false, // si ya se ha aplicado el daño del ataque en curso
  lastSwordHitId: -Infinity, // player.attackStart del último golpe de espada ya contado (evita contar el mismo tajo varias veces)
  hurtVariant: 'damage1',
  deathFadeStart: 0,
  fadeAlpha: 1,
  defeated: false,  // true cuando termina del todo la animación de muerte

  init(now, groundY) {
    this.baseX = CONFIG.TALP.GUARD_X;
    this.x = CONFIG.TALP.CAVE_X; // empieza dentro de la cueva, oculto
    this.groundY = groundY;
    this.facing = 'left'; // dentro de la cueva mira hacia dentro; al salir se orienta hacia Hero
    this.state = 'dormant';
    this.stateStart = now;
    this.active = false;
    this.hitsTaken = 0;
    this.nextAttackAt = 0;
    this.attackHit = false;
    this.lastSwordHitId = -Infinity;
    this.deathFadeStart = 0;
    this.fadeAlpha = 1;
    this.defeated = false;
  },

  _setState(now, state) {
    this.state = state;
    this.stateStart = now;
  },

  // El cuerpo bloquea el paso de Hero (ver blockTalpBody) mientras esté
  // despierto y en pie; deja de ser sólido en cuanto empieza a hundirse.
  _isSolid() {
    return this.state === 'taunt' || this.state === 'idle' || this.state === 'move' ||
           this.state === 'attack' || this.state === 'hurt';
  },

  // Lo llama el pisotón o el golpe de espada. Cuenta como un golpe más;
  // al llegar a HITS_TO_KILL empieza la secuencia de muerte.
  takeHit(now) {
    if (!this.active) return;
    if (this.state === 'dormant' || this.state === 'emerge' || this.state === 'taunt' || this.state === 'death') return;

    this.hitsTaken++;
    if (this.hitsTaken >= CONFIG.TALP.HITS_TO_KILL) {
      this._setState(now, 'death');
      this.deathFadeStart = 0;
      Pickups.spawnBraceletsAt(this.x, this.groundY - CONFIG.PICKUP.GROUND_OFFSET, CONFIG.TALP.BRACELET_REWARD);
    } else {
      this.hurtVariant = Math.random() < 0.5 ? 'damage1' : 'damage2';
      this._setState(now, 'hurt');
    }
  },

  // Duración total (ms) del ciclo de frames del estado actual, o Infinity
  // para los que no son un ciclo con frames propios (dormant/hurt/death, que
  // se controlan aparte). Se usa tanto para elegir el frame a dibujar como
  // para saber cuándo ha terminado una animación de una sola pasada.
  _cycleMs() {
    const C = CONFIG.TALP;
    switch (this.state) {
      case 'emerge':
      case 'move': return ASSETS.talp.walk.length * C.WALK_FRAME_MS;
      case 'taunt': return ASSETS.talp.taunt.length * C.TAUNT_FRAME_MS;
      case 'attack': return ASSETS.talp.attack2.length * C.ATTACK_FRAME_MS;
      case 'death': return ASSETS.talp.death.length * C.DEATH_FRAME_MS;
      case 'idle': return ASSETS.talp.idle.length * C.IDLE_FRAME_MS;
      default: return Infinity;
    }
  },

  _frameImg() {
    const A = ASSETS.talp;
    const C = CONFIG.TALP;
    const elapsed = performance.now() - this.stateStart;
    switch (this.state) {
      case 'emerge':
      case 'move': {
        const idx = Math.floor(elapsed / C.WALK_FRAME_MS) % A.walk.length; // en bucle mientras camina
        return A.walk[idx] || A.walk[0];
      }
      case 'taunt': {
        const idx = Math.min(A.taunt.length - 1, Math.floor(elapsed / C.TAUNT_FRAME_MS)); // una sola pasada
        return A.taunt[idx] || A.taunt[0];
      }
      case 'attack': {
        const idx = Math.min(A.attack2.length - 1, Math.floor(elapsed / C.ATTACK_FRAME_MS));
        return A.attack2[idx] || A.attack2[0];
      }
      case 'hurt':
        return this.hurtVariant === 'damage1' ? A.damage1 : A.damage2;
      case 'death': {
        const idx = Math.min(A.death.length - 1, Math.floor(elapsed / C.DEATH_FRAME_MS)); // se queda en el último
        return A.death[idx] || A.death[0];
      }
      default: { // idle
        const idx = Math.floor(elapsed / C.IDLE_FRAME_MS) % A.idle.length; // en bucle
        return A.idle[idx] || A.idle[0];
      }
    }
  },

  // Caja de colisión en coordenadas de MUNDO (sin restar cámara).
  getBox() {
    return getBox(this._frameImg(), this.x, this.groundY, this.height);
  },

  update(now, player, groundY) {
    const C = CONFIG.TALP;

    if (this.state === 'dormant') {
      if (Math.abs(player.x - this.baseX) <= C.WAKE_DISTANCE) {
        this.active = true;
        this._setState(now, 'emerge');
      }
      return;
    }
    if (!this.active) return;

    if (this.state === 'emerge') {
      // camina desde la boca de la cueva (CAVE_X) hasta su puesto de
      // guardia (GUARD_X), al mismo ritmo que al perseguir (ver WALK)
      const dir = C.GUARD_X >= C.CAVE_X ? 1 : -1;
      this.facing = dir < 0 ? 'left' : 'right';
      this.x += C.SPEED * dir;
      if ((dir > 0 && this.x >= C.GUARD_X) || (dir < 0 && this.x <= C.GUARD_X)) {
        this.x = C.GUARD_X;
        this._setState(now, 'taunt');
      }
      return;
    }
    if (this.state === 'taunt') {
      if (now - this.stateStart >= this._cycleMs()) {
        // deja pasar un primer respiro tras el rugido, en vez de golpear nada más terminar
        this.nextAttackAt = now + C.ATTACK_COOLDOWN_MS;
        this._setState(now, 'idle');
      }
      return;
    }
    if (this.state === 'hurt') {
      if (now - this.stateStart >= C.HURT_MS) this._setState(now, 'idle');
      return;
    }
    if (this.state === 'death') {
      this._updateDeath(now);
      return;
    }

    // idle | move | attack: persecución activa + ataque cuerpo a cuerpo cronometrado
    const dist = player.x - this.x;
    this.facing = dist < 0 ? 'left' : 'right';

    if (this.state === 'attack') {
      const elapsed = now - this.stateStart;
      const dur = this._cycleMs();
      if (!this.attackHit && elapsed >= dur * C.ATTACK_HIT_FRACTION) {
        this.attackHit = true;
        if (Math.abs(dist) <= C.HIT_RANGE && !player.isInvulnerable(now)) {
          player.hurt(now, dist < 0 ? -1 : 1);
        }
      }
      if (elapsed >= dur) {
        this.nextAttackAt = now + C.ATTACK_COOLDOWN_MS;
        this._setState(now, 'idle');
      }
      return;
    }

    if (Math.abs(dist) <= C.ATTACK_RANGE) {
      // lo tiene a tiro: se para y, en cuanto el cooldown lo permita, ataca
      if (now >= this.nextAttackAt) {
        this.attackHit = false;
        this._setState(now, 'attack');
      } else if (this.state !== 'idle') {
        this._setState(now, 'idle');
      }
    } else if (Math.abs(this.x - this.baseX) <= C.CHASE_LEASH) {
      // lo persigue mientras no se aleje demasiado de su punto de aparición
      this.x += C.SPEED * Math.sign(dist);
      if (this.state !== 'move') this._setState(now, 'move');
    } else if (this.state !== 'idle') {
      this._setState(now, 'idle');
    }
  },

  _updateDeath(now) {
    const C = CONFIG.TALP;
    const elapsed = now - this.stateStart;

    if (!this.deathFadeStart) {
      // reproduce el ciclo de hundirse y se queda quieto en el último frame
      // un rato (DEATH_HOLD_MS) antes de empezar a desvanecerse
      if (elapsed >= this._cycleMs() + C.DEATH_HOLD_MS) this.deathFadeStart = now;
      return;
    }

    const fadeElapsed = now - this.deathFadeStart;
    this.fadeAlpha = Math.max(0, 1 - fadeElapsed / C.DEATH_FADE_MS);
    if (this.fadeAlpha <= 0 && !this.defeated) {
      this.active = false;
      this.defeated = true;
    }
  },

  draw(ctx, now, cameraX) {
    if (this.state === 'dormant') return;
    if (!this.active && this.state !== 'death') return;

    const img = this._frameImg();
    if (!img || !img.complete || img.width === 0) return;

    const box = getBox(img, this.x - cameraX, this.groundY, this.height);

    ctx.save();
    if (this.state === 'death' && this.deathFadeStart) {
      ctx.globalAlpha = this.fadeAlpha;
    } else if (this.state === 'hurt') {
      // parpadeo breve al recibir el golpe, como Hero al ser invulnerable
      if (Math.floor((now - this.stateStart) / 60) % 2 === 0) ctx.globalAlpha = 0.55;
    }
    if (this.facing === 'left') {
      const c = box.x + box.w / 2;
      ctx.translate(c, 0);
      ctx.scale(-1, 1);
      ctx.translate(-c, 0);
    }
    ctx.drawImage(img, box.x, box.y, box.w, box.h);
    ctx.restore();
  }
};

// Mientras el cuerpo de Talp esté "sólido" (ver Talp._isSolid), bloquea el
// paso de Hero A SU ALREDEDOR, como un tronco en el suelo: no hay ningún
// techo invisible por encima, así que si Hero salta lo bastante alto como
// para que sus pies queden por encima de la cabeza de Talp, lo puede saltar
// con normalidad. Igual que blockGrassBlade, pero con Talp pudiendo moverse
// y sin bloquear en el aire.
function blockTalpBody(player, groundY) {
  if (!Talp._isSolid()) return;

  const pBox = getBox(ASSETS.hero, player.x, groundY + player.jumpOffset, player.height);
  const tBox = Talp.getBox();
  if (pBox.y + pBox.h <= tBox.y) return; // los pies de Hero ya están por encima de la cabeza de Talp: no bloquea

  const halfW = CONFIG.TALP.BODY_WIDTH / 2;
  if (player.x < Talp.x) {
    player.x = Math.min(player.x, Talp.x - halfW);
  } else {
    player.x = Math.max(player.x, Talp.x + halfW);
  }
}

// Comprueba el pisotón (saltar encima de Talp lo golpea, igual que con el
// jabalí/gusano/hormigas). El contacto lateral ya NO hace daño por sí solo:
// el cuerpo sólido (blockTalpBody) impide que Hero llegue a solaparse de
// lado, y el daño de verdad llega por el ataque cronometrado de Talp.update().
function checkTalpCollision(now, player, groundY) {
  if (!Talp.active) return;
  if (!Talp._isSolid()) return;
  if (player.isInvulnerable(now)) return;

  const pBox = getBox(ASSETS.hero, player.x, groundY + player.jumpOffset, player.height);
  const tBox = Talp.getBox();
  if (!rectsOverlap(pBox, tBox)) return;

  const stomping = player.vy > 0 && (pBox.y + pBox.h) < (tBox.y + tBox.h * 0.55);
  if (stomping) {
    Talp.takeHit(now);
    player.vy = CONFIG.STOMP_BOUNCE;
    player.jumpOffset = -1;
    player.grounded = false;
  }
}

// Comprueba si el golpe de espada/puñetazo de Hero alcanza a Talp (igual que
// checkBoarSwordHit). Puede golpearse también durante su propio ataque o
// mientras está aturdido, para poder castigarlo sin ventanas de invulnerabilidad raras.
// A diferencia del resto de enemigos (que mueren de un solo golpe), Talp
// aguanta varios impactos -> hay que evitar contar el MISMO tajo más de una
// vez (player.attacking se mantiene activo varios frames seguidos mientras
// dura la animación, y sin esta comprobación cada uno de esos frames sumaba
// un golpe, matándolo casi al instante).
function checkTalpSwordHit(now, player, groundY) {
  if (!Talp.active) return;
  if (!['idle', 'move', 'attack', 'hurt'].includes(Talp.state)) return;
  if (!player.attacking) return;
  if (Talp.lastSwordHitId === player.attackStart) return; // este tajo ya ha contado

  const pBox = getBox(ASSETS.hero, player.x, groundY + player.jumpOffset, player.height);
  const reach = CONFIG.ATTACK.MELEE_REACH;
  const atkBox = player.facing === 'right'
    ? { x: pBox.x, y: pBox.y, w: pBox.w + reach, h: pBox.h }
    : { x: pBox.x - reach, y: pBox.y, w: pBox.w + reach, h: pBox.h };

  if (rectsOverlap(atkBox, Talp.getBox())) {
    Talp.lastSwordHitId = player.attackStart;
    Talp.takeHit(now);
  }
}
