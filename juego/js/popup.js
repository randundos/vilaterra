// Aviso emergente estilo "objeto conseguido" (p.ej. al recoger la espada):
// congela el mundo, igual que un diálogo, hasta que el jugador pulsa E. Solo
// guarda el estado; drawItemPopup (ui.js) es quien lo dibuja.
const ItemPopup = {
  active: false,
  icon: null,
  text: '',
  shownAt: 0,

  show(now, icon, text) {
    this.active = true;
    this.icon = icon;
    this.text = text;
    this.shownAt = now;
  },

  dismiss() {
    this.active = false;
  }
};
