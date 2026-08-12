// Punto de entrada: prepara el canvas, engancha el input a las acciones del
// jugador, y controla la máquina de estados del nivel: primero la cinemática
// del meteorito, luego la jugabilidad con scroll (Hero + jabalí + Mac Arrons).
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const groundY = CONFIG.CANVAS_H * CONFIG.GROUND_Y_RATIO;

let mode = 'cutscene'; // 'cutscene' | 'gameplay'

Input.onJump = () => { if (mode === 'gameplay' && !Dialogue.active) Player.jump(); };
Input.onDash = () => { if (mode === 'gameplay' && !Dialogue.active) Player.dash(); };
Input.onAction = () => {
  const now = performance.now();
  if (mode === 'cutscene') {
    Cutscene.handleAction(now);
  } else if (mode === 'gameplay' && Dialogue.active) {
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

function update() {
  if (mode === 'cutscene') {
    Cutscene.update(performance.now());
    if (Cutscene.finished) {
      mode = 'gameplay';
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
      Dialogue.start(now, Mac.introLines, () => {
        // Aquí engancharemos la siguiente escena cuando lleguen más detalles.
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
  drawLevelBackground(ctx, Camera.x);
  Mac.draw(ctx, t, groundY, Camera.x);
  Boar.draw(ctx, now, t, Camera.x);
  Player.draw(ctx, t, groundY, Camera.x);
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
