// Gestión de teclado. Expone el estado de A/D como booleanos, y dispara
// callbacks onJump / onDash cuando corresponde (Espacio simple vs doble).
const Input = {
  keys: { a: false, d: false },
  onJump: null,
  onDash: null,
  _lastSpaceTime: -Infinity,

  init() {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'a') this.keys.a = true;
      if (k === 'd') this.keys.d = true;

      if (k === ' ' || e.code === 'Space') {
        e.preventDefault(); // evita que la página haga scroll
        if (!e.repeat) {
          const now = performance.now();
          if (now - this._lastSpaceTime < CONFIG.DOUBLE_TAP_MS) {
            // doble espacio rápido -> empujón
            this._lastSpaceTime = -Infinity;
            if (this.onDash) this.onDash();
          } else {
            // espacio simple -> salto
            this._lastSpaceTime = now;
            if (this.onJump) this.onJump();
          }
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'a') this.keys.a = false;
      if (k === 'd') this.keys.d = false;
    });
  }
};
