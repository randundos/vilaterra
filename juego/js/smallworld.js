// Tramo "Hero pequeño" (tras la escena de la manguera de Mac): un tallo de
// hierba que hay que golpear con el ataque (clic izquierdo, con espada o sin
// ella); al golpearlo desaparece y cae la espada, que Hero recoge al pasar
// por encima.
//
// De momento el tallo se dibuja con formas simples (placeholder) porque aún
// no tenemos un sprite real para él - en cuanto llegue, solo hay que
// sustituir GrassBlade.draw().
const GrassBlade = {
  x: CONFIG.SMALL_WORLD.GRASS_BLADE_X,
  height: CONFIG.SMALL_WORLD.GRASS_BLADE_HEIGHT,
  width: 22,
  state: 'idle', // idle | hit | gone
  hitAt: 0,

  reset() {
    this.state = 'idle';
    this.hitAt = 0;
  },

  // Caja de colisión en coordenadas de MUNDO.
  getBox(groundY) {
    return { x: this.x - this.width / 2, y: groundY - this.height, w: this.width, h: this.height };
  },

  hit(now) {
    if (this.state !== 'idle') return;
    this.state = 'hit';
    this.hitAt = now;
  },

  update(now) {
    if (this.state === 'hit' && now - this.hitAt >= CONFIG.SMALL_WORLD.HIT_FADE_MS) {
      this.state = 'gone';
      SwordPickup.spawn(now, this.x);
    }
  },

  draw(ctx, now, groundY, cameraX) {
    if (this.state === 'gone') return;
    const box = this.getBox(groundY);
    const baseX = box.x - cameraX + box.w / 2;
    const baseY = box.y + box.h;
    // balanceo suave y constante (no solo al golpearlo) para que llame la
    // atención sobre el resto de la hierba del fondo
    const sway = Math.sin(now * 0.0022) * 16;

    ctx.save();
    let shakeX = 0;
    if (this.state === 'hit') {
      const t = Math.min(1, (now - this.hitAt) / CONFIG.SMALL_WORLD.HIT_FADE_MS);
      ctx.globalAlpha = 1 - t;
      shakeX = Math.sin(now * 0.09) * 4 * (1 - t);
    }
    ctx.translate(shakeX, 0);

    const tipX = baseX + sway;
    const tipY = box.y;
    const midX = baseX + sway * 0.45;
    const midY = box.y + box.h * 0.45;

    // resplandor para que destaque sobre el fondo cargado de hierba
    ctx.shadowColor = 'rgba(180, 255, 120, 0.85)';
    ctx.shadowBlur = 18;

    // cuerpo grueso del tallo
    ctx.strokeStyle = '#3f8f22';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.stroke();

    // brillo central más claro y fino, encima del cuerpo
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#a7ec6b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY - 6);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY + 4);
    ctx.stroke();

    ctx.restore();
  }
};

// Plataformas flotantes del tramo de hierba: unas cuantas sirven para cruzar
// la gran travesía (CONFIG.SMALL_WORLD.PITS[0], sin ellas no hay forma de
// llegar al otro lado) y otra es una plataforma "bonus" con pulseras encima,
// con suelo normal debajo, solo para quien se anime a subir. La física real
// (aterrizar encima, caerse por los lados) la resuelve Player.update() a
// partir de Player.platforms (ver player.js); esto solo dibuja. De momento,
// como con el tallo de hierba, van con formas simples (placeholder).
const Platforms = {
  list: [],

  reset() {
    this.list = CONFIG.SMALL_WORLD.PLATFORMS.map((p) => ({ ...p }));
  },

  draw(ctx, groundY, cameraX) {
    this.list.forEach((p) => drawPlatform(ctx, p, groundY, cameraX));
  }
};

function drawPlatform(ctx, p, groundY, cameraX) {
  const screenX = p.x - cameraX;
  if (screenX + p.width < -20 || screenX > CONFIG.CANVAS_W + 20) return;

  const topY = groundY + p.top;
  const thickness = 22;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;

  const grad = ctx.createLinearGradient(0, topY, 0, topY + thickness);
  grad.addColorStop(0, '#8a6a45');
  grad.addColorStop(1, '#5c4529');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(screenX, topY, p.width, thickness, 6);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // borde de hierba encima, para que encaje con el estilo del tramo
  ctx.fillStyle = '#5fae32';
  ctx.fillRect(screenX, topY - 4, p.width, 8);
  ctx.fillStyle = '#8de35a';
  for (let i = 4; i < p.width - 4; i += 10) {
    const bladeH = 6 + (i % 3) * 3;
    ctx.fillRect(screenX + i, topY - 4 - bladeH + 4, 3, bladeH);
  }
  ctx.restore();
}

const SwordPickup = {
  active: false,
  collected: false,
  x: 0,
  fallStart: 0,
  landed: false,

  spawn(now, x) {
    this.active = true;
    this.collected = false;
    this.landed = false;
    this.x = x;
    this.fallStart = now;
  },

  update(now, player, groundY) {
    if (!this.active) return;

    if (!this.landed) {
      const t = (now - this.fallStart) / CONFIG.SMALL_WORLD.SWORD_FALL_MS;
      if (t >= 1) this.landed = true;
      return;
    }

    if (Math.abs(player.x - this.x) <= CONFIG.SMALL_WORLD.SWORD_COLLECT_RADIUS) {
      this.active = false;
      this.collected = true;
      player.hasSword = true;
      ItemPopup.show(
        now,
        ASSETS.sword,
        "Has trobat una espasa dins d'un bri d'herba. Fes-la servir per acabar amb els que et volen parar els peus"
      );
    }
  },

  draw(ctx, now, groundY, cameraX) {
    if (!this.active) return;
    const img = ASSETS.sword;
    if (!img.complete || img.width === 0) return;

    const sx = this.x - cameraX;
    const fallT = this.landed ? 1 : Math.min(1, (now - this.fallStart) / CONFIG.SMALL_WORLD.SWORD_FALL_MS);
    const eased = 1 - Math.pow(1 - fallT, 2);
    const sy = groundY - 10 * eased; // baja hasta posarse justo sobre el suelo

    const h = CONFIG.SMALL_WORLD.SWORD_PICKUP_HEIGHT;
    const w = h * (img.width / img.height);
    const G = CONFIG.HERO_SWORD.GRIP_FRACTION;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(-0.5 + eased * 0.5); // gira mientras cae hasta quedar apoyada
    ctx.drawImage(img, -w * G.x, -h * G.y, w, h);
    ctx.restore();
  }
};

// Mientras el tallo siga en pie, actúa como un muro sólido: no se puede
// atravesar hasta que se le golpea con el ataque (clic izquierdo).
function blockGrassBlade(player) {
  if (GrassBlade.state !== 'idle') return;
  const halfW = GrassBlade.width / 2 + 14;
  if (player.x < GrassBlade.x) {
    player.x = Math.min(player.x, GrassBlade.x - halfW);
  } else {
    player.x = Math.max(player.x, GrassBlade.x + halfW);
  }
}

// Comprueba si el golpe de Hero (con espada o sin ella, Player.attacking)
// alcanza al tallo de hierba. El "filo" se extiende un poco más allá de la
// caja del Hero, hacia el lado al que mira (igual que con la hormiga),
// porque blockGrassBlade no deja que su cuerpo llegue a solaparse del todo.
function checkGrassBladeHit(now, player, groundY) {
  if (GrassBlade.state !== 'idle') return;
  if (!player.attacking) return;

  const pBox = getBox(ASSETS.hero, player.x, groundY + player.jumpOffset, player.height);
  const reach = CONFIG.ATTACK.MELEE_REACH;
  const atkBox = player.facing === 'right'
    ? { x: pBox.x, y: pBox.y, w: pBox.w + reach, h: pBox.h }
    : { x: pBox.x - reach, y: pBox.y, w: pBox.w + reach, h: pBox.h };

  const bBox = GrassBlade.getBox(groundY);
  const overlap = atkBox.x < bBox.x + bBox.w && atkBox.x + atkBox.w > bBox.x &&
                  atkBox.y < bBox.y + bBox.h && atkBox.y + atkBox.h > bBox.y;
  if (overlap) GrassBlade.hit(now);
}
