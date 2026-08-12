// Orquesta la cinemática inicial: cae el meteorito, impacta (shake + explosión
// + cráter), Blai emerge preocupado y habla (el jugador avanza el texto con
// E), sale corriendo, y espera otra pulsación de E para hacer el fundido a
// negro y pasar a la jugabilidad. Hero permanece de fondo observando todo.
const BLAI_LINE = "Ei noi, em podries ajudar si us plau? he perdut el Cub!";

const Cutscene = {
  finished: false,
  // meteor-fall | impact-shake | blai-emerge | dialogue | blai-run | wait-skip | fade-out
  phase: 'meteor-fall',
  shakeUntil: 0,
  fadeAlpha: 0,
  craterDrawn: false,

  dialogueStart: 0,
  dialogueRevealCount: 0,
  dialogueTotalChars: 0,
  dialogueFullyShown: false,

  start(now) {
    this.finished = false;
    this.phase = 'meteor-fall';
    this.craterDrawn = false;
    this.fadeAlpha = 0;
    this.dialogueRevealCount = 0;
    this.dialogueTotalChars = 0;
    this.dialogueFullyShown = false;
    Meteor.start();
    Particles.clear();
  },

  // Lo dispara Input al pulsar E. Su efecto depende de en qué fase estemos.
  handleAction(now) {
    if (this.phase === 'dialogue') {
      if (!this.dialogueFullyShown) {
        // primera pulsación: completa el texto de golpe en vez de esperar
        this.dialogueRevealCount = this.dialogueTotalChars || 9999;
        this.dialogueFullyShown = true;
      } else {
        // segunda pulsación: Blai sale corriendo
        Blai.startRunning(now);
        this.phase = 'blai-run';
      }
    } else if (this.phase === 'wait-skip') {
      this.phase = 'fade-out';
      this.fadeAlpha = 0;
    }
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
        this.phase = 'dialogue';
        this.dialogueStart = now;
        this.dialogueRevealCount = 0;
        this.dialogueFullyShown = false;
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
        this.phase = 'wait-skip';
      }
    } else if (this.phase === 'fade-out') {
      this.fadeAlpha = Math.min(1, this.fadeAlpha + CONFIG.CUTSCENE.FADE_STEP);
      if (this.fadeAlpha >= 1) {
        this.finished = true;
      }
    }

    Particles.update(16.7);
  },

  draw(ctx, t) {
    const now = performance.now();
    const shaking = this.phase === 'impact-shake' && now < this.shakeUntil;

    ctx.save();
    if (shaking) {
      ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
    }

    // fondo nocturno (reutiliza el fondo del nivel con un tinte encima)
    ctx.drawImage(ASSETS.bg, 0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
    drawNightOverlay(ctx, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

    // Hero observando la escena desde su posición inicial
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

    const blaiVisible = ['blai-emerge', 'dialogue', 'blai-run', 'wait-skip'].includes(this.phase);
    if (blaiVisible) {
      Blai.draw(ctx, t);
    }

    if (this.phase === 'dialogue') {
      const box = getBox(ASSETS.blaiShock, Blai.x, Blai.groundY, Blai.height);
      const result = drawDialogueBox(ctx, box.x + box.w / 2, box.y, 260, BLAI_LINE, this.dialogueRevealCount);
      this.dialogueTotalChars = result.totalChars;
      drawPressHint(ctx, 'E per avançar', CONFIG.CANVAS_W, CONFIG.CANVAS_H, t);
    }

    if (this.phase === 'wait-skip') {
      drawPressHint(ctx, 'E per avançar', CONFIG.CANVAS_W, CONFIG.CANVAS_H, t);
    }

    ctx.restore();

    if (this.fadeAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.fadeAlpha;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
      ctx.restore();
    }
  }
};
