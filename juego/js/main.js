// Punto de entrada: prepara el canvas, engancha el input a las acciones del
// jugador, y lleva el bucle principal (update + draw) del nivel.
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const groundY = CONFIG.CANVAS_H * CONFIG.GROUND_Y_RATIO;

Input.onJump = () => Player.jump();
Input.onDash = () => Player.dash();
Input.init();

function update() {
  Player.update();
  Mac.updateBubble(Player.x);
}

function draw(t) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(ASSETS.bg, 0, 0, canvas.width, canvas.height);

  Mac.draw(ctx, t, groundY);
  Player.draw(ctx, t, groundY);
  Mac.drawBubble(ctx); // por encima de todo, incluso si Blai está delante
}

function loop(t) {
  update();
  draw(t || 0);
  requestAnimationFrame(loop);
}

loadAssets(() => requestAnimationFrame(loop));
