// Gestión de teclado. Expone el estado de A/D como booleanos, y dispara
// callbacks onJump / onAction cuando corresponde. Espacio siempre llama a
// onJump: es Player.jump() quien decide si es el primer salto o el doble
// salto según si Hero ya está en el aire (ver player.js). onAction (tecla E)
// avanza diálogos o ataca, según el contexto (ver el cableado en main.js).
const Input = {
  keys: { a: false, d: false },
  onJump: null,
  onAction: null,  // tecla E: avanzar diálogo / confirmar, o atacar en jugabilidad (con espada si la tiene, si no un golpe)
  onMenuUp: null,  // flecha arriba: mover selector hacia arriba
  onMenuDown: null, // flecha abajo: mover selector hacia abajo
  onWeaponSwitch: null, // tecla Q: alterna espada/puños (solo tiene efecto una vez se ha recogido la espada, ver main.js)

  init() {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'a') this.keys.a = true;
      if (k === 'd') this.keys.d = true;

      if (k === 'e' && !e.repeat) {
        if (this.onAction) this.onAction();
      }
      if (k === 'q' && !e.repeat) {
        if (this.onWeaponSwitch) this.onWeaponSwitch();
      }
      if (k === 'arrowup' && !e.repeat) {
        e.preventDefault(); // evita que la página haga scroll
        if (this.onMenuUp) this.onMenuUp();
      }
      if (k === 'arrowdown' && !e.repeat) {
        e.preventDefault();
        if (this.onMenuDown) this.onMenuDown();
      }

      if (k === ' ' || e.code === 'Space') {
        e.preventDefault(); // evita que la página haga scroll
        if (!e.repeat && this.onJump) this.onJump();
      }
    });

    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'a') this.keys.a = false;
      if (k === 'd') this.keys.d = false;
    });
  }
};
