// El meteorito de la cinemática inicial: cae en línea recta hacia el punto de
// impacto, girando sobre sí mismo y dejando una estela de chispas.
const Meteor = {
  x: 0,
  y: 0,
  active: false,
  landed: false,
  rotation: 0,
  lastTrailAt: 0,

  start() {
    this.x = CONFIG.METEOR.START_X;
    this.y = CONFIG.METEOR.START_Y;
    this.active = true;
    this.landed = false;
    this.rotation = 0;
    this.lastTrailAt = 0;
  },

  update(now) {
    if (!this.active || this.landed) return;

    const targetX = CONFIG.METEOR.LAND_X;
    const targetY = CONFIG.CANVAS_H * CONFIG.METEOR.LAND_Y_RATIO;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < CONFIG.METEOR.SPEED) {
      this.x = targetX;
      this.y = targetY;
      this.landed = true;
      return;
    }

    this.x += (dx / dist) * CONFIG.METEOR.SPEED;
    this.y += (dy / dist) * CONFIG.METEOR.SPEED;
    this.rotation += CONFIG.METEOR.ROTATION_SPEED;

    if (now - this.lastTrailAt > CONFIG.METEOR.TRAIL_EVERY_MS) {
      spawnTrailParticle(this.x, this.y);
      this.lastTrailAt = now;
    }
  },

  draw(ctx) {
    if (!this.active || this.landed) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // roca irregular con un par de "cráteres" oscuros encima
    ctx.fillStyle = '#4a3b32';
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c211b';
    ctx.beginPath();
    ctx.arc(-5, -4, 5, 0, Math.PI * 2);
    ctx.arc(6, 5, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};
