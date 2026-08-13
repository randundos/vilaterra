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
Input.onDash = () => { if ((mode === 'gameplay' || mode === 'small') && !Dialogue.active && !macSprayPhase) Player.dash(); };
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
  Player.isWalking = false;

  Camera.reset();
  GrassBlade.reset();
  SwordPickup.active = false;
}

function update() {
  if (mode === 'cutscene') {
    Cutscene.update(performance.now());
    if (Cutscene.finished) {
      mode = 'gameplay';
      Player.height = CONFIG.HERO_HEIGHT_GAMEPLAY; // más pequeño que en la cinemática
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
    Camera.update(Player.x, CONFIG.SMALL_WORLD.LEVEL_WIDTH);
    GrassBlade.update(now);
    SwordPickup.update(now, Player, smallGroundY);
    return;
  }

  if (macSprayPhase) {
    updateMacSprayScene(now);
    return; // el mundo se congela durante la rociada + encogimiento
  }

  Player.update();
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
    Player.draw(ctx, t, smallGroundY, Camera.x);
    Dialogue.draw(ctx, getSpeakerBox);
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

loadAssets(() => {
  Cutscene.start(performance.now());
  requestAnimationFrame(loop);
});
