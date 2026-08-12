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

// Pose de "manos a la cabeza": el torso se dibuja fijo (con un ligero
// temblor de pánico) y cada brazo se recorta y gira desde el hombro hacia
// arriba. armProgress va de 0 (brazos caídos) a 1 (brazos arriba del todo).
// Es una aproximación estilizada -> puede necesitar ajuste fino visual.
function drawShocked(ctx, img, box, armProgress) {
  const { x, y, w, h } = box;
  const jitter = (Math.random() - 0.5) * 2;
  const armAngle = armProgress * 2.3; // radianes

  ctx.save();
  ctx.drawImage(img, x + jitter, y, w, h);

  // brazo del lado izquierdo de la pantalla
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 6, y + h * 0.30, w * 0.32, h * 0.34);
  ctx.clip();
  const pivotL = { x: x + w * 0.16, y: y + h * 0.34 };
  ctx.translate(pivotL.x, pivotL.y);
  ctx.rotate(-armAngle);
  ctx.translate(-pivotL.x, -pivotL.y);
  ctx.drawImage(img, x + jitter, y, w, h);
  ctx.restore();

  // brazo del lado derecho de la pantalla
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + w * 0.68, y + h * 0.30, w * 0.32 + 6, h * 0.34);
  ctx.clip();
  const pivotR = { x: x + w * 0.84, y: y + h * 0.34 };
  ctx.translate(pivotR.x, pivotR.y);
  ctx.rotate(armAngle);
  ctx.translate(-pivotR.x, -pivotR.y);
  ctx.drawImage(img, x + jitter, y, w, h);
  ctx.restore();

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
