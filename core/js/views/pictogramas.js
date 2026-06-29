// Pictosfera — vista "Pictogramas" (zona del adulto): menú principal.
//
// Antes esta pantalla mezclaba en una sola página la búsqueda en
// ARASAAC, las fotos propias y un resumen de secuencias, lo que
// resultaba confuso (un único título "Pictogramas" para tres tareas
// muy distintas, con un solo scroll larguísimo). Ahora es solo un
// menú con accesos, cada uno con su propia pantalla y su propia ruta:
//   - /pictogramas/arasaac    -> buscar y gestionar pictogramas de ARASAAC
//                                (pictogramasArasaac.js)
//   - /pictogramas/secuencias -> crear y editar secuencias, sin cambios
//                                (pictogramasSecuencias.js)
//   - /pictogramas/categorias -> crear y editar parejas de categorías
//                                dicotómicas (pictogramasCategorias.js)
//   - /pictogramas/fotos      -> añadir y gestionar fotos propias
//                                (pictogramasFotos.js)

import { t } from '../i18n.js';
import { navigate } from '../router.js';
import * as sounds from '../sounds.js';

const OPCIONES = [
  { ruta: '/pictogramas/arasaac', icono: '🖼️', clave: 'pictogramas.menu_pictogramas' },
  { ruta: '/pictogramas/secuencias', icono: '📋', clave: 'pictogramas.secuencias_titulo' },
  { ruta: '/pictogramas/categorias', icono: '🗂️', clave: 'pictogramas.categorias_titulo' },
  { ruta: '/pictogramas/fotos', icono: '📷', clave: 'pictogramas.menu_fotos' }
];

export async function render() {
  const view = document.getElementById('view');
  view.innerHTML = '';

  const raiz = document.createElement('div');
  raiz.className = 'zona-adulto card';

  const titulo = document.createElement('h1');
  titulo.textContent = t('pictogramas.titulo');
  raiz.appendChild(titulo);

  const ayuda = document.createElement('p');
  ayuda.className = 'ayuda';
  ayuda.textContent = t('pictogramas.menu_ayuda');
  raiz.appendChild(ayuda);

  const seccion = document.createElement('section');
  seccion.className = 'estante';
  const grid = document.createElement('div');
  grid.className = 'app-grid';

  OPCIONES.forEach((opcion) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'app-card';

    const icono = document.createElement('span');
    icono.className = 'app-icon';
    icono.setAttribute('aria-hidden', 'true');
    icono.textContent = opcion.icono;

    const etiqueta = document.createElement('span');
    etiqueta.textContent = t(opcion.clave);

    card.append(icono, etiqueta);
    card.addEventListener('click', () => {
      sounds.click();
      navigate(opcion.ruta);
    });
    grid.appendChild(card);
  });

  seccion.appendChild(grid);
  raiz.appendChild(seccion);
  view.appendChild(raiz);

  return () => {};
}
