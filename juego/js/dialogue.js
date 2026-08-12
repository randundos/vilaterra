// Sistema de diálogo reutilizable para conversaciones DENTRO de la jugabilidad
// (a diferencia del de Cutscene, que es específico de la intro). Cola de
// líneas con hablante alternante, efecto máquina de escribir, y tecla E para
// avanzar. Mientras Dialogue.active es true, main.js congela el mundo.
const Dialogue = {
  active: false,
  lines: [],          // [{ speaker: 'mac' | 'hero', text: '...' }, ...]
  index: 0,
  startTime: 0,
  revealCount: 0,
  totalChars: 0,
  fullyShown: false,
  onDone: null,

  start(now, lines, onDone) {
    this.active = true;
    this.lines = lines;
    this.index = 0;
    this.startTime = now;
    this.revealCount = 0;
    this.totalChars = 0;
    this.fullyShown = false;
    this.onDone = onDone;
  },

  // Tecla E: completa la línea si aún se está escribiendo, si no, avanza.
  advance(now) {
    if (!this.active) return;
    if (!this.fullyShown) {
      this.revealCount = this.totalChars || 9999;
      this.fullyShown = true;
      return;
    }
    this.index++;
    if (this.index < this.lines.length) {
      this.startTime = now;
      this.revealCount = 0;
      this.totalChars = 0;
      this.fullyShown = false;
    } else {
      this.active = false;
      const cb = this.onDone;
      this.onDone = null;
      if (cb) cb(now);
    }
  },

  update(now) {
    if (!this.active || this.fullyShown) return;
    const elapsed = now - this.startTime;
    this.revealCount = Math.floor(elapsed / CONFIG.CUTSCENE.TYPE_MS_PER_CHAR);
    if (this.totalChars && this.revealCount >= this.totalChars) {
      this.fullyShown = true;
    }
  },

  // getSpeakerBox(speaker) debe devolver la caja {x,y,w,h} EN PANTALLA del
  // personaje que habla, para anclar la burbuja justo encima de su cabeza.
  draw(ctx, getSpeakerBox) {
    if (!this.active) return;
    const line = this.lines[this.index];
    if (!line) return;
    const box = getSpeakerBox(line.speaker);
    if (!box) return;
    const result = drawDialogueBox(ctx, box.x + box.w / 2, box.y, 260, line.text, this.revealCount);
    this.totalChars = result.totalChars;
    drawPressHint(ctx, 'E per avançar', CONFIG.CANVAS_W, CONFIG.CANVAS_H, performance.now());
  }
};
