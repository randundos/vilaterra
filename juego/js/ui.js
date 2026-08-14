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

// Aviso emergente "objeto conseguido" (ver ItemPopup en popup.js): icono a
// la izquierda dentro de una ranura oscura, texto a la derecha, con un
// marco de esquinas cuadradas (sin bordes redondeados) para que encaje con
// la estética pixel art del resto del juego, en vez de la caja de diálogo
// habitual. Aparece con un pequeño "pop" de escala + fundido.
function drawItemPopup(ctx, now, canvasW, canvasH, popup) {
  if (!popup.active) return;
  const C = CONFIG.ITEM_POPUP;
  const t = Math.min(1, (now - popup.shownAt) / C.POP_MS);
  const ease = 1 - Math.pow(1 - t, 3);

  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${0.45 * ease})`;
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.restore();

  ctx.font = 'bold 18px Trebuchet MS';
  const maxTextW = C.BOX_W - C.PADDING * 3 - C.ICON_SIZE;
  const lines = wrapText(ctx, popup.text, maxTextW);
  const lineHeight = 24;
  const contentH = Math.max(C.ICON_SIZE, lines.length * lineHeight);
  const boxW = C.BOX_W;
  const boxH = contentH + C.PADDING * 2;
  const bx = (canvasW - boxW) / 2;
  const by = (canvasH - boxH) / 2;

  ctx.save();
  ctx.globalAlpha = ease;
  const scale = 0.85 + ease * 0.15;
  const cx = canvasW / 2, cy = canvasH / 2;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);

  // marco: borde negro grueso de esquinas cuadradas + relleno color
  // pergamino + un filete interior más claro (nada de bordes redondeados)
  ctx.fillStyle = '#1c1408';
  ctx.fillRect(bx - C.BORDER, by - C.BORDER, boxW + C.BORDER * 2, boxH + C.BORDER * 2);
  ctx.fillStyle = '#f3e6c8';
  ctx.fillRect(bx, by, boxW, boxH);
  ctx.strokeStyle = '#c9a86a';
  ctx.lineWidth = 2;
  ctx.strokeRect(bx + 4, by + 4, boxW - 8, boxH - 8);

  // icono a la izquierda, dentro de una ranura oscura cuadrada
  const slotX = bx + C.PADDING;
  const slotY = by + boxH / 2 - C.ICON_SIZE / 2;
  ctx.fillStyle = '#2b2013';
  ctx.fillRect(slotX - 4, slotY - 4, C.ICON_SIZE + 8, C.ICON_SIZE + 8);
  const icon = popup.icon;
  if (icon && icon.complete && icon.width > 0) {
    const ratio = icon.width / icon.height;
    let iw = C.ICON_SIZE, ih = C.ICON_SIZE;
    if (ratio > 1) ih = iw / ratio; else iw = ih * ratio;
    ctx.drawImage(icon, slotX + (C.ICON_SIZE - iw) / 2, slotY + (C.ICON_SIZE - ih) / 2, iw, ih);
  }

  // texto a la derecha, centrado verticalmente junto al icono
  const textX = slotX + C.ICON_SIZE + C.PADDING;
  ctx.fillStyle = '#2b2013';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const textBlockH = lines.length * lineHeight;
  const textStartY = by + boxH / 2 - textBlockH / 2 + lineHeight / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, textX, textStartY + i * lineHeight);
  });
  ctx.restore();

  drawPressHint(ctx, 'E per continuar', canvasW, canvasH, now);
}
