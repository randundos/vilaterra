// Punto de entrada: prepara el canvas, engancha el input a las acciones del
// jugador, y controla la máquina de estados del nivel: primero la cinemática
// del meteorito, luego la jugabilidad con scroll (Hero + jabalí + Mac Arrons).
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const groundY = CONFIG.CANVAS_H * CONFIG.GROUND_Y_RATIO;
const smallGroundY = CONFIG.CANVAS_H * CONFIG.SMALL_WORLD.GROUND_Y_RATIO;

let mode = 'cutscene'; // 'cutscene' | 'gameplay' | 'small'

// Escena "Mac rocía a Hero con la manguera" tras el diálogo de encuentro:
// null | 'spraying' (rociando un momento antes de encoger) | 'shrinking' | 'done'
let macSprayPhase = null;
let macSprayStart = 0;
let macSprayNextParticle = 0;

Input.onJump = () => { if ((mode === 'gameplay' || mode === 'small') && !Dialogue.active && !macSprayPhase) Player.jump(); };
Input.onAttack = () => { if ((mode === 'gameplay' || mode === 'small') && !Dialogue.active && !macSprayPhase) Player.attack(performance.now()); };
Input.onAction = () => {
  const now = performance.now();
  if (mode === 'cutscene') {
    Cutscene.handleAction(now);
  } else if ((mode === 'gameplay' || mode === 'small') && Dialogue.active) {
    Dialogue.advance(now);
  }
};
Input.onMenuUp = () => { if (mode === 'cutscene') Cutscene.handleMenuUp(); };
Input.onMenuDown = () => { if (mode === 'cutscene') Cutscene.handleMenuDown(); };
Input.init();

// Devuelve la caja en pantalla del personaje que habla, para anclar la
// burbuja de diálogo justo encima de su cabeza.
function getSpeakerBox(speaker) {
  return speaker === 'mac' ? Mac._box : Player._box;
}

// Rociada de Mac + encogimiento de Hero, tras terminar el diálogo de
// encuentro. Congela el resto del mundo (igual que el diálogo) hasta acabar.
function updateMacSprayScene(now) {
  const C = CONFIG.MAC_SPRAY;

  if (macSprayPhase === 'spraying' && now - macSprayStart >= C.LEAD_MS) {
    Player.startShrink(now);
    macSprayPhase = 'shrinking';
  }
  if (macSprayPhase === 'shrinking' && !Player.visible) {
    macSprayPhase = 'done';
    startSmallWorld(now);
  }

  if ((macSprayPhase === 'spraying' || macSprayPhase === 'shrinking') && now >= macSprayNextParticle && Player._box) {
    const tip = Mac.getHoseTip();
    const targetX = Player._box.x + Player._box.w / 2;
    const targetY = Player._box.y + Player._box.h / 2;
    for (let i = 0; i < C.PARTICLES_PER_TICK; i++) {
      spawnWaterDroplet(tip.x, tip.y, targetX, targetY, C.SPEED);
    }
    macSprayNextParticle = now + C.PARTICLE_INTERVAL_MS;
  }

  Particles.update(16.7);
}

// Arranca el tramo "Hero pequeño" entre la hierba, justo después de que
// Hero termine de encogerse del todo con la manguera de Mac.
function startSmallWorld(now) {
  mode = 'small';
  macSprayPhase = null; // ya no debe seguir congelando el mundo

  Player.visible = true;
  Player.shrinking = false;
  Player.height = CONFIG.HERO_HEIGHT_SMALL;
  Player.levelWidth = CONFIG.SMALL_WORLD.LEVEL_WIDTH;
  Player.x = CONFIG.MARGIN_X + 40;
  Player.facing = 'right';
  Player.dashVX = 0;
  Player.vy = 0;
  Player.jumpOffset = 0;
  Player.grounded = true;
  Player.jumpsUsed = 0;
  Player.isWalking = false;
  Player.pits = []; // no hay agujeros en este tramo

  Camera.reset();
  GrassBlade.reset();
  SwordPickup.active = false;
  Ant.reset(now, smallGroundY);
}

// Reinicia el nivel 1 desde el principio: lo dispara la caída por el
// agujero (ver checkPitFall más abajo). Vuelve todo a su estado inicial de
// jugabilidad (posición, vida, pulseras, jabalí) como si se acabara de
// terminar la cinemática.
function restartLevel1(now) {
  Player.x = 200;
  Player.height = CONFIG.HERO_HEIGHT_GAMEPLAY;
  Player.facing = 'right';
  Player.vy = 0;
  Player.jumpOffset = 0;
  Player.grounded = true;
  Player.jumpsUsed = 0;
  Player.dashVX = 0;
  Player.isWalking = false;
  Player.health = CONFIG.HERO_MAX_HEALTH;
  Player.bracelets = 0;
  Player.invulnerableUntil = 0;
  Player.levelWidth = CONFIG.LEVEL_WIDTH;
  Player.pits = [{ x: CONFIG.PIT.X, width: CONFIG.PIT.WIDTH }];

  Pickups.items = [];
  Camera.reset();
  Boar.init(now, groundY);

  Mac.metHero = false;
  Mac.spraying = false;
  macSprayPhase = null;
}

// Hero ha caído lo bastante lejos por el agujero (bien fuera de pantalla) ->
// se reinicia el nivel 1.
function checkPitFall(now) {
  if (Player.jumpOffset > CONFIG.PIT.FALL_TRIGGER) {
    restartLevel1(now);
  }
}

function update() {
  if (mode === 'cutscene') {
    Cutscene.update(performance.now());
    if (Cutscene.finished) {
      mode = 'gameplay';
      Player.height = CONFIG.HERO_HEIGHT_GAMEPLAY; // más pequeño que en la cinemática
      Player.pits = [{ x: CONFIG.PIT.X, width: CONFIG.PIT.WIDTH }];
      Camera.reset();
      Boar.init(performance.now(), groundY);
    }
    return;
  }

  const now = performance.now();

  if (Dialogue.active) {
    Dialogue.update(now);
    return; // el mundo se congela mientras se habla
  }

  if (mode === 'small') {
    Player.update();
    checkGrassBladeHit(now, Player, smallGroundY); // primero el golpe, o nunca pasaría de "sólido"
    blockGrassBlade(Player);
    checkAntSwordHit(now, Player, smallGroundY);
    checkAntStomp(now, Player, smallGroundY);
    Ant.update(now, Player, smallGroundY, Camera.x);
    Camera.update(Player.x, CONFIG.SMALL_WORLD.LEVEL_WIDTH);
    GrassBlade.update(now);
    SwordPickup.update(now, Player, smallGroundY);
    Pickups.update(now, Player, Camera.x, canvas.width, canvas.height); // las pulseras que suelte la hormiga
    return;
  }

  if (macSprayPhase) {
    updateMacSprayScene(now);
    return; // el mundo se congela durante la rociada + encogimiento
  }

  Player.update();
  checkPitFall(now); // si ha caído del todo, restartLevel1 ya ha vuelto a colocar a Hero al principio

  Camera.update(Player.x);
  Boar.update(now);
  checkBoarCollision(now, groundY);
  Pickups.update(now, Player, Camera.x, canvas.width, canvas.height);

  // Primer encuentro con Mac Arrons: se dispara una sola vez al acercarse.
  if (!Mac.metHero) {
    const distance = Math.abs(Mac.x - Player.x);
    if (distance <= CONFIG.TALK_DISTANCE) {
      Mac.metHero = true;
      Player.isWalking = false; // deja de andar en cuanto Mac empieza a hablar
      Dialogue.start(now, Mac.introLines, () => {
        Mac.spraying = true;
        macSprayPhase = 'spraying';
        macSprayStart = performance.now();
        macSprayNextParticle = 0;
      });
    }
  }
}

function draw(t) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (mode === 'cutscene') {
    Cutscene.draw(ctx, t);
    return;
  }

  const now = performance.now();

  if (mode === 'small') {
    drawSmallWorldBackground(ctx, Camera.x);
    GrassBlade.draw(ctx, now, smallGroundY, Camera.x);
    SwordPickup.draw(ctx, now, smallGroundY, Camera.x);
    Ant.draw(ctx, now, Camera.x);
    Player.draw(ctx, t, smallGroundY, Camera.x);
    Pickups.draw(ctx, now, Camera.x); // pulseras sueltas por la hormiga, volando al contador
    Dialogue.draw(ctx, getSpeakerBox);
    drawHealthBar(ctx, Player.health / CONFIG.HERO_MAX_HEALTH);
    drawBraceletCounter(ctx, canvas.width, canvas.height, Player.bracelets);
    return;
  }

  drawLevelBackground(ctx, Camera.x);
  Mac.draw(ctx, t, groundY, Camera.x);
  Boar.draw(ctx, now, t, Camera.x);
  Player.draw(ctx, t, groundY, Camera.x);
  Particles.draw(ctx); // agua de la manguera, por encima de Mac y Hero
  Pickups.draw(ctx, now, Camera.x); // encima del Hero: las que flotan y las que ya van volando
  Dialogue.draw(ctx, getSpeakerBox);

  drawHealthBar(ctx, Player.health / CONFIG.HERO_MAX_HEALTH);
  drawBraceletCounter(ctx, canvas.width, canvas.height, Player.bracelets);
}

function loop(t) {
  update();
  draw(t || 0);
  requestAnimationFrame(loop);
}

// --- Atajos de depuración: teclas 1-4 para saltar a puntos clave del juego
// sin tener que rejugar desde el principio cada vez. Solo activos si
// CONFIG.DEBUG es true (ver config.js); no tocan el HUD ni el input normal.
if (CONFIG.DEBUG) {
  const hideBoar = () => {
    Boar.active = false;
    Boar.alive = false; // con las dos a false, Boar.draw()/update() se saltan del todo
  };

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const now = performance.now();

    if (e.key === '1') {
      // justo antes del agujero
      mode = 'gameplay';
      Dialogue.active = false;
      macSprayPhase = null;
      hideBoar();
      Player.visible = true;
      Player.height = CONFIG.HERO_HEIGHT_GAMEPLAY;
      Player.levelWidth = CONFIG.LEVEL_WIDTH;
      Player.pits = [{ x: CONFIG.PIT.X, width: CONFIG.PIT.WIDTH }];
      Player.x = CONFIG.PIT.X - 80;
      Player.vy = 0; Player.jumpOffset = 0; Player.grounded = true; Player.jumpsUsed = 0; Player.dashVX = 0;
      Player.health = CONFIG.HERO_MAX_HEALTH;
      Camera.reset();
    } else if (e.key === '2') {
      // justo antes de Mac Arrons (para probar el diálogo + la manguera)
      mode = 'gameplay';
      Dialogue.active = false;
      macSprayPhase = null;
      hideBoar();
      Mac.metHero = false;
      Mac.spraying = false;
      Player.visible = true;
      Player.height = CONFIG.HERO_HEIGHT_GAMEPLAY;
      Player.levelWidth = CONFIG.LEVEL_WIDTH;
      Player.pits = [{ x: CONFIG.PIT.X, width: CONFIG.PIT.WIDTH }];
      Player.x = CONFIG.MAC_X - 200;
      Player.vy = 0; Player.jumpOffset = 0; Player.grounded = true; Player.jumpsUsed = 0; Player.dashVX = 0;
      Player.health = CONFIG.HERO_MAX_HEALTH;
      Camera.reset();
    } else if (e.key === '3') {
      // tramo de hierba, con la espada ya equipada, cerca de la hormiga
      startSmallWorld(now);
      GrassBlade.state = 'gone';
      Player.hasSword = true;
      Player.x = CONFIG.ANT.SPAWN_X - 150;
    } else if (e.key === '4') {
      // reinicia el nivel 1 del todo, desde el principio
      restartLevel1(now);
      mode = 'gameplay';
    }
  });

  console.log('[DEBUG] Atajos activos: 1 = antes del agujero · 2 = antes de Mac Arrons · 3 = hierba con espada, cerca de la hormiga · 4 = reiniciar nivel 1');
}

loadAssets(() => {
  Cutscene.start(performance.now());
  requestAnimationFrame(loop);
});
