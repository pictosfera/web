// Pictosfera — vista "Jugar una ruta" (cara del niño). Ruta /rutas/jugar/:id.
//
// Pinta los pasos de la ruta como una lista: los ya superados se ven
// con un check, el siguiente pendiente (y cualquiera ya alcanzado
// antes) se puede tocar para jugarlo, y los que van más allá se ven
// en gris y bloqueados (ver core/js/rutas.js: pasoDesbloqueado). Al
// tocar un paso jugable, se sustituye la lista por el propio juego
// (mountApp en "modo ruta": ver core/js/appLoader.js) con la
// configuración propia de esa instancia. Al terminar la partida se
// registra el progreso y, al pulsar "volver a la ruta", se vuelve a
// esta lista (ya actualizada).

import { t } from '../i18n.js';
import { navigate } from '../router.js';
import { mountApp, loadDescriptors, nombreDescriptor } from '../appLoader.js';
import * as rutas from '../rutas.js';
import * as sounds from '../sounds.js';

export async function render({ id } = {}) {
  const view = document.getElementById('view');
  view.innerHTML = '';
  let cancelado = false;
  let limpiarApp = null;

  const volver = document.createElement('button');
  volver.type = 'button';
  volver.className = 'btn btn-ghost';
  volver.textContent = `← ${t('comunes.volver')}`;
  volver.addEventListener('click', () => navigate('/inicio'));
  view.appendChild(volver);

  const titulo = document.createElement('h1');
  view.appendChild(titulo);

  const listaPasos = document.createElement('div');
  listaPasos.className = 'ruta-jugar-lista';

  const contenedorJuego = document.createElement('div');
  contenedorJuego.className = 'juego-contenedor';
  contenedorJuego.hidden = true;

  view.append(listaPasos, contenedorJuego);

  let ruta = null;
  let descriptoresPorId = new Map();
  try {
    const [rutaCargada, descriptores] = await Promise.all([rutas.getById(id), loadDescriptors()]);
    ruta = rutaCargada;
    descriptoresPorId = new Map(descriptores.map((d) => [d.id, d]));
  } catch (err) {
    if (cancelado) return undefined;
    titulo.hidden = true;
    listaPasos.innerHTML = `<p class="vacio">${t('core.error_cargar_apps')}</p>`;
    return () => { cancelado = true; };
  }
  if (cancelado) return undefined;

  if (!ruta) {
    titulo.hidden = true;
    listaPasos.innerHTML = `<p class="vacio">${t('rutas.no_encontrada')}</p>`;
    return () => { cancelado = true; };
  }

  titulo.textContent = ruta.nombre;

  function desmontarJuegoActual() {
    if (typeof limpiarApp === 'function') {
      try {
        limpiarApp();
      } catch (err) {
        console.warn('[rutaJugar] Error al desmontar el juego:', err);
      }
      limpiarApp = null;
    }
  }

  function pintarLista() {
    listaPasos.innerHTML = '';
    const desbloqueadoHasta = (ruta.progreso && ruta.progreso.desbloqueadoHasta) || 0;
    ruta.pasos.forEach((paso, indice) => {
      const descriptor = descriptoresPorId.get(paso.appId);
      const desbloqueado = rutas.pasoDesbloqueado(ruta, indice);
      const completado = indice < desbloqueadoHasta;
      const jugable = desbloqueado && Boolean(descriptor);

      const card = document.createElement(jugable ? 'button' : 'div');
      if (jugable) card.type = 'button';
      card.className = [
        'ruta-jugar-paso',
        desbloqueado ? '' : 'ruta-jugar-paso-bloqueado',
        completado ? 'ruta-jugar-paso-completado' : ''
      ].filter(Boolean).join(' ');

      const orden = document.createElement('span');
      orden.className = 'ruta-jugar-paso-orden';
      orden.textContent = String(indice + 1);

      const icono = document.createElement('span');
      icono.className = 'ruta-jugar-paso-icono';
      icono.setAttribute('aria-hidden', 'true');
      icono.textContent = !descriptor ? '❓' : !desbloqueado ? '🔒' : (descriptor.icono || '🎮');

      const nombre = document.createElement('span');
      nombre.className = 'ruta-jugar-paso-nombre';
      nombre.textContent = !descriptor ? t('rutas.paso_roto') : nombreDescriptor(descriptor);

      card.append(orden, icono, nombre);

      if (completado) {
        const check = document.createElement('span');
        check.className = 'ruta-jugar-paso-check';
        check.setAttribute('aria-hidden', 'true');
        check.textContent = '✅';
        card.appendChild(check);
      }

      if (jugable) {
        card.addEventListener('click', () => {
          sounds.click();
          jugarPaso(indice);
        });
      } else if (!desbloqueado) {
        card.setAttribute('aria-label', t('rutas.bloqueado'));
      }

      listaPasos.appendChild(card);
    });
  }

  function mostrarLista() {
    desmontarJuegoActual();
    contenedorJuego.hidden = true;
    contenedorJuego.innerHTML = '';
    listaPasos.hidden = false;
    pintarLista();
  }

  async function jugarPaso(indice) {
    const paso = ruta.pasos[indice];
    listaPasos.hidden = true;
    contenedorJuego.hidden = false;
    contenedorJuego.innerHTML = '';
    try {
      limpiarApp = await mountApp(paso.appId, contenedorJuego, {
        ajustesPistaOverride: paso.config,
        rutaContexto: {
          alTerminarPaso: async (fuePerfecto) => {
            if (cancelado) return;
            try {
              ruta = await rutas.registrarProgreso(ruta.id, indice, fuePerfecto);
            } catch (err) {
              console.warn('[rutaJugar] No se pudo registrar el progreso:', err);
            }
          },
          alSalir: () => {
            if (cancelado) return;
            mostrarLista();
          }
        }
      });
    } catch (err) {
      console.warn(`[rutaJugar] No se pudo cargar el paso "${paso.appId}":`, err);
      contenedorJuego.innerHTML = `<p class="vacio">${t('core.error_cargar_app')}</p>`;
    }
  }

  mostrarLista();

  return () => {
    cancelado = true;
    desmontarJuegoActual();
  };
}
