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
