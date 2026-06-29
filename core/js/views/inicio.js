// Pictosfera — vista "Inicio".
//
// Pantalla de bienvenida sencilla para el niño o niña: un saludo, un
// botón grande para ir a jugar y, si el adulto ha creado alguna ruta
// de aprendizaje (ver core/js/rutas.js), una tarjeta por ruta para
// entrar directamente a jugarla en orden. Es parte del núcleo.

import { t } from '../i18n.js';
import { navigate } from '../router.js';
import * as sounds from '../sounds.js';
import * as rutas from '../rutas.js';

export async function render() {
  const view = document.getElementById('view');
  view.innerHTML = '';
  let cancelado = false;

  const raiz = document.createElement('div');
  raiz.className = 'card inicio';

  const titulo = document.createElement('h1');
  titulo.textContent = t('inicio.bienvenida');

  const intro = document.createElement('p');
  intro.textContent = t('inicio.intro');

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn';
  btn.textContent = t('inicio.ir_juegos');
  btn.addEventListener('click', () => {
    sounds.click();
    navigate('/juegos');
  });

  raiz.append(titulo, intro, btn);
  view.appendChild(raiz);

  // Las rutas creadas se muestran aparte, como tarjetas propias: el
  // niño no necesita saber que son "de aprendizaje", solo verlas como
  // una forma más de jugar.
  let todasLasRutas = [];
  try {
    todasLasRutas = await rutas.listAll();
  } catch (err) {
    console.warn('[inicio] No se pudieron cargar las rutas:', err);
  }
  if (cancelado || !todasLasRutas.length) return () => { cancelado = true; };

  const seccionRutas = document.createElement('section');
  seccionRutas.className = 'estante';
  const tituloRutas = document.createElement('h2');
  tituloRutas.className = 'estante-titulo';
  tituloRutas.textContent = t('inicio.rutas_titulo');
  const grid = document.createElement('div');
  grid.className = 'app-grid';

  todasLasRutas.forEach((ruta) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'app-card';

    const icono = document.createElement('span');
    icono.className = 'app-icon';
    icono.setAttribute('aria-hidden', 'true');
    icono.textContent = '🧭';

    const nombre = document.createElement('span');
    nombre.textContent = ruta.nombre;

    card.append(icono, nombre);
    card.addEventListener('click', () => {
      sounds.click();
      navigate(`/rutas/jugar/${ruta.id}`);
    });
    grid.appendChild(card);
  });

  seccionRutas.append(tituloRutas, grid);
  raiz.appendChild(seccionRutas);

  return () => {
    cancelado = true;
  };
}
