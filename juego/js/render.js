// Funciones de dibujo puras: calculan cajas de posición y pintan sprites/burbujas.
// No guardan estado propio, siempre reciben el contexto de canvas (ctx) como parámetro.

function getBox(img, centerX, groundYPos, height) {
  const ratio = img.width / img.height;
  const h = height;
  const w = h * ratio;
  const x = centerX - w / 2;
  const y = groundYPos - h;
  return { x, y, w, h };
}

// Dibuja el sprite simulando un ciclo de andar: separa el cuerpo (torso+cabeza)
// de las piernas, y gira cada mitad de piernas alrededor de la cadera como un
// compás, ya que solo tenemos una pose estática de cada personaje (sin frames
// de animación reales).
function drawWalking(ctx, img, box, hipFraction, t, walking, idleBreath = true) {
  const { x, y, w, h } = box;
  const hipY = y + h * hipFraction;
  const bodyH = hipY - y;
  const legH = (y + h) - hipY;

  const bob = walking ? Math.sin(t * 0.018) * 3 : (idleBreath ? Math.sin(t * 0.0025) * 1.5 : 0);

  ctx.save();

  // --- torso + cabeza (con pequeño balanceo vertical) ---
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 4, y - 4 + bob, w + 8, bodyH + 8);
  ctx.clip();
  ctx.drawImage(img, x, y + bob, w, h);
  ctx.restore();

  if (walking) {
    // --- piernas: dos mitades que giran en contrafase alrededor de la cadera ---
    const legAngle = Math.sin(t * 0.022) * 0.30;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 4, hipY - 2, w / 2 + 4, legH + 12);
    ctx.clip();
    const pivotLX = x + w * 0.30;
    ctx.translate(pivotLX, hipY);
    ctx.rotate(legAngle);
    ctx.translate(-pivotLX, -hipY);
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(x + w / 2 - 4, hipY - 2, w / 2 + 8, legH + 12);
    ctx.clip();
    const pivotRX = x + w * 0.70;
    ctx.translate(pivotRX, hipY);
    ctx.rotate(-legAngle);
    ctx.translate(-pivotRX, -hipY);
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
  } else {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 4, hipY - 2, w + 8, legH + 12);
    ctx.clip();
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
  }

  ctx.restore();
}

// Tinte nocturno sobre un fondo diurno ya existente: overlay azulado +
// estrellas (posiciones deterministas para que no parpadeen) + luna simple.
// Así no necesitamos un arte de fondo nuevo para las escenas de noche.
function drawNightOverlay(ctx, w, h) {
  ctx.save();
  ctx.fillStyle = CONFIG.NIGHT_TINT;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#fff';
  for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
    const sx = (i * 137.5) % w;
    const sy = (i * 71.3) % (h * 0.55);
    const size = (i % 3 === 0) ? 2 : 1;
    ctx.globalAlpha = 0.4 + ((i * 53) % 60) / 100;
    ctx.fillRect(sx, sy, size, size);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#f4f1de';
  ctx.beginPath();
  ctx.arc(w * 0.82, h * 0.16, 26, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Parte un texto en líneas que quepan en maxWidth (con el ctx.font ya puesto).
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  words.forEach((word) => {
    const test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  });
  if (current) lines.push(current);
  return lines;
}

// Caja de diálogo de tamaño FIJO (calculado con el texto completo) que solo
// revela los primeros revealCount caracteres -> efecto máquina de escribir
// sin que la caja cambie de tamaño mientras se va escribiendo el texto.
// Devuelve { totalChars } para que quien la use sepa cuándo está completo.
function drawDialogueBox(ctx, x, y, maxWidth, fullText, revealCount) {
  ctx.font = 'bold 19px Trebuchet MS';
  const lines = wrapText(ctx, fullText, maxWidth);

  const lineHeight = 26;
  const paddingX = 20, paddingY = 16;
  let widest = 0;
  lines.forEach((l) => { widest = Math.max(widest, ctx.measureText(l).width); });
  const boxW = widest + paddingX * 2;
  const boxH = lines.length * lineHeight + paddingY * 2;
  const bx = x - boxW / 2;
  const by = y - boxH - 22;

  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(bx, by, boxW, boxH, 12);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x - 10, by + boxH);
  ctx.lineTo(x + 10, by + boxH);
  ctx.lineTo(x - 4, by + boxH + 16);
  ctx.closePath();
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.stroke();

  ctx.fillStyle = '#222';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  let remaining = revealCount;
  let totalChars = 0;
  lines.forEach((line, i) => {
    totalChars += line.length + 1;
    const shown = remaining > 0 ? line.slice(0, remaining) : '';
    remaining -= line.length + 1;
    ctx.fillText(shown, bx + paddingX, by + paddingY + lineHeight * i + lineHeight / 2);
  });

  ctx.restore();

  return { totalChars };
}

// Aviso tipo videojuego en la parte inferior de la pantalla (p.ej. "E per
// avançar"), con un parpadeo suave para que se note que espera al jugador.
function drawPressHint(ctx, text, canvasW, canvasH, t) {
  ctx.save();
  const alpha = 0.55 + Math.sin(t * 0.006) * 0.35;
  ctx.globalAlpha = Math.max(0.2, alpha);
  ctx.font = 'bold 15px Trebuchet MS';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.lineWidth = 3;
  const px = canvasW / 2;
  const py = canvasH - 22;
  ctx.strokeText(text, px, py);
  ctx.fillText(text, px, py);
  ctx.restore();
}

function drawSpeechBubble(ctx, x, y, text, scale) {
  if (scale <= 0.01) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.font = 'bold 20px Trebuchet MS';
  const paddingX = 18, paddingY = 12;
  const textWidth = ctx.measureText(text).width;
  const boxW = textWidth + paddingX * 2;
  const boxH = 40 + paddingY;
  const bx = -boxW / 2;
  const by = -boxH - 20;

  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(bx, by, boxW, boxH, 12);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-10, by + boxH);
  ctx.lineTo(10, by + boxH);
  ctx.lineTo(-4, by + boxH + 16);
  ctx.closePath();
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.stroke();

  ctx.fillStyle = '#222';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, by + boxH / 2 + 2);

  ctx.restore();
}
