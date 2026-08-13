// Cámara horizontal estilo Sonic: sigue al Hero manteniéndolo hacia el
// tercio izquierdo de la pantalla, sin salirse de los límites del nivel.
const Camera = {
  x: 0,

  reset() {
    this.x = 0;
  },

  // levelWidth es opcional: por defecto el nivel 1 grande; el tramo de
  // "Hero pequeño" pasa su propio CONFIG.SMALL_WORLD.LEVEL_WIDTH.
  update(targetWorldX, levelWidth = CONFIG.LEVEL_WIDTH) {
    const desired = targetWorldX - CONFIG.CANVAS_W * 0.35;
    const maxX = Math.max(0, levelWidth - CONFIG.CANVAS_W);
    this.x = Math.max(0, Math.min(maxX, desired));
  }
};
