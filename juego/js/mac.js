// Estado y comportamiento de Mac Arrons: se queda fijo en su sitio del nivel
// (más adelante, no a la vista al empezar). this.x es coordenada de MUNDO.
// Al acercarse el jugador por primera vez se dispara la escena de encuentro
// (ver introLines) a través del sistema de Dialogue.
const Mac = {
  x: CONFIG.MAC_X,
  height: 195,
  hipFraction: 0.62,
  metHero: false, // para que la escena de encuentro solo salte una vez

  introLines: [
    { speaker: 'mac', text: "Hola, sóc en Mac Arrons, i efectivament, sóc un mag." },
    { speaker: 'mac', text: "No sé què fas aquí, però això és casa meva. Has de marxar." },
    { speaker: 'hero', text: "Ho sento, però haig de passar per aquí per ajudar a un amic." },
    { speaker: 'mac', text: "Si tant insisteixes..." }
  ],

  // cameraX es opcional (por defecto 0) por si algún día aparece en una
  // escena sin scroll; en la jugabilidad normal siempre se pasa Camera.x.
  draw(ctx, t, groundY, cameraX = 0) {
    const box = getBox(ASSETS.mac, this.x - cameraX, groundY, this.height);
    drawWalking(ctx, ASSETS.mac, box, this.hipFraction, t, false, true);
    this._box = box; // se guarda para anclar el diálogo por encima de él
    return box;
  }
};
