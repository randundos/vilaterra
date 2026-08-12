// Blai solo existe en la cinemática inicial: emerge del cráter del meteorito,
// se lleva las manos a la cabeza y sale corriendo. No es controlable por el
// jugador (eso es Hero, ver player.js) — es un personaje "de escena".
const Blai = {
  x: 0,
  groundY: 0,
  height: 150,
  hipFraction: 0.58,
  state: 'hidden', // hidden | emerging | idle | shock-up | shock-hold | shock-down | running | done
  stateStart: 0,
  scale: 0,
  armProgress: 0,
  runDirX: 1, // 1 = corre hacia la derecha y sale de pantalla por ahí

  startAt(x, groundY, now) {
    this.x = x;
    this.groundY = groundY;
    this.state = 'emerging';
    this.stateStart = now;
    this.scale = 0;
    this.armProgress = 0;
  },

  _next(now, state) {
    this.state = state;
    this.stateStart = now;
  },

  update(now) {
    const elapsed = now - this.stateStart;
    const C = CONFIG.CUTSCENE;

    switch (this.state) {
      case 'emerging':
        this.scale = Math.min(1, elapsed / C.EMERGE_MS);
        if (elapsed >= C.EMERGE_MS) this._next(now, 'idle');
        break;
      case 'idle':
        if (elapsed >= C.HOLD_AFTER_EMERGE_MS) this._next(now, 'shock-up');
        break;
      case 'shock-up':
        this.armProgress = Math.min(1, elapsed / C.ARMS_UP_MS);
        if (elapsed >= C.ARMS_UP_MS) this._next(now, 'shock-hold');
        break;
      case 'shock-hold':
        if (elapsed >= C.HOLD_SHOCK_MS) this._next(now, 'shock-down');
        break;
      case 'shock-down':
        this.armProgress = 1 - Math.min(1, elapsed / C.ARMS_DOWN_MS);
        if (elapsed >= C.ARMS_DOWN_MS) this._next(now, 'running');
        break;
      case 'running':
        this.x += C.RUN_SPEED * this.runDirX;
        if (this.x > CONFIG.CANVAS_W + 100 || this.x < -100) {
          this.state = 'done';
        }
        break;
      default:
        break;
    }
  },

  draw(ctx, t) {
    if (this.state === 'hidden' || this.state === 'done') return;

    const box = getBox(ASSETS.blai, this.x, this.groundY, this.height);

    ctx.save();
    if (this.runDirX < 0) {
      const c = box.x + box.w / 2;
      ctx.translate(c, 0);
      ctx.scale(-1, 1);
      ctx.translate(-c, 0);
    }

    if (this.state === 'emerging') {
      // crece desde el suelo del cráter hacia arriba
      ctx.save();
      const pivotX = box.x + box.w / 2;
      const pivotY = box.y + box.h;
      ctx.translate(pivotX, pivotY);
      ctx.scale(this.scale, this.scale);
      ctx.translate(-pivotX, -pivotY);
      drawWalking(ctx, ASSETS.blai, box, this.hipFraction, t, false, false);
      ctx.restore();
    } else if (this.state === 'shock-up' || this.state === 'shock-hold' || this.state === 'shock-down') {
      drawShocked(ctx, ASSETS.blai, box, this.armProgress);
    } else if (this.state === 'running') {
      drawWalking(ctx, ASSETS.blai, box, this.hipFraction, t, true, true);
    } else {
      drawWalking(ctx, ASSETS.blai, box, this.hipFraction, t, false, true);
    }

    ctx.restore();
  }
};
