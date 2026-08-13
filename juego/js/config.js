// Constantes de configuración del juego. Ajusta aquí valores de física,
// velocidades y distancias en vez de buscarlos repartidos por el código.
const CONFIG = {
  CANVAS_W: 960,
  CANVAS_H: 540,
  // Altura del "suelo" SOLO en la jugabilidad (fracción del canvas). La
  // cinemática inicial usa su propia referencia (METEOR.LAND_Y_RATIO) para
  // no descuadrar el fondo ya pintado del meteorito.
  GROUND_Y_RATIO: 0.85,

  GRAVITY: 0.6,
  JUMP_VELOCITY: -16,     // salto más alto que antes (era -12)
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
    HEIGHT: 54,
    SPEED: 1.6,
    PATROL_RANGE: 150,
    FRAME_MS: 110,       // duración de cada frame de animación
    IDLE_MS: 600,
    STOP_MS: 220,
    TURN_MS: 380,
    HURT_MS: 350,
    DEATH_FADE_MS: 700   // cuánto tarda en desvanecerse tras la animación de death
  },

  STOMP_BOUNCE: -14,      // rebote del Hero al saltar encima del jabalí
  HERO_KNOCKBACK: 7,      // empuje horizontal al tocar al jabalí de lado
  HERO_INVULN_MS: 1000,   // invulnerabilidad tras recibir un golpe

  // Altura de Hero: más grande en la cinemática (primer plano) y más
  // pequeña en la jugabilidad (para que no se vea "encajado" en el nivel).
  HERO_HEIGHT_CUTSCENE: 155,
  HERO_HEIGHT_GAMEPLAY: 112,

  HERO_MAX_HEALTH: 100,
  HERO_DAMAGE_PER_HIT: 20, // % de vida que quita un golpe de enemigo
  BOAR_BRACELET_REWARD: 3, // pulseras que suelta el jabalí al morir
  HERO_WALK_FRAME_MS: 90,  // duración de cada frame del ciclo de andar real
  // orden real de reproducción de los frames de hero_walk (no es 0..7 en
  // orden numérico: el ciclo natural de zancada es este, con el frame 0
  // repetido porque es la "pose de paso" que se cruza dos veces por ciclo)
  HERO_WALK_SEQUENCE: [7, 6, 5, 4, 0, 3, 2, 1, 0],

  HUD: {
    HEALTH_BAR_X: 18,
    HEALTH_BAR_Y: 14,
    HEALTH_BAR_W: 220,     // ancho en pantalla de la barra completa
    BRACELET_ICON_SIZE: 40,
    MARGIN: 16              // margen respecto al borde del canvas
  },

  // Pulseras que quedan flotando al morir un enemigo, hasta que el Hero
  // pasa por encima; entonces "vuelan" hacia el contador del HUD.
  PICKUP: {
    GROUND_OFFSET: 28,      // altura sobre el suelo a la que flotan
    SPREAD_X: 20,           // separación horizontal entre pulseras al aparecer
    FLOAT_AMPLITUDE: 5,     // px que suben/bajan mientras flotan
    FLOAT_SPEED: 0.004,     // velocidad del vaivén (ms)
    COLLECT_RADIUS: 40,     // distancia del Hero para empezar a recogerlas
    FLY_DURATION_MS: 550,   // cuánto tardan en volar hasta el contador
    ICON_SIZE: 30
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
