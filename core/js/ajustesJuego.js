// Pictosfera — núcleo: ajustes visuales compartidos por los juegos.
//
// Ajustes sobre "pistas" que algunos juegos ofrecen:
//   1) si la palabra de pista se escribe en MAYÚSCULAS o en minúsculas.
//   2) si esa palabra se muestra o se oculta del todo.
//   3) si, en los juegos que usan un teclado en pantalla (p.ej. "Teclea
//      la palabra"), se sombrean las teclas necesarias para escribir
//      la palabra mostrada.
//   4) cuatro ajustes de "mano amiga" (todos activados por defecto) que
//      evitan complicar al niño mientras aprende a escribir, en los
//      juegos donde se teclea una palabra:
//        - tildesAutomaticas: las tildes (á,é,í,ó,ú) se ponen solas al
//          comprobar lo escrito; el niño no necesita teclearlas.
//        - mayusculasAutomaticas: no hace falta escribir en mayúscula
//          la inicial de un nombre propio para que cuente como acierto.
//        - puntuacionAutomatica: comas, puntos, signos de pregunta o
//          exclamación, etc. no hace falta teclearlos.
//        - espaciosAutomaticos: los espacios entre palabras se añaden
//          solos; el niño no necesita pulsar la tecla de espacio.
//      Si el adulto desactiva alguno, el juego deja de "ayudar" en ese
//      aspecto y exige que el niño lo teclee correctamente (mostrando,
//      si hace falta, las teclas necesarias para poder hacerlo).
//   5) dos ajustes de "modo de presentación" (ambos DESACTIVADOS por
//      defecto: no cambian el comportamiento habitual salvo que el
//      adulto los active a propósito):
//        - soloTexto: el pictograma se sustituye por su nombre en
//          texto (sin la imagen) donde la mecánica lo permita (p.ej.
//          las cartas de Memoria, o el objetivo de "Arrastra"/"Teclea").
//        - pulsadorTts: el pictograma y su pista se sustituyen por un
//          botón animado; al pulsarlo, la voz dice el nombre. Mientras
//          no se pulse, la mecánica bloquea su acción principal
//          (arrastrar, teclear, etc.) para asegurar que el niño escucha
//          la palabra antes de poder responder.
//   6) dos ajustes propios de "Escribe la letra" (escritura guiada
//      letra a letra con el dedo o un stylus):
//        - letraPunteada: dentro de cada casilla se ve la letra en
//          trazo punteado, como pista visual para repasarla (activado
//          por defecto).
//        - toleranciaTrazo: cuánta precisión se exige al comparar el
//          trazo del niño con la letra ("facil"/"normal"/"dificil").
//          Empieza en "facil" a propósito: el niño está aprendiendo y
//          no va a trazar la letra perfecta desde el primer día.
//   7) un ajuste propio de "Ruleta de letras" (ruleta con pictograma
//      oculto):
//        - dificultadRuleta: "facil"/"normal"/"dificil". Cambia, todo a
//          la vez, la longitud de las palabras elegidas, cuántas
//          casillas del pictograma se ven desde el principio, si el
//          abecedario es completo o reducido (solo en "facil") y cómo
//          de generosa es la ruleta repartiendo pistas/letras gratis.
//          Empieza en "facil" por el mismo motivo que toleranciaTrazo.
//   8) dos ajustes propios de "Lista de la compra" (ambos DESACTIVADOS
//      por defecto), uno por cada lado de la pantalla, porque ahí no
//      basta un único soloTexto/mostrar para todo el juego:
//        - listaSoloTexto: el lado de la lista de la compra muestra
//          solo el nombre en texto de cada pictograma, sin su imagen.
//        - estanteSoloImagen: el lado del estante muestra solo el
//          pictograma, sin su nombre en texto debajo.
//
// Cada ajuste puede vivir en dos niveles:
//   - GLOBAL (clave "pictosfera.pista.<ajuste>"): el valor de toda la
//     vida, compartido por todos los juegos. Sigue existiendo para no
//     romper a quien ya tenía ajustes guardados.
//   - POR JUEGO (clave "pictosfera.juego.<appId>.<ajuste>"): un valor
//     propio de un juego concreto, que desde el momento en que se crea
//     ya no depende del global.
//
// Por eso cada get/set acepta un `appId` opcional como último
// parámetro. Cadena de resolución al LEER un ajuste para un juego:
//   1) clave propia de ese juego (si existe);
//   2) si no existe, la clave global heredada (el valor de "siempre");
//   3) si tampoco existe, el valor de fábrica.
// Al ESCRIBIR un ajuste con `appId`, se crea/actualiza solo su clave
// propia: ese juego queda desde ese momento desacoplado del global.
// Sin `appId`, get/set siguen leyendo/escribiendo la clave global de
// siempre (uso interno y compatibilidad con quien no necesite
// diferenciar por juego). Un juego nuevo, sin clave global heredada,
// cae directo en el valor de fábrica.
//
// Son ajustes del PORTAL, no código de ningún juego: viven en Ajustes
// y cualquier app/mecánica que use una "pista" de texto o de teclado
// debe respetar lo que se decida aquí. Sigue el mismo patrón sencillo
// que pin.js: una clave de localStorage por ajuste, con get/set
// protegidos por try/catch.

const CLAVE_MAYUSCULA = 'pictosfera.pista.mayuscula';
const CLAVE_MOSTRAR = 'pictosfera.pista.mostrar';
const CLAVE_RESALTAR_TECLADO = 'pictosfera.pista.resaltarTeclado';
const CLAVE_TILDES_AUTOMATICAS = 'pictosfera.pista.tildesAutomaticas';
const CLAVE_MAYUSCULAS_AUTOMATICAS = 'pictosfera.pista.mayusculasAutomaticas';
const CLAVE_PUNTUACION_AUTOMATICA = 'pictosfera.pista.puntuacionAutomatica';
const CLAVE_ESPACIOS_AUTOMATICOS = 'pictosfera.pista.espaciosAutomaticos';
const CLAVE_SOLO_TEXTO = 'pictosfera.pista.soloTexto';
const CLAVE_PULSADOR_TTS = 'pictosfera.pista.pulsadorTts';
const CLAVE_LETRA_PUNTEADA = 'pictosfera.pista.letraPunteada';
const CLAVE_TOLERANCIA_TRAZO = 'pictosfera.pista.toleranciaTrazo';
const CLAVE_DIFICULTAD_RULETA = 'pictosfera.pista.dificultadRuleta';
const CLAVE_LISTA_SOLO_TEXTO = 'pictosfera.pista.listaSoloTexto';
const CLAVE_ESTANTE_SOLO_IMAGEN = 'pictosfera.pista.estanteSoloImagen';
const CLAVE_HUECOS_LIBRES = 'pictosfera.pista.huecosLibres';
const EVENTO_CAMBIO = 'pictosfera:ajustes-juego-changed';

/** Únicos valores válidos para el ajuste de tolerancia de trazo. Si el
 *  valor guardado no es ninguno de estos (almacenamiento corrupto, o
 *  versión antigua), se cae al más permisivo ("facil"), igual que el
 *  resto de ajustes caen a su valor por defecto ante datos inválidos. */
const NIVELES_TOLERANCIA_TRAZO = ['facil', 'normal', 'dificil'];

/** Únicos valores válidos para la dificultad de "Ruleta de letras"
 *  (mismo patrón que NIVELES_TOLERANCIA_TRAZO). */
const NIVELES_DIFICULTAD_RULETA = ['facil', 'normal', 'dificil'];

/** Construye la clave propia de un juego a partir de su clave global
 *  (p.ej. "pictosfera.pista.mayuscula" + appId "memoria-animales" ->
 *  "pictosfera.juego.memoria-animales.mayuscula"). */
function claveJuego(appId, claveGlobal) {
  const ajuste = claveGlobal.slice(claveGlobal.lastIndexOf('.') + 1);
  return `pictosfera.juego.${appId}.${ajuste}`;
}

function avisarCambio() {
  try {
    window.dispatchEvent(new CustomEvent(EVENTO_CAMBIO));
  } catch {
    /* entornos sin CustomEvent/window: no pasa nada, solo no hay aviso */
  }
}

function leerBooleano(claveGlobal, porDefecto, appId) {
  if (appId) {
    try {
      const propio = localStorage.getItem(claveJuego(appId, claveGlobal));
      if (propio !== null) return propio === '1';
    } catch {
      /* sin localStorage disponible: se sigue probando con la global */
    }
  }
  try {
    const valor = localStorage.getItem(claveGlobal);
    if (valor === null) return porDefecto;
    return valor === '1';
  } catch {
    return porDefecto;
  }
}

function guardarBooleano(claveGlobal, valor, appId) {
  const clave = appId ? claveJuego(appId, claveGlobal) : claveGlobal;
  try {
    localStorage.setItem(clave, valor ? '1' : '0');
  } catch {
    /* si no hay localStorage disponible, simplemente no persiste */
  }
  avisarCambio();
}

function leerEnum(claveGlobal, valoresValidos, porDefecto, appId) {
  if (appId) {
    try {
      const propio = localStorage.getItem(claveJuego(appId, claveGlobal));
      if (valoresValidos.includes(propio)) return propio;
    } catch {
      /* sin localStorage disponible: se sigue probando con la global */
    }
  }
  try {
    const valor = localStorage.getItem(claveGlobal);
    if (valoresValidos.includes(valor)) return valor;
  } catch {
    /* si no hay localStorage disponible, se usa el valor por defecto */
  }
  return porDefecto;
}

function guardarEnum(claveGlobal, valor, valoresValidos, porDefecto, appId) {
  const seguro = valoresValidos.includes(valor) ? valor : porDefecto;
  const clave = appId ? claveJuego(appId, claveGlobal) : claveGlobal;
  try {
    localStorage.setItem(clave, seguro);
  } catch {
    /* si no hay localStorage disponible, simplemente no persiste */
  }
  avisarCambio();
}

/** ¿Las pistas de texto se muestran en mayúsculas? (por defecto: sí) */
export function getMayuscula(appId) {
  return leerBooleano(CLAVE_MAYUSCULA, true, appId);
}

export function setMayuscula(valor, appId) {
  guardarBooleano(CLAVE_MAYUSCULA, Boolean(valor), appId);
}

/** ¿Se muestra la pista de texto junto al pictograma? (por defecto: sí) */
export function getMostrarPista(appId) {
  return leerBooleano(CLAVE_MOSTRAR, true, appId);
}

export function setMostrarPista(valor, appId) {
  guardarBooleano(CLAVE_MOSTRAR, Boolean(valor), appId);
}

/** ¿Se sombrean en el teclado en pantalla las teclas necesarias para
 *  escribir la palabra? (por defecto: sí, como ayuda visual). */
export function getResaltarTeclado(appId) {
  return leerBooleano(CLAVE_RESALTAR_TECLADO, true, appId);
}

export function setResaltarTeclado(valor, appId) {
  guardarBooleano(CLAVE_RESALTAR_TECLADO, Boolean(valor), appId);
}

/** ¿Se ponen solas las tildes al comprobar lo escrito? (por defecto: sí) */
export function getTildesAutomaticas(appId) {
  return leerBooleano(CLAVE_TILDES_AUTOMATICAS, true, appId);
}

export function setTildesAutomaticas(valor, appId) {
  guardarBooleano(CLAVE_TILDES_AUTOMATICAS, Boolean(valor), appId);
}

/** ¿Se ignora la mayúscula inicial de los nombres propios al comprobar
 *  lo escrito? (por defecto: sí) */
export function getMayusculasAutomaticas(appId) {
  return leerBooleano(CLAVE_MAYUSCULAS_AUTOMATICAS, true, appId);
}

export function setMayusculasAutomaticas(valor, appId) {
  guardarBooleano(CLAVE_MAYUSCULAS_AUTOMATICAS, Boolean(valor), appId);
}

/** ¿Se ponen solos los signos de puntuación al comprobar lo escrito?
 *  (por defecto: sí) */
export function getPuntuacionAutomatica(appId) {
  return leerBooleano(CLAVE_PUNTUACION_AUTOMATICA, true, appId);
}

export function setPuntuacionAutomatica(valor, appId) {
  guardarBooleano(CLAVE_PUNTUACION_AUTOMATICA, Boolean(valor), appId);
}

/** ¿Se ponen solos los espacios entre palabras al comprobar lo escrito?
 *  (por defecto: sí) */
export function getEspaciosAutomaticos(appId) {
  return leerBooleano(CLAVE_ESPACIOS_AUTOMATICOS, true, appId);
}

export function setEspaciosAutomaticos(valor, appId) {
  guardarBooleano(CLAVE_ESPACIOS_AUTOMATICOS, Boolean(valor), appId);
}

/** ¿Se muestra solo el texto del pictograma, sin su imagen, donde la
 *  mecánica lo permita? (por defecto: no, se ve la imagen). */
export function getSoloTexto(appId) {
  return leerBooleano(CLAVE_SOLO_TEXTO, false, appId);
}

export function setSoloTexto(valor, appId) {
  guardarBooleano(CLAVE_SOLO_TEXTO, Boolean(valor), appId);
}

/** ¿Se sustituye el pictograma (y su pista) por un botón animado que
 *  dice el nombre en voz alta al pulsarlo, bloqueando la acción
 *  principal del juego hasta que se pulse? (por defecto: no). */
export function getPulsadorTts(appId) {
  return leerBooleano(CLAVE_PULSADOR_TTS, false, appId);
}

export function setPulsadorTts(valor, appId) {
  guardarBooleano(CLAVE_PULSADOR_TTS, Boolean(valor), appId);
}

/** ¿Se ve la letra en trazo punteado dentro de cada casilla de
 *  "Escribe la letra", como pista visual para repasarla? (por defecto:
 *  sí). No afecta a si el trazo se evalúa o no: la evaluación siempre
 *  compara contra la forma real de la letra, se vea o no la pista. */
export function getLetraPunteada(appId) {
  return leerBooleano(CLAVE_LETRA_PUNTEADA, true, appId);
}

export function setLetraPunteada(valor, appId) {
  guardarBooleano(CLAVE_LETRA_PUNTEADA, Boolean(valor), appId);
}

/** Tolerancia exigida al comparar el trazo del niño con la letra, en
 *  "Escribe la letra": "facil" (por defecto), "normal" o "dificil". */
export function getToleranciaTrazo(appId) {
  return leerEnum(CLAVE_TOLERANCIA_TRAZO, NIVELES_TOLERANCIA_TRAZO, 'facil', appId);
}

export function setToleranciaTrazo(valor, appId) {
  guardarEnum(CLAVE_TOLERANCIA_TRAZO, valor, NIVELES_TOLERANCIA_TRAZO, 'facil', appId);
}

/** Dificultad de "Ruleta de letras": "facil" (por defecto), "normal" o
 *  "dificil". Empieza en "facil" por el mismo motivo que
 *  toleranciaTrazo: el niño está aprendiendo. */
export function getDificultadRuleta(appId) {
  return leerEnum(CLAVE_DIFICULTAD_RULETA, NIVELES_DIFICULTAD_RULETA, 'facil', appId);
}

export function setDificultadRuleta(valor, appId) {
  guardarEnum(CLAVE_DIFICULTAD_RULETA, valor, NIVELES_DIFICULTAD_RULETA, 'facil', appId);
}

/** ¿En "Lista de la compra", el lado de la lista muestra solo el
 *  nombre en texto, sin el pictograma? (por defecto: no, se ve el
 *  pictograma). Ajuste propio de esa mecánica, igual que
 *  toleranciaTrazo o dificultadRuleta: a diferencia de soloTexto (que
 *  es plano y mecánica-ancho), aquí hace falta distinguir el lado de la
 *  LISTA del lado del ESTANTE (ver getEstanteSoloImagen), así que no se
 *  puede reutilizar el ajuste genérico. */
export function getListaSoloTexto(appId) {
  return leerBooleano(CLAVE_LISTA_SOLO_TEXTO, false, appId);
}

export function setListaSoloTexto(valor, appId) {
  guardarBooleano(CLAVE_LISTA_SOLO_TEXTO, Boolean(valor), appId);
}

/** ¿En "Lista de la compra", el lado del estante muestra solo el
 *  pictograma, sin el nombre en texto debajo? (por defecto: no, se ve
 *  el texto). Ver getListaSoloTexto: mismo motivo para ser un ajuste
 *  propio en vez de reutilizar soloTexto/mostrar. */
export function getEstanteSoloImagen(appId) {
  return leerBooleano(CLAVE_ESTANTE_SOLO_IMAGEN, false, appId);
}

export function setEstanteSoloImagen(valor, appId) {
  guardarBooleano(CLAVE_ESTANTE_SOLO_IMAGEN, Boolean(valor), appId);
}

/** ¿Los huecos de "Completa la serie" pueden aparecer en cualquier
 *  posición de la serie, no solo al final? (por defecto: no, para que
 *  los huecos estén siempre al final de la serie, que es lo más
 *  intuitivo para empezar). Si se activa, los huecos aparecen en
 *  posiciones aleatorias, lo que hace la tarea más desafiante. */
export function getHuecosLibres(appId) {
  return leerBooleano(CLAVE_HUECOS_LIBRES, false, appId);
}

export function setHuecosLibres(valor, appId) {
  guardarBooleano(CLAVE_HUECOS_LIBRES, Boolean(valor), appId);
}

/** Foto fija de todos los ajustes de pista de un juego (o de los
 *  globales, sin `appId`), cómoda para colgar de `plataforma`. */
export function getAjustesPista(appId) {
  return {
    mayuscula: getMayuscula(appId),
    mostrar: getMostrarPista(appId),
    resaltarTeclado: getResaltarTeclado(appId),
    tildesAutomaticas: getTildesAutomaticas(appId),
    mayusculasAutomaticas: getMayusculasAutomaticas(appId),
    puntuacionAutomatica: getPuntuacionAutomatica(appId),
    espaciosAutomaticos: getEspaciosAutomaticos(appId),
    soloTexto: getSoloTexto(appId),
    pulsadorTts: getPulsadorTts(appId),
    letraPunteada: getLetraPunteada(appId),
    toleranciaTrazo: getToleranciaTrazo(appId),
    dificultadRuleta: getDificultadRuleta(appId),
    listaSoloTexto: getListaSoloTexto(appId),
    estanteSoloImagen: getEstanteSoloImagen(appId),
    huecosLibres: getHuecosLibres(appId)
  };
}

/**
 * Avisa cuando cambia alguno de estos ajustes (p.ej. para repintar un
 * juego que esté en marcha si el adulto cambia el ajuste en otra
 * pestaña). El callback recibe la foto fija de los ajustes GLOBALES
 * (sin filtrar por ningún `appId`): quien escuche y le importe un
 * juego concreto puede volver a pedir `getAjustesPista(appId)` desde
 * dentro del callback. Devuelve una función para dejar de escuchar.
 */
export function onChange(callback) {
  if (typeof callback !== 'function') return () => {};
  const manejador = () => callback(getAjustesPista());
  window.addEventListener(EVENTO_CAMBIO, manejador);
  return () => window.removeEventListener(EVENTO_CAMBIO, manejador);
}
