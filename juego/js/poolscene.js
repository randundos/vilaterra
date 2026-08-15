// Escena de apertura del nivel 3 (ver CONFIG.POOL_SCENE): arranca justo
// después de que el pájaro termine de fundir a negro tras la captura
// (Bird.captureSub === 'done', ver startPoolScene en main.js). Sustituye a la
// antigua pantalla estática "pròximament": el pájaro, ahora mucho más pequeño
// que en el combate, cruza el cielo sobre una piscina y deja caer un bulto
// diminuto (no se distingue bien qué es) que, al tocar el agua, crece de
// golpe -> es Hero. Suelta una línea, y se va andando hacia el jardín,
// cerrando la demo con una tarjeta final. Escena fija, sin scroll (cameraX=0
// siempre), reutiliza el propio objeto Player para la parte de Hero (mismo
// patrón que Cutscene con la cinemática inicial).
const PoolScene = {
  phase: 'flyIn', // flyIn | hover | drop | splash | grow | hop | dialogue | walkAway | end
  phaseStart: 0,
  birdX: 0,
  dropY: 0,
  fadeAlpha: 0,
  hopStartX: 0, // Player.x al empezar el salto (ver fase 'hop')
  groundY: 0,   // "suelo" actual de Player: WATER_GROUND_Y hasta el salto, DECK_GROUND_Y después

  // --- diálogo (máquina de escribir, mismo patrón que Cutscene) ---
  dialogueRevealCount: 0,
  dialogueTotalChars: 0,
  dialogueFullyShown: false,

  start(now) {
    const C = CONFIG.POOL_SCENE;
    this.phase = 'flyIn';
    this.phaseStart = now;
    this.birdX = C.BIRD_ENTRY_X;
    this.dropY = C.DROP_Y_START;
    this.fadeAlpha = 0;
    this.dialogueRevealCount = 0;
    this.dialogueTotalChars = 0;
    this.dialogueFullyShown = false;
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

  // Tecla E: solo hace algo durante el diálogo (revelar de golpe / avanzar),
  // igual que Cutscene.handleAction.
  handleAction(now) {
    if (this.phase !== 'dialogue') return;
    if (!this.dialogueFullyShown) {
      this.dialogueRevealCount = this.dialogueTotalChars || 9999;
      this.dialogueFullyShown = true;
      return;
    }
    this._setPhase(now, 'walkAway');
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
        this._setPhase(now, 'dialogue');
      }
    } else if (this.phase === 'dialogue') {
      if (!this.dialogueFullyShown) {
        this.dialogueRevealCount = Math.floor(elapsed / CONFIG.CUTSCENE.TYPE_MS_PER_CHAR);
        if (this.dialogueTotalChars && this.dialogueRevealCount >= this.dialogueTotalChars) {
          this.dialogueFullyShown = true;
        }
      }
    } else if (this.phase === 'walkAway') {
      Player.isWalking = true;
      Player.facing = 'right';
      Player.x += C.WALK_SPEED;
      if (Player.x > C.WALK_EXIT_X) this._setPhase(now, 'end');
    } else if (this.phase === 'end') {
      this.fadeAlpha = Math.min(1, this.fadeAlpha + 16.7 / C.END_FADE_MS);
    }

    Particles.update(16.7);
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
    // que Bird (ver getScaledBox en render.js).
    if (this.phase !== 'end' && ASSETS.bird.flap.length && ASSETS.bird.flap[0].complete && ASSETS.bird.stand.complete) {
      const frames = ASSETS.bird.flap;
      const idx = Math.floor(now / CONFIG.BIRD.FLAP_FRAME_MS) % frames.length;
      const img = frames[idx];
      const scale = C.BIRD_HEIGHT / ASSETS.bird.stand.height;
      const box = getScaledBox(img.width, img.height, this.birdX, C.BIRD_FLY_Y, scale);
      ctx.drawImage(img, box.x, box.y, box.w, box.h);
    }

    if (this.phase === 'grow' || this.phase === 'hop' || this.phase === 'dialogue' || this.phase === 'walkAway') {
      Player.draw(ctx, t, this.groundY, 0);
    }

    if (this.phase === 'dialogue') {
      const box = Player._box || { x: Player.x, y: this.groundY - Player.height, w: 0, h: 0 };
      const result = drawDialogueBox(ctx, box.x + box.w / 2, box.y, 260, C.LINE, this.dialogueRevealCount);
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
