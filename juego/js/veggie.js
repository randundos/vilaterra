// Enemigos-verdura: pequeño "gauntlet" de 6 mooks repartidos por el nivel 2
// parte 2, antes del pájaro (ver CONFIG.VEGGIE). Los 6 comparten exactamente
// el mismo comportamiento y solo cambia el sprite (una especie por
// instancia, ver CONFIG.VEGGIE.SPECIES/SPAWNS): duermen hasta que Hero se
// acerca (WAKE_DISTANCE), reproducen una vez la animación de aparición
// (spawn), y a partir de ahí patrullan cerca de su punto de partida (igual
// que el gusano) atacando por contacto cuerpo a cuerpo cuando Hero se pone a
// tiro (igual que Talp, pero mucho más flojos). Se matan de un solo golpe
// (pisotón o espada), igual que hormigas/gusano.
const Veggies = {
  list: [],

  reset(now, groundY) {
    const C = CONFIG.VEGGIE;
    this.list = C.SPAWNS.map((x, i) => {
      const species = C.SPECIES[i % C.SPECIES.length];
      // Factor de escala fijo (px de la sheet -> px de mundo), calculado UNA
      // vez a partir del frame de referencia (idle, primer frame = la pose
      // "de pie" de esa especie): así C.HEIGHT es la altura de esa pose
      // concreta, y el resto de frames (más anchos/achatados, como al morir)
      // se dibujan a su tamaño relativo real en vez de estirarse para
      // ocupar siempre la misma altura (ver getScaledBox en render.js).
      const refH = C.SHEETS[species].frames.idle[0][1];
      return {
        x,
        baseX: x,
        groundY,
        species,
        height: C.HEIGHT,
        scale: C.HEIGHT / refH,
        dir: 1,
        state: 'dormant', // dormant | spawn | idle | walk | attack | death
        stateStart: now,
        active: false,
        alive: true,
        nextAttackAt: 0,
        attackHit: false,
        deathAnimDone: false,
        fadeStart: 0,
        fadeAlpha: 1
      };
    });
  },

  update(now, player) {
    this.list.forEach((v) => updateVeggie(v, now, player));
  },

  draw(ctx, now, cameraX) {
    this.list.forEach((v) => drawVeggie(ctx, v, now, cameraX));
  }
};

function veggieSetState(v, now, state) {
  v.state = state;
  v.stateStart = now;
}

function veggieTakeHit(v, now) {
  if (!v.alive || v.state === 'death' || v.state === 'dormant') return;
  veggieSetState(v, now, 'death');
  Pickups.spawnHeartAt(v.x, v.groundY - CONFIG.PICKUP.GROUND_OFFSET, CONFIG.VEGGIE.HEART_HEAL);
}

// Fila de cada estado dentro de la sheet (ver CONFIG.VEGGIE.SHEETS): se
// generó con las 8 columnas/frame en este mismo orden.
const VEGGIE_STATE_ROW = { idle: 0, walk: 1, spawn: 2, attack: 3, death: 4 };
const VEGGIE_FRAMES_PER_STATE = 8;

// Frame actual según el estado: idle/walk son ciclos en bucle; spawn/attack/
// death son de una sola pasada (se quedan en el último frame al terminar).
// Devuelve el recorte dentro de la sheet compartida de la especie: { img,
// sx, sy, sw, sh } (sw/sh son el tamaño REAL de ese frame, no el de toda la
// sheet), o null si la sheet todavía no se ha cargado.
function veggieFrame(v, now) {
  const C = CONFIG.VEGGIE;
  const img = ASSETS.veggies[v.species];
  const sheet = C.SHEETS[v.species];
  if (!img || !img.complete || img.width === 0 || !sheet) return null;

  const state = (v.state === 'idle' || v.state === 'walk' || v.state === 'spawn' ||
    v.state === 'attack' || v.state === 'death') ? v.state : 'idle';
  const sizes = sheet.frames[state];
  const frameMs = {
    idle: C.IDLE_FRAME_MS, walk: C.WALK_FRAME_MS, spawn: C.SPAWN_FRAME_MS,
    attack: C.ATTACK_FRAME_MS, death: C.DEATH_FRAME_MS
  }[state];
  const elapsed = now - v.stateStart;

  let idx;
  if (state === 'idle' || state === 'walk') {
    idx = Math.floor(elapsed / frameMs) % sizes.length; // en bucle
  } else {
    idx = Math.min(sizes.length - 1, Math.floor(elapsed / frameMs)); // una sola pasada
  }

  const [sw, sh] = sizes[idx];
  const row = VEGGIE_STATE_ROW[state];
  const sx = idx * sheet.CELL_W;
  const sy = row * sheet.CELL_H;
  return { img, sx, sy, sw, sh };
}

// Caja de colisión en coordenadas de MUNDO (sin restar cámara).
function getVeggieBox(v, now) {
  const f = veggieFrame(v, now);
  if (!f) return { x: v.x, y: v.groundY - v.height, w: 0, h: v.height };
  return getScaledBox(f.sw, f.sh, v.x, v.groundY, v.scale);
}

function updateVeggie(v, now, player) {
  const C = CONFIG.VEGGIE;

  if (v.state === 'dormant') {
    if (Math.abs(player.x - v.baseX) <= C.WAKE_DISTANCE) {
      v.active = true;
      veggieSetState(v, now, 'spawn');
    }
    return;
  }
  if (!v.active) return;

  if (v.state === 'death') {
    if (!v.deathAnimDone) {
      const cycleMs = VEGGIE_FRAMES_PER_STATE * C.DEATH_FRAME_MS;
      if (now - v.stateStart >= cycleMs + C.DEATH_HOLD_MS) {
        v.deathAnimDone = true;
        v.fadeStart = now;
      }
    } else {
      const fadeElapsed = now - v.fadeStart;
      v.fadeAlpha = Math.max(0, 1 - fadeElapsed / C.DEATH_FADE_MS);
      if (v.fadeAlpha <= 0) {
        v.alive = false;
        v.active = false;
      }
    }
    return;
  }

  if (v.state === 'spawn') {
    const cycleMs = VEGGIE_FRAMES_PER_STATE * C.SPAWN_FRAME_MS;
    if (now - v.stateStart >= cycleMs) veggieSetState(v, now, 'idle');
    return;
  }

  const dist = player.x - v.x;

  if (v.state === 'attack') {
    const cycleMs = VEGGIE_FRAMES_PER_STATE * C.ATTACK_FRAME_MS;
    const elapsed = now - v.stateStart;
    if (!v.attackHit && elapsed >= cycleMs * C.ATTACK_HIT_FRACTION) {
      v.attackHit = true;
      if (Math.abs(dist) <= C.HIT_RANGE && !player.isInvulnerable(now)) {
        player.hurt(now, dist < 0 ? -1 : 1);
      }
    }
    if (elapsed >= cycleMs) {
      v.nextAttackAt = now + C.ATTACK_COOLDOWN_MS;
      veggieSetState(v, now, 'idle');
    }
    return;
  }

  // 'idle' o 'walk': si Hero está a tiro y el cooldown lo permite, ataca;
  // si no, patrulla igual que el gusano (anda hasta el borde de su rango,
  // pausa, y vuelve).
  if (Math.abs(dist) <= C.ATTACK_RANGE && now >= v.nextAttackAt) {
    v.dir = dist < 0 ? -1 : 1;
    v.attackHit = false;
    veggieSetState(v, now, 'attack');
    return;
  }

  if (v.state === 'idle') {
    if (now - v.stateStart >= C.REST_MS) veggieSetState(v, now, 'walk');
    return;
  }

  // 'walk'
  v.x += C.SPEED * v.dir;
  const off = v.x - v.baseX;
  if (off > C.PATROL_RANGE || off < -C.PATROL_RANGE) {
    v.x = v.baseX + C.PATROL_RANGE * Math.sign(off);
    v.dir *= -1;
    veggieSetState(v, now, 'idle');
  }
}

function drawVeggie(ctx, v, now, cameraX) {
  if (v.state === 'dormant') return;
  if (!v.active && !v.alive) return;

  const f = veggieFrame(v, now);
  if (!f) return;

  const box = getScaledBox(f.sw, f.sh, v.x - cameraX, v.groundY, v.scale);

  ctx.save();
  if (v.state === 'death' && v.deathAnimDone) {
    ctx.globalAlpha = v.fadeAlpha;
  }
  if (v.dir < 0) {
    // los sprites miran de forma natural hacia la derecha, igual que el
    // resto de enemigos (jabalí/hormiga/gusano) -> se voltean hacia la izquierda
    const c = box.x + box.w / 2;
    ctx.translate(c, 0);
    ctx.scale(-1, 1);
    ctx.translate(-c, 0);
  }
  ctx.drawImage(f.img, f.sx, f.sy, f.sw, f.sh, box.x, box.y, box.w, box.h);
  ctx.restore();
}

// Comprueba el contacto Hero <-> verduras y resuelve pisotón vs. golpe
// lateral (igual que checkWormCollision).
function checkVeggieCollision(now, player, groundY) {
  if (player.isInvulnerable(now)) return;

  Veggies.list.forEach((v) => {
    if (!v.active || !v.alive || v.state === 'death' || v.state === 'spawn') return;

    const pBox = getBox(ASSETS.hero, player.x, groundY + player.jumpOffset, player.height);
    const vBox = getVeggieBox(v, now);
    if (!rectsOverlap(pBox, vBox)) return;

    const stomping = player.vy > 0 && (pBox.y + pBox.h) < (vBox.y + vBox.h * 0.55);
    if (stomping) {
      veggieTakeHit(v, now);
      player.vy = CONFIG.STOMP_BOUNCE;
      player.jumpOffset = -1;
      player.grounded = false;
    } else {
      const dir = player.x < v.x ? -1 : 1;
      player.hurt(now, dir);
    }
  });
}

// Comprueba si el ataque de Hero (con espada o sin ella) alcanza a alguna
// verdura; la mata igual que el pisotón (igual que checkWormSwordHit).
function checkVeggieSwordHit(now, player, groundY) {
  if (!player.attacking) return;

  const pBox = getBox(ASSETS.hero, player.x, groundY + player.jumpOffset, player.height);
  const reach = CONFIG.ATTACK.MELEE_REACH;
  const atkBox = player.facing === 'right'
    ? { x: pBox.x, y: pBox.y, w: pBox.w + reach, h: pBox.h }
    : { x: pBox.x - reach, y: pBox.y, w: pBox.w + reach, h: pBox.h };

  Veggies.list.forEach((v) => {
    if (!v.active || !v.alive || v.state === 'death' || v.state === 'spawn') return;
    if (rectsOverlap(atkBox, getVeggieBox(v, now))) veggieTakeHit(v, now);
  });
}
