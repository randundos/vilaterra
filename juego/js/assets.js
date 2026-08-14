// Carga de imágenes (rutas relativas a la carpeta Visuals, un nivel por encima de /juego).
// ASSET_V se añade como query string a cada imagen para evitar que el
// navegador sirva una versión vieja cacheada de un archivo que hemos
// sustituido en disco (mismo nombre de archivo, contenido nuevo).
const ASSET_V = 6;
function withV(path) {
  return `${path}?v=${ASSET_V}`;
}

const ASSETS = {
  bg: new Image(),        // fondo completo (día), usado en la cinemática con tinte de noche
  bgSky: new Image(),     // capa de cielo/árboles para el scroll en paralaje (más lenta)
  bgGround: new Image(),  // capa de hierba/tierra para el scroll en paralaje (velocidad normal)
  hero: new Image(),      // protagonista jugable (aún sin nombre in-game, "Hero" de momento), pose de pie/idle
  heroWalk: [],           // 6 frames reales del ciclo de andar, sin arma
  heroJump: [],           // 4 frames reales del salto, sin arma (según la fase: despegue/subida/pico/caída)
  heroWalkSword: [],      // 6 frames reales del ciclo de andar, con la espada ya equipada
  heroJumpSword: [],      // 4 frames reales del salto, con la espada ya equipada
  heroSwordIdle: new Image(), // Hero de pie con la espada (reutiliza el frame 0 del ciclo de andar armado, para que sea la MISMA espada que al andar)
  heroAttackVertical: [],   // 5 frames reales del ataque "tajo vertical" (con espada)
  heroAttackHorizontal: [], // 5 frames reales del ataque "tajo horizontal" (con espada)
  heroAttackPunch: [],      // 4 frames reales del puñetazo (sin espada)
  sword: new Image(),     // espada suelta, para el pickup en el suelo del tramo de hierba
  bgSmallWorld: new Image(), // fondo del tramo "Hero pequeño" entre la hierba
  ant: new Image(),       // hormiga con rifle, primer y tercer enemigo del tramo de hierba
  worm: { rest: new Image(), move: new Image(), jump: new Image(), death: new Image() }, // gusano, 2o enemigo del tramo de hierba
  blai: new Image(),      // solo aparece en la cinemática inicial
  blaiShock: new Image(), // pose de Blai preocupado (manos a la cabeza) para el diálogo
  blaiPoint: new Image(), // pose de Blai señalando hacia Hero al pedirle ayuda
  mac: new Image(),
  macSpray: new Image(), // Mac con la manguera, rociando agua sobre Hero
  healthBar: new Image(), // barra de vida (corazón + tira), se recorta según el % de vida
  bracelet: new Image(),  // icono de pulsera para el contador de recompensas
  boar: { idle: [], move: [], turn: [], stop: [], hurt: [], death: [] }
};

ASSETS.bg.src = withV('../Visuals/fondo%20lvl1.png');
ASSETS.bgSky.src = withV('../Visuals/fondo_cielo.png');
ASSETS.bgGround.src = withV('../Visuals/fondo_suelo.png');
ASSETS.hero.src = withV('../Visuals/Hero_sinfondo.png');
// reutiliza el frame 0 del ciclo de andar armado: así la espada de la pose
// de pie (y la del ataque, que también usa heroSwordIdle) es la MISMA que
// la de andar/saltar, en vez del diseño antiguo de Hero_espada_sinfondo.png
ASSETS.heroSwordIdle.src = withV('../Visuals/hero_walk_sword/walk_0.png');
ASSETS.sword.src = withV('../Visuals/Espada_sinfondo.png');
ASSETS.bgSmallWorld.src = withV('../Visuals/fondo_hierba.png');
ASSETS.ant.src = withV('../Visuals/Hormiga_sinfondo.png');
ASSETS.worm.rest.src = withV('../Visuals/worm/rest.png');
ASSETS.worm.move.src = withV('../Visuals/worm/move.png');
ASSETS.worm.jump.src = withV('../Visuals/worm/jump.png');
ASSETS.worm.death.src = withV('../Visuals/worm/death.png');

const HERO_WALK_FRAME_COUNT = 6;
const HERO_JUMP_FRAME_COUNT = 4;
function loadFrameSet(target, folder, prefix, count) {
  for (let i = 0; i < count; i++) {
    const img = new Image();
    img.src = withV(`../Visuals/${folder}/${prefix}_${i}.png`);
    target.push(img);
  }
}
loadFrameSet(ASSETS.heroWalk, 'hero_walk', 'walk', HERO_WALK_FRAME_COUNT);
loadFrameSet(ASSETS.heroJump, 'hero_jump', 'jump', HERO_JUMP_FRAME_COUNT);
loadFrameSet(ASSETS.heroWalkSword, 'hero_walk_sword', 'walk', HERO_WALK_FRAME_COUNT);
loadFrameSet(ASSETS.heroJumpSword, 'hero_jump_sword', 'jump', HERO_JUMP_FRAME_COUNT);
loadFrameSet(ASSETS.heroAttackVertical, 'hero_attack_vertical', 'slash', CONFIG.ATTACK.SWORD_FRAME_COUNT);
loadFrameSet(ASSETS.heroAttackHorizontal, 'hero_attack_horizontal', 'slash', CONFIG.ATTACK.SWORD_FRAME_COUNT);
loadFrameSet(ASSETS.heroAttackPunch, 'hero_attack_punch', 'punch', CONFIG.ATTACK.UNARMED_FRAME_COUNT);
ASSETS.blai.src = withV('../Visuals/Blai_sinfondo.png');
ASSETS.blaiShock.src = withV('../Visuals/Blai_preocupat_sinfondo.png');
ASSETS.blaiPoint.src = withV('../Visuals/Blai_preguntant_sinfondo.png');
ASSETS.mac.src = withV('../Visuals/Mac%20Arrons_sinfondo.png');
ASSETS.macSpray.src = withV('../Visuals/Mac_reguera_sinfondo.png');
ASSETS.healthBar.src = withV('../Visuals/barra_vida_sinfondo.png');
ASSETS.bracelet.src = withV('../Visuals/pulsera_sinfondo.png');

const BOAR_FRAME_COUNT = 8;
Object.keys(ASSETS.boar).forEach((state) => {
  for (let i = 0; i < BOAR_FRAME_COUNT; i++) {
    const img = new Image();
    img.src = withV(`../Visuals/jabali/${state}_${i}.png`);
    ASSETS.boar[state].push(img);
  }
});

// Recopila todas las instancias de Image dentro de ASSETS, incluidas las que
// están anidadas en objetos/listas (como ASSETS.boar.idle).
function collectImages(node) {
  const list = [];
  Object.values(node).forEach((value) => {
    if (value instanceof Image) {
      list.push(value);
    } else if (Array.isArray(value)) {
      value.forEach((item) => { if (item instanceof Image) list.push(item); });
    } else if (value && typeof value === 'object') {
      list.push(...collectImages(value));
    }
  });
  return list;
}

// Llama a onReady() en cuanto todas las imágenes han terminado de cargar.
function loadAssets(onReady) {
  const images = collectImages(ASSETS);
  let loaded = 0;
  images.forEach((img) => {
    img.onload = () => {
      loaded++;
      if (loaded === images.length) onReady();
    };
    img.onerror = () => console.error('No se pudo cargar la imagen:', img.src);
  });
}
