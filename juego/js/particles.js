// Sistema de partículas genérico (estela del meteorito, chispas de la explosión,
// humo...). Cualquier escena puede usar Particles.spawn(...) sin más.
const Particles = {
  list: [],

  spawn(opts) {
    this.list.push(Object.assign({
      age: 0,
      gravity: 0,
      fade: true,
      shrink: false
    }, opts));
  },

  update(dtMs) {
    const dt = dtMs / 16.7; // normaliza a "frames" de referencia (60fps)
    this.list.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.gravity || 0) * dt;
      p.age += dtMs;
    });
    this.list = this.list.filter((p) => p.age < p.life);
  },

  draw(ctx) {
    this.list.forEach((p) => {
      const lifeRatio = Math.max(0, 1 - p.age / p.life);
      // p.fadeIn: en vez de apagarse con el tiempo, aparece progresivamente
      // (ver spawnMaterialize, usado para que Mac "se forme" en escena).
      const alpha = p.fadeIn ? Math.min(1, p.age / (p.fadeInMs || p.life)) : (p.fade ? lifeRatio : 1);
      if (alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      if (p.img) {
        // "astilla" de sprite: un recorte vertical del propio personaje (ver
        // spawnDissolve/spawnMaterialize), en vez de una simple chispa de color.
        const w = p.shrink ? p.w * lifeRatio : p.w;
        const h = p.shrink ? p.h * lifeRatio : p.h;
        if (w > 0.5 && h > 0.5) {
          ctx.drawImage(p.img, p.sx, p.sy, p.sw, p.sh, p.x, p.y, w, h);
        }
      } else {
        const size = p.shrink ? p.size * lifeRatio : p.size;
        if (size > 0) {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    });
  },

  clear() {
    this.list = [];
  }
};

// Chispazo de impacto: partículas de fuego + humo que se queda flotando.
function spawnExplosion(x, y) {
  for (let i = 0; i < 26; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;
    Particles.spawn({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 400 + Math.random() * 300,
      color: Math.random() < 0.5 ? '#ffb347' : '#ff5b3d',
      size: 3 + Math.random() * 4,
      gravity: 0.08,
      shrink: true
    });
  }
  for (let i = 0; i < 14; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.4 + Math.random() * 1.4;
    Particles.spawn({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.6,
      life: 900 + Math.random() * 500,
      color: 'rgba(90,90,90,0.55)',
      size: 6 + Math.random() * 6,
      gravity: -0.01,
      shrink: false
    });
  }
}

// Gota de agua de la manguera de Mac Arrons: sale de (x,y) volando hacia
// (targetX,targetY) con algo de dispersión y gravedad, para la escena en la
// que rocía a Hero y este se va encogiendo.
function spawnWaterDroplet(x, y, targetX, targetY, speed) {
  const dx = targetX - x;
  const dy = targetY - y;
  const dist = Math.hypot(dx, dy) || 1;
  const spread = (Math.random() - 0.5) * 0.35;
  const nx = (dx / dist) * Math.cos(spread) - (dy / dist) * Math.sin(spread);
  const ny = (dx / dist) * Math.sin(spread) + (dy / dist) * Math.cos(spread);
  const v = speed * (0.85 + Math.random() * 0.3);
  Particles.spawn({
    x, y,
    vx: nx * v,
    vy: ny * v,
    life: (dist / v) * 16.7 + 150,
    color: Math.random() < 0.5 ? '#2ec4f1' : '#ffffff',
    size: 4.5 + Math.random() * 4,
    gravity: 0.12,
    // ni se encoge ni se apaga durante el vuelo (solo al final, de golpe):
    // así se ve bien todo el trayecto hasta llegar a Hero, no solo al salir
    // de la boquilla.
    shrink: false,
    fade: false
  });
}

// Chapoteo al caer algo al agua (ver PoolScene, apertura del nivel 3):
// gotas que saltan hacia arriba/lados y un par de ondas planas que se
// expanden sobre la superficie.
function spawnSplash(x, y) {
  for (let i = 0; i < 16; i++) {
    const angle = Math.PI + Math.random() * Math.PI; // hacia arriba, en abanico
    const speed = 1.5 + Math.random() * 3.5;
    Particles.spawn({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 350 + Math.random() * 300,
      color: Math.random() < 0.5 ? '#dff6fb' : '#8fd9ec',
      size: 2.5 + Math.random() * 3,
      gravity: 0.18,
      shrink: true
    });
  }
  for (let i = 0; i < 3; i++) {
    Particles.spawn({
      x, y,
      vx: 0, vy: 0,
      life: 450 + i * 120,
      color: 'rgba(255,255,255,0.5)',
      size: 6 + i * 5,
      gravity: 0,
      shrink: false,
      fade: true
    });
  }
}

// Chispas mágicas de teletransporte (ver PoolScene, aparición/desaparición
// de Mac Arrons y salida final de Hero+Mac): un anillo de chispas
// morado/dorado que sale disparado hacia fuera, a juego con el sombrero de
// mag de Mac.
function spawnTeleport(x, y) {
  for (let i = 0; i < 22; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 4;
    Particles.spawn({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 350 + Math.random() * 350,
      color: Math.random() < 0.5 ? '#b98bf0' : '#ffd447',
      size: 2.5 + Math.random() * 3.5,
      gravity: 0,
      shrink: true
    });
  }
}

// Desintegración en tiras verticales (ver referencia "teleport example.gif"
// aportada por el usuario: el personaje se rompe en columnas finas de su
// propia silueta, que salen disparadas hacia arriba a distinta velocidad
// mientras se desvanecen y encogen, en vez de simples chispas de color).
// img/x/y/w/h son la imagen y la caja en pantalla donde estaba dibujado el
// personaje justo antes de desaparecer (ver PoolScene).
function spawnDissolve(img, x, y, w, h) {
  if (!img || !img.complete || !img.width) return;
  const strips = 12;
  const stripW = w / strips;
  const srcStripW = img.width / strips;
  for (let i = 0; i < strips; i++) {
    Particles.spawn({
      img,
      sx: i * srcStripW, sy: 0, sw: srcStripW, sh: img.height,
      x: x + i * stripW, y, w: stripW, h,
      vx: (Math.random() - 0.5) * 0.7,
      vy: -(1.3 + Math.random() * 2.6),
      gravity: -0.01,
      life: 380 + Math.random() * 260,
      fade: true,
      shrink: true
    });
  }
}

// El efecto inverso: tiras del sprite que "caen" un poco desde arriba y se
// desvanecen sobre la posición final, como si el personaje se formara a
// partir de fragmentos oscuros (a juego con spawnDissolve; se usa junto con
// un "pop" de escala del propio sprite real, ver macAppearAt en PoolScene).
function spawnMaterialize(img, x, y, w, h) {
  if (!img || !img.complete || !img.width) return;
  const strips = 12;
  const stripW = w / strips;
  const srcStripW = img.width / strips;
  for (let i = 0; i < strips; i++) {
    const drop = 18 + Math.random() * 24;
    Particles.spawn({
      img,
      sx: i * srcStripW, sy: 0, sw: srcStripW, sh: img.height,
      x: x + i * stripW, y: y - drop, w: stripW, h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: drop / 16,
      gravity: 0,
      life: 260 + Math.random() * 180,
      fade: true,
      shrink: false
    });
  }
}

// Una chispa suelta de la estela de fuego del meteorito al caer.
function spawnTrailParticle(x, y) {
  Particles.spawn({
    x: x + (Math.random() - 0.5) * 6,
    y: y + (Math.random() - 0.5) * 6,
    vx: (Math.random() - 0.5) * 0.5,
    vy: 0.3 + Math.random() * 0.5,
    life: 300 + Math.random() * 200,
    color: Math.random() < 0.5 ? '#ffcf6b' : '#ff7b3d',
    size: 4 + Math.random() * 3,
    gravity: 0,
    shrink: true
  });
}
