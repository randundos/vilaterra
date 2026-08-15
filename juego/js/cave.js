// Cueva al final del tramo de hierba (ver CONFIG.SMALL_WORLD.CAVE): la
// salida hacia "nivel 2, parte 2". Mientras Talp siga vivo, una barrera
// invisible impide llegar hasta la boca (sin ningún bloqueo dibujado
// encima); en cuanto muere, cruzar hasta CAVE.TRANSITION_X dispara el
// cambio a nivel 2 parte 2 (ver startCaveTransition en main.js).

// Mientras Talp no esté derrotado, Hero no puede acercarse más allá del
// borde de la boca (aunque haya saltado por encima de Talp): a diferencia
// del cuerpo de Talp, esta barrera SÍ ocupa toda la altura, como una pared.
function blockCaveEntrance(player) {
  if (Talp.defeated) return;
  const gateX = CONFIG.SMALL_WORLD.CAVE.GATE_X;
  if (player.x > gateX) player.x = gateX;
}

// true en el instante en que Hero ha cruzado lo bastante adentro de la
// cueva (con Talp ya derrotado) como para disparar el cambio de pantalla.
function checkCaveTransition(player) {
  return Talp.defeated && player.x >= CONFIG.SMALL_WORLD.CAVE.TRANSITION_X;
}
