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
    MAX_HP: 10,
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

  // Cantidad de vida que quita cada tipo de golpe del jugador a un enemigo
  // con vida numérica (ver combat.js: meleeDamage/stompDamage). La espada
  // quita más que los puños; el pisotón (saltar encima) es fijo, no depende
  // del arma equipada. De momento no hay enemigos más resistentes a un tipo
  // de golpe que a otro (se podrá añadir más adelante).
  DAMAGE: {
    FIST_MIN: 4, FIST_MAX: 5,
    STOMP_MIN: 6, STOMP_MAX: 7,
    SWORD_MIN: 10, SWORD_MAX: 12
  },

  // Barra de vida de enemigo (roja sobre negro), dibujada flotando encima de
  // su caja de colisión a partir del primer golpe que recibe (ver
  // drawEnemyHealthBar en ui.js).
  ENEMY_HEALTH_BAR: {
    WIDTH: 40,
    HEIGHT: 6,
    OFFSET_Y: 8 // separación entre la cabeza del enemigo y el borde inferior de la barra
  },

  // Hormigas con rifle: enemigos a distancia del tramo de hierba (nivel 2). Se
  // quedan quietas y disparan balas a intervalos regulares; el Hero tiene que
  // esquivarlas saltando hasta acercarse lo suficiente para rematarlas con la
  // espada (clic izquierdo) o saltándoles encima. SPAWNS tiene una posición
  // por cada hormiga del nivel (la 2a se sustituyó por el gusano, ver WORM; la
  // que iba al final se sustituyó por el jefe Talp, ver TALP).
  ANT: {
    MAX_HP: 10,
    HEIGHT: 102,             // escalada junto con HERO_HEIGHT_SMALL, para mantener su proporción respecto a Hero
    SPAWNS: [1150], // más allá del tallo/espada, para que ya vaya armado al llegar
    ELITE_INDEX: -1, // ya no hay ninguna "veterana": el final del tramo lo lleva Talp
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
  // saltándole encima o con la espada, igual que el resto. "rest" es una
  // única pose quieta; move/jump/death son ciclos reales de varios frames
  // (extraídos de bug.gif, frames 1-7: 2a imagen = move, 3a = jump, 4a =
  // death, que ya se desvanece por sí sola en solo 6 frames). Worms.list
  // guarda varias instancias con el mismo comportamiento (una por cada
  // SPAWNS), lo bastante cerca entre sí como para poder solaparse.
  WORM: {
    MAX_HP: 6, // más débil que la media (10): "los gusanos y las verduras tendrán 6"
    HEIGHT: 40,            // un poco más pequeños que antes (era 46)
    SPAWNS: [2440, 2500, 2560], // 3 gusanos, patrullas solapadas
    SPEED: 1.4,
    PATROL_RANGE: 140,
    REST_MS: 700,         // pausa al arrancar y en cada extremo de la patrulla
    HOP_EVERY_MS: 1600,   // cada cuánto da un saltito mientras patrulla
    HOP_MS: 420,          // duración del saltito
    HOP_HEIGHT: 22,
    MOVE_FRAME_MS: 90,    // ciclo de 7 frames en bucle mientras anda
    JUMP_FRAME_MS: 60,    // ciclo de 7 frames, una vez por saltito (7*60 ≈ HOP_MS)
    DEATH_FRAME_MS: 90,   // ciclo de 6 frames, una vez, ya se desvanece él solo
    DEATH_HOLD_MS: 150,   // se queda en el último frame antes de empezar a desvanecerse del todo
    DEATH_FADE_MS: 350,
    BRACELET_REWARD: 4
  },

  // Talp (topo): jefe final del tramo de hierba, guarda la boca de la cueva
  // (ver SMALL_WORLD.CAVE). Ya NO sale del suelo: empieza escondido DENTRO
  // de la cueva (CAVE_X) y, al acercarse Hero, camina (WALK) hasta su puesto
  // de guardia (GUARD_X), ruge (TAUNT) y a partir de ahí lo persigue de
  // verdad: si está lejos avanza hacia él (WALK de nuevo), y si lo tiene a
  // tiro se para y ataca (ATTACK2) cada ATTACK_COOLDOWN_MS (1,5s) para que
  // sea agresivo sin abrumar. Quieto sin nada que hacer usa IDLE. Su cuerpo
  // es sólido a su alrededor (ver blockTalpBody en talp.js) pero NO por
  // encima: se le puede saltar. Aun así, la única forma de cruzar la cueva
  // es derrotarlo (vida numérica, MAX_HP = 55, pisotón o espada): mientras
  // siga vivo, la propia boca de la cueva tiene su propia barrera (ver
  // blockCaveEntrance en cave.js) que esta sí no se puede saltar.
  // Los sets de WALK/TAUNT/IDLE/ATTACK2/DEATH son ciclos reales de varios
  // frames (ver ASSETS.talp); *_FRAME_MS es la duración de cada frame, la
  // duración total de cada ciclo sale de multiplicarlo por su nº de frames.
  TALP: {
    HEIGHT: 140,           // más grande que Hero, para que se note que es el jefe
    CAVE_X: 3750,          // dentro de la boca de la cueva, punto de partida mientras está "dormant"
    GUARD_X: 3525,         // puesto de guardia, delante de la boca, tras salir de la cueva
    WAKE_DISTANCE: 260,    // a esta distancia (respecto a GUARD_X) empieza a salir
    SPEED: 2.1,            // ritmo al perseguir/patrullar (antes 1.6: más agresivo al perseguir)
    EMERGE_SPEED: 6,       // sale de la cueva mucho más rápido que al perseguir, para que no se note lento al asomar
    WALK_FRAME_MS: 90,     // ciclo de 5 frames -> ~450ms por zancada completa
    TAUNT_FRAME_MS: 70,    // ciclo de 13 frames -> ~910ms de rugido
    IDLE_FRAME_MS: 180,    // ciclo de 8 frames, de fondo mientras espera
    CHASE_LEASH: 950,      // no se aleja más de esto de GUARD_X al perseguir (antes 420: ahora cubre casi todo el tramo, para que no se rinda si Hero se aleja)
    ATTACK_RANGE: 150,     // a esta distancia deja de avanzar y ataca en vez de seguir acercándose
    HIT_RANGE: 170,        // rango real en el que el golpe conecta (algo más generoso que ATTACK_RANGE)
    ATTACK_FRAME_MS: 65,   // ciclo de 9 frames -> ~585ms de ataque
    ATTACK_HIT_FRACTION: 0.6, // instante del ciclo de ataque (9 frames) en el que conecta el golpe
    ATTACK_COOLDOWN_MS: 1500, // "que tarde 1,5 segundo entre cada ataque"
    BODY_WIDTH: 100,       // ancho del cuerpo sólido que bloquea el paso de Hero (solo a su alrededor, no por encima)
    HURT_MS: 350,
    MAX_HP: 55,            // jefe: bastante más resistente que un mook normal (10), ver CONFIG.DAMAGE en combat.js
    DEATH_FRAME_MS: 90,    // ciclo de 11 frames hundiéndose -> ~990ms
    DEATH_HOLD_MS: 300,    // se queda quieto en el último frame antes de empezar a desvanecerse
    DEATH_FADE_MS: 500,
    BRACELET_REWARD: 10    // recompensa de jefe, el doble que una hormiga normal
  },

  HUD: {
    HEALTH_BAR_X: 18,
    HEALTH_BAR_Y: 14,
    HEALTH_BAR_W: 220,     // ancho en pantalla de la barra completa
    BRACELET_ICON_SIZE: 40,
    MARGIN: 16,             // margen respecto al borde del canvas
    // Ranura de arma activa (espada/puños, tecla Q): esquina inferior
    // izquierda, mismo MARGIN que el resto del HUD. Solo se dibuja una vez
    // Player.hasSword es true (ver drawWeaponIndicator en ui.js).
    WEAPON_BOX_SIZE: 48
  },

  // Aviso emergente estilo "objeto conseguido" (p.ej. al recoger la espada):
  // congela el mundo (como un diálogo) hasta que se cierra con E. Icono a
  // la izquierda dentro de una ranura, texto a la derecha.
  ITEM_POPUP: {
    POP_MS: 220,     // animación de aparición (escala + fundido)
    ICON_SIZE: 72,
    BOX_W: 560,
    PADDING: 18,
    BORDER: 4
  },

  // Pulseras que quedan flotando al morir un enemigo, hasta que el Hero
  // pasa por encima; entonces "vuelan" hacia el contador del HUD. Los
  // corazones (ver VEGGIE.HEART_HEAL) usan el mismo sistema de flotar +
  // volar, pero curan vida en vez de sumar al contador, y vuelan hacia la
  // barra de vida en vez de hacia la esquina de pulseras.
  PICKUP: {
    GROUND_OFFSET: 28,      // altura sobre el suelo a la que flotan
    SPREAD_X: 20,           // separación horizontal entre pulseras al aparecer
    FLOAT_AMPLITUDE: 5,     // px que suben/bajan mientras flotan
    FLOAT_SPEED: 0.004,     // velocidad del vaivén (ms)
    COLLECT_RADIUS: 40,     // distancia del Hero para empezar a recogerlas
    FLY_DURATION_MS: 550,   // cuánto tardan en volar hasta el contador
    ICON_SIZE: 30,
    HEART_ICON_SIZE: 26     // el corazón se dibuja a mano (sin sprite), un poco más pequeño
  },

  // --- Tramo "Hero pequeño" en la hierba, tras la escena de la manguera ---
  SMALL_WORLD: {
    LEVEL_WIDTH: 3820,       // ampliado para dejar sitio a la cueva del final (ver CAVE)
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
    // El segundo agujero que había aquí (justo antes de Talp) se ha
    // quitado: ahora el final del tramo lo marca la cueva (ver CAVE), no un agujero.
    PITS: [
      { x: 1400, width: 920 }
    ],

    // Cueva al final del tramo: la salida hacia "nivel 2, parte 2". Usa la
    // imagen real (ASSETS.caveWall, cueva_entrada.png), ya sin césped/cielo
    // propios (recortada a solo el promontorio de roca + boca oscura, sobre
    // fondo transparente) para que el césped/cielo del propio fondo del
    // juego se vea detrás. Se ancla por la base directamente a groundY
    // (DRAW_HEIGHT fija la altura en pantalla, el ancho sale de mantener la
    // proporción real de la imagen) y se coloca SIEMPRE pegada al final del
    // nivel (drawX = LEVEL_WIDTH - drawW, ver drawCaveEntrance en render.js),
    // así que ya no hace falta una X fija. MOUTH_CENTER_FRAC/MOUTH_WIDTH_FRAC
    // ubican la boca oscura dentro de esa imagen ya escalada (medido sobre la
    // imagen real), solo para el cálculo de GATE_X/TRANSITION_X de abajo.
    // Mientras Talp siga vivo, una barrera invisible (ver blockCaveEntrance
    // en cave.js) impide pasar de GATE_X, sin nada dibujado encima; en
    // cuanto muere, cruzar hasta TRANSITION_X dispara el cambio de pantalla.
    CAVE: {
      DRAW_HEIGHT: 320,        // alto en pantalla de la imagen de la cueva (ancho = proporcional)
      GROUND_OVERLAP: 6,       // baja la imagen unos px de más para que no quede rendija con el césped/suelo
      MOUTH_CENTER_FRAC: 0.79, // centro de la boca oscura, como fracción del ancho ya escalado
      MOUTH_WIDTH_FRAC: 0.41,  // ancho aproximado de la boca, como fracción del ancho ya escalado
      GATE_X: 3685,           // hasta dónde se puede acercar a la boca mientras Talp siga vivo
      TRANSITION_X: 3740      // cruzar este punto (con Talp derrotado) = pasa a nivel 2 parte 2
    },

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

  // --- Nivel 2, parte 2: al otro lado de la cueva ---
  // Mismo estilo visual que SMALL_WORLD (sin agujeros ni plataformas): un
  // pequeño "gauntlet" de 6 enemigos-verdura (ver VEGGIE) y, al final, el
  // pájaro (ver BIRD) esperando. Con el pájaro no se "gana" la pelea en el
  // sentido normal: es él quien acaba llevándose a Hero volando, dando paso
  // a PoolScene (ver POOL_SCENE/poolscene.js), la apertura del nivel 3.
  SMALL_WORLD2: {
    LEVEL_WIDTH: 2500,
    GROUND_Y_RATIO: 0.85
  },

  // Enemigos-verdura: 6 mooks (uno de cada especie/sprite) repartidos antes
  // del pájaro, a modo de pequeño gauntlet. Comportamiento sencillo, todos
  // con la misma "dificultad" (solo cambia el sprite): patrullan cerca de su
  // punto de partida (igual que el gusano), y al despertar (WAKE_DISTANCE)
  // reproducen una vez la animación de aparición antes de empezar a
  // patrullar/atacar. Tienen poca vida (MAX_HP = 6, ver CONFIG.DAMAGE) que
  // baja con cada pisotón/golpe hasta morir. Los 5 estados (idle/walk/spawn/
  // attack/death) son
  // ciclos reales de 8 frames, extraídos de vegetables1.gif/vegetables2.gif
  // y empaquetados en UNA sola imagen por especie (ver ASSETS.veggies y
  // Visuals/veggies/<especie>.png): una rejilla de 8 columnas x 5 filas
  // (idle/walk/spawn/attack/death, en ese orden) de celdas CELL_W x CELL_H,
  // con cada frame recortado a su tamaño real (SHEETS.<especie>.frames.
  // <estado>[i] = [ancho, alto]) y encajado en la esquina superior
  // izquierda de su celda -> así se puede recortar exactamente con
  // ctx.drawImage(sheet, sx,sy,sw,sh, ...) sin cargar 240 archivos sueltos
  // (240 peticiones de red hacían el arranque muy lento).
  VEGGIE: {
    MAX_HP: 6, // más débil que la media (10), igual que los gusanos
    HEIGHT: 76,
    SPECIES: ['scallion', 'pod', 'cherry', 'carrot', 'potato', 'onion'],
    SPAWNS: [250, 750, 1250, 1750], // solo 4 (antes 6), repartidas por el mismo tramo
    WAKE_DISTANCE: 220,
    PATROL_RANGE: 90,
    SPEED: 1.2,
    REST_MS: 900,
    SPAWN_FRAME_MS: 90,
    IDLE_FRAME_MS: 160,
    WALK_FRAME_MS: 110,
    ATTACK_FRAME_MS: 70,
    DEATH_FRAME_MS: 90,
    ATTACK_RANGE: 70,
    HIT_RANGE: 85,
    ATTACK_COOLDOWN_MS: 1400,
    ATTACK_HIT_FRACTION: 0.55,
    DEATH_HOLD_MS: 200,
    DEATH_FADE_MS: 450,
    HEART_HEAL: 25, // % de vida (sobre HERO_MAX_HEALTH) que cura el corazón que sueltan al morir
    SHEETS: {
      scallion: {
        CELL_W: 119, CELL_H: 119,
        frames: {
          idle: [[34,99],[34,99],[44,94],[34,99],[34,99],[34,99],[44,94],[34,99]],
          walk: [[34,99],[34,99],[44,94],[34,99],[34,99],[34,99],[44,94],[34,99]],
          spawn: [[19,44],[14,29],[34,84],[44,74],[39,84],[29,94],[34,89],[34,99]],
          attack: [[34,99],[49,89],[89,69],[119,44],[89,119],[74,109],[29,94],[34,99]],
          death: [[34,99],[34,99],[34,94],[34,84],[79,44],[84,24],[84,14],[84,14]]
        }
      },
      pod: {
        CELL_W: 184, CELL_H: 114,
        frames: {
          idle: [[69,84],[69,89],[69,89],[69,94],[69,84],[69,89],[69,89],[69,94]],
          walk: [[69,84],[69,84],[69,84],[69,89],[69,94],[69,89],[69,89],[69,99]],
          spawn: [[69,44],[79,34],[154,99],[154,114],[69,94],[69,89],[69,89],[69,94]],
          attack: [[69,84],[69,84],[59,54],[64,44],[154,84],[164,99],[184,109],[69,84]],
          death: [[69,84],[69,84],[69,79],[69,79],[69,79],[69,79],[69,79],[69,79]]
        }
      },
      cherry: {
        CELL_W: 49, CELL_H: 84,
        frames: {
          idle: [[44,79],[44,79],[44,74],[44,74],[44,79],[44,79],[44,74],[44,74]],
          walk: [[44,84],[49,74],[49,69],[44,74],[44,74],[44,69],[44,64],[44,74]],
          spawn: [[44,47],[34,47],[44,64],[44,59],[44,74],[44,74],[44,74],[44,79]],
          attack: [[44,64],[44,64],[44,54],[44,44],[44,54],[44,44],[49,34],[44,44]],
          death: [[44,79],[44,74],[44,64],[49,59],[49,59],[49,59],[49,59],[49,59]]
        }
      },
      carrot: {
        CELL_W: 100, CELL_H: 94,
        frames: {
          idle: [[46,89],[46,78],[41,89],[41,89],[46,89],[46,78],[41,89],[41,89]],
          walk: [[47,89],[47,84],[47,78],[47,78],[41,94],[52,84],[52,73],[52,84]],
          spawn: [[41,35],[52,79],[47,89],[25,35],[52,84],[41,35],[47,83],[47,89]],
          attack: [[46,89],[85,94],[85,94],[58,89],[85,94],[85,94],[57,94],[85,94]],
          death: [[47,89],[74,57],[100,30],[52,84],[90,36],[100,30],[58,73],[100,30]]
        }
      },
      potato: {
        CELL_W: 100, CELL_H: 175,
        frames: {
          idle: [[62,68],[62,68],[62,73],[62,68],[62,68],[62,68],[62,73],[62,68]],
          walk: [[63,63],[63,63],[63,63],[63,63],[63,63],[63,63],[63,63],[63,63]],
          spawn: [[41,175],[73,62],[78,63],[31,175],[73,63],[63,170],[63,175],[90,57]],
          attack: [[62,68],[68,170],[63,170],[74,57],[100,170],[62,170],[62,68],[100,170]],
          death: [[62,170],[63,57],[68,52],[62,170],[62,68],[62,68],[62,68],[62,68]]
        }
      },
      onion: {
        CELL_W: 154, CELL_H: 173,
        frames: {
          idle: [[68,95],[68,90],[68,90],[68,90],[68,95],[68,90],[68,90],[68,90]],
          walk: [[68,95],[68,84],[68,84],[68,90],[68,79],[68,95],[68,84],[73,84]],
          spawn: [[41,173],[68,73],[68,95],[31,173],[68,78],[68,95],[68,173],[68,84]],
          attack: [[68,95],[79,106],[154,90],[68,95],[68,95],[68,95],[68,95],[68,95]],
          death: [[68,95],[68,68],[68,79],[68,95],[68,95],[68,95],[68,95],[68,95]]
        }
      }
    }
  },

  // Pájaro (puput): jefe final del nivel 2 parte 2. A diferencia de Talp, NO
  // se le puede matar de verdad: el combate es real (Hero puede moverse/
  // saltar y atacar con espada/puños, y el pájaro reacciona con un breve
  // parpadeo al golpe), pero el pájaro está pensado para acabar aterrizando
  // sus propios ataques sí o sí. Cada ataque que conecta hace daño normal a
  // Hero (igual que cualquier otro enemigo, con riesgo real de "Has Fallat"
  // si la vida llega a 0 antes); tiene una vida numérica (MAX_HP, ver
  // combat.js) que baja con los golpes de Hero, y en cuanto llega a 0, en
  // vez de morir agarra a Hero y se lo lleva volando (ver CAPTURE más abajo
  // y Bird.updateCapture en bird.js), terminando en la pantalla
  // "pròximament" (nivell 3). Solo tenemos dos poses reales (de pie/en vuelo
  // y picoteando/atacando), sin ciclo de vuelo propio, así que "active" usa
  // un ligero balanceo (HOVER_*) para dar sensación de que planea.
  BIRD: {
    MAX_HP: 40,             // jefe: más resistente que un mook normal (10), aunque menos que Talp (55)
    HEIGHT: 175,           // más grande (antes 130), para que se note que es el jefe final
    SPAWN_X: 2200,         // al final del gauntlet de verduras (ver VEGGIE.SPAWNS)
    WAKE_DISTANCE: 260,
    HOVER_AMPLITUDE: 3,   // balanceo vertical MUY leve mientras persigue/ataca: los pies tocan el suelo
    HOVER_SPEED: 0.0022,
    SPEED: 2.6,
    ATTACK_RANGE: 140,
    HIT_RANGE: 165,
    ATTACK_COOLDOWN_MS: 1300,
    ATTACK_DURATION_MS: 420,
    ATTACK_HIT_FRACTION: 0.6,
    CHASE_LEASH: 900,     // prácticamente todo el tramo: no se rinde
    FLINCH_MS: 150,       // parpadeo al recibir un golpe de Hero (no le hace nada más, es invulnerable)
    FLAP_FRAME_MS: 90,    // velocidad del ciclo de aleteo real (ASSETS.bird.flap, 4 frames en bucle)
    ATTACK_FOOT_GAP: 18,  // px (en la imagen attack.png original, 343 de alto) que el pico sobresale por debajo de las patas: ver Bird._anchorY

    // Secuencia final, una vez conecta el 5º golpe: se posa junto a Hero y
    // lo agarra (grab), sube en vertical con él (rise), se aleja volando
    // hacia fuera de la pantalla (exit) y funde a negro (fade) antes de dar
    // paso a PoolScene (ver poolscene.js), la apertura del nivel 3.
    CAPTURE: {
      GRAB_MS: 350,
      RISE_MS: 900,
      RISE_DISTANCE: 260,
      EXIT_MS: 700,
      EXIT_SPEED: 8,
      FADE_MS: 600
    }
  },

  // --- Escena de apertura del nivel 3 (ver poolscene.js): tras la fundido a
  // negro de la captura, el pájaro (mucho más pequeño que en el combate)
  // cruza el cielo sobre una piscina y deja caer un pequeño bulto que, al
  // tocar el agua, crece de golpe y resulta ser Hero. Escena fija (sin
  // scroll), con la imagen de fondo ya a la resolución del canvas.
  POOL_SCENE: {
    BG_PATH: '../Visuals/level3/piscina.jpg',
    BIRD_HEIGHT: 55,        // bastante más pequeño que en el combate (CONFIG.BIRD.HEIGHT = 175)
    BIRD_FLY_Y: 90,         // altura (en pantalla) a la que vuela, por encima del muro/luces
    BIRD_SPEED: 3.2,
    BIRD_ENTRY_X: 1060,     // entra por la derecha, fuera de pantalla
    HOVER_X: 300,           // se detiene encima de la piscina (cerca del borde derecho) para soltar el bulto
    HOVER_MS: 500,
    DROP_Y_START: 100,
    DROP_Y_END: 420,        // agua, cerca del borde de la piscina en piscina.jpg (960x540)
    DROP_MS: 550,
    SPLASH_MS: 550,
    GROW_MS: 850,
    HERO_START_HEIGHT: 8,   // diminuto: no se distingue qué es hasta que crece
    HERO_FINAL_HEIGHT: 165, // bastante más grande que el tamaño normal de jugabilidad (112): la piscina es grande, Hero tiene que notarse a esa escala
    STAND_X: 300,           // mismo x que HOVER_X: crece justo donde ha caído, dentro del agua
    WATER_GROUND_Y: 420,    // dentro del agua, donde crece (mismo y que DROP_Y_END)
    DECK_GROUND_Y: 470,     // borde de piedra fuera de la piscina, donde aterriza el salto
    // Pequeño salto (arco real, con las poses reales de salto) justo después
    // de crecer, para SALIR de la piscina de un brinco: avanza de
    // WATER_GROUND_Y a DECK_GROUND_Y (HOP_X_OFFSET a la derecha) mientras
    // sube y baja.
    HOP_MS: 420,
    HOP_HEIGHT: 55,
    HOP_X_OFFSET: 180,
    // Mac Arrons se teletransporta a la escena a mitad del diálogo (ver
    // POOL_DIALOGUE en poolscene.js): reutiliza su sprite normal (ASSETS.mac)
    // a la misma altura que en el nivel 1, ya que por casualidad coincide
    // con la de Hero en esta escena (165).
    MAC_X: 620,
    MAC_HEIGHT: 165,
    MAC_APPEAR_MS: 260,      // "pop" rápido al aparecer (ver spawnTeleport)
    // Teletransporte final (ver drawTeleportBeam en poolscene.js): un haz de
    // luz vertical flashea sobre Hero/Mac, el personaje desaparece de golpe
    // en el punto más brillante (nada de encogerse), el haz se apaga, y la
    // escena se queda vacía un rato antes de la tarjeta final.
    TELEPORT_BEAM_MS: 700,
    TELEPORT_HIDE_FRACTION: 0.42, // instante (0-1) del haz en el que el personaje desaparece
    TELEPORT_EMPTY_MS: 2000,
    LINE: "Ostres, l'aigua m'ha fet creixer de nou! A veure si trobo al mag dels collons!"
  },

  // Escena de las oficinas de Infordisa (nivel 3, parte 2 - ver
  // officescene.js): arranca justo cuando PoolScene llega a su fase 'done'
  // (ver startOfficeScene en main.js). Hero y Mac aparecen con el mismo haz
  // de luz que cierra PoolScene (pero a la inversa: se materializan en vez
  // de desaparecer), Mac se despide porque nota "massa màgia" para él y se
  // teletransporta fuera, y entonces entra flotando Big Bross (sobre su nube,
  // ver ASSETS.bigBross), que pide ayuda porque la màgia se le ha ido de las
  // manos. Escena fija (cameraX=0).
  OFFICE_SCENE: {
    BG_PATH: '../Visuals/level3/oficinas.jpg',
    GROUND_Y: 410, // línea del suelo (baldosa), calibrada a ojo con una rejilla de referencia sobre oficinas.jpg (960x540)

    // Aparecen en la zona de baldosa despejada frente al despacho de
    // cristal (izquierda de la imagen): más a la derecha se cruza con el
    // mostrador rojo y las mesas de trabajo, y los personajes "flotarían"
    // encima de esos muebles al no haber ordenación por profundidad.
    HERO_X: 260,
    // = HERO_HEIGHT_GAMEPLAY (112), NO HERO_HEIGHT_CUTSCENE (155): Hero se
    // queda al mismo tamaño "de jugabilidad" durante TODA la escena (llegada,
    // diálogos y freeRoam), para que no se note un salto de tamaño justo al
    // empezar a luchar contra el sapo (antes entraba a 155 y encogía a 112
    // de golpe al recuperar el control).
    HERO_HEIGHT: 112,
    MAC_X: 360,
    MAC_HEIGHT: 165,

    // Llegada (haz de luz, mismo aspecto que el de PoolScene): aparecen
    // juntos, se revelan en el tramo brillante del haz, y tras una pequeña
    // pausa arranca el diálogo de despedida de Mac.
    ARRIVE_BEAM_MS: 700,
    ARRIVE_REVEAL_FRACTION: 0.42,
    POST_ARRIVE_PAUSE_MS: 400,

    // Salida de Mac (mismo mecanismo que el teletransporte final de PoolScene).
    MAC_EXIT_BEAM_MS: 700,
    MAC_EXIT_HIDE_FRACTION: 0.42,
    POST_MAC_EXIT_PAUSE_MS: 350,

    // Entrada de Big Bross: se desliza flotando (sobre su nube, ya integrada
    // en el propio sprite) desde fuera de pantalla (derecha) hasta su punto
    // de parada, con un ligero vaivén vertical (mismo estilo que el hover
    // del pájaro, ver CONFIG.BIRD.HOVER_*). Se para junto a la columna,
    // justo antes del mostrador rojo (zona de baldosa despejada), cerca de
    // Hero/Mac sin superponerse a los muebles.
    BIG_BROSS_HEIGHT: 175,
    BIG_BROSS_ENTRY_X: 1040,
    BIG_BROSS_STOP_X: 450,
    BIG_BROSS_FLOAT_SPEED: 1.6,
    BIG_BROSS_HOVER_AMPLITUDE: 5,
    BIG_BROSS_HOVER_SPEED: 0.0018,
    // El cuerpo verde del sprite se cicla constantemente de color con un
    // filtro CSS hue-rotate al dibujarlo (ver _drawBigBross): como la nube y
    // el fondo de galaxia son poco saturados, el giro de tono se nota sobre
    // todo en el cuerpo (y da un extra de brillo mágico al fondo estrellado).
    BIG_BROSS_HUE_CYCLE_MS: 6000, // tiempo para completar una vuelta de color (360º)

    // Tras la oferta de Big Bross entra el sapo mago (primer enemigo del
    // nivel), camina desde fuera de pantalla hasta pararse cerca del centro
    // de la sala, dice "Croac!" y Big Bross reacciona (con su pose de
    // sorpresa, ver ASSETS.bigBrossShock/_drawBigBross) antes de marcharse
    // flotando hacia la izquierda, fuera de pantalla (nada de teletransporte
    // en su salida). Al terminar, Hero recupera el control (ver fase
    // 'freeRoam' en officescene.js).
    TOAD_ENTRY_X: 1040,
    TOAD_STOP_X: 700,
    TOAD_ENTER_SPEED: 1.4,

    // Se sorprende en cuanto ve entrar al sapo (fase 'toadEnter') y sigue así
    // durante su "Croac!" (primera línea de TOAD_INTRO_LINES); en cuanto Big
    // Bross empieza a hablar (segunda línea, su reacción) vuelve a su pose
    // normal, y así se va de la escena.
    BIGBROSS_EXIT_SPEED: 7, // se va mucho más rápido que antes (era 2.2)
    BIGBROSS_EXIT_OFF_X: -150, // fuera de pantalla del todo por la izquierda
    POST_BIGBROSS_EXIT_PAUSE_MS: 300,

    // Espacio jugable una vez Hero recupera el control: mismo encuadre fijo
    // (sin scroll), Hero limitado a MARGIN_X por cada lado dentro del ancho
    // del canvas -> basta con fijar Player.levelWidth a CANVAS_W.
    FREE_ROAM_LEVEL_WIDTH: 960,

    END_FADE_MS: 900
  },

  // Sapo mago: primer enemigo del nivel 3 (ver TOAD_ENTRY_X en OFFICE_SCENE
  // y toad.js). Sheet única (Visuals/toad/toad_sheet.png, ver ASSETS.toad)
  // con 5 filas (idle/walk/cast/firebreath/death) x 8 columnas/frame, misma
  // técnica que CONFIG.VEGGIE.SHEETS: cada frame recortado a su tamaño real
  // y encajado en la esquina superior izquierda de su celda CELL_W x CELL_H
  // (todas las celdas de un mismo estado comparten tamaño real, a diferencia
  // de las verduras). El factor de escala (ver getScaledBox) se calcula una
  // vez a partir de la altura real del frame de idle, así el sapo tumbado al
  // morir no se estira para ocupar la misma altura que de pie.
  TOAD: {
    MAX_HP: 10,
    HEIGHT: 105,
    CELL_W: 211,
    CELL_H: 147,
    FRAME_COUNT: 8,
    FRAME_SIZES: {
      idle: [155, 135],
      walk: [159, 147],
      cast: [211, 135],
      firebreath: [167, 135],
      death: [199, 131]
    },
    IDLE_FRAME_MS: 220,
    WALK_FRAME_MS: 110,
    CAST_FRAME_MS: 90,
    FIREBREATH_FRAME_MS: 90,
    DEATH_FRAME_MS: 90,
    DEATH_HOLD_MS: 1400,
    DEATH_FADE_MS: 500,

    // Patrulla cerca de su punto de entrada (igual que las verduras) y, si
    // Hero está a tiro, ataca alternando hechizo (bala mágica) y aliento de
    // fuego (daño instantáneo en un cono corto) en vez de patrullar.
    PATROL_RANGE: 70,
    SPEED: 1,
    REST_MS: 900,
    ATTACK_RANGE: 480, // prácticamente toda la sala: siempre puede atacar si Hero está dentro
    ATTACK_COOLDOWN_MS: 1600,

    CAST_HIT_FRACTION: 0.55, // instante (0-1) del ciclo de CAST_FRAME_MS*8 en el que sale la bala
    BULLET_SPEED: 4.2,
    BULLET_RADIUS: 6,
    BULLET_LIFETIME_MS: 1600,

    FIREBREATH_HIT_FRACTION: 0.35, // instante del aliento en el que hace daño si Hero está en FIREBREATH_RANGE
    FIREBREATH_RANGE: 150,

    HEART_HEAL: 20 // corazón que suelta al morir (mismo sistema que las verduras)
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
