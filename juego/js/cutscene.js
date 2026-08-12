// Orquesta la cinemática inicial: cae el meteorito, impacta (shake + explosión
// + cráter), Blai emerge y sale corriendo, y hace un fundido a negro antes de
// pasar a la jugabilidad. Hero permanece de fondo observando toda la escena.
const Cutscene = {
  finished: false,
  phase: 'meteor-fall', // meteor-fall | impact-shake | blai | fade-out | done
  shakeUntil: 0,
  fadeAlpha: 0,
  craterDrawn: false,

  start(now) {
    this.finished = false;
    this.phase = 'meteor-fall';
    this.craterDrawn = false;
    this.fadeAlpha = 0;
    Meteor.start();
    Particles.clear();
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
        this.phase = 'blai';
      }
    } else if (this.phase === 'blai') {
      Blai.update(now);
      if (Blai.state === 'done') {
        this.phase = 'fade-out';
        this.fadeAlpha = 0;
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

    if (this.phase === 'blai' || this.phase === 'fade-out') {
      Blai.draw(ctx, t);
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
