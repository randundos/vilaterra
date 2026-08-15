// Objetos recogibles que quedan flotando al morir un enemigo, hasta que el
// Hero pasa por encima; entonces "vuelan" hacia su destino en el HUD. Dos
// tipos: 'bracelet' (vuela al contador de pulseras, suma 1) y 'heart' (vuela
// hacia la barra de vida, cura CONFIG.VEGGIE.HEART_HEAL). El corazón no usa
// sprite: se dibuja a mano (ver drawHeartIcon) para no depender de un asset.
const Pickups = {
  items: [], // { type, x, baseY (mundo), phase, state: 'floating'|'flying', flyStart, startScreenX, startScreenY, amount }

  // worldX/worldY: punto de origen (normalmente donde muere el enemigo).
  spawnBraceletsAt(worldX, worldY, count) {
    const C = CONFIG.PICKUP;
    const startOffset = -((count - 1) * C.SPREAD_X) / 2;
    for (let i = 0; i < count; i++) {
      this.items.push({
        type: 'bracelet',
        x: worldX + startOffset + i * C.SPREAD_X,
        baseY: worldY,
        phase: Math.random() * Math.PI * 2,
        state: 'floating',
        flyStart: 0,
        startScreenX: 0,
        startScreenY: 0,
        amount: 1
      });
    }
  },

  // Un único corazón (las verduras sueltan solo uno al morir).
  spawnHeartAt(worldX, worldY, amount) {
    this.items.push({
      type: 'heart',
      x: worldX,
      baseY: worldY,
      phase: Math.random() * Math.PI * 2,
      state: 'floating',
      flyStart: 0,
      startScreenX: 0,
      startScreenY: 0,
      amount
    });
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

    const braceletTargetX = canvasW - CONFIG.HUD.MARGIN - CONFIG.HUD.BRACELET_ICON_SIZE / 2;
    const braceletTargetY = canvasH - CONFIG.HUD.MARGIN - CONFIG.HUD.BRACELET_ICON_SIZE / 2;
    // el corazón vuela hacia el icono de la barra de vida (esquina superior izq.)
    const heartTargetX = CONFIG.HUD.HEALTH_BAR_X + 24;
    const heartTargetY = CONFIG.HUD.HEALTH_BAR_Y + 22;

    this.items = this.items.filter((item) => {
      if (item.state !== 'flying') return true;
      const t = (now - item.flyStart) / C.FLY_DURATION_MS;
      if (t >= 1) {
        if (item.type === 'heart') player.heal(item.amount);
        else player.addBracelets(item.amount);
        return false;
      }
      return true;
    });

    // guardamos los objetivos para que draw() no tenga que recalcularlos
    this._braceletTargetX = braceletTargetX;
    this._braceletTargetY = braceletTargetY;
    this._heartTargetX = heartTargetX;
    this._heartTargetY = heartTargetY;
  },

  draw(ctx, now, cameraX) {
    const C = CONFIG.PICKUP;

    this.items.forEach((item) => {
      let sx, sy;
      if (item.state === 'floating') {
        sx = item.x - cameraX;
        sy = item.baseY + Math.sin(now * C.FLOAT_SPEED + item.phase) * C.FLOAT_AMPLITUDE;
      } else {
        const t = Math.min(1, (now - item.flyStart) / C.FLY_DURATION_MS);
        const ease = 1 - Math.pow(1 - t, 3); // ease-out cúbico: rápido al final
        const targetX = item.type === 'heart' ? this._heartTargetX : this._braceletTargetX;
        const targetY = item.type === 'heart' ? this._heartTargetY : this._braceletTargetY;
        sx = item.startScreenX + ((targetX || 0) - item.startScreenX) * ease;
        sy = item.startScreenY + ((targetY || 0) - item.startScreenY) * ease;
      }

      if (item.type === 'heart') {
        drawHeartIcon(ctx, sx, sy, C.HEART_ICON_SIZE);
      } else {
        const img = ASSETS.bracelet;
        if (!img.complete || img.width === 0) return;
        ctx.drawImage(img, sx - C.ICON_SIZE / 2, sy - C.ICON_SIZE / 2, C.ICON_SIZE, C.ICON_SIZE);
      }
    });
  }
};

// Corazón pixel-art dibujado a mano con rectángulos (sin sprite propio):
// misma silueta clásica de 2 lóbulos + pico, en una rejilla de 7x6 "píxeles"
// escalados a size, con un contorno negro fino para que destaque sobre
// cualquier fondo.
const HEART_PIXELS = [
  '.11.11.',
  '1111111',
  '1111111',
  '.11111.',
  '..111..',
  '...1...'
];
function drawHeartIcon(ctx, cx, cy, size) {
  const cols = HEART_PIXELS[0].length;
  const rows = HEART_PIXELS.length;
  const px = size / cols;
  const startX = cx - size / 2;
  const startY = cy - (rows * px) / 2;

  ctx.save();
  ctx.fillStyle = '#8b0000';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (HEART_PIXELS[r][c] !== '1') continue;
      ctx.fillRect(startX + c * px - 0.5, startY + r * px - 0.5, px + 1, px + 1);
    }
  }
  ctx.fillStyle = '#e63946';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (HEART_PIXELS[r][c] !== '1') continue;
      ctx.fillRect(startX + c * px + 1, startY + r * px + 1, px - 2, px - 2);
    }
  }
  ctx.restore();
}
