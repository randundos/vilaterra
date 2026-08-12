// Constantes de configuración del juego. Ajusta aquí valores de física,
// velocidades y distancias en vez de buscarlos repartidos por el código.
const CONFIG = {
  CANVAS_W: 960,
  CANVAS_H: 540,
  GROUND_Y_RATIO: 0.80,   // altura del "suelo" como fracción del canvas

  GRAVITY: 0.6,
  JUMP_VELOCITY: -12,
  SPEED: 3.2,
  DASH_BURST: 10,
  DASH_DECAY: 0.90,
  DOUBLE_TAP_MS: 320,     // ventana para detectar doble pulsación de Espacio

  TALK_DISTANCE: 130,     // distancia a la que Mac Arrons saluda
  MARGIN_X: 60            // límites de movimiento horizontal dentro del canvas
};
