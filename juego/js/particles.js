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
      const size = p.shrink ? p.size * lifeRatio : p.size;
      if (size <= 0) return;
      ctx.save();
      ctx.globalAlpha = p.fade ? lifeRatio : 1;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
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
