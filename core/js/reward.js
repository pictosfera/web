// Pictosfera — núcleo: pantalla de recompensa reutilizable.
//
// Cualquier mecánica de juego puede llamar a showReward() al terminar
// una partida, sin tener que reinventar su propia pantalla de "¡bien
// hecho!". Habla, suena y se ve igual en todas las apps.

import { t } from './i18n.js';
import * as sounds from './sounds.js';
import * as tts from './tts.js';
import { navigate } from './router.js';

const MENSAJES = ['recompensa.mensaje_1', 'recompensa.mensaje_2', 'recompensa.mensaje_3'];
const EMOJIS = ['🌟', '🎉', '🏆', '🎈', '✨'];

function elegir(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

/**
 * Muestra la pantalla de recompensa.
 * options.onContinuar() — si se pasa, se ofrece el botón "seguir
 *   jugando" y se ejecuta al pulsarlo (la app decide qué significa
 *   "seguir": una partida nueva, la siguiente palabra, etc.).
 * options.onSalir() — qué hacer al pulsar "volver"; por defecto navega
 *   a /juegos.
 * options.salirLabelKey — clave de i18n para el botón de salir; por
 *   defecto 'recompensa.salir' ("Volver a juegos"). La usa el modo
 *   ruta (ver appLoader.js) para mostrar "Volver a la ruta" cuando el
 *   juego se ha jugado como un paso de una ruta de aprendizaje.
 */
export function showReward(options = {}) {
  const root = document.getElementById('modal-root');
  if (!root) return;

  const mensajeKey = options.mensajeKey || elegir(MENSAJES);
  const emoji = options.emoji || elegir(EMOJIS);
  const mensaje = t(mensajeKey);

  sounds.recompensa();
  tts.speak(mensaje);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const box = document.createElement('div');
  box.className = 'modal-box recompensa';

  const emojiEl = document.createElement('span');
  emojiEl.className = 'recompensa-emoji';
  emojiEl.setAttribute('aria-hidden', 'true');
  emojiEl.textContent = emoji;

  const texto = document.createElement('h2');
  texto.textContent = mensaje;

  box.append(emojiEl, texto);

  function cerrar() {
    overlay.remove();
  }

  if (typeof options.onContinuar === 'function') {
    const btnContinuar = document.createElement('button');
    btnContinuar.type = 'button';
    btnContinuar.className = 'btn';
    btnContinuar.textContent = t('recompensa.continuar');
    btnContinuar.addEventListener('click', () => {
      cerrar();
      options.onContinuar();
    });
    box.appendChild(btnContinuar);
  }

  const btnSalir = document.createElement('button');
  btnSalir.type = 'button';
  btnSalir.className = 'btn btn-ghost';
  btnSalir.textContent = t(options.salirLabelKey || 'recompensa.salir');
  btnSalir.addEventListener('click', () => {
    cerrar();
    if (typeof options.onSalir === 'function') options.onSalir();
    else navigate('/juegos');
  });
  box.appendChild(btnSalir);

  overlay.appendChild(box);
  root.appendChild(overlay);
}
