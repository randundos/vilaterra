// Pájaro (puput): jefe final del nivel 2 parte 2 (ver CONFIG.BIRD). A
// diferencia de Talp, NO se le puede derrotar: Hero puede moverse, saltar y
// atacar con espada/puñetazo con normalidad, y el pájaro reacciona con un
// breve parpadeo al golpe (ver Bird.flinch), pero eso no cuenta para nada -
// el combate está pensado para que el pájaro acabe aterrizando sus propios
// golpes sí o sí. Cada ataque que conecta hace daño normal (igual que
// cualquier otro enemigo); al conectar el 7º golpe, en vez de seguir
// atacando agarra a Hero y se lo lleva volando (ver updateCapture/drawCapture,
// una pequeña cinemática en varias fases: grab -> rise -> exit -> fade),
// terminando en la pantalla "pròximament" (ver drawBirdEndOverlay en ui.js).
// Solo hay dos poses reales (de pie/volando y picoteando/atacando): "active"
// usa un balanceo vertical simple (HOVER_*) para simular que planea, ya que
// no hay un ciclo de vuelo propio.
const Bird = {
  x: 0,
  baseX: 0,
  groundY: 0,
  height: CONFIG.BIRD.HEIGHT,
  facing: 'left', // el sprite mira de forma natural hacia la IZQUIERDA
  state: 'dormant', // dormant | active | attack | captured
  stateStart: 0,
  active: false,
  hitsLanded: 0,
  nextAttackAt: 0,
  attackHit: false,
  flinchUntil: 0,

  // Secuencia final (solo se usan cuando state === 'captured')
  captureSub: null, // null | 'grab' | 'rise' | 'exit' | 'fade' | 'done'
  captureStart: 0,
  liftY: 0,

  init(now, groundY) {
    this.baseX = CONFIG.BIRD.SPAWN_X;
    this.x = CONFIG.BIRD.SPAWN_X;
    this.groundY = groundY;
    this.facing = 'left';
    this.state = 'dormant';
    this.stateStart = now;
    this.active = false;
    this.hitsLanded = 0;
    this.nextAttackAt = 0;
    this.attackHit = false;
    this.flinchUntil = 0;
    this.captureSub = null;
    this.captureStart = 0;
    this.liftY = 0;
  },

  _setState(now, state) {
    this.state = state;
    this.stateStart = now;
  },

  // Lo llama el golpe de espada/puñetazo de Hero: no le hace ningún daño
  // real (es invulnerable), solo un parpadeo breve para que la pelea se
  // sienta "real" en vez de que los golpes de Hero no tengan ningún efecto.
  flinch(now) {
    if (this.state !== 'active' && this.state !== 'attack') return;
    this.flinchUntil = now + CONFIG.BIRD.FLINCH_MS;
  },

  _frameImg() {
    return this.state === 'attack' ? ASSETS.bird.attack : ASSETS.bird.stand;
  },

  // Punto de anclaje vertical (el "groundY" que se le pasa a getBox: el
  // borde inferior del sprite), compartido entre getBox() y draw() para que
  // la caja de colisión coincida siempre con la posición realmente dibujada
  // (el pájaro vuela, no está pegado al suelo como el resto de enemigos).
  _anchorY(now) {
    if (this.state === 'captured') {
      return this.groundY + this.liftY - this.height * 0.55;
    }
    return this.groundY - this.height * 0.5 + Math.sin(now * CONFIG.BIRD.HOVER_SPEED) * CONFIG.BIRD.HOVER_AMPLITUDE;
  },

  // Caja de colisión en coordenadas de MUNDO (sin restar cámara). Necesita
  // "now" porque el pájaro flota (ver _anchorY), a diferencia del resto de
  // enemigos que están siempre pegados a groundY.
  getBox(now) {
    return getBox(this._frameImg(), this.x, this._anchorY(now), this.height);
  },

  update(now, player, groundY) {
    const C = CONFIG.BIRD;

    if (this.state === 'dormant') {
      if (Math.abs(player.x - this.baseX) <= C.WAKE_DISTANCE) {
        this.active = true;
        this._setState(now, 'active');
      }
      return;
    }
    if (!this.active) return;

    if (this.state === 'captured') {
      this._updateCapture(now, player);
      return;
    }

    const dist = player.x - this.x;
    this.facing = dist < 0 ? 'left' : 'right';

    if (this.state === 'attack') {
      const elapsed = now - this.stateStart;
      if (!this.attackHit && elapsed >= C.ATTACK_DURATION_MS * C.ATTACK_HIT_FRACTION) {
        this.attackHit = true;
        if (Math.abs(dist) <= C.HIT_RANGE && !player.isInvulnerable(now)) {
          player.hurt(now, dist < 0 ? -1 : 1);
          this.hitsLanded++;
          if (this.hitsLanded >= C.HITS_TO_CAPTURE) {
            this._setState(now, 'captured');
            this.captureSub = 'grab';
            this.captureStart = now;
            return;
          }
        }
      }
      if (elapsed >= C.ATTACK_DURATION_MS) {
        this.nextAttackAt = now + C.ATTACK_COOLDOWN_MS;
        this._setState(now, 'active');
      }
      return;
    }

    // 'active': persigue mientras no se aleje demasiado de su punto de
    // partida, y ataca en cuanto lo tiene a tiro y el cooldown lo permite
    if (Math.abs(dist) <= C.ATTACK_RANGE) {
      if (now >= this.nextAttackAt) {
        this.attackHit = false;
        this._setState(now, 'attack');
      }
    } else if (Math.abs(this.x - this.baseX) <= C.CHASE_LEASH) {
      this.x += C.SPEED * Math.sign(dist);
    }
  },

  // Cinemática final en varias fases: se posa junto a Hero y lo agarra,
  // sube con él en vertical, se aleja volando hacia fuera de la pantalla y
  // funde a negro; a partir de 'done' se queda fija (no hay más transición,
  // es la pantalla "pròximament" final).
  _updateCapture(now, player) {
    const C = CONFIG.BIRD.CAPTURE;
    const elapsed = now - this.captureStart;

    if (this.captureSub === 'grab') {
      this.x = player.x;
      player.jumpOffset = 0;
      player.grounded = false;
      if (elapsed >= C.GRAB_MS) {
        this.captureSub = 'rise';
        this.captureStart = now;
      }
      return;
    }
    if (this.captureSub === 'rise') {
      const t = Math.min(1, elapsed / C.RISE_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      this.liftY = -C.RISE_DISTANCE * eased;
      player.jumpOffset = this.liftY;
      player.x = this.x;
      if (t >= 1) {
        this.captureSub = 'exit';
        this.captureStart = now;
      }
      return;
    }
    if (this.captureSub === 'exit') {
      this.x += C.EXIT_SPEED;
      player.x = this.x;
      player.jumpOffset = this.liftY;
      if (elapsed >= C.EXIT_MS) {
        this.captureSub = 'fade';
        this.captureStart = now;
      }
      return;
    }
    if (this.captureSub === 'fade') {
      if (elapsed >= C.FADE_MS) this.captureSub = 'done';
      return;
    }
    // 'done': ya no hay más que actualizar, se queda la pantalla final fija
  },

  draw(ctx, now, cameraX) {
    if (this.state === 'dormant') return;
    if (!this.active) return;

    const img = this._frameImg();
    if (!img || !img.complete || img.width === 0) return;

    const box = getBox(img, this.x - cameraX, this._anchorY(now), this.height);

    ctx.save();
    if (now < this.flinchUntil && Math.floor((this.flinchUntil - now) / 50) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }
    if (this.facing === 'right') {
      const c = box.x + box.w / 2;
      ctx.translate(c, 0);
      ctx.scale(-1, 1);
      ctx.translate(-c, 0);
    }
    ctx.drawImage(img, box.x, box.y, box.w, box.h);
    ctx.restore();
  }
};

// Comprueba si el golpe de espada/puñetazo de Hero alcanza al pájaro: no lo
// mata (es invulnerable), solo dispara el parpadeo (ver Bird.flinch).
function checkBirdSwordHit(now, player, groundY) {
  if (!Bird.active || Bird.state === 'dormant' || Bird.state === 'captured') return;
  if (!player.attacking) return;

  const pBox = getBox(ASSETS.hero, player.x, groundY + player.jumpOffset, player.height);
  const reach = CONFIG.ATTACK.MELEE_REACH;
  const atkBox = player.facing === 'right'
    ? { x: pBox.x, y: pBox.y, w: pBox.w + reach, h: pBox.h }
    : { x: pBox.x - reach, y: pBox.y, w: pBox.w + reach, h: pBox.h };

  if (rectsOverlap(atkBox, Bird.getBox(now))) {
    Bird.flinch(now);
  }
}
