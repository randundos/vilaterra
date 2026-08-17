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

// Ranura de "arma activa" (tecla Q, ver Input.onWeaponSwitch/main.js): un
// recuadro anclado a la esquina inferior izquierda con la espada (reutiliza
// ASSETS.sword, el mismo icono del pickup) o unos puños (dibujados a mano,
// no hay sprite dedicado) según Player.weaponEquipped. Solo se llama a esto
// una vez Player.hasSword es true (antes de recogerla no hay nada que
// mostrar: siempre son los puños).
function drawWeaponIndicator(ctx, canvasH, weaponEquipped) {
  const { MARGIN, WEAPON_BOX_SIZE: size } = CONFIG.HUD;
  const x = MARGIN;
  const y = canvasH - MARGIN - size;
  const pad = 9;

  ctx.save();
  ctx.fillStyle = 'rgba(20, 16, 28, 0.72)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 2;
  drawRoundRect(ctx, x, y, size, size, 8);
  ctx.fill();
  ctx.stroke();

  if (weaponEquipped === 'sword') {
    const img = ASSETS.sword;
    if (img.complete && img.width > 0) {
      const availH = size - pad * 2;
      const w = img.width * (availH / img.height);
      ctx.drawImage(img, x + (size - w) / 2, y + pad, w, availH);
    }
  } else {
    drawFistIcon(ctx, x + size / 2, y + size / 2, size - pad * 2);
  }
  ctx.restore();
}

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Icono de puño plano (sin sprite propio): muñeca + círculo con tres marcas
// de nudillo, mismo estilo de trazo grueso que el resto del HUD.
function drawFistIcon(ctx, cx, cy, size) {
  const skin = '#e0a878';
  const outline = '#3a2418';
  const r = size * 0.36;

  ctx.save();
  ctx.fillStyle = skin;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.5;

  ctx.beginPath();
  ctx.rect(cx - size * 0.16, cy + r * 0.35, size * 0.32, size * 0.34);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.04, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.lineWidth = 1.6;
  [-0.55, -0.05, 0.45].forEach((fx) => {
    ctx.beginPath();
    ctx.moveTo(cx + r * fx, cy - r * 0.1);
    ctx.lineTo(cx + r * fx, cy - r * 0.75);
    ctx.stroke();
  });
  ctx.restore();
}

// Barra de vida de un enemigo (roja sobre negro), flotando encima de su
// caja de colisión: en negro la vida total, en rojo la que le queda. Se
// llama con coordenadas ya en PANTALLA (cámara ya restada si aplica),
// centrada horizontalmente en "cx", con el borde inferior en "bottomY"
// (normalmente justo encima de la cabeza del enemigo, ver ENEMY_HEALTH_BAR.
// OFFSET_Y). Cada enemigo decide cuándo llamarla: solo a partir del primer
// golpe recibido (hpBarVisible) y nunca una vez muerto.
function drawEnemyHealthBar(ctx, cx, bottomY, hpFraction) {
  const { WIDTH, HEIGHT } = CONFIG.ENEMY_HEALTH_BAR;
  const x = cx - WIDTH / 2;
  const y = bottomY - HEIGHT;
  const pct = Math.max(0, Math.min(1, hpFraction));

  ctx.save();
  ctx.fillStyle = '#000';
  ctx.fillRect(x, y, WIDTH, HEIGHT);
  ctx.fillStyle = '#d81f1f';
  ctx.fillRect(x, y, WIDTH * pct, HEIGHT);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, WIDTH - 1, HEIGHT - 1);
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

// Fundido a negro genérico (0 = transparente, 1 = negro sólido): lo usa la
// travesía de la cueva para cortar a negro y volver a aparecer al otro lado.
function drawFadeOverlay(ctx, canvasW, canvasH, alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillRect(0, 0, canvasW, canvasH);
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
