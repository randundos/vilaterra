// Escena de las oficinas de Infordisa (nivel 3, parte 2 - ver
// CONFIG.OFFICE_SCENE): arranca en cuanto PoolScene llega a su fase 'done'
// (ver startOfficeScene en main.js). Hero y Mac se materializan juntos con
// el mismo haz de luz que cierra PoolScene (pero a la inversa: aparecen en
// vez de desaparecer); Mac nota que hay "massa màgia" para él y se
// teletransporta fuera con el mismo mecanismo; entra caminando Big Bross
// (mago con más conocimiento de la zona) y pide ayuda porque la màgia se le
// ha ido de las manos, ofreciendo enseñarnos un encanteri a distància a
// cambio. La escena acaba ahí (tarjeta "Continuarà..."): el reto de
// "ayudarle a mantener la màgia" y el encanteri en sí se completarán en otra
// sesión. Escena fija (cameraX=0), mismo patrón que PoolScene/Cutscene.
//
// NOTA: ASSETS.bigBross es un PLACEHOLDER (silueta genérica de mago, ver
// Visuals/bigbross_placeholder_sinfondo.png) hasta que Randu pase el sprite
// real de Big Bross. Toda la lógica de aparición/caminata/diálogo ya está
// lista: basta con sustituir el archivo (y quizás CONFIG.OFFICE_SCENE.
// BIG_BROSS_HEIGHT/HIP_FRACTION si el diseño real tiene otras proporciones).
//
// NOTA 2: las líneas de diálogo de Mac y Big Bross son un BORRADOR mío para
// poder probar el timing de la escena - lo suyo es que Randu las revise/
// sustituya por el texto definitivo en catalán (con su tono habitual).
const MAC_FAREWELL_LINES = [
  { speaker: 'mac', text: 'Uf... es nota molta màgia, aquí dins.' },
  { speaker: 'mac', text: 'Massa per al meu gust. Aquí ja no us puc ajudar més... sort a tots dos!' }
];

const BIGBROSS_LINES = [
  { speaker: 'bigbross', text: 'Vaja, vaja... visitants inesperats a aquestes hores.' },
  { speaker: 'bigbross', text: "La màgia d'aquest lloc se m'ha escapat de les mans... fa dies que no la puc controlar." },
  { speaker: 'hero', text: 'Nosaltres podem ajudar-te, si cal.' },
  { speaker: 'bigbross', text: "De debò? Doncs ajudeu-me a tornar-la a controlar, i a canvi us ensenyaré un encanteri a distància." }
];

const OfficeScene = {
  phase: 'arrive', // arrive | macDialogue | macExit | bigBrossWalk | bigBrossDialogue | end
  phaseStart: 0,
  fadeAlpha: 0,

  // --- diálogo (mismo patrón que PoolScene: máquina de escribir + cola de
  // líneas, reutilizada tanto para la despedida de Mac como para Big Bross) ---
  dialogueIndex: 0,
  dialogueStart: 0,
  dialogueRevealCount: 0,
  dialogueTotalChars: 0,
  dialogueFullyShown: false,

  macVisible: false,
  macBox: null,

  bigBrossX: 0,
  bigBrossBox: null,

  start(now) {
    const C = CONFIG.OFFICE_SCENE;
    this.phase = 'arrive';
    this.phaseStart = now;
    this.fadeAlpha = 0;
    this.dialogueIndex = 0;
    this.dialogueStart = 0;
    this.dialogueRevealCount = 0;
    this.dialogueTotalChars = 0;
    this.dialogueFullyShown = false;
    this.macVisible = false;
    this.macBox = null;
    this.bigBrossX = C.BIG_BROSS_ENTRY_X;
    this.bigBrossBox = null;
    Particles.clear();

    Player.visible = false; // se revela a mitad del haz de llegada (ver update)
    Player.shrinking = false;
    Player.attacking = false;
    Player.isWalking = false;
    Player.facing = 'right';
    Player.vy = 0;
    Player.jumpOffset = 0;
    Player.grounded = true;
    Player.dashVX = 0;
    Player.x = C.HERO_X;
    Player.height = C.HERO_HEIGHT;
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

  _updateTypewriter(now) {
    if (this.dialogueFullyShown) return;
    const dElapsed = now - this.dialogueStart;
    this.dialogueRevealCount = Math.floor(dElapsed / CONFIG.CUTSCENE.TYPE_MS_PER_CHAR);
    if (this.dialogueTotalChars && this.dialogueRevealCount >= this.dialogueTotalChars) {
      this.dialogueFullyShown = true;
    }
  },

  // Tecla E: revela la línea de golpe, o pasa a la siguiente (con los
  // efectos especiales de fin de cola: Mac se teletransporta fuera / la
  // escena acaba con la tarjeta final).
  handleAction(now) {
    if (this.phase !== 'macDialogue' && this.phase !== 'bigBrossDialogue') return;

    if (!this.dialogueFullyShown) {
      this.dialogueRevealCount = this.dialogueTotalChars || 9999;
      this.dialogueFullyShown = true;
      return;
    }

    const queue = this.phase === 'macDialogue' ? MAC_FAREWELL_LINES : BIGBROSS_LINES;
    const nextIndex = this.dialogueIndex + 1;

    if (nextIndex >= queue.length) {
      if (this.phase === 'macDialogue') {
        this._setPhase(now, 'macExit');
      } else {
        this._setPhase(now, 'end');
      }
      return;
    }

    this._startLine(now, nextIndex);
  },

  update(now) {
    const C = CONFIG.OFFICE_SCENE;
    const elapsed = now - this.phaseStart;

    if (this.phase === 'arrive') {
      // se revelan juntos en el tramo brillante del haz (ver drawTeleportBeam,
      // definido en poolscene.js y reutilizado aquí)
      if (elapsed >= C.ARRIVE_BEAM_MS * C.ARRIVE_REVEAL_FRACTION) {
        Player.visible = true;
        this.macVisible = true;
      }
      if (elapsed >= C.ARRIVE_BEAM_MS + C.POST_ARRIVE_PAUSE_MS) {
        this._startLine(now, 0);
        this._setPhase(now, 'macDialogue');
      }
    } else if (this.phase === 'macDialogue') {
      this._updateTypewriter(now);
    } else if (this.phase === 'macExit') {
      if (elapsed >= C.MAC_EXIT_BEAM_MS * C.MAC_EXIT_HIDE_FRACTION) {
        this.macVisible = false;
      }
      if (elapsed >= C.MAC_EXIT_BEAM_MS + C.POST_MAC_EXIT_PAUSE_MS) {
        this._setPhase(now, 'bigBrossWalk');
      }
    } else if (this.phase === 'bigBrossWalk') {
      this.bigBrossX -= C.BIG_BROSS_WALK_SPEED;
      if (this.bigBrossX <= C.BIG_BROSS_STOP_X) {
        this.bigBrossX = C.BIG_BROSS_STOP_X;
        this._startLine(now, 0);
        this._setPhase(now, 'bigBrossDialogue');
      }
    } else if (this.phase === 'bigBrossDialogue') {
      this._updateTypewriter(now);
    } else if (this.phase === 'end') {
      this.fadeAlpha = Math.min(1, this.fadeAlpha + 16.7 / C.END_FADE_MS);
    }

    Particles.update(16.7);
  },

  _drawMac(ctx, now) {
    if (!this.macVisible) return;
    const C = CONFIG.OFFICE_SCENE;
    const img = ASSETS.mac;
    if (!img.complete || img.width === 0) return;
    const box = getBox(img, C.MAC_X, C.GROUND_Y, C.MAC_HEIGHT);
    drawWalking(ctx, img, box, 0.62, now, false, true); // 0.62 = mismo hipFraction que Mac.hipFraction en mac.js
    this.macBox = box;
  },

  _drawBigBross(ctx, now) {
    const C = CONFIG.OFFICE_SCENE;
    const img = ASSETS.bigBross;
    if (!img.complete || img.width === 0) return;
    const box = getBox(img, this.bigBrossX, C.GROUND_Y, C.BIG_BROSS_HEIGHT);
    const walking = this.phase === 'bigBrossWalk';
    drawWalking(ctx, img, box, C.BIG_BROSS_HIP_FRACTION, now, walking, true);
    this.bigBrossBox = box;
  },

  draw(ctx, t, now) {
    const C = CONFIG.OFFICE_SCENE;
    const elapsed = now - this.phaseStart;

    if (ASSETS.officeBg.complete && ASSETS.officeBg.width > 0) {
      ctx.drawImage(ASSETS.officeBg, 0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
    }

    Particles.draw(ctx);

    Player.draw(ctx, t, C.GROUND_Y, 0);
    this._drawMac(ctx, now);
    if (this.phase === 'bigBrossWalk' || this.phase === 'bigBrossDialogue' || this.phase === 'end') {
      this._drawBigBross(ctx, now);
    }

    // Haz de luz de la llegada (Hero + Mac se materializan juntos).
    if (this.phase === 'arrive') {
      const beamAlpha = _beamEnvelope(elapsed / C.ARRIVE_BEAM_MS);
      drawTeleportBeam(ctx, C.HERO_X, C.GROUND_Y, beamAlpha);
      drawTeleportBeam(ctx, C.MAC_X, C.GROUND_Y, beamAlpha);
    }

    // Haz de luz de la salida de Mac.
    if (this.phase === 'macExit') {
      const beamAlpha = _beamEnvelope(elapsed / C.MAC_EXIT_BEAM_MS);
      drawTeleportBeam(ctx, C.MAC_X, C.GROUND_Y, beamAlpha);
    }

    if (this.phase === 'macDialogue' || this.phase === 'bigBrossDialogue') {
      const queue = this.phase === 'macDialogue' ? MAC_FAREWELL_LINES : BIGBROSS_LINES;
      const line = queue[this.dialogueIndex];
      const speakerBox = line.speaker === 'mac' ? this.macBox
        : line.speaker === 'bigbross' ? this.bigBrossBox
        : Player._box;
      const anchor = speakerBox || { x: Player.x, y: C.GROUND_Y - Player.height, w: 0, h: 0 };
      const result = drawDialogueBox(ctx, anchor.x + anchor.w / 2, anchor.y, 260, line.text, this.dialogueRevealCount);
      this.dialogueTotalChars = result.totalChars;
      drawPressHint(ctx, 'E per avançar', CONFIG.CANVAS_W, CONFIG.CANVAS_H, t);
    }

    if (this.phase === 'end') {
      ctx.save();
      ctx.fillStyle = `rgba(5, 8, 18, ${this.fadeAlpha})`;
      ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

      ctx.globalAlpha = this.fadeAlpha;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const cx = CONFIG.CANVAS_W / 2, cy = CONFIG.CANVAS_H / 2;

      ctx.font = 'italic bold 40px Georgia, "Times New Roman", serif';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#f3e6c8';
      ctx.fillText('Continuarà...', cx, cy - 22);

      ctx.shadowBlur = 0;
      ctx.font = '20px Trebuchet MS';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
      ctx.fillStyle = '#c9a86a';
      ctx.fillText('Gràcies per jugar la demo!', cx, cy + 28);
      ctx.restore();
    }
  }
};
