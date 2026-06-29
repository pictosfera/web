// Pictosfera — vista "Juego" (anfitrión de apps).
//
// Ruta /juegos/:id. No sabe nada de ninguna mecánica concreta: solo
// pide a appLoader que monte la app pedida dentro de un contenedor, y
// llama a su limpieza al salir. Así el núcleo no cambia nunca al
// añadir una app nueva.

import { t } from '../i18n.js';
import { navigate } from '../router.js';
import { mountApp } from '../appLoader.js';

export async function render({ id }) {
  const view = document.getElementById('view');
  view.innerHTML = '';

  const volver = document.createElement('button');
  volver.type = 'button';
  volver.className = 'btn btn-ghost';
  volver.textContent = `← ${t('juegos.volver')}`;
  volver.addEventListener('click', () => navigate('/juegos'));
  view.appendChild(volver);

  const contenedor = document.createElement('div');
  contenedor.className = 'juego-contenedor';
  view.appendChild(contenedor);

  let limpiarApp = null;
  try {
    limpiarApp = await mountApp(id, contenedor);
  } catch (err) {
    console.warn(`[juego] No se pudo cargar la app "${id}":`, err);
    contenedor.innerHTML = `<p class="vacio">${t('core.error_cargar_app')}</p>`;
  }

  return () => {
    if (typeof limpiarApp === 'function') {
      try {
        limpiarApp();
      } catch (err) {
        console.warn('[juego] Error al desmontar la app:', err);
      }
    }
  };
}
