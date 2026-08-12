// Punto de entrada: prepara el canvas, engancha el input a las acciones del
// jugador, y controla la máquina de estados del nivel: primero la cinemática
// del meteorito, luego la jugabilidad normal (Hero + Mac Arrons).
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const groundY = CONFIG.CANVAS_H * CONFIG.GROUND_Y_RATIO;

let mode = 'cutscene'; // 'cutscene' | 'gameplay'

Input.onJump = () => { if (mode === 'gameplay') Player.jump(); };
Input.onDash = () => { if (mode === 'gameplay') Player.dash(); };
Input.init();

function update() {
  if (mode === 'cutscene') {
    Cutscene.update(performance.now());
    if (Cutscene.finished) {
      mode = 'gameplay';
    }
  } else {
    Player.update();
    Mac.updateBubble(Player.x);
  }
}

function draw(t) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (mode === 'cutscene') {
    Cutscene.draw(ctx, t);
  } else {
    ctx.drawImage(ASSETS.bg, 0, 0, canvas.width, canvas.height);
    Mac.draw(ctx, t, groundY);
    Player.draw(ctx, t, groundY);
    Mac.drawBubble(ctx);
  }
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
