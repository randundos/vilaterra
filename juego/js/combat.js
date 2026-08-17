// Sistema de daño compartido por los enemigos "mook" (jabalí, hormiga,
// gusano, verdura, sapo): en vez de morir de un único golpe, cada uno tiene
// una vida numérica (hp/maxHp) que baja según el tipo de golpe recibido. La
// espada quita más que los puños (ver meleeDamage); saltar encima (pisotón)
// quita una cantidad fija, sin importar el arma equipada (ver stompDamage).
// Talp (mini-jefe) y el pájaro ya tenían su propio sistema de "aguanta
// varios golpes" antes de esto y se quedan como estaban.

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// Golpe cuerpo a cuerpo (clic izquierdo / Player.attack()): la cantidad
// depende de si Hero lleva la espada equipada o solo los puños.
function meleeDamage(player) {
  const D = CONFIG.DAMAGE;
  return player.weaponEquipped === 'sword'
    ? randInt(D.SWORD_MIN, D.SWORD_MAX)
    : randInt(D.FIST_MIN, D.FIST_MAX);
}

// Pisotón (saltar encima del enemigo): siempre el mismo rango, no depende
// del arma equipada.
function stompDamage() {
  const D = CONFIG.DAMAGE;
  return randInt(D.STOMP_MIN, D.STOMP_MAX);
}

// Resta "amount" a la vida del enemigo (con suelo en 0) y activa su barra de
// vida (una vez visible, se queda así hasta que muera). Devuelve true si el
// golpe ha sido mortal (hp a 0), para que cada enemigo decida cómo
// reaccionar (entrar en su secuencia de muerte de siempre).
function applyEnemyDamage(enemy, amount) {
  enemy.hpBarVisible = true;
  enemy.hp = Math.max(0, enemy.hp - amount);
  return enemy.hp <= 0;
}
