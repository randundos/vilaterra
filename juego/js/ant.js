// Hormigas con rifle: enemigos a distancia del tramo de hierba (nivel 2). Se
// quedan fijas en su sitio y disparan una bala a intervalos regulares hacia
// el Hero; hay que esquivarlas saltando hasta acercarse y rematarlas con un
// golpe de espada (Player.attacking, clic izquierdo) o saltándoles encima,
// igual que al jabalí. Ants.list guarda varias instancias con el mismo
// comportamiento (una por cada CONFIG.ANT.SPAWNS); la de índice ELITE_INDEX
// es una versión "veterana" que dispara más rápido y se dibuja teñida de
// rojo, para variar la dificultad hacia el final del tramo sin necesitar
// arte nuevo.
const Ants = {
  list: [],

  reset(now, groundY) {
    this.list = CONFIG.ANT.SPAWNS.map((x, i) => ({
      x,
      height: CONFIG.ANT.HEIGHT,
      groundY,
      active: true,
      state: 'alive', // alive | hit | dead
      hitAt: 0,
      fireNext: Infinity,
      hasAppeared: false, // true en cuanto entra en pantalla por primera vez: hasta entonces no dispara
      bullets: [],
      elite: i === CONFIG.ANT.ELITE_INDEX,
      _box: null
    }));
  },

  update(now, player, groundY, cameraX) {
    this.list.forEach((ant) => updateAnt(ant, now, player, groundY, cameraX));
  },

  draw(ctx, now, cameraX) {
    this.list.forEach((ant) => drawAnt(ctx, ant, now, cameraX));
  }
};

// Caja de colisión en coordenadas de MUNDO (sin restar cámara).
function getAntBox(ant) {
  return getBox(ASSETS.ant, ant.x, ant.groundY, ant.height);
}

function antHit(ant, now) {
  if (ant.state !== 'alive') return;
  ant.state = 'hit';
  ant.hitAt = now;
}

function antFire(ant, now) {
  const box = getAntBox(ant); // caja en coordenadas de MUNDO
  // el sprite mira de forma natural hacia la derecha, pero en pantalla
  // siempre se dibuja volteado (dispara hacia la izquierda) -> la punta
  // real del rifle queda en (1 - TIP_X_FRACTION), no en TIP_X_FRACTION
  const tipX = box.x + box.w * (1 - CONFIG.ANT.TIP_X_FRACTION);
  const tipY = box.y + box.h * CONFIG.ANT.TIP_Y_FRACTION;
  ant.bullets.push({ x: tipX, y: tipY, vx: -CONFIG.ANT.BULLET_SPEED, spawnAt: now });
}

function updateAnt(ant, now, player, groundY, cameraX) {
  if (!ant.active) return;

  const fireInterval = ant.elite
    ? CONFIG.ANT.FIRE_INTERVAL_MS * CONFIG.ANT.ELITE_FIRE_FACTOR
    : CONFIG.ANT.FIRE_INTERVAL_MS;

  // no dispara hasta que aparece por primera vez dentro de la pantalla
  if (!ant.hasAppeared && ant.state === 'alive') {
    const box = getAntBox(ant); // coordenadas de MUNDO
    const screenX = box.x - cameraX;
    if (screenX + box.w > 0 && screenX < CONFIG.CANVAS_W) {
      ant.hasAppeared = true;
      ant.fireNext = now + fireInterval;
    }
  }

  if (ant.state === 'alive') {
    if (ant.hasAppeared && now >= ant.fireNext) {
      antFire(ant, now);
      ant.fireNext = now + fireInterval;
    }
  } else if (ant.state === 'hit') {
    if (now - ant.hitAt >= CONFIG.ANT.HIT_FADE_MS) {
      ant.state = 'dead';
      ant.active = false;
      ant.bullets = []; // las balas que quedaran en el aire desaparecen con ella
      // suelta pulseras donde ha caído; el Hero las recoge al pasar por
      // encima (mismo sistema que las del jabalí, ver pickups.js)
      Pickups.spawnBraceletsAt(ant.x, ant.groundY - CONFIG.PICKUP.GROUND_OFFSET, CONFIG.ANT.BRACELET_REWARD);
    }
  }

  // balas: avanzan en línea recta y comprueban contacto con el Hero
  ant.bullets = ant.bullets.filter((b) => {
    b.x += b.vx;
    if (now - b.spawnAt >= CONFIG.ANT.BULLET_LIFETIME_MS) return false;

    if (!player.isInvulnerable(now)) {
      const pBox = getBox(ASSETS.hero, player.x, groundY + player.jumpOffset, player.height);
      const hit = b.x >= pBox.x && b.x <= pBox.x + pBox.w && b.y >= pBox.y && b.y <= pBox.y + pBox.h;
      if (hit) {
        const dir = player.x < ant.x ? -1 : 1;
        player.hurt(now, dir);
        return false; // la bala desaparece al impactar
      }
    }
    return true;
  });
}

function drawAnt(ctx, ant, now, cameraX) {
  if (!ant.active && ant.state !== 'hit') return;

  const box = getBox(ASSETS.ant, ant.x - cameraX, ant.groundY, ant.height);
  ant._box = box;

  ctx.save();
  if (ant.state === 'hit') {
    const t = Math.min(1, (now - ant.hitAt) / CONFIG.ANT.HIT_FADE_MS);
    ctx.globalAlpha = 1 - t;
  }
  // igual que el jabalí: el sprite mira de forma natural hacia la derecha,
  // así que se voltea siempre (aquí solo dispara hacia la izquierda)
  const c = box.x + box.w / 2;
  ctx.translate(c, 0);
  ctx.scale(-1, 1);
  ctx.translate(-c, 0);
  ctx.drawImage(ASSETS.ant, box.x, box.y, box.w, box.h);
  if (ant.elite) {
    // teñido rojizo (placeholder) para distinguir a la veterana a simple vista
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = CONFIG.ANT.ELITE_TINT;
    ctx.fillRect(box.x, box.y, box.w, box.h);
  }
  ctx.restore();

  ant.bullets.forEach((b) => drawBullet(ctx, b, cameraX));
}

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

// Comprueba si el golpe de espada del Hero (Player.attacking) alcanza a
// alguna hormiga viva. El "filo" se extiende un poco más allá de la caja del
// Hero, hacia el lado al que mira, para que no haga falta pisarla literalmente.
function checkAntSwordHit(now, player, groundY) {
  if (!player.attacking) return;

  const pBox = getBox(ASSETS.hero, player.x, groundY + player.jumpOffset, player.height);
  const reach = CONFIG.ATTACK.MELEE_REACH;
  const atkBox = player.facing === 'right'
    ? { x: pBox.x, y: pBox.y, w: pBox.w + reach, h: pBox.h }
    : { x: pBox.x - reach, y: pBox.y, w: pBox.w + reach, h: pBox.h };

  Ants.list.forEach((ant) => {
    if (!ant.active || ant.state !== 'alive') return;
    if (rectsOverlap(atkBox, getAntBox(ant))) antHit(ant, now);
  });
}

// También se puede matar saltándole encima, igual que al jabalí (estilo
// Mario): si el Hero cae sobre ella desde arriba, muere y da un pequeño
// rebote; si el contacto es lateral, no pasa nada (así se puede acercar sin
// miedo para rematarla con la espada).
function checkAntStomp(now, player, groundY) {
  const pBox = getBox(ASSETS.hero, player.x, groundY + player.jumpOffset, player.height);

  Ants.list.forEach((ant) => {
    if (!ant.active || ant.state !== 'alive') return;
    const aBox = getAntBox(ant);
    if (!rectsOverlap(pBox, aBox)) return;

    const stomping = player.vy > 0 && (pBox.y + pBox.h) < (aBox.y + aBox.h * 0.55);
    if (stomping) {
      antHit(ant, now);
      player.vy = CONFIG.STOMP_BOUNCE;
      player.jumpOffset = -1;
      player.grounded = false;
    }
  });
}
