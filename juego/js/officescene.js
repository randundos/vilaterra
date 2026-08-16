// Escena de las oficinas de Infordisa (nivel 3, parte 2 - ver
// CONFIG.OFFICE_SCENE): arranca en cuanto PoolScene llega a su fase 'done'
// (ver startOfficeScene en main.js). Hero y Mac se materializan juntos con
// el mismo haz de luz que cierra PoolScene (pero a la inversa: aparecen en
// vez de desaparecer); Mac nota que hay "massa màgia" para él y se
// teletransporta fuera con el mismo mecanismo; entra flotando Big Bross
// (mago con más conocimiento de la zona, sentado sobre su nube - ver
// ASSETS.bigBross) y pide ayuda porque la màgia se le ha ido de las manos,
// ofreciendo enseñarnos un encanteri a distància a cambio. En cuanto acaba
// de hablar entra el sapo mago (primer enemigo del nivel, ver CONFIG.TOAD/
// toad.js), dice "Croac!", Big Bross reacciona y se marcha (mismo haz de
// luz), y Hero recupera el control (fase 'freeRoam'): mismo encuadre fijo,
// sin scroll, con el sapo ya activo como enemigo real (patrulla/ataca a
// distancia, muere de un golpe). La escena acaba ahí (tarjeta
// "Continuarà...") en cuanto el sapo muere: el resto (ayudar a Big Bross a
// mantener la màgia de verdad, el encanteri en sí) se completará en otra
// sesión. Escena fija (cameraX=0), mismo patrón que PoolScene/Cutscene.
//
// NOTA: las líneas de diálogo de Mac y Big Bross son un BORRADOR mío para
// poder probar el timing de la escena - lo suyo es que Randu las revise/
// sustituya por el texto definitivo en catalán (con su tono habitual). Las
// del sapo/Big Bross en la reacción ("Croac!" / "Ho veus! Ajudam siusplau!")
// son las que Randu pasó tal cual.
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

// Variantes de color pre-renderizadas de Big Bross (ver _drawBigBross): en
// vez de aplicar ctx.filter = hue-rotate(...) en directo cada frame (caro en
// canvas 2D, sobre todo repetido 60 veces por segundo), se generan N
// lienzos fuera de pantalla UNA sola vez por imagen (normal/sorpresa), cada
// uno ya "teñido", y luego cada frame solo hace falta un drawImage normal
// del lienzo más cercano al tono actual -> mismo efecto visual, sin el coste
// del filtro en directo.
const HUE_VARIANT_STEPS = 24;
const _hueVariantCache = new Map();
function getHueVariants(img) {
  if (!img.complete || img.width === 0) return null;
  let variants = _hueVariantCache.get(img);
  if (variants) return variants;
  variants = [];
  for (let i = 0; i < HUE_VARIANT_STEPS; i++) {
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const cctx = c.getContext('2d');
    cctx.filter = `hue-rotate(${(360 * i) / HUE_VARIANT_STEPS}deg)`;
    cctx.drawImage(img, 0, 0);
    variants.push(c);
  }
  _hueVariantCache.set(img, variants);
  return variants;
}

const TOAD_INTRO_LINES = [
  { speaker: 'toad', text: 'Croac!' },
  { speaker: 'bigbross', text: 'Ho veus! Ajudam siusplau!' }
];

const OfficeScene = {
  // arrive | macDialogue | macExit | bigBrossWalk (en realidad flota, ver
  // _drawBigBross) | bigBrossDialogue | toadEnter | toadDialogue |
  // bigBrossExit | freeRoam | end
  phase: 'arrive',
  phaseStart: 0,
  fadeAlpha: 0,

  // --- diálogo (mismo patrón que PoolScene: máquina de escribir + cola de
  // líneas, reutilizada para Mac, Big Bross y el sapo) ---
  dialogueIndex: 0,
  dialogueStart: 0,
  dialogueRevealCount: 0,
  dialogueTotalChars: 0,
  dialogueFullyShown: false,

  macVisible: false,
  macBox: null,

  bigBrossVisible: false,
  bigBrossX: 0,
  bigBrossBox: null,
  _bigBrossGoneAt: null, // primer instante en que sale del todo de pantalla al irse (ver fase 'bigBrossExit')

  toadVisible: false,
  _toadDeadAt: null, // primer instante en que Toad.alive pasa a false del todo (ver update, fase 'freeRoam')

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
    this.bigBrossVisible = false;
    this.bigBrossX = C.BIG_BROSS_ENTRY_X;
    this.bigBrossBox = null;
    this._bigBrossGoneAt = null;
    this.toadVisible = false;
    this._toadDeadAt = null;
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

    Toad.init(C.TOAD_ENTRY_X, C.GROUND_Y);
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

  // Una vez Big Bross se ha ido, Hero recupera el control: mismo encuadre
  // fijo (sin scroll), sin agujeros ni plataformas, y el sapo pasa a
  // atacar/patrullar por su cuenta (ver Toad.activate).
  _enterFreeRoam(now) {
    const C = CONFIG.OFFICE_SCENE;
    Player.height = CONFIG.HERO_HEIGHT_GAMEPLAY;
    Player.levelWidth = C.FREE_ROAM_LEVEL_WIDTH;
    Player.pits = [];
    Player.platforms = [];
    Toad.activate(now);
  },

  // Igual que restartSmallWorld/restartLevel1 (ver updateDeathScene en
  // main.js), pero sin repetir toda la cinemática de llegada: solo repone a
  // Hero y al sapo, y sigue en 'freeRoam'.
  restartFreeRoam(now) {
    const C = CONFIG.OFFICE_SCENE;
    Player.x = C.HERO_X;
    Player.facing = 'right';
    Player.vy = 0;
    Player.jumpOffset = 0;
    Player.grounded = true;
    Player.jumpsUsed = 0;
    Player.dashVX = 0;
    Player.isWalking = false;
    Player.health = CONFIG.HERO_MAX_HEALTH;
    Player.invulnerableUntil = 0;
    Pickups.items = [];
    this._toadDeadAt = null;
    Toad.init(C.TOAD_STOP_X, C.GROUND_Y);
    Toad.activate(now);
  },

  // Tecla E: en diálogo revela la línea de golpe o pasa a la siguiente (con
  // los efectos especiales de fin de cola: Mac se teletransporta fuera, el
  // sapo entra en escena, Big Bross se despide y se va); en 'freeRoam' es el
  // ataque de Hero (igual que en jugabilidad normal).
  handleAction(now) {
    if (this.phase === 'freeRoam') {
      Player.attack(now);
      return;
    }

    if (this.phase !== 'macDialogue' && this.phase !== 'bigBrossDialogue' && this.phase !== 'toadDialogue') return;
    const C = CONFIG.OFFICE_SCENE;

    if (!this.dialogueFullyShown) {
      this.dialogueRevealCount = this.dialogueTotalChars || 9999;
      this.dialogueFullyShown = true;
      return;
    }

    const queue = this.phase === 'macDialogue' ? MAC_FAREWELL_LINES
      : this.phase === 'bigBrossDialogue' ? BIGBROSS_LINES
      : TOAD_INTRO_LINES;
    const nextIndex = this.dialogueIndex + 1;

    if (nextIndex >= queue.length) {
      if (this.phase === 'macDialogue') {
        this._setPhase(now, 'macExit');
      } else if (this.phase === 'bigBrossDialogue') {
        this.toadVisible = true;
        Toad.state = 'walk';
        Toad.stateStart = now;
        this._setPhase(now, 'toadEnter');
      } else {
        this._setPhase(now, 'bigBrossExit');
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
        this.bigBrossVisible = true;
        this._setPhase(now, 'bigBrossWalk');
      }
    } else if (this.phase === 'bigBrossWalk') {
      this.bigBrossX -= C.BIG_BROSS_FLOAT_SPEED;
      if (this.bigBrossX <= C.BIG_BROSS_STOP_X) {
        this.bigBrossX = C.BIG_BROSS_STOP_X;
        this._startLine(now, 0);
        this._setPhase(now, 'bigBrossDialogue');
      }
    } else if (this.phase === 'bigBrossDialogue') {
      this._updateTypewriter(now);
    } else if (this.phase === 'toadEnter') {
      Toad.x -= C.TOAD_ENTER_SPEED;
      if (Toad.x <= C.TOAD_STOP_X) {
        Toad.x = C.TOAD_STOP_X;
        Toad.state = 'idle';
        Toad.stateStart = now;
        this._startLine(now, 0);
        this._setPhase(now, 'toadDialogue');
      }
    } else if (this.phase === 'toadDialogue') {
      this._updateTypewriter(now);
    } else if (this.phase === 'bigBrossExit') {
      // se va flotando hacia la izquierda (sin teletransporte) hasta salir
      // del todo de la pantalla; en cuanto sale, una pequeña pausa antes de
      // que Hero recupere el control.
      this.bigBrossX -= C.BIGBROSS_EXIT_SPEED;
      if (this.bigBrossX <= C.BIGBROSS_EXIT_OFF_X) {
        this.bigBrossX = C.BIGBROSS_EXIT_OFF_X;
        this.bigBrossVisible = false;
        if (this._bigBrossGoneAt == null) this._bigBrossGoneAt = now;
        if (now - this._bigBrossGoneAt >= C.POST_BIGBROSS_EXIT_PAUSE_MS) {
          this._setPhase(now, 'freeRoam');
          this._enterFreeRoam(now);
        }
      }
    } else if (this.phase === 'freeRoam') {
      Player.update();
      checkToadSwordHit(now, Player);
      checkToadStomp(now, Player);
      Toad.update(now, Player);
      Pickups.update(now, Player, C.GROUND_Y, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
      if (!Toad.alive && this.phase === 'freeRoam' && this._toadDeadAt == null) {
        this._toadDeadAt = now; // primer frame en que el sapo ya ha desaparecido del todo
      }
      if (this._toadDeadAt != null && now - this._toadDeadAt >= 900) {
        this._setPhase(now, 'end');
      }
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

  // Big Bross no anda: flota sentado sobre su nube (ya integrada en el
  // propio sprite, incluido el fondo de galaxia bajo la nube), con un ligero
  // vaivén vertical tipo "hover" (igual que el pájaro) en vez de un ciclo de
  // piernas. Su cuerpo verde se cicla constantemente de color con un filtro
  // hue-rotate, a petición de Randu ("quiero que vaya cambiando de color
  // constantemente"). Cambia a la pose de sorpresa (ASSETS.bigBrossShock, ya
  // volteada para mirar a la derecha) en cuanto ve entrar al sapo, y vuelve
  // a la normal (ASSETS.bigBross) al empezar a hablar (ver _isShocked).
  _isShocked() {
    return this.phase === 'toadEnter' || (this.phase === 'toadDialogue' && this.dialogueIndex === 0);
  },

  _drawBigBross(ctx, now) {
    if (!this.bigBrossVisible) return;
    const C = CONFIG.OFFICE_SCENE;
    const img = this._isShocked() ? ASSETS.bigBrossShock : ASSETS.bigBross;
    if (!img.complete || img.width === 0) return;
    const bobY = Math.sin(now * C.BIG_BROSS_HOVER_SPEED) * C.BIG_BROSS_HOVER_AMPLITUDE;
    const box = getBox(img, this.bigBrossX, C.GROUND_Y + bobY, C.BIG_BROSS_HEIGHT);

    const variants = getHueVariants(img);
    if (variants) {
      const hueFrac = (now % C.BIG_BROSS_HUE_CYCLE_MS) / C.BIG_BROSS_HUE_CYCLE_MS;
      const idx = Math.floor(hueFrac * HUE_VARIANT_STEPS) % HUE_VARIANT_STEPS;
      ctx.drawImage(variants[idx], box.x, box.y, box.w, box.h);
    } else {
      ctx.drawImage(img, box.x, box.y, box.w, box.h); // fallback puntual mientras la sheet aún no ha cargado
    }
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
    this._drawBigBross(ctx, now);
    if (this.toadVisible) drawToad(ctx, now);
    Pickups.draw(ctx, now, 0);

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

    if (this.phase === 'macDialogue' || this.phase === 'bigBrossDialogue' || this.phase === 'toadDialogue') {
      const queue = this.phase === 'macDialogue' ? MAC_FAREWELL_LINES
        : this.phase === 'bigBrossDialogue' ? BIGBROSS_LINES
        : TOAD_INTRO_LINES;
      const line = queue[this.dialogueIndex];
      const speakerBox = line.speaker === 'mac' ? this.macBox
        : line.speaker === 'bigbross' ? this.bigBrossBox
        : line.speaker === 'toad' ? Toad._box
        : Player._box;
      const anchor = speakerBox || { x: Player.x, y: C.GROUND_Y - Player.height, w: 0, h: 0 };
      const result = drawDialogueBox(ctx, anchor.x + anchor.w / 2, anchor.y, 260, line.text, this.dialogueRevealCount);
      this.dialogueTotalChars = result.totalChars;
      drawPressHint(ctx, 'E per avançar', CONFIG.CANVAS_W, CONFIG.CANVAS_H, t);
    }

    if (this.phase === 'freeRoam') {
      drawHealthBar(ctx, Player.health / CONFIG.HERO_MAX_HEALTH);
      drawBraceletCounter(ctx, CONFIG.CANVAS_W, CONFIG.CANVAS_H, Player.bracelets);
      if (deathPhase) drawDeathOverlay(ctx, now, deathStart);
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
