// Pictosfera — arranque del portal.
//
// Este es el único archivo que index.html carga directamente. Su
// trabajo es solo "enchufar" las piezas: idiomas, rutas, navegación y
// el paseo de bienvenida. No contiene lógica propia de ninguna
// pantalla: eso vive en core/js/views/ y en las apps.

// Importar pwa.js lo antes posible: el listener beforeinstallprompt
// debe registrarse antes de que el navegador lo descarte (ocurre muy
// pronto en el ciclo de carga de la página).
import './pwa.js';

import { initI18n } from './i18n.js';
import { registerRoute, startRouter, navigate } from './router.js';
import { initShell } from './shell.js';
import { initFooter } from './footer.js';
import { maybeShowWelcome } from './welcome.js';
import { mostrarPuerta } from './puerta.js';

import { render as renderInicio } from './views/inicio.js';
import { render as renderJuegos } from './views/juegos.js';
import { render as renderJuego } from './views/juego.js';
import { render as renderPictogramas } from './views/pictogramas.js';
import { render as renderPictogramasArasaac } from './views/pictogramasArasaac.js';
import { render as renderPictogramasSecuencias } from './views/pictogramasSecuencias.js';
import { render as renderPictogramasCategorias } from './views/pictogramasCategorias.js';
import { render as renderPictogramasFotos } from './views/pictogramasFotos.js';
import { render as renderRutas } from './views/rutas.js';
import { render as renderRutasCrear } from './views/rutasCrear.js';
import { render as renderRutaJugar } from './views/rutaJugar.js';
import { render as renderAjustes } from './views/ajustes.js';

async function arrancar() {
  await initI18n();

  registerRoute('/inicio', renderInicio);
  registerRoute('/juegos', renderJuegos);
  registerRoute('/juegos/:id', renderJuego);
  registerRoute('/pictogramas', renderPictogramas);
  registerRoute('/pictogramas/arasaac', renderPictogramasArasaac);
  registerRoute('/pictogramas/secuencias', renderPictogramasSecuencias);
  registerRoute('/pictogramas/categorias', renderPictogramasCategorias);
  registerRoute('/pictogramas/fotos', renderPictogramasFotos);
  registerRoute('/rutas', renderRutas);
  registerRoute('/rutas/crear', renderRutasCrear);
  registerRoute('/rutas/editar/:id', renderRutasCrear);
  registerRoute('/rutas/jugar/:id', renderRutaJugar);
  registerRoute('/ajustes', renderAjustes);

  initShell();
  initFooter();
  startRouter();

  // La puerta se ve siempre, antes que nada (incluso antes del paseo
  // de bienvenida): existe para captar el primer toque y así poder
  // pedir pantalla completa (ver core/js/puerta.js y fullscreen.js).
  mostrarPuerta(() => {
    maybeShowWelcome();
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('[main] No se pudo registrar el service worker:', err);
    });
  }
}

arrancar().catch((err) => {
  console.error('[main] Error al arrancar Pictosfera:', err);
  const view = document.getElementById('view');
  if (view) {
    view.innerHTML = '<p class="vacio">No se ha podido cargar Pictosfera. Comprueba la conexión e inténtalo de nuevo.</p>';
  }
});

// Disponible solo para depurar desde la consola del navegador.
window.pictosfera = { navigate };
