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
  MARGIN_X: 60,           // límites de movimiento horizontal dentro del canvas

  // --- Cinemática inicial (caída del meteorito) ---
  NIGHT_TINT: 'rgba(10, 15, 40, 0.55)',
  STAR_COUNT: 60,

  METEOR: {
    START_X: 1050,
    START_Y: -80,
    LAND_X: 620,
    LAND_Y_RATIO: 0.80,
    SPEED: 14,
    ROTATION_SPEED: 0.15,
    TRAIL_EVERY_MS: 20
  },

  CUTSCENE: {
    EMERGE_MS: 500,
    HOLD_AFTER_EMERGE_MS: 300,
    ARMS_UP_MS: 450,
    HOLD_SHOCK_MS: 600,
    ARMS_DOWN_MS: 250,
    RUN_SPEED: 6,
    FADE_STEP: 0.04,
    SHAKE_MS: 350
  }
};
