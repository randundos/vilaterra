// Constantes de configuración del juego. Ajusta aquí valores de física,
// velocidades y distancias en vez de buscarlos repartidos por el código.
const CONFIG = {
  // Atajos de teclado 1-4 para saltar directamente a puntos clave del juego
  // sin tener que rejugar desde el principio cada vez (ver el bloque de
  // depuración al final de main.js). Ponlo a false antes de dar el juego
  // por "terminado" para el jugador final.
  DEBUG: true,

  CANVAS_W: 960,
  CANVAS_H: 540,
  // Altura del "suelo" SOLO en la jugabilidad (fracción del canvas). La
  // cinemática inicial usa su propia referencia (METEOR.LAND_Y_RATIO) para
  // no descuadrar el fondo ya pintado del meteorito.
  GROUND_Y_RATIO: 0.85,

  GRAVITY: 0.6,
  JUMP_VELOCITY: -16,        // salto más alto que antes (era -12)
  DOUBLE_JUMP_VELOCITY: -14, // segundo salto (en el aire), un pelín más flojo que el primero
  MAX_JUMPS: 2,              // 1 = salto normal, 2 = salto doble real
  SPEED: 3.2,
  // dashVX ya no lo dispara el jugador (el doble salto es un salto real, no
  // un empujón): ahora solo lo usa Player.hurt() para el retroceso al
  // recibir daño, con DASH_DECAY como su fricción.
  DASH_DECAY: 0.94,

  TALK_DISTANCE: 130,     // distancia a la que Mac Arrons saluda
  MARGIN_X: 60,           // límites de movimiento horizontal dentro del nivel

  // --- Nivel 1: scroll estilo Sonic ---
  LEVEL_WIDTH: 2800,        // ancho total del nivel en px de "mundo"
  // La capa de suelo empieza justo en GROUND_Y_RATIO (donde pisan los
  // personajes) -> así los pies quedan exactamente al nivel de la textura.
  PARALLAX_SKY_FACTOR: 0.35, // el cielo/árboles se mueve a este % de la velocidad de la cámara
  MAC_X: 2500,              // posición de Mac Arrons en el nivel (ya no está a la vista al empezar)

  // Agujero en el suelo del nivel 1, justo después de la zona del jabalí:
  // hay que saltarlo (con el salto normal llega de sobra, con margen); si
  // Hero cae dentro, se muestra "Has Fallat" y se reinicia el nivel 1 desde
  // el principio (ver checkPitFall/startDeath en main.js).
  PIT: {
    X: 1450,
    WIDTH: 150,
    FALL_TRIGGER: 220 // jumpOffset a partir del cual se considera "ha caído del todo" (bien fuera de pantalla)
  },

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

  // Pantalla de muerte (vida a 0): congela el mundo, muestra "Has Fallat"
  // estilo Dark Souls, y tras esto reinicia el nivel actual desde el
  // principio (nivel 1 o el tramo de hierba, según dónde haya muerto).
  DEATH: {
    FADE_IN_MS: 900,   // cuánto tarda el texto en aparecer del todo
    HOLD_MS: 2200,      // cuánto se queda en pantalla antes de reiniciar
    get DURATION_MS() { return this.FADE_IN_MS + this.HOLD_MS; }
  },

  // Altura de Hero: más grande en la cinemática (primer plano) y más
  // pequeña en la jugabilidad (para que no se vea "encajado" en el nivel).
  HERO_HEIGHT_CUTSCENE: 155,
  HERO_HEIGHT_GAMEPLAY: 112,
  // Mismo tamaño en pantalla que en el nivel 1: la escena de la manguera ya
  // transmite que Hero se ha hecho pequeño (encoge hasta desaparecer); una
  // vez en el tramo de hierba, se mantiene a tamaño normal en pantalla para
  // que no pierda consonancia con el resto del juego (lo "diminuto" lo dan
  // el tallo/la hormiga, dibujados grandes en relación a él).
  HERO_HEIGHT_SMALL: 112,
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
  // Los ciclos de andar (con y sin espada) tienen el mismo número de frames
  // y se reproducen en orden simple 0..N-1 en bucle; walk_i y walk_sword_i
  // son la misma fase de zancada, solo cambia si lleva la espada.
  HERO_WALK_FRAME_MS: 90,  // duración de cada frame del ciclo de andar real

  // Espada suelta (Espada_sinfondo.png): solo hace falta ya para el pickup
  // tirado en el suelo del tramo de hierba (andar/saltar con espada usan
  // ahora arte real compuesto, ver ASSETS.heroWalkSword/heroJumpSword).
  HERO_SWORD: {
    GRIP_FRACTION: { x: 0.49, y: 1.0 } // punto de agarre dentro de la propia imagen de la espada
  },

  // Ataque (clic izquierdo). Con espada: se reproduce una de dos animaciones
  // reales de 5 frames (tajo vertical / tajo horizontal, elegida al azar
  // cada vez que se ataca), con el propio brillo verde ya dibujado en el
  // sprite -> ya no hace falta la estela blanca superpuesta. Sin espada: se
  // mantiene la pose estática de siempre con la estela blanca (no tenemos
  // frames de golpe a mano desnuda).
  ATTACK: {
    DURATION_MS: 320,   // cuánto dura la pose de ataque antes de volver a lo normal
    COOLDOWN_MS: 380,   // tiempo mínimo entre ataques (algo más que DURATION_MS)
    SWEEP_FRACTION: 0.55, // (solo ataque sin espada) fracción de DURATION_MS en la que la estela baja del todo
    MELEE_REACH: 46,    // cuánto se extiende el golpe más allá de la caja del Hero, hacia donde mira
    SWORD_FRAME_COUNT: 5, // frames reales de cada animación de espada (vertical/horizontal)
    UNARMED_FRAME_COUNT: 4 // frames reales del puñetazo (sin espada)
  },

  // Hormigas con rifle: enemigos a distancia del tramo de hierba (nivel 2). Se
  // quedan quietas y disparan balas a intervalos regulares; el Hero tiene que
  // esquivarlas saltando hasta acercarse lo suficiente para rematarlas con la
  // espada (clic izquierdo) o saltándoles encima. SPAWNS tiene una posición
  // por cada hormiga del nivel (la 2a se sustituyó por el gusano, ver WORM);
  // la de índice ELITE_INDEX es una versión "veterana" (dispara más rápido,
  // teñida de rojo) para variar la dificultad hacia el final del tramo, sin
  // necesitar arte nuevo.
  ANT: {
    HEIGHT: 102,             // escalada junto con HERO_HEIGHT_SMALL, para mantener su proporción respecto a Hero
    SPAWNS: [1150, 3080], // más allá del tallo/espada, para que ya vaya armado al llegar
    ELITE_INDEX: 1,
    ELITE_FIRE_FACTOR: 0.55,   // la veterana dispara ~el doble de rápido
    ELITE_TINT: 'rgba(200, 40, 40, 0.5)',
    FIRE_INTERVAL_MS: 1500,  // una bala cada segundo y medio (normal)
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

  // Gusano: segundo enemigo del tramo de hierba (sustituye a la 2a hormiga).
  // No dispara: patrulla de lado a lado y de vez en cuando da un saltito
  // (arco simple), y hace daño por contacto igual que el jabalí. Se mata
  // saltándole encima o con la espada, igual que el resto. Solo hay una
  // imagen por estado (sin ciclo de animación propio): reposo, movimiento,
  // salto y muerte.
  WORM: {
    HEIGHT: 46,
    SPAWN_X: 2500,        // donde antes iba la 2a hormiga
    SPEED: 1.4,
    PATROL_RANGE: 140,
    REST_MS: 700,         // pausa al arrancar y en cada extremo de la patrulla
    HOP_EVERY_MS: 1600,   // cada cuánto da un saltito mientras patrulla
    HOP_MS: 420,          // duración del saltito
    HOP_HEIGHT: 22,
    DEATH_HOLD_MS: 200,   // se queda visible con la pose de muerte antes de desvanecerse
    DEATH_FADE_MS: 500,
    BRACELET_REWARD: 4
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
    LEVEL_WIDTH: 3300,
    GROUND_Y_RATIO: 0.85,
    GRASS_BLADE_X: 700,      // posición del tallo que hay que golpear con el ataque
    GRASS_BLADE_HEIGHT: 260, // bien alta para que destaque, como una hierba gigante
    HIT_FADE_MS: 250,        // cuánto tarda el tallo en desvanecerse tras el golpe
    SWORD_FALL_MS: 300,      // cuánto tarda la espada en caer al suelo
    SWORD_COLLECT_RADIUS: 24,
    SWORD_PICKUP_HEIGHT: 88, // tamaño en pantalla de la espada tirada en el suelo (escalado junto con Hero)

    // Huecos sin suelo (igual que PIT en el nivel 1, pero varios tramos).
    // El primero es la gran travesía: solo se puede cruzar saltando de
    // plataforma en plataforma (ver PLATFORMS); el segundo es un agujero
    // simple, como el del nivel 1, para el que el salto normal llega de sobra.
    PITS: [
      { x: 1400, width: 920 },
      { x: 2750, width: 150 }
    ],

    // Plataformas flotantes: "top" es cuánto se elevan sobre el suelo (en
    // negativo, como jumpOffset). La primera es una plataforma "bonus" con
    // pulseras encima y suelo normal debajo (solo para quien se anime a
    // subir); las otras tres son las que permiten cruzar la gran travesía
    // (sin suelo debajo: si no se llega, se cae y hay que reiniciar).
    PLATFORMS: [
      { x: 1230, width: 120, top: -90, bonus: true },
      { x: 1550, width: 140, top: -70 },
      { x: 1800, width: 130, top: -110 },
      { x: 2040, width: 140, top: -60 }
    ]
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
