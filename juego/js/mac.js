// Estado y comportamiento de Mac Arrons: se queda fijo en su sitio, respira
// (idle bob) y saluda con una burbuja cuando el jugador se acerca.
const Mac = {
  x: CONFIG.CANVAS_W - 190,
  height: 195,
  hipFraction: 0.62,
  dialogue: 'Ei bro, que dius?',
  bubbleScale: 0,

  updateBubble(playerX) {
    const distance = Math.abs(this.x - playerX);
    const near = distance <= CONFIG.TALK_DISTANCE;
    this.bubbleScale += ((near ? 1 : 0) - this.bubbleScale) * 0.15;
  },

  draw(ctx, t, groundY) {
    const box = getBox(ASSETS.mac, this.x, groundY, this.height);
    drawWalking(ctx, ASSETS.mac, box, this.hipFraction, t, false, true);
    this._box = box; // se guarda para dibujar la burbuja por encima del jugador después
    return box;
  },

  // Se dibuja aparte y más tarde (después del jugador) para que la burbuja
  // quede siempre por encima aunque Blai esté justo delante.
  drawBubble(ctx) {
    if (!this._box) return;
    drawSpeechBubble(ctx, this._box.x + this._box.w / 2, this._box.y, this.dialogue, this.bubbleScale);
  }
};
