// Carga de imágenes (rutas relativas a la carpeta Visuals, un nivel por encima de /juego).
const ASSETS = {
  bg: new Image(),
  hero: new Image(),  // protagonista jugable (aún sin nombre in-game, "Hero" de momento)
  blai: new Image(),  // solo aparece en la cinemática inicial
  mac: new Image()
};

ASSETS.bg.src = '../Visuals/fondo%20lvl1.png';
ASSETS.hero.src = '../Visuals/Hero_sinfondo.png';
ASSETS.blai.src = '../Visuals/Blai_sinfondo.png';
ASSETS.mac.src = '../Visuals/Mac%20Arrons_sinfondo.png';

// Llama a onReady() en cuanto todas las imágenes han terminado de cargar.
function loadAssets(onReady) {
  const images = Object.values(ASSETS);
  let loaded = 0;
  images.forEach((img) => {
    img.onload = () => {
      loaded++;
      if (loaded === images.length) onReady();
    };
    img.onerror = () => console.error('No se pudo cargar la imagen:', img.src);
  });
}
