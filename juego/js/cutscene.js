// Orquesta la cinemática inicial completa:
// meteorito -> impacto -> Blai emerge preocupado -> diálogo (E avanza) ->
// selector Sí/No (flechas arriba/abajo mueven, E confirma) -> según respuesta:
//   Sí: Blai da la pista, corre y sale -> fundido a negro -> jugabilidad
//   No: Blai corre y sale, luego Hero se da la vuelta y se va -> "FI" +
//       créditos falsos -> fin (no pasa a la jugabilidad)
const LINE_LOST_CUB = "Ai no! El meu Cub! La Bruna m'ha robat el Cub!";
const LINE_ASK_HELP = "Ei noi, em podries ajudar si us plau? he perdut el Cub!";
const LINE_THANKS = "Moltes gràcies, has d'anar a l'església de Sant Joan. Allà està la Bruna.";

const CREDITS = [
  "Director Creativo", "Director Ejecutivo", "Guionista", "Programador Jefe",
  "Diseñador de Personajes", "Animador Principal", "Compositor de la Banda Sonora",
  "Diseñador de Niveles", "Responsable de Testing", "Traductor al Català",
  "Community Manager", "Diseñador de Sonido", "Responsable de Marketing",
  "Catering", "Seguridad del Estudio", "Conserje", "Café y Moral del Equipo",
  "Becario", "Agradecimientos Especiales"
].map((role) => ({ role, name: 'Albert Ferrando' }));

const Cutscene = {
  finished: false,
  // meteor-fall | impact-shake | blai-emerge | dialogue | selector |
  // blai-run | wait-skip | fade-out | hero-leaves | credits
  phase: 'meteor-fall',
  shakeUntil: 0,
  fadeAlpha: 0,
  craterDrawn: false,

  // --- diálogo (cola de líneas reutilizable) ---
  dialogueQueue: [],
  dialogueIndex: 0,
  dialogueStart: 0,
  dialogueRevealCount: 0,
  dialogueTotalChars: 0,
  dialogueFullyShown: false,
  onDialogueDone: null,

  // --- selector Sí/No ---
  selectorIndex: 0, // 0 = Sí, 1 = No

  // a qué fase pasar cuando Blai termine de correr y salir de pantalla
  nextPhaseAfterBlaiRun: 'wait-skip',

  // --- créditos ---
  credits: { subphase: 'fi-drop', subphaseStart: 0, scrollOffset: 0 },

  start(now) {
    this.finished = false;
    this.phase = 'meteor-fall';
    this.craterDrawn = false;
    this.fadeAlpha = 0;
    Meteor.start();
    Particles.clear();
  },

  beginDialogue(now, lines, onDone) {
    this.dialogueQueue = lines;
    this.dialogueIndex = 0;
    this.dialogueStart = now;
    this.dialogueRevealCount = 0;
    this.dialogueTotalChars = 0;
    this.dialogueFullyShown = false;
    this.onDialogueDone = onDone;
    this.phase = 'dialogue';
  },

  // Tecla E: su efecto depende de la fase actual.
  handleAction(now) {
    if (this.phase === 'dialogue') {
      if (!this.dialogueFullyShown) {
        this.dialogueRevealCount = this.dialogueTotalChars || 9999;
        this.dialogueFullyShown = true;
        return;
      }
      this.dialogueIndex++;
      // segunda línea de la cola inicial -> Blai señala hacia Hero
      const nextLine = this.dialogueQueue[this.dialogueIndex];
      Blai.pose = (nextLine === LINE_ASK_HELP) ? 'pointing' : 'shock';
      if (this.dialogueIndex < this.dialogueQueue.length) {
        this.dialogueStart = now;
        this.dialogueRevealCount = 0;
        this.dialogueTotalChars = 0;
        this.dialogueFullyShown = false;
      } else {
        const cb = this.onDialogueDone;
        this.onDialogueDone = null;
        if (cb) cb(now);
      }
    } else if (this.phase === 'selector') {
      if (this.selectorIndex === 0) {
        // Sí -> Blai da la pista y luego se va -> fundido a negro -> jugabilidad
        this.beginDialogue(now, [LINE_THANKS], (n) => {
          Blai.startRunning(n);
          this.nextPhaseAfterBlaiRun = 'wait-skip';
          this.phase = 'blai-run';
        });
      } else {
        // No -> primero se va Blai, luego se va Hero, y ahí acaba la aventura
        Blai.startRunning(now);
        this.nextPhaseAfterBlaiRun = 'hero-leaves';
        this.phase = 'blai-run';
      }
    } else if (this.phase === 'wait-skip') {
      this.phase = 'fade-out';
      this.fadeAlpha = 0;
    }
  },

  handleMenuUp() {
    if (this.phase === 'selector') this.selectorIndex = 0;
  },
  handleMenuDown() {
    if (this.phase === 'selector') this.selectorIndex = 1;
  },

  update(now) {
    if (this.phase === 'meteor-fall') {
      Meteor.update(now);
      if (Meteor.landed) {
        spawnExplosion(Meteor.x, Meteor.y);
        this.shakeUntil = now + CONFIG.CUTSCENE.SHAKE_MS;
        this.craterDrawn = true;
        this.phase = 'impact-shake';
      }
    } else if (this.phase === 'impact-shake') {
      if (now >= this.shakeUntil) {
        Blai.startAt(Meteor.x, CONFIG.CANVAS_H * CONFIG.GROUND_Y_RATIO, now);
        this.phase = 'blai-emerge';
      }
    } else if (this.phase === 'blai-emerge') {
      Blai.update(now);
      if (Blai.state === 'shock') {
        this.beginDialogue(now, [LINE_LOST_CUB, LINE_ASK_HELP], () => {
          this.phase = 'selector';
          this.selectorIndex = 0;
        });
      }
    } else if (this.phase === 'dialogue') {
      if (!this.dialogueFullyShown) {
        const elapsed = now - this.dialogueStart;
        this.dialogueRevealCount = Math.floor(elapsed / CONFIG.CUTSCENE.TYPE_MS_PER_CHAR);
        if (this.dialogueTotalChars && this.dialogueRevealCount >= this.dialogueTotalChars) {
          this.dialogueFullyShown = true;
        }
      }
    } else if (this.phase === 'blai-run') {
      Blai.update(now);
      if (Blai.state === 'done') {
        this.phase = this.nextPhaseAfterBlaiRun;
      }
    } else if (this.phase === 'hero-leaves') {
      this._updateHeroLeave(now);
    } else if (this.phase === 'credits') {
      this._updateCredits(now);
    } else if (this.phase === 'fade-out') {
      this.fadeAlpha = Math.min(1, this.fadeAlpha + CONFIG.CUTSCENE.FADE_STEP);
      if (this.fadeAlpha >= 1) {
        this.finished = true;
      }
    }

    Particles.update(16.7);
  },

  _updateHeroLeave(now) {
    Player.facing = 'left';
    Player.isWalking = true;
    Player.x -= CONFIG.CUTSCENE.RUN_SPEED;
    if (Player.x < -100) {
      this.phase = 'credits';
      this.credits.subphase = 'fi-drop';
      this.credits.subphaseStart = now;
      this.credits.scrollOffset = 0;
    }
  },

  _updateCredits(now) {
    const c = this.credits;
    const elapsed = now - c.subphaseStart;

    if (c.subphase === 'fi-drop') {
      if (elapsed >= 900) { c.subphase = 'fi-hold'; c.subphaseStart = now; }
    } else if (c.subphase === 'fi-hold') {
      if (elapsed >= 900) { c.subphase = 'rolling'; c.subphaseStart = now; c.scrollOffset = 0; }
    } else if (c.subphase === 'rolling') {
      c.scrollOffset += 0.6;
      const totalHeight = CREDITS.length * 42 + CONFIG.CANVAS_H;
      if (c.scrollOffset > totalHeight) {
        c.subphase = 'done';
      }
    }
    // 'done': se queda quieto con el mensaje final
  },

  draw(ctx, t) {
    const now = performance.now();
    const shaking = this.phase === 'impact-shake' && now < this.shakeUntil;

    ctx.save();
    if (shaking) {
      ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
    }

    ctx.drawImage(ASSETS.bg, 0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
    drawNightOverlay(ctx, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

    Player.draw(ctx, t, CONFIG.CANVAS_H * CONFIG.GROUND_Y_RATIO);

    if (this.craterDrawn) {
      ctx.save();
      ctx.fillStyle = 'rgba(20,15,10,0.55)';
      ctx.beginPath();
      ctx.ellipse(Meteor.x, Meteor.y + 4, 34, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    Meteor.draw(ctx);
    Particles.draw(ctx);

    const blaiVisible = [
      'blai-emerge', 'dialogue', 'selector', 'blai-run', 'wait-skip',
      'hero-leaves', 'credits'
    ].includes(this.phase);
    if (blaiVisible) {
      Blai.draw(ctx, t);
    }

    if (this.phase === 'dialogue') {
      const img = Blai.pose === 'pointing' ? ASSETS.blaiPoint : ASSETS.blaiShock;
      const box = getBox(img, Blai.x, Blai.groundY, Blai.height);
      const text = this.dialogueQueue[this.dialogueIndex] || '';
      const result = drawDialogueBox(ctx, box.x + box.w / 2, box.y, 260, text, this.dialogueRevealCount);
      this.dialogueTotalChars = result.totalChars;
      drawPressHint(ctx, 'E per avançar', CONFIG.CANVAS_W, CONFIG.CANVAS_H, t);
    }

    if (this.phase === 'wait-skip') {
      drawPressHint(ctx, 'E per avançar', CONFIG.CANVAS_W, CONFIG.CANVAS_H, t);
    }

    if (this.phase === 'selector') {
      this._drawSelector(ctx);
    }

    ctx.restore();

    if (this.phase === 'credits') {
      this._drawCredits(ctx);
    }

    if (this.fadeAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.fadeAlpha;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
      ctx.restore();
    }
  },

  _drawSelector(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

    const boxW = 240, boxH = 120;
    const x = CONFIG.CANVAS_W / 2 - boxW / 2;
    const y = CONFIG.CANVAS_H / 2 - boxH / 2;

    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x, y, boxW, boxH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#222';
    ctx.font = 'bold 16px Trebuchet MS';
    ctx.fillText("Vols ajudar en Blai?", CONFIG.CANVAS_W / 2, y + 28);

    const options = ['Sí', 'No'];
    options.forEach((opt, i) => {
      const oy = y + 62 + i * 32;
      const selected = this.selectorIndex === i;
      ctx.fillStyle = selected ? '#d1440a' : '#222';
      ctx.font = selected ? 'bold 20px Trebuchet MS' : '18px Trebuchet MS';
      ctx.fillText((selected ? '▶ ' : '') + opt, CONFIG.CANVAS_W / 2, oy);
    });

    ctx.font = '12px Trebuchet MS';
    ctx.fillStyle = '#555';
    ctx.fillText('↑ arriba · ↓ abajo · E para elegir', CONFIG.CANVAS_W / 2, y + boxH - 8);

    ctx.restore();
  },

  _drawCredits(ctx) {
    const c = this.credits;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

    // "FI" cayendo desde arriba y quedándose fijo
    let fiY;
    if (c.subphase === 'fi-drop') {
      const p = Math.min(1, (performance.now() - c.subphaseStart) / 900);
      const eased = 1 - Math.pow(1 - p, 3);
      fiY = -50 + eased * (CONFIG.CANVAS_H * 0.32 + 50);
    } else {
      fiY = CONFIG.CANVAS_H * 0.32;
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.font = 'bold 64px Trebuchet MS';
    ctx.strokeText('FI', CONFIG.CANVAS_W / 2, fiY);
    ctx.fillText('FI', CONFIG.CANVAS_W / 2, fiY);

    if (c.subphase === 'rolling' || c.subphase === 'done') {
      const lineHeight = 42;
      const startY = CONFIG.CANVAS_H + 40 - c.scrollOffset;
      CREDITS.forEach((cr, i) => {
        const y = startY + i * lineHeight;
        if (y > -lineHeight && y < CONFIG.CANVAS_H + lineHeight) {
          ctx.fillStyle = '#ffd447';
          ctx.font = 'bold 18px Trebuchet MS';
          ctx.fillText(cr.role, CONFIG.CANVAS_W / 2, y);
          ctx.fillStyle = '#fff';
          ctx.font = '16px Trebuchet MS';
          ctx.fillText(cr.name, CONFIG.CANVAS_W / 2, y + 20);
        }
      });

      if (c.subphase === 'done') {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Trebuchet MS';
        ctx.fillText('Gràcies per jugar!', CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2);
      }
    }

    ctx.restore();
  }
};
