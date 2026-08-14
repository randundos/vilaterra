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

// Dibuja una imagen repetida horizontalmente para cubrir todo el ancho del
// canvas a un desplazamiento dado, escalada para encajar en drawH de alto.
// Es la base del scroll en paralaje: se llama una vez por capa, cada una con
// su propio "factor" de velocidad respecto a la cámara.
// Con mirror=true, las copias alternas se dibujan volteadas horizontalmente
// (truco clásico para disimular costuras en texturas que no son 100% tileables:
// el borde de contacto siempre queda como un reflejo, nunca como un salto brusco).
function drawParallaxLayer(ctx, img, canvasW, drawY, drawH, cameraX, factor, mirror = false) {
  const scale = drawH / img.height;
  const scaledW = img.width * scale;
  if (scaledW <= 0) return;

  const scrollX = cameraX * factor;
  const startTile = Math.floor((scrollX - scaledW) / scaledW);
  const tilesNeeded = Math.ceil(canvasW / scaledW) + 3;

  for (let i = 0; i < tilesNeeded; i++) {
    const tileIndex = startTile + i;
    const screenX = tileIndex * scaledW - scrollX;
    if (screenX > canvasW) break;

    if (mirror && tileIndex % 2 !== 0) {
      ctx.save();
      ctx.translate(screenX + scaledW, drawY);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, scaledW, drawH);
      ctx.restore();
    } else {
      ctx.drawImage(img, screenX, drawY, scaledW, drawH);
    }
  }
}

// Fondo del nivel jugable con dos capas: el cielo/árboles se mueve más
// despacio que la cámara (sensación de profundidad, estilo Sonic) y la
// franja de suelo se mueve a la misma velocidad que la cámara, empezando
// justo en GROUND_Y_RATIO para que los pies de los personajes queden
// exactamente al nivel de la textura.
function drawLevelBackground(ctx, cameraX) {
  const groundY = CONFIG.CANVAS_H * CONFIG.GROUND_Y_RATIO;
  const groundH = CONFIG.CANVAS_H - groundY;
  drawParallaxLayer(ctx, ASSETS.bgSky, CONFIG.CANVAS_W, 0, groundY, cameraX, CONFIG.PARALLAX_SKY_FACTOR);
  drawParallaxLayer(ctx, ASSETS.bgGround, CONFIG.CANVAS_W, groundY, groundH, cameraX, 1, true);
  drawPit(ctx, { x: CONFIG.PIT.X, width: CONFIG.PIT.WIDTH }, cameraX, groundY, groundH, ASSETS.bgSky, CONFIG.PARALLAX_SKY_FACTOR);
}

// Hueco sin suelo: en vez de un agujero negro plano, se recorta una silueta
// irregular (como tierra rota) y DENTRO de ese recorte se vuelve a pintar la
// propia capa de fondo (cielo/hierba), estirada hacia abajo -> da la
// sensación de que ahí simplemente se acaba la tierra y se ve a través,
// hacia el fondo, en vez de caer a un vacío negro. Un borde y una sombra muy
// sutiles marcan el canto roto para que se note dónde deja de haber suelo.
// El desnivel de los dientes es determinista (basado en pit.x) para que no
// tiemble entre frames ni se repita igual en cada agujero. Se usa tanto para
// el del nivel 1 como para los del tramo de hierba (drawSmallWorldBackground).
function drawPit(ctx, pit, cameraX, groundY, groundH, bgImage, bgFactor) {
  const screenX = pit.x - cameraX;
  if (screenX + pit.width < -20 || screenX > CONFIG.CANVAS_W + 20) return;

  const teeth = Math.max(3, Math.round(pit.width / 90));
  const toothW = pit.width / teeth;
  const jagPoints = [];
  for (let i = 0; i <= teeth; i++) {
    const tx = screenX + i * toothW;
    const jag = (i % 2 === 0 ? 1 : -1) * (4 + ((pit.x + i * 37) % 6));
    jagPoints.push({ x: tx, y: groundY + jag });
  }

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(screenX, groundY + groundH);
  ctx.lineTo(screenX, groundY);
  jagPoints.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.lineTo(screenX + pit.width, groundY);
  ctx.lineTo(screenX + pit.width, groundY + groundH);
  ctx.closePath();
  ctx.clip();

  // el fondo, estirado para cubrir también la franja que normalmente ocupa
  // el suelo -> solo se ve dentro del recorte de arriba
  drawParallaxLayer(ctx, bgImage, CONFIG.CANVAS_W, 0, groundY + groundH, cameraX, bgFactor, false);

  // sombra muy suave pegada al borde roto, solo para dar algo de
  // profundidad (nada de negro sólido)
  const edgeGrad = ctx.createLinearGradient(0, groundY - 6, 0, groundY + 30);
  edgeGrad.addColorStop(0, 'rgba(30, 22, 14, 0.5)');
  edgeGrad.addColorStop(1, 'rgba(30, 22, 14, 0)');
  ctx.fillStyle = edgeGrad;
  ctx.fillRect(screenX, groundY - 6, pit.width, 36);
  ctx.restore();

  // silueta del canto de tierra roto, para que se note el borde contra el fondo
  ctx.save();
  ctx.strokeStyle = 'rgba(60, 45, 28, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  jagPoints.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

// Fondo del tramo "Hero pequeño": mismo suelo que el nivel 1 (para que los
// pies sigan encajando con esa textura), solo cambia la capa de fondo/cielo
// por la nueva imagen de hierba. Esa imagen ya está hecha para repetirse sin
// costuras (el borde derecho continúa en el izquierdo), así que se tilea
// directamente, sin el truco de espejo que sí hace falta para el suelo.
function drawSmallWorldBackground(ctx, cameraX) {
  const groundY = CONFIG.CANVAS_H * CONFIG.SMALL_WORLD.GROUND_Y_RATIO;
  const groundH = CONFIG.CANVAS_H - groundY;
  drawParallaxLayer(ctx, ASSETS.bgSmallWorld, CONFIG.CANVAS_W, 0, groundY, cameraX, CONFIG.PARALLAX_SKY_FACTOR, false);
  drawParallaxLayer(ctx, ASSETS.bgGround, CONFIG.CANVAS_W, groundY, groundH, cameraX, 1, true);
  // los tramos sin suelo (CONFIG.SMALL_WORLD.PITS) se "recortan" del suelo
  // tileado de arriba: así se ve claramente que ahí no se puede pisar y que
  // hay que cruzar saltando por las plataformas (ver Platforms en main.js)
  CONFIG.SMALL_WORLD.PITS.forEach((pit) => drawPit(ctx, pit, cameraX, groundY, groundH, ASSETS.bgSmallWorld, CONFIG.PARALLAX_SKY_FACTOR));
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
