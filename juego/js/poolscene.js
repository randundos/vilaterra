// Escena de apertura del nivel 3 (ver CONFIG.POOL_SCENE): arranca justo
// después de que el pájaro termine de fundir a negro tras la captura
// (Bird.captureSub === 'done', ver startPoolScene en main.js). Sustituye a la
// antigua pantalla estática "pròximament": el pájaro, ahora mucho más pequeño
// que en el combate, cruza el cielo sobre una piscina y deja caer un bulto
// diminuto (no se distingue bien qué es) que, al tocar el agua, crece de
// golpe -> es Hero. Sale de un salto del agua, y entonces Mac Arrons (ya
// establecido como "un mag" en la escena de la manguera, nivel 1) se
// teletransporta a la escena: charla con Hero, y al final los dos
// desaparecen juntos, cerrando la demo con una tarjeta final. Escena fija,
// sin scroll (cameraX=0 siempre), reutiliza los propios objetos Player/Mac
// (mismo patrón que Cutscene con la cinemática inicial).
const POOL_DIALOGUE = [
  { speaker: 'hero', text: "Ostres, l'aigua m'ha fet creixer de nou! A veure si trobo al mag dels collons!" },
  { speaker: 'mac', text: 'Em cridaves?' },
  { speaker: 'mac', text: "Ep, com has crescut tu? Has caigut a l'aigua de la piscina??!" },
  { speaker: 'hero', text: 'Sí! I ara me les pagaràs!' },
  { speaker: 'mac', text: 'Espera, si us plau!' },
  { speaker: 'mac', text: "Has d'anar a l'església de Sant Joan, oi? Necessitaràs màgia per entrar. Jo t'en ensenyaré, t'ho juro!" },
  { speaker: 'hero', text: "Hm... T'escolto..." },
  { speaker: 'mac', text: 'Som-hi doncs!' }
];

// Envolvente de brillo del haz de luz del teletransporte: t es el progreso
// (0..1) dentro de su duración total. Sube rápido, se mantiene brillante un
// rato, y baja; el personaje desaparece justo en el tramo alto (ver
// CONFIG.POOL_SCENE.TELEPORT_HIDE_FRACTION).
function _beamEnvelope(t) {
  if (t < 0.18) return t / 0.18;
  if (t < 0.55) return 1;
  return Math.max(0, 1 - (t - 0.55) / 0.45);
}

// Haz de luz vertical (blanco -> morado -> dorado, a juego con las chispas
// mágicas) que converge desde arriba hacia los pies del personaje, con un
// destello ovalado en la base. Se dibuja con "lighter" para que brille de
// verdad sobre el fondo, en vez de una simple mancha translúcida.
function drawTeleportBeam(ctx, cx, baseY, alpha) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const topY = -60;
  const width = 34;
  const beamGrad = ctx.createLinearGradient(cx, topY, cx, baseY);
  beamGrad.addColorStop(0, 'rgba(255,255,255,0)');
  beamGrad.addColorStop(0.18, `rgba(255,255,255,${0.85 * alpha})`);
  beamGrad.addColorStop(0.55, `rgba(196,150,255,${0.75 * alpha})`);
  beamGrad.addColorStop(1, `rgba(255,212,71,${0.85 * alpha})`);
  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.moveTo(cx - width * 0.14, topY);
  ctx.lineTo(cx + width * 0.14, topY);
  ctx.lineTo(cx + width * 0.55, baseY);
  ctx.lineTo(cx - width * 0.55, baseY);
  ctx.closePath();
  ctx.fill();

  const glowR = 40;
  const glowGrad = ctx.createRadialGradient(cx, baseY, 0, cx, baseY, glowR);
  glowGrad.addColorStop(0, `rgba(255,255,255,${0.95 * alpha})`);
  glowGrad.addColorStop(0.5, `rgba(214,180,255,${0.55 * alpha})`);
  glowGrad.addColorStop(1, 'rgba(214,180,255,0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.ellipse(cx, baseY, glowR, glowR * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

const PoolScene = {
  phase: 'flyIn', // flyIn | hover | drop | splash | grow | hop | dialogue | teleportOut | empty | end
  phaseStart: 0,
  birdX: 0,
  dropY: 0,
  hopStartX: 0, // Player.x al empezar el salto (ver fase 'hop')
  groundY: 0,   // "suelo" actual de Player/Mac: WATER_GROUND_Y hasta el salto, DECK_GROUND_Y después

  // --- diálogo (máquina de escribir + cola de líneas, mismo patrón que
  // Cutscene, pero con dos interlocutores: Hero y Mac) ---
  dialogueIndex: 0,
  dialogueStart: 0,
  dialogueRevealCount: 0,
  dialogueTotalChars: 0,
  dialogueFullyShown: false,

  // --- Mac Arrons (aparece a mitad del diálogo, teletransportado) ---
  macVisible: false,
  macAppearAt: 0,   // para el "pop" de aparición (ver _drawMac)
  macBeamStart: 0,  // para el haz de luz de su llegada (ver draw)
  macBox: null,     // se guarda cada frame para anclar su bocadillo de diálogo

  start(now) {
    const C = CONFIG.POOL_SCENE;
    this.phase = 'flyIn';
    this.phaseStart = now;
    this.birdX = C.BIRD_ENTRY_X;
    this.dropY = C.DROP_Y_START;
    this.dialogueIndex = 0;
    this.dialogueStart = 0;
    this.dialogueRevealCount = 0;
    this.dialogueTotalChars = 0;
    this.dialogueFullyShown = false;
    this.macVisible = false;
    this.macAppearAt = 0;
    this.macBeamStart = 0;
    this.macBox = null;
    Particles.clear();

    Player.visible = true;
    Player.shrinking = false;
    Player.attacking = false;
    Player.isWalking = false;
    Player.facing = 'right';
    Player.vy = 0;
    Player.jumpOffset = 0;
    Player.grounded = true;
    Player.dashVX = 0;
    Player.x = C.STAND_X;
    Player.height = C.HERO_START_HEIGHT;
    this.groundY = C.WATER_GROUND_Y;
  },

  _setPhase(now, phase) {
    this.phase = phase;
    this.phaseStart = now;
  },

  _startLine(now, index) {
    this.dialogueIndex = index;
    this.dialogueStart = now;
    this.dialogueRevealCount = 0;
    this.dialogueTotalChars = 0;
    this.dialogueFullyShown = false;
  },

  // Tecla E: revela la línea de golpe, o pasa a la siguiente (con algún
  // efecto especial fijado por índice: aparición de Mac, gesto de ataque de
  // Hero, y el teletransporte final de los dos al acabar la cola).
  handleAction(now) {
    if (this.phase !== 'dialogue') return;
    const C = CONFIG.POOL_SCENE;

    if (!this.dialogueFullyShown) {
      this.dialogueRevealCount = this.dialogueTotalChars || 9999;
      this.dialogueFullyShown = true;
      return;
    }

    const justFinished = this.dialogueIndex;
    const nextIndex = justFinished + 1;

    if (justFinished === 0) {
      // Hero acaba de decir que busca al mag -> Mac llega envuelto en un haz
      // de luz (ver drawTeleportBeam en draw()), con chispas mágicas
      // moradas/doradas de acompañamiento.
      this.macVisible = true;
      this.macAppearAt = now;
      this.macBeamStart = now;
      spawnTeleport(C.MAC_X, this.groundY - C.MAC_HEIGHT * 0.5);
    } else if (justFinished === 3) {
      // "Sí! I ara me les pagaràs!" -> Hero se planta con intención de pegarle
      Player.attack(now);
    }

    if (nextIndex >= POOL_DIALOGUE.length) {
      // Los dos desaparecen juntos envueltos en un haz de luz (ver
      // drawTeleportBeam / fase 'teleportOut' más abajo): nada de encogerse,
      // desaparecen de golpe en el punto más brillante del haz. Después la
      // escena se queda vacía un momento (fase 'empty') antes de la tarjeta final.
      spawnTeleport(Player.x, this.groundY - Player.height * 0.5);
      spawnTeleport(C.MAC_X, this.groundY - C.MAC_HEIGHT * 0.5);
      this._setPhase(now, 'teleportOut');
      return;
    }

    this._startLine(now, nextIndex);
  },

  update(now) {
    const C = CONFIG.POOL_SCENE;
    const elapsed = now - this.phaseStart;

    if (this.phase === 'flyIn') {
      this.birdX -= C.BIRD_SPEED;
      if (this.birdX <= C.HOVER_X) this._setPhase(now, 'hover');
    } else if (this.phase === 'hover') {
      if (elapsed >= C.HOVER_MS) this._setPhase(now, 'drop');
    } else if (this.phase === 'drop') {
      const t = Math.min(1, elapsed / C.DROP_MS);
      const eased = t * t; // acelera como si cayera de verdad (gravedad)
      this.dropY = C.DROP_Y_START + (C.DROP_Y_END - C.DROP_Y_START) * eased;
      this.birdX -= C.BIRD_SPEED; // el pájaro ya no espera, sigue su camino
      if (t >= 1) {
        spawnSplash(C.HOVER_X, C.DROP_Y_END);
        this._setPhase(now, 'splash');
      }
    } else if (this.phase === 'splash') {
      this.birdX -= C.BIRD_SPEED;
      if (elapsed >= C.SPLASH_MS) {
        Player.height = C.HERO_START_HEIGHT;
        this._setPhase(now, 'grow');
      }
    } else if (this.phase === 'grow') {
      this.birdX -= C.BIRD_SPEED;
      const t = Math.min(1, elapsed / C.GROW_MS);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cúbico: crece rápido y frena de golpe
      Player.height = C.HERO_START_HEIGHT + (C.HERO_FINAL_HEIGHT - C.HERO_START_HEIGHT) * eased;
      if (t >= 1) {
        this.hopStartX = Player.x;
        Player.grounded = false;
        this._setPhase(now, 'hop');
      }
    } else if (this.phase === 'hop') {
      // pequeño salto (arco real, con las poses de salto de Player) al salir
      // del agua hacia el borde: avanza un poco (HOP_X_OFFSET) mientras sube
      // y baja. Player.vy es de mentira (no hay física real aquí), solo para
      // que Player.draw() elija la pose de salto correcta en cada momento.
      const t = Math.min(1, elapsed / C.HOP_MS);
      Player.x = this.hopStartX + C.HOP_X_OFFSET * t;
      Player.jumpOffset = -4 * C.HOP_HEIGHT * t * (1 - t);
      Player.vy = CONFIG.JUMP_VELOCITY * (1 - 2 * t);
      this.groundY = C.WATER_GROUND_Y + (C.DECK_GROUND_Y - C.WATER_GROUND_Y) * t;
      if (t >= 1) {
        Player.jumpOffset = 0;
        Player.vy = 0;
        Player.grounded = true;
        this.groundY = C.DECK_GROUND_Y;
        this._startLine(now, 0);
        this._setPhase(now, 'dialogue');
      }
    } else if (this.phase === 'dialogue') {
      if (!this.dialogueFullyShown) {
        const dElapsed = now - this.dialogueStart;
        this.dialogueRevealCount = Math.floor(dElapsed / CONFIG.CUTSCENE.TYPE_MS_PER_CHAR);
        if (this.dialogueTotalChars && this.dialogueRevealCount >= this.dialogueTotalChars) {
          this.dialogueFullyShown = true;
        }
      }
    } else if (this.phase === 'teleportOut') {
      // El haz de luz (ver drawTeleportBeam en draw()) dura TELEPORT_BEAM_MS;
      // al llegar a TELEPORT_HIDE_FRACTION de ese tiempo (el punto más
      // brillante) el personaje desaparece de golpe, no encogiéndose.
      if (elapsed >= C.TELEPORT_BEAM_MS * C.TELEPORT_HIDE_FRACTION) {
        Player.visible = false;
      }
      if (elapsed >= C.TELEPORT_BEAM_MS) {
        this._setPhase(now, 'empty');
      }
    } else if (this.phase === 'empty') {
      // Escena vacía (solo el fondo) un par de segundos antes de pasar a la
      // escena de las oficinas (ver 'done' -> startOfficeScene en main.js;
      // la tarjeta "Continuarà..." ya no se muestra aquí, se ha movido al
      // final de OfficeScene).
      if (elapsed >= C.TELEPORT_EMPTY_MS) this._setPhase(now, 'done');
    }

    Particles.update(16.7);
  },

  // Mac no tiene (todavía) animación propia de teletransporte: al llegar se
  // simula con un "pop" de escala rápido (a juego con el haz de luz que se
  // dibuja en draw()); al final desaparece de golpe en el punto más
  // brillante del haz (ver fase 'teleportOut'), no encogiéndose.
  _drawMac(ctx, now) {
    if (!this.macVisible) return;
    const C = CONFIG.POOL_SCENE;
    const img = ASSETS.mac;
    if (!img.complete || img.width === 0) return;

    if (this.phase === 'teleportOut') {
      const elapsedBeam = now - this.phaseStart;
      if (elapsedBeam >= C.TELEPORT_BEAM_MS * C.TELEPORT_HIDE_FRACTION) {
        // desaparece para siempre (no solo "en esta fase"): si no, al pasar
        // a la fase 'empty' este bloque deja de aplicarse y Mac se dibujaría
        // otra vez de golpe con el cálculo normal de más abajo.
        this.macVisible = false;
        this.macBox = null;
        return;
      }
    }

    let scale = 1;
    if (this.macAppearAt) {
      scale = Math.min(1, (now - this.macAppearAt) / C.MAC_APPEAR_MS);
    }
    if (scale <= 0) { this.macBox = null; return; }

    const fullBox = getBox(img, C.MAC_X, this.groundY, C.MAC_HEIGHT);
    const w = fullBox.w * scale;
    const h = fullBox.h * scale;
    const x = fullBox.x + (fullBox.w - w) / 2;
    const y = fullBox.y + (fullBox.h - h); // se encoge "hacia los pies", igual que Player al encoger
    ctx.drawImage(img, x, y, w, h);
    this.macBox = { x, y, w, h };
  },

  draw(ctx, t, now) {
    const C = CONFIG.POOL_SCENE;

    if (ASSETS.poolBg.complete && ASSETS.poolBg.width > 0) {
      ctx.drawImage(ASSETS.poolBg, 0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
    }

    // el "bulto" cayendo: la propia imagen de Hero, pero diminuta -> no se
    // distingue bien qué es hasta que crece al tocar el agua (ver 'grow').
    if (this.phase === 'drop') {
      const img = ASSETS.hero;
      if (img.complete && img.width > 0) {
        const h = 14;
        const w = h * (img.width / img.height);
        ctx.drawImage(img, C.HOVER_X - w / 2, this.dropY - h / 2, w, h);
      }
    }

    Particles.draw(ctx);

    // el pájaro, mucho más pequeño que en el combate: reutiliza el mismo
    // ciclo de aleteo (ASSETS.bird.flap) y la misma técnica de escala fija
    // que Bird (ver getScaledBox en render.js). Se oculta en 'empty'/'end'
    // para que la escena quede realmente vacía antes de la tarjeta final.
    if (this.phase !== 'empty' && this.phase !== 'end' && ASSETS.bird.flap.length && ASSETS.bird.flap[0].complete && ASSETS.bird.stand.complete) {
      const frames = ASSETS.bird.flap;
      const idx = Math.floor(now / CONFIG.BIRD.FLAP_FRAME_MS) % frames.length;
      const img = frames[idx];
      const scale = C.BIRD_HEIGHT / ASSETS.bird.stand.height;
      const box = getScaledBox(img.width, img.height, this.birdX, C.BIRD_FLY_Y, scale);
      ctx.drawImage(img, box.x, box.y, box.w, box.h);
    }

    if (this.phase === 'grow' || this.phase === 'hop' || this.phase === 'dialogue' || this.phase === 'teleportOut') {
      Player.draw(ctx, t, this.groundY, 0);
    }
    this._drawMac(ctx, now);

    // Haz de luz de la llegada de Mac (independiente de la fase: ocurre a
    // mitad del diálogo).
    if (this.macBeamStart) {
      const beamT = (now - this.macBeamStart) / C.TELEPORT_BEAM_MS;
      if (beamT <= 1) {
        drawTeleportBeam(ctx, C.MAC_X, this.groundY, _beamEnvelope(beamT));
      }
    }

    // Haz de luz de la desaparición final de Hero + Mac.
    if (this.phase === 'teleportOut') {
      const beamT = (now - this.phaseStart) / C.TELEPORT_BEAM_MS;
      const beamAlpha = _beamEnvelope(beamT);
      drawTeleportBeam(ctx, Player.x, this.groundY, beamAlpha);
      drawTeleportBeam(ctx, C.MAC_X, this.groundY, beamAlpha);
    }

    if (this.phase === 'dialogue') {
      const line = POOL_DIALOGUE[this.dialogueIndex];
      const speakerBox = (line.speaker === 'mac' ? this.macBox : Player._box)
        || { x: Player.x, y: this.groundY - Player.height, w: 0, h: 0 };
      const result = drawDialogueBox(ctx, speakerBox.x + speakerBox.w / 2, speakerBox.y, 260, line.text, this.dialogueRevealCount);
      this.dialogueTotalChars = result.totalChars;
      drawPressHint(ctx, 'E per avançar', CONFIG.CANVAS_W, CONFIG.CANVAS_H, t);
    }
    // fase 'done': no se dibuja nada más (pantalla vacía); main.js detecta
    // este phase y arranca OfficeScene (ver startOfficeScene).
  }
};
