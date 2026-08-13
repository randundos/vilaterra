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
  DASH_BURST: 17,         // empujón más largo/evidente (antes 10)
  DASH_DECAY: 0.94,       // decae más despacio, para que la carrerilla se note más
  DASH_POSE_THRESHOLD: 2, // por encima de este |dashVX| se muestra/cuenta la patada del empujón
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
  HERO_HEIGHT_SMALL: 70,    // Hero ya encogido, en el tramo de hierba
  HERO_SHRINK_MS: 1800,     // cuánto tarda Hero en encogerse hasta desaparecer

  // Escena en la que Mac Arrons rocía a Hero con la manguera tras hablar.
  MAC_SPRAY: {
    LEAD_MS: 400,            // rociando un poco antes de que Hero empiece a encogerse
    PARTICLE_INTERVAL_MS: 25,
    PARTICLES_PER_TICK: 4,
    SPEED: 10,
    TIP_X_FRACTION: 0.02,    // posición real de la boquilla (medida sobre el sprite ya sin agua)
    TIP_Y_FRACTION: 0.41,
    Y_OFFSET: 22             // baja un poco la pose de la manguera para que la base toque el suelo
  },

  HERO_MAX_HEALTH: 100,
  HERO_DAMAGE_PER_HIT: 20, // % de vida que quita un golpe de enemigo
  BOAR_BRACELET_REWARD: 3, // pulseras que suelta el jabalí al morir
  HERO_WALK_FRAME_MS: 90,  // duración de cada frame del ciclo de andar real
  // orden real de reproducción de los frames de hero_walk (no es 0..7 en
  // orden numérico: el ciclo natural de zancada es este, con el frame 0
  // repetido porque es la "pose de paso" que se cruza dos veces por ciclo)
  HERO_WALK_SEQUENCE: [7, 6, 5, 4, 0, 3, 2, 1, 0],

  // Espada de hierba: en la pose de pie se usa la imagen ya compuesta
  // (Hero_espada_sinfondo.png), pero para andar/saltar se superpone la
  // espada suelta (Espada_sinfondo.png) sobre el puño visible de cada
  // frame. Las fracciones están medidas a mano sobre cada sprite.
  HERO_SWORD: {
    HEIGHT_RATIO: 0.73,             // largo de la espada como fracción del alto de Hero
    GRIP_FRACTION: { x: 0.49, y: 1.0 }, // punto de agarre dentro de la propia imagen de la espada
    JUMP_HAND: { x: 0.107, y: 0.176 },
    WALK_HANDS: [
      { x: 0.437, y: 0.608 }, // walk_0
      { x: 0.236, y: 0.645 }, // walk_1
      { x: 0.136, y: 0.616 }, // walk_2
      { x: 0.140, y: 0.653 }, // walk_3
      { x: 0.104, y: 0.647 }, // walk_4
      { x: 0.218, y: 0.639 }, // walk_5
      { x: 0.117, y: 0.632 }, // walk_6
      { x: 0.129, y: 0.661 }  // walk_7
    ]
  },

  // Ataque con la espada (clic derecho): un único frame frontal (reutiliza
  // la pose de pie ya armada) con una estela blanca que baja de arriba a
  // abajo para dar sensación de movimiento sin necesitar más frames.
  ATTACK: {
    DURATION_MS: 320,   // cuánto dura la pose de ataque antes de volver a lo normal
    COOLDOWN_MS: 380,   // tiempo mínimo entre ataques (algo más que DURATION_MS)
    SWEEP_FRACTION: 0.55, // fracción de DURATION_MS en la que la estela baja del todo; el resto es el desvanecido
    MELEE_REACH: 46     // cuánto se extiende el golpe más allá de la caja del Hero, hacia donde mira
  },

  // Hormiga con rifle: primer enemigo del tramo de hierba (nivel 2). Se queda
  // quieta y dispara balas a intervalos regulares; el Hero tiene que
  // esquivarlas saltando hasta acercarse lo suficiente para rematarla con la
  // espada (clic izquierdo).
  ANT: {
    HEIGHT: 64,
    SPAWN_X: 1150,           // más allá del tallo/espada, para que ya vaya armado al llegar
    FIRE_INTERVAL_MS: 1500,  // una bala cada segundo y medio
    BULLET_SPEED: 6,
    BULLET_RADIUS: 6,
    BULLET_LIFETIME_MS: 3000,
    // punta del rifle medida sobre el sprite en su orientación natural
    // (mirando a la derecha); en pantalla la hormiga siempre va volteada
    // (dispara hacia la izquierda, hacia el Hero), así que draw() usa
    // (1 - TIP_X_FRACTION) para la posición real en pantalla.
    TIP_X_FRACTION: 0.988,
    TIP_Y_FRACTION: 0.586,
    HIT_FADE_MS: 250,
    BRACELET_REWARD: 5 // pulseras que suelta al morir (pisotón o espada)
  },

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

  // --- Tramo "Hero pequeño" en la hierba, tras la escena de la manguera ---
  SMALL_WORLD: {
    LEVEL_WIDTH: 1600,
    GROUND_Y_RATIO: 0.85,
    GRASS_BLADE_X: 700,      // posición del tallo que hay que golpear con el empujón
    GRASS_BLADE_HEIGHT: 260, // bien alta para que destaque (Hero ya es diminuto)
    HIT_FADE_MS: 250,        // cuánto tarda el tallo en desvanecerse tras el golpe
    SWORD_FALL_MS: 300,      // cuánto tarda la espada en caer al suelo
    SWORD_COLLECT_RADIUS: 24,
    SWORD_PICKUP_HEIGHT: 55  // tamaño en pantalla de la espada tirada en el suelo
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
