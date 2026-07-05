// Pictosfera — núcleo: instalación como PWA.
//
// Gestiona el evento "beforeinstallprompt" del navegador, que permite
// ofrecer al usuario instalar el portal como app nativa (en Android/Chrome
// aparece el diálogo del sistema; en iOS hay que guiar manualmente).
//
// Este módulo se importa lo antes posible (desde main.js) para que el
// listener capture el evento antes de que el navegador lo descarte.
// El evento solo se dispara si se cumplen todos los criterios PWA:
// HTTPS + manifest + service worker + sitio visitado antes.

/** Prompt del navegador capturado; null si no hay o ya se usó. */
let promptCapturado = null;

// Capturar el evento en cuanto esté disponible. Hay que llamar a
// preventDefault() para evitar que el navegador muestre el banner
// automático sin que nosotros lo controlemos.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  promptCapturado = e;
});

// Cuando el usuario instala la app (por cualquier vía), limpiamos el prompt
// para que los controles de instalación desaparezcan.
window.addEventListener('appinstalled', () => {
  promptCapturado = null;
});

/**
 * ¿Puede instalarse la app en este momento?
 * Solo devuelve true en Chrome/Edge/Android cuando el navegador ha
 * disparado el evento beforeinstallprompt y aún no se ha instalado.
 * En iOS siempre devuelve false (ver esIOS() e instruccionesIOS()).
 */
export function puedeInstalar() {
  return promptCapturado !== null;
}

/**
 * ¿Estamos en Safari/iOS?
 * En estos dispositivos no existe beforeinstallprompt, pero el adulto
 * puede añadir la app a la pantalla de inicio manualmente.
 */
export function esIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !('MSStream' in window)
  );
}

/**
 * ¿El portal ya está funcionando como PWA instalada?
 * Útil para no mostrar el aviso de instalación si ya está instalado.
 */
export function estaInstalada() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

/**
 * Lanza el diálogo de instalación del sistema.
 * Devuelve true si el usuario aceptó, false si canceló o no había prompt.
 * Solo funciona en Chrome/Edge/Android donde beforeinstallprompt es real.
 */
export async function instalar() {
  if (!promptCapturado) return false;
  promptCapturado.prompt();
  const { outcome } = await promptCapturado.userChoice;
  promptCapturado = null;
  return outcome === 'accepted';
}
