// HUD de jugabilidad: barra de vida (arriba izquierda) y contador de
// pulseras (abajo derecha). Solo se dibuja en modo 'gameplay', nunca durante
// las cinemáticas (main.js decide cuándo llamar a estas funciones).

// La barra de vida es una única imagen (corazón + tira). Para mostrar el
// daño recibido, se recorta la propia imagen por la izquierda según el
// porcentaje de vida restante: al 100% se ve entera, y se va acortando
// (el corazón queda siempre visible, la tira se hace más corta).
function drawHealthBar(ctx, healthPercent) {
  const img = ASSETS.healthBar;
  if (!img.complete || img.width === 0) return;

  const { HEALTH_BAR_X, HEALTH_BAR_Y, HEALTH_BAR_W } = CONFIG.HUD;
  const scale = HEALTH_BAR_W / img.width;
  const destH = img.height * scale;

  const pct = Math.max(0, Math.min(1, healthPercent));
  // nunca recortamos por debajo de un mínimo visible (para que el corazón
  // siempre se vea entero aunque quede muy poca vida)
  const minFrac = img.width > 0 ? Math.min(1, (img.height * 1.05) / img.width) : 0;
  const frac = Math.max(minFrac, pct);

  const srcW = img.width * frac;
  const destW = HEALTH_BAR_W * frac;

  ctx.save();
  ctx.drawImage(img, 0, 0, srcW, img.height, HEALTH_BAR_X, HEALTH_BAR_Y, destW, destH);
  ctx.restore();
}

// Icono de pulsera + número de pulseras conseguidas, anclado a la esquina
// inferior derecha del canvas.
function drawBraceletCounter(ctx, canvasW, canvasH, count) {
  const img = ASSETS.bracelet;
  if (!img.complete || img.width === 0) return;

  const { BRACELET_ICON_SIZE, MARGIN } = CONFIG.HUD;
  const scale = BRACELET_ICON_SIZE / img.height;
  const w = img.width * scale;
  const h = BRACELET_ICON_SIZE;

  const text = `x${count}`;
  ctx.save();
  ctx.font = 'bold 20px Trebuchet MS';
  const textW = ctx.measureText(text).width;

  const totalW = w + 8 + textW;
  const x = canvasW - MARGIN - totalW;
  const y = canvasH - MARGIN - h;

  ctx.drawImage(img, x, y, w, h);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.lineWidth = 3;
  ctx.fillStyle = '#fff';
  const textX = x + w + 8;
  const textY = y + h / 2;
  ctx.strokeText(text, textX, textY);
  ctx.fillText(text, textX, textY);
  ctx.restore();
}
