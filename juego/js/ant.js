// Hormiga con rifle: primer enemigo del tramo de hierba (nivel 2). Se queda
// fija en su sitio y dispara una bala cada CONFIG.ANT.FIRE_INTERVAL_MS hacia
// el Hero; hay que esquivarlas saltando hasta acercarse y rematarla con un
// golpe de espada (Player.attacking, clic izquierdo).
const Ant = {
  x: 0,
  height: CONFIG.ANT.HEIGHT,
  groundY: 0,
  active: false,
  state: 'alive', // alive | hit | dead
  hitAt: 0,
  fireNext: Infinity,
  hasAppeared: false, // true en cuanto entra en pantalla por primera vez: hasta entonces no dispara
  bullets: [],
  _box: null,

  reset(now, groundY) {
    this.x = CONFIG.ANT.SPAWN_X;
    this.groundY = groundY;
    this.active = true;
    this.state = 'alive';
    this.bullets = [];
    this.hasAppeared = false;
    this.fireNext = Infinity; // no dispara hasta que se la ve por primera vez (ver update)
  },

  // Caja de colisión en coordenadas de MUNDO (sin restar cámara).
  getBox() {
    return getBox(ASSETS.ant, this.x, this.groundY, this.height);
  },

  hit(now) {
    if (this.state !== 'alive') return;
    this.state = 'hit';
    this.hitAt = now;
  },

  fire(now) {
    const box = this.getBox(); // caja en coordenadas de MUNDO
    // el sprite mira de forma natural hacia la derecha, pero en pantalla
    // siempre se dibuja volteado (dispara hacia la izquierda) -> la punta
    // real del rifle queda en (1 - TIP_X_FRACTION), no en TIP_X_FRACTION
    const tipX = box.x + box.w * (1 - CONFIG.ANT.TIP_X_FRACTION);
    const tipY = box.y + box.h * CONFIG.ANT.TIP_Y_FRACTION;
    this.bullets.push({ x: tipX, y: tipY, vx: -CONFIG.ANT.BULLET_SPEED, spawnAt: now });
  },

  update(now, player, groundY, cameraX) {
    if (!this.active) return;

    // no dispara hasta que aparece por primera vez dentro de la pantalla
    if (!this.hasAppeared && this.state === 'alive') {
      const box = this.getBox(); // coordenadas de MUNDO
      const screenX = box.x - cameraX;
      if (screenX + box.w > 0 && screenX < CONFIG.CANVAS_W) {
        this.hasAppeared = true;
        this.fireNext = now + CONFIG.ANT.FIRE_INTERVAL_MS;
      }
    }

    if (this.state === 'alive') {
      if (this.hasAppeared && now >= this.fireNext) {
        this.fire(now);
        this.fireNext = now + CONFIG.ANT.FIRE_INTERVAL_MS;
      }
    } else if (this.state === 'hit') {
      if (now - this.hitAt >= CONFIG.ANT.HIT_FADE_MS) {
        this.state = 'dead';
        this.active = false;
        this.bullets = []; // las balas que quedaran en el aire desaparecen con ella
        // suelta pulseras donde ha caído; el Hero las recoge al pasar por
        // encima (mismo sistema que las del jabalí, ver pickups.js)
        Pickups.spawnBraceletsAt(this.x, this.groundY - CONFIG.PICKUP.GROUND_OFFSET, CONFIG.ANT.BRACELET_REWARD);
      }
    }

    // balas: avanzan en línea recta y comprueban contacto con el Hero
    this.bullets = this.bullets.filter((b) => {
      b.x += b.vx;
      if (now - b.spawnAt >= CONFIG.ANT.BULLET_LIFETIME_MS) return false;

      if (!player.isInvulnerable(now)) {
        const pBox = getBox(ASSETS.hero, player.x, groundY + player.jumpOffset, player.height);
        const hit = b.x >= pBox.x && b.x <= pBox.x + pBox.w && b.y >= pBox.y && b.y <= pBox.y + pBox.h;
        if (hit) {
          const dir = player.x < this.x ? -1 : 1;
          player.hurt(now, dir);
          return false; // la bala desaparece al impactar
        }
      }
      return true;
    });
  },

  draw(ctx, now, cameraX) {
    if (!this.active && this.state !== 'hit') return;

    const box = getBox(ASSETS.ant, this.x - cameraX, this.groundY, this.height);
    this._box = box;

    ctx.save();
    if (this.state === 'hit') {
      const t = Math.min(1, (now - this.hitAt) / CONFIG.ANT.HIT_FADE_MS);
      ctx.globalAlpha = 1 - t;
    }
    // igual que el jabalí: el sprite mira de forma natural hacia la derecha,
    // así que se voltea siempre (aquí solo dispara hacia la izquierda)
    const c = box.x + box.w / 2;
    ctx.translate(c, 0);
    ctx.scale(-1, 1);
    ctx.translate(-c, 0);
    ctx.drawImage(ASSETS.ant, box.x, box.y, box.w, box.h);
    ctx.restore();

    this.bullets.forEach((b) => drawBullet(ctx, b, cameraX));
  }
};

// Bala: una bolita brillante con una pequeña estela hacia atrás (de donde
// viene) para dar sensación de velocidad.
function drawBullet(ctx, b, cameraX) {
  const sx = b.x - cameraX;
  const sy = b.y;
  const r = CONFIG.ANT.BULLET_RADIUS;

  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#ff9d2e';
  ctx.beginPath();
  ctx.ellipse(sx + 9, sy, 9, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.shadowColor = 'rgba(255,200,60,0.9)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#ffcf4d';
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Comprueba si el golpe de espada del Hero (Player.attacking) alcanza a la
// hormiga. El "filo" se extiende un poco más allá de la caja del Hero, hacia
// el lado al que mira, para que no haga falta pisarla literalmente.
function checkAntSwordHit(now, player, groundY) {
  if (!Ant.active || Ant.state !== 'alive') return;
  if (!player.attacking) return;

  const pBox = getBox(ASSETS.hero, player.x, groundY + player.jumpOffset, player.height);
  const reach = CONFIG.ATTACK.MELEE_REACH;
  const atkBox = player.facing === 'right'
    ? { x: pBox.x, y: pBox.y, w: pBox.w + reach, h: pBox.h }
    : { x: pBox.x - reach, y: pBox.y, w: pBox.w + reach, h: pBox.h };

  if (rectsOverlap(atkBox, Ant.getBox())) Ant.hit(now);
}

// También se puede matar saltándole encima, igual que al jabalí (estilo
// Mario): si el Hero cae sobre ella desde arriba, muere y da un pequeño
// rebote; si el contacto es lateral, no pasa nada (así se puede acercar sin
// miedo para rematarla con la espada).
function checkAntStomp(now, player, groundY) {
  if (!Ant.active || Ant.state !== 'alive') return;

  const pBox = getBox(ASSETS.hero, player.x, groundY + player.jumpOffset, player.height);
  const aBox = Ant.getBox();
  if (!rectsOverlap(pBox, aBox)) return;

  const stomping = player.vy > 0 && (pBox.y + pBox.h) < (aBox.y + aBox.h * 0.55);
  if (stomping) {
    Ant.hit(now);
    player.vy = CONFIG.STOMP_BOUNCE;
    player.jumpOffset = -1;
    player.grounded = false;
  }
}
