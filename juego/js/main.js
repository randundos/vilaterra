// Punto de entrada: prepara el canvas, engancha el input a las acciones del
// jugador, y controla la máquina de estados del nivel: primero la cinemática
// del meteorito, luego la jugabilidad con scroll (Hero + jabalí + Mac Arrons).
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const groundY = CONFIG.CANVAS_H * CONFIG.GROUND_Y_RATIO;
const smallGroundY = CONFIG.CANVAS_H * CONFIG.SMALL_WORLD.GROUND_Y_RATIO;

let mode = 'cutscene'; // 'cutscene' | 'gameplay' | 'small' | 'small2' (al otro lado de la cueva) | 'poolscene' (apertura nivel 3, ver poolscene.js) | 'officescene' (oficinas de Infordisa, ver officescene.js)

// Escena "Mac rocía a Hero con la manguera" tras el diálogo de encuentro:
// null | 'spraying' (rociando un momento antes de encoger) | 'shrinking' | 'done'
let macSprayPhase = null;
let macSprayStart = 0;
let macSprayNextParticle = 0;

// Pantalla de muerte (vida a 0): null | 'showing'. Mientras está activa se
// congela el mundo entero (como el diálogo o la rociada de Mac).
let deathPhase = null;
let deathStart = 0;

Input.onJump = () => { if ((mode === 'gameplay' || mode === 'small' || mode === 'small2') && !Dialogue.active && !macSprayPhase && !deathPhase && !ItemPopup.active && Bird.state !== 'captured') Player.jump(); };
// tecla E: en la cinemática avanza el diálogo/la escena; en jugabilidad, si
// hay un aviso de objeto conseguido lo cierra (prioridad máxima), si no hay
// un diálogo en pantalla lo avanza, y si no, ataca (antes era el clic
// izquierdo).
Input.onAction = () => {
  const now = performance.now();
  if (mode === 'cutscene') {
    Cutscene.handleAction(now);
  } else if (mode === 'poolscene') {
    PoolScene.handleAction(now);
  } else if (mode === 'officescene') {
    OfficeScene.handleAction(now);
  } else if ((mode === 'gameplay' || mode === 'small' || mode === 'small2') && ItemPopup.active) {
    ItemPopup.dismiss();
  } else if ((mode === 'gameplay' || mode === 'small' || mode === 'small2') && Dialogue.active) {
    Dialogue.advance(now);
  } else if ((mode === 'gameplay' || mode === 'small' || mode === 'small2') && !macSprayPhase && !deathPhase && Bird.state !== 'captured') {
    Player.attack(now);
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
  SmallWorldPits.reset(); // Player.pits apunta a esta MISMA lista
  Player.pits = SmallWorldPits.list;
  Player.platforms = CONFIG.SMALL_WORLD.PLATFORMS.map((p) => ({ ...p }));

  Camera.reset();
  GrassBlade.reset();
  SwordPickup.active = false;
  Ants.reset(now, smallGroundY);
  Worms.reset(now, smallGroundY);
  Talp.init(now, smallGroundY);
  Platforms.reset();
  Pickups.items = []; // limpia pulseras de una posible partida anterior
  // pulseras "de regalo" encima de las plataformas bonus, ya colocadas desde el inicio del tramo
  Platforms.list.filter((p) => p.bonus).forEach((p) => {
    Pickups.spawnBraceletsAt(p.x + p.width / 2, smallGroundY + p.top - CONFIG.PICKUP.GROUND_OFFSET, 3);
  });
}

// Al otro lado de la cueva: zona provisional (ver CONFIG.SMALL_WORLD2), sin
// resetear vida/pulseras/espada -> es la misma partida continuando, no un
// reinicio. La dispara updateCaveTransition() a media pantalla en negro.
function startSmallWorld2(now) {
  mode = 'small2';

  Player.x = CONFIG.MARGIN_X + 40;
  Player.facing = 'right';
  Player.dashVX = 0;
  Player.vy = 0;
  Player.jumpOffset = 0;
  Player.grounded = true;
  Player.jumpsUsed = 0;
  Player.isWalking = false;
  Player.levelWidth = CONFIG.SMALL_WORLD2.LEVEL_WIDTH;
  Player.pits = [];
  Player.platforms = [];

  Pickups.items = [];
  Camera.reset();
  Veggies.reset(now, smallGroundY);
  Bird.init(now, smallGroundY);
}

// Arranca la escena de apertura del nivel 3 (ver poolscene.js): la dispara
// update() en cuanto Bird.captureSub llega a 'done' (el pájaro ha terminado
// de fundir a negro tras la cinemática de captura).
function startPoolScene(now) {
  mode = 'poolscene';
  PoolScene.start(now);
}

// Arranca la escena de las oficinas de Infordisa (ver officescene.js): la
// dispara update() en cuanto PoolScene.phase llega a 'done' (pantalla vacía
// tras el teletransporte final de Hero+Mac).
function startOfficeScene(now) {
  mode = 'officescene';
  OfficeScene.start(now);
}

// Corte a negro al cruzar la cueva (Talp ya derrotado): congela el mundo
// mientras dura (ver el freeze en update()), cambia de pantalla a media
// pantalla en negro, y vuelve a aparecer ya en nivel 2 parte 2.
const CAVE_TRANSITION_MS = 500;
let caveTransition = null; // null | 'out' | 'in'
let caveTransitionStart = 0;

function startCaveTransition(now) {
  if (caveTransition) return;
  caveTransition = 'out';
  caveTransitionStart = now;
}

function updateCaveTransition(now) {
  if (caveTransition === 'out' && now - caveTransitionStart >= CAVE_TRANSITION_MS) {
    startSmallWorld2(now);
    caveTransition = 'in';
    caveTransitionStart = now;
  } else if (caveTransition === 'in' && now - caveTransitionStart >= CAVE_TRANSITION_MS) {
    caveTransition = null;
  }
}

function caveTransitionAlpha(now) {
  if (caveTransition === 'out') return Math.min(1, (now - caveTransitionStart) / CAVE_TRANSITION_MS);
  if (caveTransition === 'in') return Math.max(0, 1 - (now - caveTransitionStart) / CAVE_TRANSITION_MS);
  return 0;
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
  Player.platforms = []; // el nivel 1 no tiene plataformas

  Pickups.items = [];
  Camera.reset();
  Boar.init(now, groundY);

  Mac.metHero = false;
  Mac.spraying = false;
  macSprayPhase = null;
}

// Hero ha caído lo bastante lejos por el agujero (bien fuera de pantalla) ->
// misma pantalla de muerte "Has Fallat" que al quedarse sin vida, y luego
// se reinicia el nivel 1 (lo hace updateDeathScene).
function checkPitFall(now) {
  if (Player.jumpOffset > CONFIG.PIT.FALL_TRIGGER) {
    startDeath(now);
  }
}

// Reinicia el tramo de hierba desde el principio: a diferencia de
// startSmallWorld (que solo coloca a Hero al llegar por primera vez, tras
// encogerse), esto también resetea vida/pulseras/espada, como corresponde
// a un reinicio real del nivel tras morir.
function restartSmallWorld(now) {
  Player.health = CONFIG.HERO_MAX_HEALTH;
  Player.bracelets = 0;
  Player.hasSword = false;
  Pickups.items = [];
  ItemPopup.dismiss();
  caveTransition = null; // por si acaso, aunque no debería poder morir en mitad del corte a negro
  startSmallWorld(now);
}

// Lo dispara update() en cuanto la vida de Hero llega a 0: congela el
// mundo y muestra "Has Fallat" (ver drawDeathOverlay); al cabo de
// CONFIG.DEATH.DURATION_MS se reinicia el nivel en el que ha muerto.
function startDeath(now) {
  if (deathPhase) return;
  deathPhase = 'showing';
  deathStart = now;
}

function updateDeathScene(now) {
  if (now - deathStart < CONFIG.DEATH.DURATION_MS) return;
  const diedInSmallWorld = mode === 'small' || mode === 'small2'; // morir a manos del pájaro en la parte 2 también reinicia el tramo entero desde el principio (parte 1, con Talp incluido)
  deathPhase = null;
  if (diedInSmallWorld) {
    restartSmallWorld(now);
  } else {
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
      Player.platforms = [];
      Camera.reset();
      Boar.init(performance.now(), groundY);
    }
    return;
  }

  if (mode === 'poolscene') {
    const nowPS = performance.now();
    PoolScene.update(nowPS);
    if (PoolScene.phase === 'done') { startOfficeScene(nowPS); return; } // pantalla vacía terminada -> oficinas de Infordisa
    return;
  }

  if (mode === 'officescene') {
    OfficeScene.update(performance.now());
    return;
  }

  const now = performance.now();

  if (deathPhase) {
    updateDeathScene(now);
    return; // el mundo se congela mientras se ve "Has Fallat"
  }

  if (Dialogue.active) {
    Dialogue.update(now);
    return; // el mundo se congela mientras se habla
  }

  if (ItemPopup.active) {
    return; // el mundo se congela mientras se ve el aviso de objeto conseguido
  }

  if (caveTransition) {
    updateCaveTransition(now);
    return; // el mundo se congela durante el corte a negro al cruzar la cueva
  }

  if (mode === 'small2') {
    const capturing = Bird.state === 'captured'; // cinemática final: el pájaro manda sobre la posición de Hero
    if (!capturing) {
      Player.update();
      checkVeggieSwordHit(now, Player, smallGroundY); // primero el golpe, o el contacto lateral haría daño igualmente
      checkVeggieCollision(now, Player, smallGroundY);
      checkBirdSwordHit(now, Player, smallGroundY); // solo parpadeo, el pájaro es invulnerable
    }
    Veggies.update(now, Player);
    Bird.update(now, Player, smallGroundY);
    Camera.update(Player.x, CONFIG.SMALL_WORLD2.LEVEL_WIDTH);
    Pickups.update(now, Player, smallGroundY, Camera.x, canvas.width, canvas.height); // corazones que sueltan las verduras
    if (!capturing && Player.health <= 0) startDeath(now);
    if (Bird.captureSub === 'done') { startPoolScene(now); return; } // fundido a negro terminado -> apertura nivel 3
    return;
  }

  if (mode === 'small') {
    Player.update();
    checkPitFall(now); // caer por la gran travesía = "Has Fallat" y se reinicia el tramo
    checkGrassBladeHit(now, Player, smallGroundY); // primero el golpe, o nunca pasaría de "sólido"
    blockGrassBlade(Player);
    checkAntSwordHit(now, Player, smallGroundY);
    checkAntStomp(now, Player, smallGroundY);
    Ants.update(now, Player, smallGroundY, Camera.x);
    checkWormSwordHit(now, Player, smallGroundY); // primero el golpe, o el contacto lateral haría daño igualmente
    checkWormCollision(now, Player, smallGroundY);
    Worms.update(now);
    checkTalpSwordHit(now, Player, smallGroundY); // primero el golpe, o el pisotón lo mataría igual
    checkTalpCollision(now, Player, smallGroundY);
    Talp.update(now, Player, smallGroundY);
    blockTalpBody(Player, smallGroundY); // el cuerpo de Talp es sólido a su alrededor, pero se puede saltar por encima
    blockCaveEntrance(Player); // barrera de la boca de la cueva, esta sí ocupa toda la altura, mientras Talp no esté derrotado
    if (checkCaveTransition(Player)) startCaveTransition(now);
    Camera.update(Player.x, CONFIG.SMALL_WORLD.LEVEL_WIDTH);
    GrassBlade.update(now);
    SwordPickup.update(now, Player, smallGroundY);
    Pickups.update(now, Player, smallGroundY, Camera.x, canvas.width, canvas.height); // pulseras de la hormiga + las de regalo en las plataformas
    if (Player.health <= 0) startDeath(now);
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
  checkBoarSwordHit(now, Player, groundY); // primero el golpe, o el contacto lateral haría daño igualmente
  checkBoarCollision(now, groundY);
  Pickups.update(now, Player, groundY, Camera.x, canvas.width, canvas.height);

  if (Player.health <= 0) {
    startDeath(now);
    return;
  }

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

  if (mode === 'poolscene') {
    PoolScene.draw(ctx, t, performance.now());
    return;
  }

  if (mode === 'officescene') {
    OfficeScene.draw(ctx, t, performance.now());
    return;
  }

  const now = performance.now();

  if (mode === 'small2') {
    drawSmallWorld2Background(ctx, Camera.x);
    Veggies.draw(ctx, now, Camera.x);
    Player.draw(ctx, t, smallGroundY, Camera.x);
    Bird.draw(ctx, now, Camera.x);
    Pickups.draw(ctx, now, Camera.x); // corazones que sueltan las verduras
    drawHealthBar(ctx, Player.health / CONFIG.HERO_MAX_HEALTH);
    drawBraceletCounter(ctx, canvas.width, canvas.height, Player.bracelets);
    if (deathPhase) drawDeathOverlay(ctx, now, deathStart);
    drawFadeOverlay(ctx, canvas.width, canvas.height, caveTransitionAlpha(now));
    if (Bird.captureSub === 'fade') {
      // fundido a negro que enlaza con PoolScene (ver startPoolScene, update())
      const alpha = Math.min(1, (now - Bird.captureStart) / CONFIG.BIRD.CAPTURE.FADE_MS);
      drawFadeOverlay(ctx, canvas.width, canvas.height, alpha);
    }
    return;
  }

  if (mode === 'small') {
    drawSmallWorldBackground(ctx, Camera.x);
    drawCaveEntrance(ctx, Camera.x, smallGroundY);
    Platforms.draw(ctx, smallGroundY, Camera.x);
    GrassBlade.draw(ctx, now, smallGroundY, Camera.x);
    SwordPickup.draw(ctx, now, smallGroundY, Camera.x);
    Ants.draw(ctx, now, Camera.x);
    Worms.draw(ctx, now, Camera.x);
    Talp.draw(ctx, now, Camera.x);
    Player.draw(ctx, t, smallGroundY, Camera.x);
    Pickups.draw(ctx, now, Camera.x); // pulseras sueltas por la hormiga, volando al contador
    Dialogue.draw(ctx, getSpeakerBox);
    drawHealthBar(ctx, Player.health / CONFIG.HERO_MAX_HEALTH);
    drawBraceletCounter(ctx, canvas.width, canvas.height, Player.bracelets);
    if (deathPhase) drawDeathOverlay(ctx, now, deathStart);
    if (ItemPopup.active) drawItemPopup(ctx, now, canvas.width, canvas.height, ItemPopup);
    drawFadeOverlay(ctx, canvas.width, canvas.height, caveTransitionAlpha(now));
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
  if (deathPhase) drawDeathOverlay(ctx, now, deathStart);
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
    if ('123456789'.includes(e.key)) ItemPopup.dismiss(); // por si algún atajo salta en mitad del aviso de objeto

    if (e.key === '1') {
      // justo antes del agujero
      mode = 'gameplay';
      Dialogue.active = false;
      macSprayPhase = null;
      deathPhase = null;
      hideBoar();
      Player.visible = true;
      Player.height = CONFIG.HERO_HEIGHT_GAMEPLAY;
      Player.levelWidth = CONFIG.LEVEL_WIDTH;
      Player.pits = [{ x: CONFIG.PIT.X, width: CONFIG.PIT.WIDTH }];
      Player.platforms = [];
      Player.x = CONFIG.PIT.X - 80;
      Player.vy = 0; Player.jumpOffset = 0; Player.grounded = true; Player.jumpsUsed = 0; Player.dashVX = 0;
      Player.health = CONFIG.HERO_MAX_HEALTH;
      Camera.reset();
    } else if (e.key === '2') {
      // justo antes de Mac Arrons (para probar el diálogo + la manguera)
      mode = 'gameplay';
      Dialogue.active = false;
      macSprayPhase = null;
      deathPhase = null;
      hideBoar();
      Mac.metHero = false;
      Mac.spraying = false;
      Player.visible = true;
      Player.height = CONFIG.HERO_HEIGHT_GAMEPLAY;
      Player.levelWidth = CONFIG.LEVEL_WIDTH;
      Player.pits = [{ x: CONFIG.PIT.X, width: CONFIG.PIT.WIDTH }];
      Player.platforms = [];
      Player.x = CONFIG.MAC_X - 200;
      Player.vy = 0; Player.jumpOffset = 0; Player.grounded = true; Player.jumpsUsed = 0; Player.dashVX = 0;
      Player.health = CONFIG.HERO_MAX_HEALTH;
      Camera.reset();
    } else if (e.key === '3') {
      // tramo de hierba, con la espada ya equipada, cerca de la primera hormiga
      deathPhase = null;
      startSmallWorld(now);
      GrassBlade.state = 'gone';
      Player.hasSword = true;
      Player.x = CONFIG.ANT.SPAWNS[0] - 150;
    } else if (e.key === '4') {
      // reinicia el nivel 1 del todo, desde el principio
      deathPhase = null;
      restartLevel1(now);
      mode = 'gameplay';
    } else if (e.key === '5') {
      // prueba rápida de la pantalla de muerte "Has Fallat", sin tener que
      // perder toda la vida jugando; al acabar reinicia el nivel actual
      Player.health = 0;
      startDeath(now);
    } else if (e.key === '6') {
      // justo antes de la gran travesía de plataformas, con espada
      deathPhase = null;
      startSmallWorld(now);
      GrassBlade.state = 'gone';
      Player.hasSword = true;
      Player.x = CONFIG.SMALL_WORLD.PITS[0].x - 60;
    } else if (e.key === '7') {
      // justo antes del jefe Talp (final del tramo), con espada
      deathPhase = null;
      startSmallWorld(now);
      GrassBlade.state = 'gone';
      Player.hasSword = true;
      Player.x = CONFIG.TALP.GUARD_X - CONFIG.TALP.WAKE_DISTANCE - 30;
    } else if (e.key === '8') {
      // justo antes del gusano, con espada
      deathPhase = null;
      startSmallWorld(now);
      GrassBlade.state = 'gone';
      Player.hasSword = true;
      Player.x = CONFIG.WORM.SPAWNS[0] - 150;
    } else if (e.key === '9') {
      // nivel 2 parte 2, al otro lado de la cueva (Talp ya "derrotado")
      deathPhase = null;
      caveTransition = null;
      startSmallWorld(now); // por si se necesita volver atrás con '6'/'7'/'8' después
      Talp.defeated = true;
      Player.hasSword = true;
      startSmallWorld2(now);
    } else if (e.key === '0') {
      // justo antes del pájaro, en nivel 2 parte 2
      deathPhase = null;
      caveTransition = null;
      startSmallWorld(now);
      Talp.defeated = true;
      Player.hasSword = true;
      startSmallWorld2(now);
      Player.x = CONFIG.BIRD.SPAWN_X - CONFIG.BIRD.WAKE_DISTANCE - 30;
    } else if (e.key === 'p') {
      // directo a la escena de la piscina (apertura nivel 3)
      deathPhase = null;
      caveTransition = null;
      startPoolScene(now);
    } else if (e.key === 'o') {
      // directo a la escena de las oficinas de Infordisa (nivel 3, parte 2)
      deathPhase = null;
      caveTransition = null;
      startOfficeScene(now);
    }
  });

  console.log('[DEBUG] Atajos activos: 1 = antes del agujero · 2 = antes de Mac Arrons · 3 = hierba con espada, cerca de la 1a hormiga · 4 = reiniciar nivel 1 · 5 = probar pantalla de muerte · 6 = antes de la travesía de plataformas · 7 = antes del jefe Talp · 8 = antes del gusano · 9 = nivel 2 parte 2 (al otro lado de la cueva) · 0 = justo antes del pájaro · p = escena de la piscina (apertura nivel 3) · o = escena de las oficinas de Infordisa');
}

loadAssets(() => {
  Cutscene.start(performance.now());
  requestAnimationFrame(loop);
});
