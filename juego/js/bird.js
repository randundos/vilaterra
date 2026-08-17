// Pájaro (puput): jefe final del nivel 2 parte 2 (ver CONFIG.BIRD). NO se le
// puede matar de verdad, pero sí tiene vida numérica (hp/MAX_HP, igual que
// el resto de enemigos, ver combat.js) que baja con los golpes de Hero que
// conectan (ver checkBirdSwordHit/Bird.flinch): al llegar a 0, en vez de
// morir agarra a Hero y se lo lleva volando (ver updateCapture/drawCapture,
// una pequeña cinemática en varias fases: grab -> rise -> exit -> fade),
// dando paso a PoolScene (ver poolscene.js), la apertura del nivel 3. El
// pájaro también ataca de verdad y hace daño normal si conecta, pero eso NO
// resta su propia vida - solo es la amenaza real del combate mientras Hero
// intenta acabar con la suya.
// Mientras vuela (dormant/active/captured) usa el ciclo real de aleteo de 4
// frames (ASSETS.bird.flap, ver CONFIG.BIRD.FLAP_FRAME_MS); al atacar cambia
// a la pose fija de picotazo (ASSETS.bird.attack). Cada frame del aleteo está
// recortado a su contenido real (alas arriba/abajo cambian mucho de tamaño),
// así que se usa un único factor de escala (this.scale, calculado en init a
// partir de stand.png) para TODOS los sprites del pájaro en vez de forzar
// siempre la misma altura (mismo motivo que getScaledBox en render.js: si no,
// las alas extendidas se verían más grandes/pequeñas de golpe entre frames).
const Bird = {
  x: 0,
  baseX: 0,
  groundY: 0,
  height: CONFIG.BIRD.HEIGHT,
  scale: 1, // lo recalcula init() a partir de ASSETS.bird.stand
  facing: 'left', // el sprite mira de forma natural hacia la IZQUIERDA
  state: 'dormant', // dormant | active | attack | captured
  stateStart: 0,
  active: false,
  hp: CONFIG.BIRD.MAX_HP,
  hpBarVisible: false, // se enseña la barra de vida a partir del primer golpe recibido
  lastSwordHitSwing: -1, // player.attackStart del último tajo ya contado, para no contar el mismo swing varias veces (checkBirdSwordHit se llama cada frame mientras dura la animación de ataque)
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
    // igual que Veggies/Worms: un único factor de escala (px de imagen -> px
    // de mundo) a partir de un frame de referencia (stand.png), para que
    // todas las poses del pájaro (de pie, aleteando, atacando) mantengan un
    // tamaño coherente entre sí.
    this.scale = CONFIG.BIRD.HEIGHT / ASSETS.bird.stand.height;
    this.facing = 'left';
    this.state = 'dormant';
    this.stateStart = now;
    this.active = false;
    this.hp = CONFIG.BIRD.MAX_HP;
    this.hpBarVisible = false;
    this.lastSwordHitSwing = -1;
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

  // 'attack' usa la pose fija de picotazo; cualquier otro estado (dormant,
  // active, captured) usa el ciclo real de 4 frames aleteando, en bucle.
  _frameImg(now) {
    if (this.state === 'attack') return ASSETS.bird.attack;
    const frames = ASSETS.bird.flap;
    if (!frames.length || !frames[0].complete || frames[0].width === 0) return ASSETS.bird.stand;
    const idx = Math.floor((now || 0) / CONFIG.BIRD.FLAP_FRAME_MS) % frames.length;
    return frames[idx];
  },

  // Punto de anclaje vertical (el "groundY" que se le pasa a getBox: el
  // borde inferior del RECORTE de la imagen), compartido entre getBox() y
  // draw() para que la caja de colisión coincida siempre con la posición
  // realmente dibujada. Los pies tocan el suelo (igual que el resto de
  // enemigos): solo un balanceo MUY leve (HOVER_AMPLITUDE), sin despegar del
  // todo, salvo durante la captura final, que sí levanta el vuelo de verdad.
  // En attack.png el pico baja a picotear MÁS ABAJO que las patas (el borde
  // inferior del recorte es el pico, no las patas) - sin este ajuste, anclar
  // por el borde inferior deja las patas flotando por encima del suelo. Se
  // compensa bajando el ancla lo que sobresale el pico (ATTACK_FOOT_GAP, en
  // píxeles de la imagen original) para que sean las PATAS las que toquen
  // groundY, y el pico se clave un poco en el suelo (normal al picotear).
  _anchorY(now) {
    if (this.state === 'captured') {
      return this.groundY + this.liftY - this.height * 0.55;
    }
    const base = this.groundY - Math.abs(Math.sin(now * CONFIG.BIRD.HOVER_SPEED)) * CONFIG.BIRD.HOVER_AMPLITUDE;
    if (this.state === 'attack') {
      return base + CONFIG.BIRD.ATTACK_FOOT_GAP * this.scale;
    }
    return base;
  },

  // Caja de colisión en coordenadas de MUNDO (sin restar cámara). Necesita
  // "now" porque el pájaro flota (ver _anchorY) y porque elige el frame de
  // aleteo actual, a diferencia del resto de enemigos que están siempre
  // pegados a groundY con un frame fijo por estado.
  getBox(now) {
    const img = this._frameImg(now);
    return getScaledBox(img.width, img.height, this.x, this._anchorY(now), this.scale);
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
        // El golpe del pájaro hace daño normal si conecta, pero NO cuenta
        // para la captura (eso solo lo hacen los golpes de Hero, ver
        // checkBirdSwordHit): es solo la amenaza real del combate.
        if (Math.abs(dist) <= C.HIT_RANGE && !player.isInvulnerable(now)) {
          player.hurt(now, dist < 0 ? -1 : 1);
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

    const img = this._frameImg(now);
    if (!img || !img.complete || img.width === 0) return;

    const box = getScaledBox(img.width, img.height, this.x - cameraX, this._anchorY(now), this.scale);

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

    if (this.hpBarVisible && this.state !== 'captured') {
      drawEnemyHealthBar(ctx, box.x + box.w / 2, box.y - CONFIG.ENEMY_HEALTH_BAR.OFFSET_Y, this.hp / CONFIG.BIRD.MAX_HP);
    }
  }
};

// Comprueba si el golpe de espada/puñetazo de Hero alcanza al pájaro: baja
// su vida numérica (ver Bird.hp/MAX_HP, meleeDamage en combat.js) igual que
// el resto de enemigos, aunque nunca "muere" del todo. player.attacking se
// queda a true durante TODA la animación del tajo, así que esta función se
// llama muchas veces por swing; lastSwordHitSwing evita contar el mismo
// golpe más de una vez (cada swing tiene su propio player.attackStart).
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

    if (Bird.lastSwordHitSwing !== player.attackStart) {
      Bird.lastSwordHitSwing = player.attackStart;
      if (applyEnemyDamage(Bird, meleeDamage(player))) {
        Bird._setState(now, 'captured');
        // durante el combate "facing" cambia según de qué lado venga Hero, y
        // se queda congelado al entrar en 'captured' (update() ya no lo
        // recalcula); lo fijamos aquí a 'right' porque la salida (exit, más
        // abajo) siempre se aleja hacia la derecha (this.x += EXIT_SPEED),
        // así que tiene que mirar hacia donde realmente vuela.
        Bird.facing = 'right';
        Bird.captureSub = 'grab';
        Bird.captureStart = now;
      }
    }
  }
}
