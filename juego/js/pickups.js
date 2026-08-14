// Pulseras recogibles: al morir un enemigo se sueltan flotando cerca del
// suelo. Cuando el Hero pasa por encima, cada una "vuela" hacia el contador
// del HUD (abajo derecha) y solo entonces se suma a Player.bracelets.
const Pickups = {
  items: [], // { x, baseY (mundo), phase, state: 'floating'|'flying', flyStart, startScreenX, startScreenY }

  // worldX/worldY: punto de origen (normalmente donde muere el enemigo).
  spawnBraceletsAt(worldX, worldY, count) {
    const C = CONFIG.PICKUP;
    const startOffset = -((count - 1) * C.SPREAD_X) / 2;
    for (let i = 0; i < count; i++) {
      this.items.push({
        x: worldX + startOffset + i * C.SPREAD_X,
        baseY: worldY,
        phase: Math.random() * Math.PI * 2,
        state: 'floating',
        flyStart: 0,
        startScreenX: 0,
        startScreenY: 0
      });
    }
  },

  update(now, player, groundY, cameraX, canvasW, canvasH) {
    const C = CONFIG.PICKUP;

    // la Y real del Hero (groundY + jumpOffset) hace falta para las pulseras
    // "de regalo" sobre una plataforma: si solo mirásemos dx, se recogerían
    // igual pasando por debajo, sin necesidad de subir a por ellas.
    const playerY = groundY + player.jumpOffset;

    this.items.forEach((item) => {
      if (item.state !== 'floating') return;
      const bobY = Math.sin(now * C.FLOAT_SPEED + item.phase) * C.FLOAT_AMPLITUDE;
      const dx = player.x - item.x;
      const dy = playerY - (item.baseY + bobY);
      if (Math.abs(dx) < C.COLLECT_RADIUS && Math.abs(dy) < C.COLLECT_RADIUS) {
        item.state = 'flying';
        item.flyStart = now;
        item.startScreenX = item.x - cameraX;
        item.startScreenY = item.baseY + bobY;
      }
    });

    const targetX = canvasW - CONFIG.HUD.MARGIN - CONFIG.HUD.BRACELET_ICON_SIZE / 2;
    const targetY = canvasH - CONFIG.HUD.MARGIN - CONFIG.HUD.BRACELET_ICON_SIZE / 2;

    this.items = this.items.filter((item) => {
      if (item.state !== 'flying') return true;
      const t = (now - item.flyStart) / C.FLY_DURATION_MS;
      if (t >= 1) {
        player.addBracelets(1);
        return false;
      }
      return true;
    });

    // guardamos el objetivo para que draw() no tenga que recalcularlo
    this._targetX = targetX;
    this._targetY = targetY;
  },

  draw(ctx, now, cameraX) {
    const C = CONFIG.PICKUP;
    const img = ASSETS.bracelet;
    if (!img.complete || img.width === 0) return;

    const size = C.ICON_SIZE;
    const targetX = this._targetX || 0;
    const targetY = this._targetY || 0;

    this.items.forEach((item) => {
      let sx, sy;
      if (item.state === 'floating') {
        sx = item.x - cameraX;
        sy = item.baseY + Math.sin(now * C.FLOAT_SPEED + item.phase) * C.FLOAT_AMPLITUDE;
      } else {
        const t = Math.min(1, (now - item.flyStart) / C.FLY_DURATION_MS);
        const ease = 1 - Math.pow(1 - t, 3); // ease-out cúbico: rápido al final
        sx = item.startScreenX + (targetX - item.startScreenX) * ease;
        sy = item.startScreenY + (targetY - item.startScreenY) * ease;
      }
      ctx.drawImage(img, sx - size / 2, sy - size / 2, size, size);
    });
  }
};
