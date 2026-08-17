// Gusano(s): segundo enemigo del tramo de hierba (sustituye a la 2a
// hormiga). No disparan: patrullan de lado a lado y de vez en cuando dan un
// saltito (arco simple), y hacen daño por contacto igual que el jabalí. Se
// matan saltándoles encima o con la espada, igual que el resto. Worms.list
// guarda varias instancias con el mismo comportamiento (una por cada
// CONFIG.WORM.SPAWNS), colocadas lo bastante cerca entre sí como para poder
// solaparse. Van cada uno a su aire: dirección inicial alternada (para que
// no vayan todos al mismo lado a la vez) y una fase de tiempo distinta (para
// que no anden/salten todos sincronizados). "rest" es una única pose quieta;
// move/jump/death son ciclos reales de varios frames (ver ASSETS.worm),
// *_FRAME_MS es la duración de cada frame.
const Worms = {
  list: [],

  reset(now, groundY) {
    // Los frames sueltos del gusano (move/jump/death) están cada uno
    // recortado a su propio contenido (tamaños distintos entre sí, ver
    // getScaledBox en render.js), así que hace falta un factor de escala fijo
    // -calculado UNA vez a partir de la pose de reposo- para que el resto de
    // frames se dibujen a su tamaño relativo real en vez de forzarlos todos a
    // la misma altura (eso es justo lo que hacía que el gusano se viera
    // enorme en los frames más "achatados" de la animación de morir).
    const scale = CONFIG.WORM.HEIGHT / ASSETS.worm.rest.height;
    this.list = CONFIG.WORM.SPAWNS.map((x, i) => {
      const dir = i % 2 === 0 ? 1 : -1; // alterna: mientras uno va a la derecha, el siguiente va a la izquierda
      const restJitter = Math.random() * CONFIG.WORM.REST_MS; // ya llevan un rato "esperando" cuando arranca el tramo
      return {
        x,
        baseX: x,
        groundY,
        height: CONFIG.WORM.HEIGHT,
        scale,
        dir,
        state: 'rest',    // rest | move | hop | hurt | death
        stateStart: now - restJitter,
        hopStart: 0,
        nextHopAt: now + CONFIG.WORM.HOP_EVERY_MS * (0.4 + Math.random() * 0.8), // saltitos también desfasados
        hp: CONFIG.WORM.MAX_HP,
        hpBarVisible: false,
        lastSwordHitId: -Infinity,
        alive: true,
        active: true,
        deathAnimDone: false,
        fadeStart: 0,
        fadeAlpha: 1
      };
    });
  },

  update(now) {
    this.list.forEach((worm) => updateWorm(worm, now));
  },

  draw(ctx, now, cameraX) {
    this.list.forEach((worm) => drawWorm(ctx, worm, now, cameraX));
  }
};

function wormSetState(worm, now, state) {
  worm.state = state;
  worm.stateStart = now;
}

// amount = puntos de vida que quita este golpe (ver meleeDamage/stompDamage
// en combat.js). Si la deja a 0, entra en la secuencia de muerte de
// siempre; si no, solo baja la barra de vida.
function wormTakeHit(worm, now, amount) {
  if (!worm.alive || worm.state === 'death') return;
  if (!applyEnemyDamage(worm, amount)) return;
  wormSetState(worm, now, 'death');
  Pickups.spawnBraceletsAt(
    worm.x,
    worm.groundY - CONFIG.PICKUP.GROUND_OFFSET,
    CONFIG.WORM.BRACELET_REWARD
  );
}

// Frame actual según el estado: "move"/"hop" son ciclos en bucle o de una
// pasada indexados por tiempo (mismo patrón que Talp, ver talp.js
// _frameImg); "rest" no anima, es una única pose.
function wormFrameImg(worm, now) {
  const C = CONFIG.WORM;
  const elapsed = now - worm.stateStart;
  if (worm.state === 'death') {
    const set = ASSETS.worm.death;
    const idx = Math.min(set.length - 1, Math.floor(elapsed / C.DEATH_FRAME_MS));
    return set[idx];
  }
  if (worm.state === 'hop') {
    const set = ASSETS.worm.jump;
    const idx = Math.min(set.length - 1, Math.floor(elapsed / C.JUMP_FRAME_MS));
    return set[idx];
  }
  if (worm.state === 'move') {
    const set = ASSETS.worm.move;
    const idx = Math.floor(elapsed / C.MOVE_FRAME_MS) % set.length;
    return set[idx];
  }
  return ASSETS.worm.rest;
}

// Caja de colisión en coordenadas de MUNDO (sin restar cámara).
function getWormBox(worm, now) {
  const img = wormFrameImg(worm, now);
  return getScaledBox(img.width, img.height, worm.x, worm.groundY, worm.scale);
}

function updateWorm(worm, now) {
  if (!worm.active) return;
  const C = CONFIG.WORM;

  if (worm.state === 'death') {
    if (!worm.deathAnimDone) {
      const cycleMs = ASSETS.worm.death.length * C.DEATH_FRAME_MS;
      if (now - worm.stateStart >= cycleMs + C.DEATH_HOLD_MS) {
        worm.deathAnimDone = true;
        worm.fadeStart = now;
      }
    } else {
      const fadeElapsed = now - worm.fadeStart;
      worm.fadeAlpha = Math.max(0, 1 - fadeElapsed / C.DEATH_FADE_MS);
      if (worm.fadeAlpha <= 0) {
        worm.alive = false;
        worm.active = false;
      }
    }
    return;
  }

  if (worm.state === 'rest') {
    if (now - worm.stateStart >= C.REST_MS) wormSetState(worm, now, 'move');
    return;
  }

  // 'move' o 'hop': ambos avanzan igual, solo cambia la pose dibujada
  worm.x += C.SPEED * worm.dir;
  const dist = worm.x - worm.baseX;
  if (dist > C.PATROL_RANGE || dist < -C.PATROL_RANGE) {
    worm.x = worm.baseX + C.PATROL_RANGE * Math.sign(dist);
    worm.dir *= -1;
    wormSetState(worm, now, 'rest'); // pequeña pausa en cada extremo antes de volver
    worm.nextHopAt = now + C.HOP_EVERY_MS;
    return;
  }

  if (worm.state === 'move' && now >= worm.nextHopAt) {
    wormSetState(worm, now, 'hop');
    worm.hopStart = now;
  } else if (worm.state === 'hop' && now - worm.hopStart >= C.HOP_MS) {
    wormSetState(worm, now, 'move');
    worm.nextHopAt = now + C.HOP_EVERY_MS;
  }
}

function drawWorm(ctx, worm, now, cameraX) {
  if (!worm.active && !worm.alive) return;

  const img = wormFrameImg(worm, now);
  if (!img || !img.complete || img.width === 0) return;

  // durante el saltito se eleva siguiendo un arco simple (parábola), sin
  // tocar worm.x (que ya avanza igual que al andar)
  let hopOffset = 0;
  if (worm.state === 'hop') {
    const t = Math.min(1, (now - worm.hopStart) / CONFIG.WORM.HOP_MS);
    hopOffset = -Math.sin(t * Math.PI) * CONFIG.WORM.HOP_HEIGHT;
  }

  const box = getScaledBox(img.width, img.height, worm.x - cameraX, worm.groundY + hopOffset, worm.scale);

  ctx.save();
  if (worm.state === 'death' && worm.deathAnimDone) {
    ctx.globalAlpha = worm.fadeAlpha;
  }
  if (worm.dir < 0) {
    // el sprite mira de forma natural hacia la derecha -> se voltea al
    // andar hacia la izquierda (igual que el jabalí)
    const c = box.x + box.w / 2;
    ctx.translate(c, 0);
    ctx.scale(-1, 1);
    ctx.translate(-c, 0);
  }
  ctx.drawImage(img, box.x, box.y, box.w, box.h);
  ctx.restore();

  if (worm.hpBarVisible && worm.state !== 'death') {
    drawEnemyHealthBar(ctx, box.x + box.w / 2, box.y - CONFIG.ENEMY_HEALTH_BAR.OFFSET_Y, worm.hp / CONFIG.WORM.MAX_HP);
  }
}

// Comprueba el contacto Hero <-> gusanos y resuelve pisotón vs. golpe
// lateral (igual que checkBoarCollision).
function checkWormCollision(now, player, groundY) {
  if (player.isInvulnerable(now)) return;

  Worms.list.forEach((worm) => {
    if (!worm.active || !worm.alive || worm.state === 'death') return;

    const pBox = getBox(ASSETS.hero, player.x, groundY + player.jumpOffset, player.height);
    const wBox = getWormBox(worm, now);
    if (!rectsOverlap(pBox, wBox)) return;

    const stomping = player.vy > 0 && (pBox.y + pBox.h) < (wBox.y + wBox.h * 0.55);
    if (stomping) {
      wormTakeHit(worm, now, stompDamage());
      player.vy = CONFIG.STOMP_BOUNCE;
      player.jumpOffset = -1;
      player.grounded = false;
    } else {
      const dir = player.x < worm.x ? -1 : 1;
      player.hurt(now, dir);
    }
  });
}

// Comprueba si el ataque de Hero (con espada o sin ella) alcanza a algún
// gusano; lo mata igual que el pisotón (igual que checkBoarSwordHit/checkAntSwordHit).
function checkWormSwordHit(now, player, groundY) {
  if (!player.attacking) return;

  const pBox = getBox(ASSETS.hero, player.x, groundY + player.jumpOffset, player.height);
  const reach = CONFIG.ATTACK.MELEE_REACH;
  const atkBox = player.facing === 'right'
    ? { x: pBox.x, y: pBox.y, w: pBox.w + reach, h: pBox.h }
    : { x: pBox.x - reach, y: pBox.y, w: pBox.w + reach, h: pBox.h };

  Worms.list.forEach((worm) => {
    if (!worm.active || !worm.alive || worm.state === 'death') return;
    if (worm.lastSwordHitId === player.attackStart) return; // este tajo ya ha contado
    if (rectsOverlap(atkBox, getWormBox(worm, now))) {
      worm.lastSwordHitId = player.attackStart;
      wormTakeHit(worm, now, meleeDamage(player));
    }
  });
}
