// Pictosfera — núcleo: modo pantalla completa.
//
// Objetivo: reducir que el niño toque por error la barra de
// direcciones, las pestañas o el menú del navegador. IMPORTANTE: esto
// es solo una capa de comodidad, no una medida de seguridad real.
// Ningún sitio web puede bloquear el botón de inicio, el gesto de
// "atrás" del sistema ni la bandeja de notificaciones: eso es una
// barrera de los propios sistemas operativos (ver Ajustes > Anclaje
// de pantalla en Android o Accesibilidad > Acceso guiado en iPhone).
//
// Pedir pantalla completa SOLO funciona si va pegado a un toque o
// clic real del usuario (regla de seguridad de todos los
// navegadores): no se puede activar sola al cargar la página. Por eso
// existe core/js/puerta.js, que capta ese primer toque.
//
// En iPhone (Safari), esta función no hace nada: el propio sistema no
// permite pantalla completa en páginas web (solo en vídeos). El resto
// del portal sigue funcionando con normalidad, sin avisos ni errores.

function elementoCompleto() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function pedirCompleto() {
  const el = document.documentElement;
  const metodo = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!metodo) return; // no soportado (p. ej. iPhone): se ignora sin romper nada
  try {
    const resultado = metodo.call(el);
    if (resultado && typeof resultado.catch === 'function') {
      resultado.catch(() => {/* bloqueado por el navegador: se ignora */});
    }
  } catch {
    /* algunos navegadores lanzan en vez de rechazar la promesa */
  }
}

/** Pide pantalla completa ahora mismo. Debe llamarse dentro de un evento de clic/toque real. */
export function activarPantallaCompleta() {
  pedirCompleto();
}

/**
 * A partir de ahora, cualquier toque en el portal que encuentre la
 * pantalla completa "rota" (el niño pulsó "atrás", giró la pantalla,
 * salió y volvió...) la vuelve a pedir. Como pedirla siempre tiene
 * que ir pegada a un toque real, esto es lo más parecido a
 * "automático" que permite el navegador.
 */
export function vigilarPantallaCompleta() {
  document.addEventListener('click', () => {
    if (!elementoCompleto()) pedirCompleto();
  }, { capture: true });
}
