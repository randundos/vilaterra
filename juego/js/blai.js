// Blai solo existe en la cinemática inicial: emerge del cráter del meteorito,
// se queda con las manos a la cabeza (esperando a que el jugador avance el
// diálogo) y sale corriendo. No es controlable por el jugador (eso es Hero,
// ver player.js) — es un personaje "de escena".
const Blai = {
  x: 0,
  groundY: 0,
  height: 150,
  hipFraction: 0.58,
  state: 'hidden', // hidden | emerging | idle | shock | running | done
  pose: 'shock',   // 'shock' | 'pointing' -> qué imagen usar mientras state === 'shock'
  stateStart: 0,
  scale: 0,
  runDirX: 1, // 1 = corre hacia la derecha y sale de pantalla por ahí

  startAt(x, groundY, now) {
    this.x = x;
    this.groundY = groundY;
    this.state = 'emerging';
    this.pose = 'shock';
    this.stateStart = now;
    this.scale = 0;
  },

  // Lo llama Cutscene cuando el jugador ha terminado de leer el diálogo
  // (pulsando E la segunda vez) -> arranca a correr y sale de pantalla.
  startRunning(now) {
    this.state = 'running';
    this.stateStart = now;
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
        if (elapsed >= C.HOLD_AFTER_EMERGE_MS) this._next(now, 'shock');
        break;
      case 'shock':
        // se queda quieto (pose de la imagen "preocupado") hasta que
        // Cutscene llame a startRunning() al terminar el diálogo
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

    let img = ASSETS.blai;
    if (this.state === 'shock') {
      img = (this.pose === 'pointing') ? ASSETS.blaiPoint : ASSETS.blaiShock;
    }
    const box = getBox(img, this.x, this.groundY, this.height);

    ctx.save();
    if (this.state === 'running' && this.runDirX > 0) {
      // el sprite mira de forma natural hacia la izquierda, así que se
      // voltea al correr hacia la derecha
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
    } else if (this.state === 'shock') {
      // imagen real de Blai preocupado, con un balanceo idle muy sutil
      const bob = Math.sin(t * 0.003) * 1.5;
      ctx.drawImage(img, box.x, box.y + bob, box.w, box.h);
    } else if (this.state === 'running') {
      drawWalking(ctx, ASSETS.blai, box, this.hipFraction, t, true, true);
    } else {
      drawWalking(ctx, ASSETS.blai, box, this.hipFraction, t, false, true);
    }

    ctx.restore();
  }
};
