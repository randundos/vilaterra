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
