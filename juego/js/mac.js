// Estado y comportamiento de Mac Arrons: se queda fijo en su sitio del nivel
// (más adelante, no a la vista al empezar). this.x es coordenada de MUNDO.
// Al acercarse el jugador por primera vez se dispara la escena de encuentro
// (ver introLines) a través del sistema de Dialogue.
const Mac = {
  x: CONFIG.MAC_X,
  height: 165,
  hipFraction: 0.62,
  metHero: false, // para que la escena de encuentro solo salte una vez
  spraying: false, // true tras el diálogo: cambia a la pose de la manguera

  introLines: [
    { speaker: 'mac', text: "Hola, sóc en Mac Arrons, i efectivament, sóc un mag." },
    { speaker: 'mac', text: "No sé què fas aquí, però això és casa meva. Has de marxar." },
    { speaker: 'hero', text: "Ho sento, però haig de passar per aquí per ajudar a un amic." },
    { speaker: 'mac', text: "Si tant insisteixes..." }
  ],

  // cameraX es opcional (por defecto 0) por si algún día aparece en una
  // escena sin scroll; en la jugabilidad normal siempre se pasa Camera.x.
  draw(ctx, t, groundY, cameraX = 0) {
    const img = this.spraying ? ASSETS.macSpray : ASSETS.mac;
    // la pose de la manguera se baja un poco para que la base/boquilla
    // enterrada quede a ras del suelo (su recorte deja algo más de aire
    // por debajo que la pose de pie)
    const yOffset = this.spraying ? CONFIG.MAC_SPRAY.Y_OFFSET : 0;
    const box = getBox(img, this.x - cameraX, groundY + yOffset, this.height);
    drawWalking(ctx, img, box, this.hipFraction, t, false, true);
    this._box = box; // se guarda para anclar el diálogo por encima de él
    return box;
  },

  // Posición en pantalla (aprox.) de la boquilla de la manguera, para hacer
  // salir de ahí las partículas de agua cuando this.spraying es true.
  getHoseTip() {
    if (!this._box) return { x: 0, y: 0 };
    return {
      x: this._box.x + this._box.w * CONFIG.MAC_SPRAY.TIP_X_FRACTION,
      y: this._box.y + this._box.h * CONFIG.MAC_SPRAY.TIP_Y_FRACTION
    };
  }
};
