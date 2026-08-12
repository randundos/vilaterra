// Cámara horizontal estilo Sonic: sigue al Hero manteniéndolo hacia el
// tercio izquierdo de la pantalla, sin salirse de los límites del nivel.
const Camera = {
  x: 0,

  reset() {
    this.x = 0;
  },

  update(targetWorldX) {
    const desired = targetWorldX - CONFIG.CANVAS_W * 0.35;
    const maxX = Math.max(0, CONFIG.LEVEL_WIDTH - CONFIG.CANVAS_W);
    this.x = Math.max(0, Math.min(maxX, desired));
  }
};
