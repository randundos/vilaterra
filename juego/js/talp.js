// Talp (topo): jefe final del tramo de hierba, sustituye a la hormiga
// veterana. Se queda escondido bajo tierra hasta que Hero se acerca, emerge
// con un rugido de intimidación (taunt), y luego patrulla su zona; si Hero
// se pone cerca, de vez en cuando hace un ademán de ataque (solo visual, el
// daño real es por contacto, igual que el jabalí). Hace falta golpearlo más
// de 5 veces (CONFIG.TALP.HITS_TO_KILL) con pisotón o espada para matarlo;
// al morir se hunde en la tierra en 3 fases antes de desaparecer del todo.
const Talp = {
  x: 0,
  baseX: 0,
  groundY: 0,
  height: CONFIG.TALP.HEIGHT,
  facing: 'left',   // hacia dónde mira ahora mismo (sigue a Hero una vez despierto)
  moveDir: 1,       // dirección de la patrulla (independiente de hacia dónde mira)
  state: 'dormant', // dormant | emerge | taunt | idle | move | attack | hurt | death
  stateStart: 0,
  active: false,    // false mientras está "dormant" (bajo tierra, sin colisión ni dibujo)
  hitsTaken: 0,
  nextAttackAt: 0,
  attackVariant: 'attack1',
  hurtVariant: 'damage1',
  deathStage: 0,
  deathFadeStart: 0,
  fadeAlpha: 1,
  defeated: false,  // true cuando termina del todo la animación de muerte

  init(now, groundY) {
    this.baseX = CONFIG.TALP.SPAWN_X;
    this.x = CONFIG.TALP.SPAWN_X;
    this.groundY = groundY;
    this.facing = 'left';
    this.moveDir = 1;
    this.state = 'dormant';
    this.stateStart = now;
    this.active = false;
    this.hitsTaken = 0;
    this.nextAttackAt = 0;
    this.deathStage = 0;
    this.fadeAlpha = 1;
    this.defeated = false;
  },

  _setState(now, state) {
    this.state = state;
    this.stateStart = now;
  },

  // Lo llama el pisotón o el golpe de espada. Cuenta como un golpe más;
  // al llegar a HITS_TO_KILL empieza la secuencia de muerte.
  takeHit(now) {
    if (!this.active) return;
    if (this.state === 'dormant' || this.state === 'emerge' || this.state === 'taunt' || this.state === 'death') return;

    this.hitsTaken++;
    if (this.hitsTaken >= CONFIG.TALP.HITS_TO_KILL) {
      this._setState(now, 'death');
      this.deathStage = 0;
      this.deathFadeStart = 0;
      Pickups.spawnBraceletsAt(this.x, this.groundY - CONFIG.PICKUP.GROUND_OFFSET, CONFIG.TALP.BRACELET_REWARD);
    } else {
      this.hurtVariant = Math.random() < 0.5 ? 'damage1' : 'damage2';
      this._setState(now, 'hurt');
    }
  },

  _frameImg() {
    const A = ASSETS.talp;
    switch (this.state) {
      case 'emerge': return A.emerge;
      case 'taunt': return A.taunt;
      case 'move': return A.move;
      case 'attack': return this.attackVariant === 'attack1' ? A.attack1 : A.attack2;
      case 'hurt': return this.hurtVariant === 'damage1' ? A.damage1 : A.damage2;
      case 'death': return A.death[this.deathStage] || A.death[0];
      default: return A.idle;
    }
  },

  // Desplazamiento vertical mientras emerge: empieza hundido del todo bajo
  // el suelo y sube hasta su altura normal.
  _emergeOffset(now) {
    if (this.state !== 'emerge') return 0;
    const t = Math.min(1, (now - this.stateStart) / CONFIG.TALP.EMERGE_MS);
    return this.height * (1 - t);
  },

  // Caja de colisión en coordenadas de MUNDO (sin restar cámara).
  getBox() {
    return getBox(this._frameImg(), this.x, this.groundY + this._emergeOffset(performance.now()), this.height);
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
      if (now - this.stateStart >= C.EMERGE_MS) this._setState(now, 'taunt');
      return;
    }
    if (this.state === 'taunt') {
      if (now - this.stateStart >= C.TAUNT_MS) this._setState(now, 'idle');
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

    // patrulla + orientación hacia Hero + ademán de ataque si lo tiene cerca
    this.facing = player.x < this.x ? 'left' : 'right';

    if (this.state === 'idle') {
      if (now - this.stateStart >= C.IDLE_MS) this._setState(now, 'move');
    } else if (this.state === 'move') {
      this.x += C.SPEED * this.moveDir;
      const dist = this.x - this.baseX;
      if (dist > C.PATROL_RANGE || dist < -C.PATROL_RANGE) {
        this.x = this.baseX + C.PATROL_RANGE * Math.sign(dist);
        this.moveDir *= -1;
      }
      if (now - this.stateStart >= C.MOVE_MS) this._setState(now, 'idle');
    } else if (this.state === 'attack') {
      if (now - this.stateStart >= C.ATTACK_POSE_MS) {
        this.nextAttackAt = now + C.ATTACK_COOLDOWN_MS;
        this._setState(now, 'idle');
      }
    }

    if ((this.state === 'idle' || this.state === 'move') &&
        now >= this.nextAttackAt &&
        Math.abs(player.x - this.x) <= C.ATTACK_RANGE) {
      this.attackVariant = Math.random() < 0.5 ? 'attack1' : 'attack2';
      this._setState(now, 'attack');
    }
  },

  _updateDeath(now) {
    const C = CONFIG.TALP;
    const elapsed = now - this.stateStart;

    if (!this.deathFadeStart) {
      this.deathStage = Math.min(2, Math.floor(elapsed / C.DEATH_STAGE_MS));
      if (elapsed >= C.DEATH_STAGE_MS * 3) this.deathFadeStart = now;
      return;
    }

    const fadeElapsed = now - this.deathFadeStart;
    this.fadeAlpha = Math.max(0, 1 - fadeElapsed / C.DEATH_FADE_MS);
    if (this.fadeAlpha <= 0) {
      this.active = false;
      this.defeated = true;
    }
  },

  draw(ctx, now, cameraX) {
    if (this.state === 'dormant') return;
    if (!this.active && this.state !== 'death') return;

    const img = this._frameImg();
    if (!img || !img.complete || img.width === 0) return;

    const drawY = this.groundY + this._emergeOffset(now);
    const box = getBox(img, this.x - cameraX, drawY, this.height);

    ctx.save();
    if (this.state === 'death' && this.deathFadeStart) {
      ctx.globalAlpha = this.fadeAlpha;
    } else if (this.state === 'hurt') {
      // parpadeo breve al recibir el golpe, como Hero al ser invulnerable
      if (Math.floor((now - this.stateStart) / 60) % 2 === 0) ctx.globalAlpha = 0.55;
    }
    // el sprite mira de forma natural hacia la izquierda -> se voltea al mirar a la derecha
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

// Comprueba el contacto Hero <-> Talp y resuelve pisotón vs. golpe lateral
// (igual que checkBoarCollision). Solo hace daño mientras está en patrulla o
// atacando: no mientras emerge, hace el taunt, está aturdido o ya ha muerto.
function checkTalpCollision(now, player, groundY) {
  if (!Talp.active) return;
  if (!['idle', 'move', 'attack'].includes(Talp.state)) return;
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
  } else {
    const dir = player.x < Talp.x ? -1 : 1;
    player.hurt(now, dir);
  }
}

// Comprueba si el golpe de espada/puñetazo de Hero alcanza a Talp (igual que
// checkBoarSwordHit). Puede golpearse también durante su propio ademán de
// ataque, para poder castigar el windup.
function checkTalpSwordHit(now, player, groundY) {
  if (!Talp.active) return;
  if (!['idle', 'move', 'attack', 'hurt'].includes(Talp.state)) return;
  if (!player.attacking) return;

  const pBox = getBox(ASSETS.hero, player.x, groundY + player.jumpOffset, player.height);
  const reach = CONFIG.ATTACK.MELEE_REACH;
  const atkBox = player.facing === 'right'
    ? { x: pBox.x, y: pBox.y, w: pBox.w + reach, h: pBox.h }
    : { x: pBox.x - reach, y: pBox.y, w: pBox.w + reach, h: pBox.h };

  if (rectsOverlap(atkBox, Talp.getBox())) {
    Talp.takeHit(now);
  }
}
