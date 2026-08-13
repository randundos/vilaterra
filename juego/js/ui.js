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

// Pantalla de muerte estilo Dark Souls: fondo oscurecido + "Has Fallat" en
// rojo oscuro, con dos líneas finas arriba y abajo, apareciendo poco a poco.
function drawDeathOverlay(ctx, now, deathStart) {
  const D = CONFIG.DEATH;
  const elapsed = now - deathStart;
  const alpha = Math.max(0, Math.min(1, elapsed / D.FADE_IN_MS));
  if (alpha <= 0) return;

  const cx = CONFIG.CANVAS_W / 2;
  const cy = CONFIG.CANVAS_H / 2;

  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${0.72 * alpha})`;
  ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#7a1414';
  ctx.lineWidth = 1.5;
  const lineW = 380;
  ctx.beginPath();
  ctx.moveTo(cx - lineW / 2, cy - 36);
  ctx.lineTo(cx + lineW / 2, cy - 36);
  ctx.moveTo(cx - lineW / 2, cy + 36);
  ctx.lineTo(cx + lineW / 2, cy + 36);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'italic 54px Georgia, "Times New Roman", serif';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#8b0000';
  ctx.fillText('Has Fallat', cx, cy);
  ctx.restore();
}
