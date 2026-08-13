// Carga de imágenes (rutas relativas a la carpeta Visuals, un nivel por encima de /juego).
const ASSETS = {
  bg: new Image(),        // fondo completo (día), usado en la cinemática con tinte de noche
  bgSky: new Image(),     // capa de cielo/árboles para el scroll en paralaje (más lenta)
  bgGround: new Image(),  // capa de hierba/tierra para el scroll en paralaje (velocidad normal)
  hero: new Image(),      // protagonista jugable (aún sin nombre in-game, "Hero" de momento), pose de pie/idle
  heroJump: new Image(),  // pose de salto (mientras está en el aire)
  heroWalk: [],           // 8 frames reales del ciclo de andar (sustituyen al truco procedural)
  blai: new Image(),      // solo aparece en la cinemática inicial
  blaiShock: new Image(), // pose de Blai preocupado (manos a la cabeza) para el diálogo
  blaiPoint: new Image(), // pose de Blai señalando hacia Hero al pedirle ayuda
  mac: new Image(),
  macSpray: new Image(), // Mac con la manguera, rociando agua sobre Hero
  healthBar: new Image(), // barra de vida (corazón + tira), se recorta según el % de vida
  bracelet: new Image(),  // icono de pulsera para el contador de recompensas
  boar: { idle: [], move: [], turn: [], stop: [], hurt: [], death: [] }
};

ASSETS.bg.src = '../Visuals/fondo%20lvl1.png';
ASSETS.bgSky.src = '../Visuals/fondo_cielo.png';
ASSETS.bgGround.src = '../Visuals/fondo_suelo.png';
ASSETS.hero.src = '../Visuals/Hero_sinfondo.png';
ASSETS.heroJump.src = '../Visuals/Hero_salto_sinfondo.png';

const HERO_WALK_FRAME_COUNT = 8;
for (let i = 0; i < HERO_WALK_FRAME_COUNT; i++) {
  const img = new Image();
  img.src = `../Visuals/hero_walk/walk_${i}.png`;
  ASSETS.heroWalk.push(img);
}
ASSETS.blai.src = '../Visuals/Blai_sinfondo.png';
ASSETS.blaiShock.src = '../Visuals/Blai_preocupat_sinfondo.png';
ASSETS.blaiPoint.src = '../Visuals/Blai_preguntant_sinfondo.png';
ASSETS.mac.src = '../Visuals/Mac%20Arrons_sinfondo.png';
ASSETS.macSpray.src = '../Visuals/Mac_reguera_sinfondo.png';
ASSETS.healthBar.src = '../Visuals/barra_vida_sinfondo.png';
ASSETS.bracelet.src = '../Visuals/pulsera_sinfondo.png';

const BOAR_FRAME_COUNT = 8;
Object.keys(ASSETS.boar).forEach((state) => {
  for (let i = 0; i < BOAR_FRAME_COUNT; i++) {
    const img = new Image();
    img.src = `../Visuals/jabali/${state}_${i}.png`;
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
