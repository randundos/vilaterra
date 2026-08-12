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
  MARGIN_X: 60,           // límites de movimiento horizontal dentro del nivel

  // --- Nivel 1: scroll estilo Sonic ---
  LEVEL_WIDTH: 2800,        // ancho total del nivel en px de "mundo"
  // La capa de suelo empieza justo en GROUND_Y_RATIO (donde pisan los
  // personajes) -> así los pies quedan exactamente al nivel de la textura.
  PARALLAX_SKY_FACTOR: 0.35, // el cielo/árboles se mueve a este % de la velocidad de la cámara
  MAC_X: 2500,              // posición de Mac Arrons en el nivel (ya no está a la vista al empezar)

  BOAR: {
    SPAWN_X: 1150,
    HEIGHT: 72,
    SPEED: 1.6,
    PATROL_RANGE: 150,
    FRAME_MS: 110,       // duración de cada frame de animación
    IDLE_MS: 600,
    STOP_MS: 220,
    TURN_MS: 380,
    HURT_MS: 350,
    DEATH_FADE_MS: 700   // cuánto tarda en desvanecerse tras la animación de death
  },

  STOMP_BOUNCE: -12,      // rebote del Hero al saltar encima del jabalí
  HERO_KNOCKBACK: 7,      // empuje horizontal al tocar al jabalí de lado
  HERO_INVULN_MS: 1000,   // invulnerabilidad tras recibir un golpe

  HERO_MAX_HEALTH: 100,
  HERO_DAMAGE_PER_HIT: 20, // % de vida que quita un golpe de enemigo
  BOAR_BRACELET_REWARD: 3, // pulseras que suelta el jabalí al morir

  HUD: {
    HEALTH_BAR_X: 18,
    HEALTH_BAR_Y: 14,
    HEALTH_BAR_W: 220,     // ancho en pantalla de la barra completa
    BRACELET_ICON_SIZE: 40,
    MARGIN: 16              // margen respecto al borde del canvas
  },

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
    RUN_SPEED: 6,
    FADE_STEP: 0.04,
    SHAKE_MS: 350,
    TYPE_MS_PER_CHAR: 28   // velocidad del efecto máquina de escribir
  }
};
