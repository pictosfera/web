// Pictosfera — mecánica reutilizable: "teclea la palabra".
//
// El pictograma aparece arriba con su nombre debajo como pista
// (mayúsculas/minúsculas y mostrar/ocultar son ajustes del PORTAL, ver
// core/js/ajustesJuego.js). Debajo aparece un teclado en pantalla
// (QWERTY, adaptado al idioma activo) y una caja de escritura donde
// va apareciendo lo que el niño teclea. Si al llegar a la longitud de
// la palabra no la ha escrito bien, las letras caen con un efecto y un
// sonido y se puede volver a intentar; si acierta, pasa al siguiente
// pictograma. 10 niveles.
//
// "Mano amiga" al escribir (ajustes del PORTAL, activados por defecto):
// el niño no necesita teclear tildes, la mayúscula inicial de nombres
// propios, signos de puntuación ni espacios para que cuente como
// acierto; el teclado solo muestra las teclas que de verdad hacen
// falta. Si el adulto desactiva alguno de estos ajustes, el juego deja
// de "ayudar" en ese aspecto concreto y, si la palabra lo necesita,
// aparecen las teclas extra para poder escribirlo correctamente:
//   - si faltan tildes y la palabra lleva alguna, la letra base (p.ej.
//     "a") se marca con un indicador y, al pulsarla, abre un subset
//     con esa letra y su variante con tilde para elegir ("a" / "á"),
//     igual que la tecla de Símbolos/Números abre su propia capa (ver
//     abrirSubsetTilde() y pintarCapaTildes());
//   - una tecla "Mayúscula" (interruptor), si la palabra mezcla
//     mayúsculas y minúsculas; mientras esté activa, las teclas del
//     teclado se muestran en mayúscula (y en minúscula si no), como un
//     teclado físico real (ver casoVisualTeclado());
//   - una tecla de acceso a "Símbolos", que abre una capa con los
//     signos de puntuación que la palabra necesita;
//   - una tecla de acceso a "Números", que abre una capa con las
//     cifras que la palabra necesita;
//   - la tecla de espacio, solo si la palabra tiene más de una palabra
//     y el ajuste de espacios automáticos está desactivado.
// Siempre hay disponible una tecla de borrar (⌫) para corregir la
// última letra tecleada.
// El teclado en pantalla, igual que un teclado físico real, no tiene
// teclas muertas: las vocales con tilde solo aparecen disponibles (vía
// el subset) cuando de verdad hacen falta (ver tildesNecesarias()).
//
// Es "código de confianza del autor": JavaScript nativo, módulo ES, sin
// framework. No importa nada del núcleo directamente: todo lo que
// necesita (idioma, voz, sonidos, recompensa, material, ajustes de
// pista) le llega a través del objeto `plataforma` que recibe en
// montar(). Esto es lo que la hace reutilizable: otra app distinta
// (otro material, otro nombre, otro estante) puede usar este mismo
// archivo con solo un descriptor JSON nuevo en data/apps.json.

const ESTILOS_ID = 'teclea-palabra-estilos';
const MIN_MATERIAL = 3;
const NIVELES_TOTAL = 10;
const RETRASO_FALLO_MS = 650; // tiempo para que se vea caer la letra antes de limpiar la caja
const RETRASO_ACIERTO_MS = 700;
const RETRASO_FINAL_MS = 500;

// Teclado físico español: el mismo para castellano, catalán, euskera,
// gallego y valenciano (todos comparten teclado QWERTY con Ñ en
// España). El inglés no tiene Ñ. Las vocales con tilde y la diéresis
// no tienen tecla propia aquí tampoco, como en cualquier teclado
// físico real sin teclas muertas: solo aparecen como teclas sueltas
// cuando una palabra concreta las necesita y el ajuste de tildes
// automáticas está desactivado (ver tildesNecesarias()).
const TECLADO_ES = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm']
];
const TECLADO_EN = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm']
];
const FAMILIA_TECLADO = { es: TECLADO_ES, ca: TECLADO_ES, eu: TECLADO_ES, gl: TECLADO_ES, va: TECLADO_ES, en: TECLADO_EN };

const MARCAS_DIACRITICAS = /[̀-ͯ]/g;
const VOCALES_TILDE = 'áéíóú';
// Antes había una lista cerrada de signos admitidos (SIGNOS_PUNTUACION),
// así que cualquier símbolo ASCII que no estuviera en esa lista (p.ej.
// "*", "+", "=", "/", "#", "%"...) no se reconocía como signo: no
// aparecía su tecla en la capa de Símbolos ni contaba para activar esa
// capa. Un pictograma puede llevar, aunque sea raras veces, cualquier
// símbolo ASCII en su nombre, así que en vez de mantener una lista que
// hay que ir ampliando a mano, se clasifica como "signo" cualquier
// carácter que no sea letra, ni cifra, ni espacio.
const ES_LETRA = /\p{L}/u;

function esPuntuacion(caracter) {
  return caracter !== ' ' && !ES_LETRA.test(caracter) && !esDigito(caracter);
}

function esDigito(caracter) {
  return caracter >= '0' && caracter <= '9';
}

function tieneMayuscula(texto) {
  return texto.toLocaleLowerCase('es') !== texto;
}

/** Quita la tilde de una vocal suelta (p.ej. "á" -> "a"), para poder
 *  agrupar cada vocal con tilde bajo su letra base en el teclado. */
function quitarTilde(caracter) {
  return caracter.normalize('NFD').replace(MARCAS_DIACRITICAS, '');
}

let estado = null; // { plataforma, contenedor, raiz, nivelActual, usados, medioActual, tecleado, bloqueado, escuchado, timeoutId, ajustesPista, capaTeclado, mayusActiva, tildeBase, tildeObjetivo }

/** Filas de teclas (minúsculas) del teclado adecuado para un idioma.
 *  Lógica pura: no toca el DOM. Si el idioma no se reconoce, cae al
 *  teclado castellano (red de seguridad, igual que hace i18n.js). */
export function tecladoParaIdioma(lang) {
  return FAMILIA_TECLADO[lang] || TECLADO_ES;
}

/** Normaliza un texto según los ajustes de "mano amiga" (todos true
 *  por defecto = comportamiento de siempre): quita tildes, pasa a
 *  minúsculas, y quita puntuación y espacios. La Ñ nunca se toca: es
 *  una letra propia, no una variante con diacrítico. Si se desactiva
 *  alguno de los ajustes, esa parte deja de "perdonarse" y debe
 *  coincidir tal cual con lo tecleado. */
export function normalizarTexto(texto, opciones = {}) {
  const {
    tildesAutomaticas = true,
    mayusculasAutomaticas = true,
    puntuacionAutomatica = true,
    espaciosAutomaticos = true
  } = opciones;
  if (!texto) return '';
  const resultado = Array.from(texto)
    .filter((ch) => {
      if (espaciosAutomaticos && ch === ' ') return false;
      if (puntuacionAutomatica && esPuntuacion(ch)) return false;
      return true;
    })
    .map((ch) => {
      if (ch === 'ñ' || ch === 'Ñ') return ch;
      return tildesAutomaticas ? ch.normalize('NFD').replace(MARCAS_DIACRITICAS, '') : ch;
    })
    .join('');
  return mayusculasAutomaticas ? resultado.toLocaleLowerCase('es') : resultado;
}

/** Letras (únicas, sin espacios ni símbolos ni cifras) que hacen falta
 *  resaltar en las filas normales del teclado para escribir una
 *  palabra. Con tildes:false conserva las vocales con tilde como
 *  letras propias (para poder resaltar también la fila de tildes). */
export function letrasNecesarias(texto, opciones = {}) {
  const { tildes = true } = opciones;
  if (!texto) return [];
  const base = Array.from(texto)
    .map((ch) => {
      if (ch === 'ñ' || ch === 'Ñ') return 'ñ';
      return tildes ? ch.normalize('NFD').replace(MARCAS_DIACRITICAS, '') : ch;
    })
    .join('')
    .toLocaleLowerCase('es');
  return Array.from(new Set(base.split(''))).filter((ch) => ch !== ' ' && !esPuntuacion(ch) && !esDigito(ch));
}

/** ¿Lo que ha tecleado el niño coincide con el nombre del pictograma,
 *  según los ajustes de "mano amiga" vigentes? */
export function comprobarPalabra(tecleado, objetivo, opciones = {}) {
  return normalizarTexto(tecleado, opciones) === normalizarTexto(objetivo, opciones);
}

/** Reconstruye la secuencia de caracteres a mostrar en la caja de escritura,
 *  insertando automáticamente en su posición exacta los caracteres que gestiona
 *  la "mano amiga":
 *    - tildes: se reemplaza la letra base tecleada por la variante con acento
 *              que tiene el objetivo en esa posición ('i' → 'í').
 *    - espacios y puntuación: se insertan entre los caracteres reales sin
 *              consumir pulsación del niño.
 *
 *  De esta forma el niño ve en pantalla "bolígrafo rojo" aunque solo haya
 *  pulsado "b-o-l-i-g-r-a-f-o-r-o-j-o" (sin tilde ni espacio). Se exporta
 *  para poder probarlo con tests unitarios. */
export function secuenciaVisual(tecleado, objetivo, ajustesPista = {}) {
  const {
    tildesAutomaticas    = true,
    espaciosAutomaticos  = true,
    puntuacionAutomatica = true
  } = ajustesPista;
  const resultado = [];
  let posNorm = 0; // cuántos caracteres "reales" (no auto) hemos consumido de tecleado

  for (const ch of objetivo) {
    const esAutoEspacio = espaciosAutomaticos  && ch === ' ';
    const esAutoPunt    = puntuacionAutomatica && esPuntuacion(ch);

    if (esAutoEspacio || esAutoPunt) {
      // Auto-carácter: se inserta solo cuando el niño ya ha tecleado al
      // menos un carácter real anterior (posNorm > 0). No consume pulsación.
      if (posNorm > 0) resultado.push(ch);
    } else {
      // Carácter real que el niño debe pulsar.
      if (posNorm >= tecleado.length) break; // aún no ha llegado aquí
      // Si las tildes son automáticas, mostrar el carácter original del
      // objetivo (con su acento); si no, lo que el niño eligió teclear.
      resultado.push(tildesAutomaticas ? ch : tecleado[posNorm]);
      posNorm++;
    }
  }

  return resultado;
}

/** ¿Esta palabra necesita una tecla "Mayúscula" para poder escribirse?
 *  Solo si el ajuste de mayúsculas automáticas está desactivado y la
 *  palabra de verdad mezcla mayúsculas y minúsculas (p.ej. un nombre
 *  propio). */
export function necesitaTeclaMayus(nombre, ajustesPista = {}) {
  if (!nombre || ajustesPista.mayusculasAutomaticas !== false) return false;
  return tieneMayuscula(nombre);
}

/** ¿Esta palabra necesita una tecla de acceso a "Símbolos"? Solo si el
 *  ajuste de puntuación automática está desactivado y la palabra lleva
 *  de verdad algún signo de puntuación. */
export function necesitaTeclaSimbolos(nombre, ajustesPista = {}) {
  if (!nombre || ajustesPista.puntuacionAutomatica !== false) return false;
  return Array.from(nombre).some(esPuntuacion);
}

/** ¿Esta palabra necesita una tecla de acceso a "Números"? No depende
 *  de ningún ajuste de "mano amiga" (no existe una cifra "por
 *  defecto"): si la palabra lleva alguna cifra, hace falta poder
 *  escribirla. */
export function necesitaTeclaNumeros(nombre) {
  return Boolean(nombre) && Array.from(nombre).some(esDigito);
}

/** ¿Esta palabra necesita la tecla de espacio? Solo si tiene más de
 *  una palabra y el ajuste de espacios automáticos está desactivado
 *  (si está activado, los espacios se dan por puestos). */
export function necesitaTeclaEspacio(nombre, ajustesPista = {}) {
  if (!nombre || !nombre.includes(' ')) return false;
  return ajustesPista.espaciosAutomaticos === false;
}

/** Vocales con tilde (únicas) que esta palabra necesita como teclas
 *  sueltas: solo cuando el ajuste de tildes automáticas está
 *  desactivado y la palabra de verdad lleva alguna. */
export function tildesNecesarias(nombre, ajustesPista = {}) {
  if (!nombre || ajustesPista.tildesAutomaticas !== false) return [];
  return letrasNecesarias(nombre, { tildes: false }).filter((ch) => VOCALES_TILDE.includes(ch));
}

/** Signos de puntuación (únicos) que esta palabra necesita en la capa
 *  de símbolos. */
export function simbolosNecesarios(nombre) {
  if (!nombre) return [];
  return Array.from(new Set(Array.from(nombre).filter(esPuntuacion)));
}

/** Cifras (únicas) que esta palabra necesita en la capa de números. */
export function numerosNecesarios(nombre) {
  if (!nombre) return [];
  return Array.from(new Set(Array.from(nombre).filter(esDigito)));
}

/** Elige el siguiente pictograma a teclear, evitando repetir los ya
 *  usados en esta partida si todavía queda alguno sin usar. Lógica
 *  pura, igual de espíritu que generarNivel() en arrastraPalabra.js. */
export function elegirSiguienteMedio(medios, { evitarIds = [] } = {}) {
  if (!Array.isArray(medios) || !medios.length) return null;
  const evitar = new Set(evitarIds);
  const sinUsar = medios.filter((m) => m && !evitar.has(m.id));
  const candidatos = sinUsar.length ? sinUsar : medios.filter(Boolean);
  if (!candidatos.length) return null;
  return candidatos[Math.floor(Math.random() * candidatos.length)];
}

/** Aplica el ajuste de mayúsculas/minúsculas de visualización a un
 *  texto (palabra o letra suelta). No tiene relación con el ajuste de
 *  "mayúsculas automáticas" (ese afecta a la comprobación, no a cómo
 *  se ve); esto es solo apariencia. */
export function formatearTexto(texto, mayuscula = true) {
  if (!texto) return '';
  return mayuscula ? texto.toLocaleUpperCase('es') : texto.toLocaleLowerCase('es');
}

/** Validación de seguridad del ajuste "pulsador TTS": mientras esté
 *  activo, no se puede teclear ni cambiar de capa de teclado hasta
 *  haber pulsado el botón y escuchado la palabra una vez por nivel. Si
 *  el ajuste está desactivado, siempre se puede responder. Lógica
 *  pura, fácil de probar (duplicada a propósito en arrastraPalabra.js:
 *  cada mecánica es independiente). */
export function puedeResponder(ajustesPista, escuchado) {
  return !ajustesPista.pulsadorTts || Boolean(escuchado);
}

function inyectarEstilosUnaVez() {
  if (document.getElementById(ESTILOS_ID)) return;
  const link = document.createElement('link');
  link.id = ESTILOS_ID;
  link.rel = 'stylesheet';
  link.href = new URL('tecleaPalabra.css', import.meta.url).href;
  document.head.appendChild(link);
}

function mostrarSinMaterial(zona, plataforma) {
  zona.innerHTML = '';
  const vacio = document.createElement('p');
  vacio.className = 'vacio';
  vacio.textContent = plataforma.t('juegos.sin_material');
  zona.appendChild(vacio);
}

function pintarEscritura() {
  const { raiz, ajustesPista, tecleado, medioActual } = estado;
  const caja = raiz.querySelector('.teclea-escritura');
  caja.innerHTML = '';
  // Reconstruir la secuencia visual: los caracteres auto-gestionados por la
  // "mano amiga" (tildes, espacios, puntuación) se insertan en su posición
  // exacta del objetivo aunque el niño no los haya pulsado.
  const secuencia = secuenciaVisual(tecleado, medioActual ? medioActual.nombre : '', ajustesPista);
  secuencia.forEach((caracter, i) => {
    const ficha = document.createElement('span');
    ficha.className = 'teclea-letra' + (caracter === ' ' ? ' teclea-letra-espacio' : '');
    ficha.style.setProperty('--orden', i);
    // Si las mayúsculas automáticas están desactivadas, lo que se ve
    // en la ficha es tal cual lo tecleó el niño (para que pueda
    // comprobar si ha pulsado o no la tecla "Mayúscula"); si están
    // activadas, el caso no importa para la comprobación y se respeta
    // el ajuste de visualización general.
    const mostrado = ajustesPista.mayusculasAutomaticas === false ? caracter : formatearTexto(caracter, ajustesPista.mayuscula);
    ficha.textContent = caracter === ' ' ? '' : mostrado;
    caja.appendChild(ficha);
  });
}

function marcarFichas(clase) {
  const { raiz } = estado;
  raiz.querySelectorAll('.teclea-escritura .teclea-letra').forEach((ficha) => {
    ficha.classList.add(clase);
  });
}

function aplicarMayusActiva(caracter) {
  if (!estado.mayusActiva) return caracter;
  return caracter.toLocaleUpperCase('es');
}

/** Caso visual (mayúscula/minúscula) que deben mostrar las teclas del
 *  teclado. Con mayúsculas automáticas activadas (lo de siempre), las
 *  teclas siguen el ajuste general de mayúsculas/minúsculas de la
 *  pista (ajustesPista.mayuscula), como hasta ahora. Con mayúsculas
 *  automáticas desactivadas, el teclado se comporta como un teclado
 *  físico real: muestra minúscula o mayúscula según el interruptor
 *  "Mayús" (ver manejarMayus()), no según el ajuste general. */
function casoVisualTeclado() {
  const { ajustesPista, mayusActiva } = estado;
  return ajustesPista.mayusculasAutomaticas === false ? mayusActiva : ajustesPista.mayuscula;
}

/** Carácter exacto (con su tilde si la lleva) que toca teclear a
 *  continuación, según lo que el niño ya ha escrito (estado.tecleado).
 *  Se ignora a propósito el ajuste de mayúsculas automáticas (siempre
 *  en minúscula) porque el caso lo gestiona la tecla "Mayús" por
 *  separado; lo único que importa aquí es si ESTA posición concreta de
 *  la palabra necesita o no una tilde. Es la base de la decisión,
 *  posición a posición, de si pulsar una letra debe abrir el subset de
 *  tildes (ver crearTeclaLetra() y pintarCapaLetras()): la misma tecla
 *  "a" abre el subset solo cuando la próxima letra a escribir es "á",
 *  y teclea "a" directamente cuando no lo es, aunque la palabra tenga
 *  una "á" en otra posición. */
function siguienteCaracterObjetivo() {
  const { medioActual, ajustesPista, tecleado } = estado;
  const secuencia = normalizarTexto(medioActual.nombre, { ...ajustesPista, mayusculasAutomaticas: true });
  return secuencia[tecleado.length];
}

function crearTeclaCaracter(caracter, resaltada, esEspacio) {
  const { plataforma } = estado;
  const mayusculaVisual = casoVisualTeclado();
  const tecla = document.createElement('button');
  tecla.type = 'button';
  tecla.className = 'teclea-tecla' + (esEspacio ? ' teclea-tecla-espacio' : '') + (resaltada ? ' teclea-tecla-resaltada' : '');
  tecla.textContent = esEspacio ? '' : formatearTexto(caracter, mayusculaVisual);
  tecla.setAttribute('aria-label', esEspacio ? plataforma.t('teclea.espacio') : formatearTexto(caracter, true));
  tecla.addEventListener('click', () => manejarCaracter(caracter, esEspacio));
  return tecla;
}

function crearTeclaAccion(glifo, etiqueta, manejador, claseExtra, activa) {
  const tecla = document.createElement('button');
  tecla.type = 'button';
  tecla.className = 'teclea-tecla teclea-tecla-accion' + (claseExtra ? ` ${claseExtra}` : '') + (activa ? ' teclea-tecla-activa' : '');
  tecla.textContent = glifo;
  tecla.setAttribute('aria-label', etiqueta);
  tecla.addEventListener('click', manejador);
  return tecla;
}

/** Tecla de una letra normal del teclado. Si la PRÓXIMA letra a
 *  escribir (no la palabra entera) es justo la variante con tilde de
 *  esta letra, no teclea directamente al pulsarla: abre un subset con
 *  la letra normal y esa variante para elegir, igual que la tecla de
 *  Símbolos/Números abre su propia capa (ver abrirSubsetTilde() y
 *  pintarCapaTildes()). Si la palabra tiene esta misma letra en otra
 *  posición que no necesita tilde, esa otra vez se teclea
 *  directamente: la decisión es por ocurrencia, no por palabra. */
function crearTeclaLetra(letra, resaltada, tildeRequerida) {
  if (!tildeRequerida) {
    return crearTeclaCaracter(letra, resaltada, false);
  }
  const mayusculaVisual = casoVisualTeclado();
  const tecla = document.createElement('button');
  tecla.type = 'button';
  tecla.className = 'teclea-tecla teclea-tecla-con-subset' + (resaltada ? ' teclea-tecla-resaltada' : '');
  tecla.textContent = formatearTexto(letra, mayusculaVisual);
  tecla.setAttribute('aria-label', formatearTexto(letra, true));
  tecla.addEventListener('click', () => abrirSubsetTilde(letra, tildeRequerida));
  return tecla;
}

function abrirSubsetTilde(letraBase, tildeObjetivo) {
  if (!estado || estado.bloqueado) return;
  if (!puedeResponder(estado.ajustesPista, estado.escuchado)) return;
  estado.plataforma.sounds.click();
  estado.capaTeclado = 'tildes';
  estado.tildeBase = letraBase;
  estado.tildeObjetivo = tildeObjetivo;
  pintarTeclado();
}

function manejarBorrar() {
  if (!estado || estado.bloqueado) return;
  if (!puedeResponder(estado.ajustesPista, estado.escuchado)) return;
  if (!estado.tecleado.length) return;
  estado.plataforma.sounds.click();
  estado.tecleado.pop();
  pintarEscritura();
}

function cambiarCapa(nuevaCapa) {
  if (!estado || estado.bloqueado) return;
  if (!puedeResponder(estado.ajustesPista, estado.escuchado)) return;
  estado.plataforma.sounds.click();
  estado.capaTeclado = nuevaCapa;
  pintarTeclado();
}

function manejarMayus() {
  if (!estado || estado.bloqueado) return;
  if (!puedeResponder(estado.ajustesPista, estado.escuchado)) return;
  estado.plataforma.sounds.click();
  estado.mayusActiva = !estado.mayusActiva;
  pintarTeclado();
}

function pintarCapaLetras(teclado) {
  const { plataforma, medioActual, ajustesPista } = estado;
  // Las letras "necesarias" para el sombreado siempre se calculan
  // normalizando las tildes a su letra base: si la palabra solo lleva
  // "é" y nunca una "e" suelta, la tecla física "e" debe sombrearse
  // igual, porque es la que hay que pulsar para llegar hasta ella (ver
  // bug: con varias letras acentuadas distintas, solo se sombreaba la
  // primera y la siguiente se quedaba solo con el indicador de subset).
  const necesarias = new Set(ajustesPista.resaltarTeclado ? letrasNecesarias(medioActual.nombre, { tildes: true }) : []);
  const siguiente = siguienteCaracterObjetivo();

  tecladoParaIdioma(plataforma.lang).forEach((filaLetras) => {
    const fila = document.createElement('div');
    fila.className = 'teclea-fila';
    filaLetras.forEach((letra) => {
      const tildeRequerida = siguiente && siguiente !== letra && quitarTilde(siguiente) === letra ? siguiente : null;
      fila.appendChild(crearTeclaLetra(letra, necesarias.has(letra), tildeRequerida));
    });
    teclado.appendChild(fila);
  });

  const hayMayus = necesitaTeclaMayus(medioActual.nombre, ajustesPista);
  const haySimbolos = necesitaTeclaSimbolos(medioActual.nombre, ajustesPista);
  const hayNumeros = necesitaTeclaNumeros(medioActual.nombre);
  const hayEspacio = necesitaTeclaEspacio(medioActual.nombre, ajustesPista);

  const filaAcciones = document.createElement('div');
  filaAcciones.className = 'teclea-fila teclea-fila-acciones';

  if (hayMayus) {
    filaAcciones.appendChild(
      crearTeclaAccion('⇧', plataforma.t('teclea.mayus'), manejarMayus, 'teclea-tecla-mayus', estado.mayusActiva)
    );
  }
  if (haySimbolos) {
    filaAcciones.appendChild(
      crearTeclaAccion('.,¿?', plataforma.t('teclea.simbolos'), () => cambiarCapa('simbolos'), 'teclea-tecla-capa', false)
    );
  }
  if (hayNumeros) {
    filaAcciones.appendChild(
      crearTeclaAccion('123', plataforma.t('teclea.numeros'), () => cambiarCapa('numeros'), 'teclea-tecla-capa', false)
    );
  }
  if (hayEspacio) {
    filaAcciones.appendChild(crearTeclaCaracter(' ', false, true));
  }
  // La tecla de borrar siempre está disponible, sin depender de
  // ningún ajuste: cualquier palabra puede necesitar corregir la
  // última letra tecleada.
  filaAcciones.appendChild(
    crearTeclaAccion('⌫', plataforma.t('teclea.borrar'), manejarBorrar, 'teclea-tecla-borrar', false)
  );
  teclado.appendChild(filaAcciones);
}

function pintarCapaVolver(teclado) {
  const { plataforma } = estado;
  const filaVolver = document.createElement('div');
  filaVolver.className = 'teclea-fila';
  filaVolver.appendChild(
    crearTeclaAccion('⌫', plataforma.t('teclea.borrar'), manejarBorrar, 'teclea-tecla-borrar', false)
  );
  filaVolver.appendChild(
    crearTeclaAccion('←', plataforma.t('teclea.volver_letras'), () => cambiarCapa('letras'), 'teclea-tecla-volver', false)
  );
  teclado.appendChild(filaVolver);
}

function pintarCapaSimbolos(teclado) {
  const { medioActual } = estado;
  const fila = document.createElement('div');
  fila.className = 'teclea-fila';
  // simbolosNecesarios() ya filtra a solo los signos que la palabra de
  // verdad necesita: todos los que aparecen aquí hacen falta, así que
  // se sombrean todos (antes se pintaban sin resaltar).
  simbolosNecesarios(medioActual.nombre).forEach((simbolo) => {
    fila.appendChild(crearTeclaCaracter(simbolo, true, false));
  });
  teclado.appendChild(fila);
  pintarCapaVolver(teclado);
}

function pintarCapaNumeros(teclado) {
  const { medioActual } = estado;
  const fila = document.createElement('div');
  fila.className = 'teclea-fila';
  // Mismo razonamiento que en pintarCapaSimbolos(): numerosNecesarios()
  // ya filtra a solo las cifras necesarias, así que se sombrean todas.
  numerosNecesarios(medioActual.nombre).forEach((numero) => {
    fila.appendChild(crearTeclaCaracter(numero, true, false));
  });
  teclado.appendChild(fila);
  pintarCapaVolver(teclado);
}

/** Capa temporal con la letra base y su variante con tilde, para que
 *  el niño elija cuál escribir (ver abrirSubsetTilde()). Solo muestra
 *  las dos opciones de la ocurrencia concreta que se está tecleando
 *  ahora mismo (estado.tildeObjetivo ya trae la variante correcta para
 *  esta posición); la opción que de verdad hace falta aquí se muestra
 *  sombreada, como pista. */
function pintarCapaTildes(teclado) {
  const { tildeBase, tildeObjetivo } = estado;
  const fila = document.createElement('div');
  fila.className = 'teclea-fila';
  fila.appendChild(crearTeclaSubsetTilde(tildeBase, false));
  fila.appendChild(crearTeclaSubsetTilde(tildeObjetivo, true));
  teclado.appendChild(fila);
  pintarCapaVolver(teclado);
}

/** Tecla de una de las dos opciones del subset de tildes. A diferencia
 *  de Símbolos/Números (capas donde se puede seguir escribiendo varios
 *  caracteres), elegir aquí es una decisión de un solo carácter: tras
 *  elegir cualquiera de las dos opciones, se vuelve automáticamente a
 *  la vista principal del teclado (ver elegirOpcionTilde()). */
function crearTeclaSubsetTilde(caracter, resaltada) {
  const mayusculaVisual = casoVisualTeclado();
  const tecla = document.createElement('button');
  tecla.type = 'button';
  tecla.className = 'teclea-tecla' + (resaltada ? ' teclea-tecla-resaltada' : '');
  tecla.textContent = formatearTexto(caracter, mayusculaVisual);
  tecla.setAttribute('aria-label', formatearTexto(caracter, true));
  tecla.addEventListener('click', () => elegirOpcionTilde(caracter));
  return tecla;
}

function elegirOpcionTilde(caracter) {
  manejarCaracter(caracter, false);
  if (estado && !estado.bloqueado && estado.capaTeclado === 'tildes') {
    estado.capaTeclado = 'letras';
    estado.tildeBase = null;
    estado.tildeObjetivo = null;
    pintarTeclado();
  }
}

function pintarTeclado() {
  const { raiz, capaTeclado, ajustesPista, escuchado } = estado;
  const teclado = raiz.querySelector('.teclea-teclado');
  teclado.innerHTML = '';
  teclado.classList.remove('teclea-teclado-bloqueado');

  if (capaTeclado === 'simbolos') {
    pintarCapaSimbolos(teclado);
  } else if (capaTeclado === 'numeros') {
    pintarCapaNumeros(teclado);
  } else if (capaTeclado === 'tildes') {
    pintarCapaTildes(teclado);
  } else {
    pintarCapaLetras(teclado);
  }

  // Validación de seguridad: con el "pulsador TTS" activo, el teclado
  // queda visualmente bloqueado (igual que tras responder) hasta que
  // se pulse el botón y se escuche la palabra de este nivel.
  if (!puedeResponder(ajustesPista, escuchado)) {
    teclado.classList.add('teclea-teclado-bloqueado');
  }
}

function pintarNivel() {
  const { raiz, plataforma, medioActual, ajustesPista } = estado;
  // Cada nivel nuevo trae una palabra distinta: con el "pulsador TTS"
  // hay que volver a escucharla antes de poder escribir nada.
  estado.escuchado = false;

  raiz.querySelector('.teclea-nivel').textContent = plataforma.t('teclea.nivel', {
    n: estado.nivelActual,
    total: NIVELES_TOTAL
  });

  const objetivo = raiz.querySelector('.teclea-objetivo');
  objetivo.innerHTML = '';

  if (ajustesPista.pulsadorTts) {
    // "Pulsador TTS": se sustituye el pictograma y su pista por un
    // botón animado. Validación de seguridad: el teclado queda
    // bloqueado hasta pulsarlo (ver pintarTeclado() y los guardas en
    // manejarCaracter()/cambiarCapa()/manejarMayus()).
    const pulsador = document.createElement('button');
    pulsador.type = 'button';
    pulsador.className = 'teclea-pulsador';
    pulsador.setAttribute('aria-label', plataforma.t('comunes.escuchar'));
    pulsador.textContent = '🔊';
    pulsador.addEventListener('click', () => {
      plataforma.sounds.click();
      plataforma.tts.speak(medioActual.nombre);
      estado.escuchado = true;
      pulsador.classList.add('teclea-pulsador-escuchado');
      pintarTeclado();
    });
    objetivo.appendChild(pulsador);
  } else {
    if (!ajustesPista.soloTexto) {
      const img = document.createElement('img');
      img.className = 'teclea-objetivo-img';
      img.src = plataforma.getDisplayUrl(medioActual);
      img.alt = medioActual.nombre;
      objetivo.appendChild(img);
    }

    const pista = document.createElement('p');
    pista.className = 'teclea-pista';
    pista.textContent = formatearTexto(medioActual.nombre, ajustesPista.mayuscula);
    // En "solo texto" no hay imagen, así que la pista de texto es el
    // único contenido y se ve siempre, pase lo que pase el ajuste
    // "mostrar pista" (si no, no quedaría nada visible).
    pista.hidden = !ajustesPista.mostrar && !ajustesPista.soloTexto;
    objetivo.appendChild(pista);
  }

  estado.tecleado = [];
  estado.capaTeclado = 'letras';
  // El interruptor "Mayús" arranca en el caso que marque el ajuste de
  // pista (ajustesPista.mayuscula), no siempre en minúscula: si no, con
  // las mayúsculas automáticas desactivadas, el teclado podía mostrarse
  // en minúscula aunque la pista de texto estuviera en mayúsculas (o al
  // revés), una contradicción visual confusa para el niño.
  estado.mayusActiva = Boolean(ajustesPista.mayuscula);
  estado.tildeBase = null;
  estado.tildeObjetivo = null;
  pintarEscritura();
  pintarTeclado();
}

function resolverAcierto() {
  estado.plataforma.sounds.acierto();
  estado.plataforma.tts.speak(estado.medioActual.nombre);
  marcarFichas('teclea-letra-correcta');
  estado.raiz.querySelector('.teclea-teclado').classList.add('teclea-teclado-bloqueado');

  if (estado.nivelActual >= NIVELES_TOTAL) {
    estado.timeoutId = setTimeout(() => {
      if (!estado) return;
      estado.plataforma.mostrarRecompensa({ onContinuar: iniciarPartida });
    }, RETRASO_FINAL_MS);
  } else {
    estado.timeoutId = setTimeout(() => {
      if (!estado) return;
      estado.bloqueado = false;
      siguienteNivel();
    }, RETRASO_ACIERTO_MS);
  }
}

function resolverFallo() {
  estado.plataforma.sounds.fallo();
  marcarFichas('teclea-letra-cae');
  estado.raiz.querySelector('.teclea-teclado').classList.add('teclea-teclado-bloqueado');

  estado.timeoutId = setTimeout(() => {
    if (!estado) return;
    estado.tecleado = [];
    estado.capaTeclado = 'letras';
    // Mismo criterio que en pintarNivel(): el interruptor "Mayús" vuelve
    // al caso configurado en la pista, no siempre a minúscula.
    estado.mayusActiva = Boolean(estado.ajustesPista.mayuscula);
    estado.tildeBase = null;
    estado.tildeObjetivo = null;
    pintarEscritura();
    pintarTeclado();
    estado.bloqueado = false;
  }, RETRASO_FALLO_MS);
}

function manejarCaracter(caracter, esEspacio) {
  if (!estado || estado.bloqueado) return;
  if (!puedeResponder(estado.ajustesPista, estado.escuchado)) return;

  estado.plataforma.sounds.click();
  const valor = esEspacio ? ' ' : aplicarMayusActiva(caracter);
  estado.tecleado.push(valor);
  pintarEscritura();

  const longitudObjetivo = normalizarTexto(estado.medioActual.nombre, estado.ajustesPista).length;
  if (estado.tecleado.length < longitudObjetivo) {
    // Repinta la fila de letras: qué tecla abre ahora el subset de
    // tildes depende de la posición en la que se está escribiendo, no
    // de la palabra entera (ver siguienteCaracterObjetivo()), así que
    // tiene que recalcularse tras cada carácter tecleado.
    if (estado.capaTeclado === 'letras') pintarTeclado();
    return;
  }

  estado.bloqueado = true;
  const escrito = estado.tecleado.join('');
  if (comprobarPalabra(escrito, estado.medioActual.nombre, estado.ajustesPista)) {
    resolverAcierto();
  } else {
    resolverFallo();
  }
}

function siguienteNivel() {
  if (!estado) return;
  estado.nivelActual += 1;
  const medio = elegirSiguienteMedio(estado.plataforma.medios, { evitarIds: estado.usados });
  if (!medio) {
    mostrarSinMaterial(estado.raiz.querySelector('.teclea-zona'), estado.plataforma);
    return;
  }
  estado.usados.push(medio.id);
  estado.medioActual = medio;
  pintarNivel();
}

function iniciarPartida() {
  if (!estado) return;
  estado.nivelActual = 0;
  estado.usados = [];
  estado.bloqueado = false;
  siguienteNivel();
}

function montar(contenedor, plataforma) {
  inyectarEstilosUnaVez();
  contenedor.innerHTML = '';

  const raiz = document.createElement('div');
  raiz.className = 'teclea-app';

  const cabecera = document.createElement('header');
  cabecera.className = 'teclea-cabecera';
  const titulo = document.createElement('h1');
  titulo.textContent = `${plataforma.icono || ''} ${plataforma.nombre}`.trim();
  const instrucciones = document.createElement('p');
  instrucciones.textContent = plataforma.t('teclea.instrucciones');
  cabecera.append(titulo, instrucciones);

  const marcador = document.createElement('div');
  marcador.className = 'teclea-marcador';
  const nivelEl = document.createElement('span');
  nivelEl.className = 'teclea-nivel';
  marcador.appendChild(nivelEl);

  const zona = document.createElement('div');
  zona.className = 'teclea-zona';

  const objetivo = document.createElement('div');
  objetivo.className = 'teclea-objetivo';

  const escritura = document.createElement('div');
  escritura.className = 'teclea-escritura';

  const teclado = document.createElement('div');
  teclado.className = 'teclea-teclado';

  zona.append(objetivo, escritura, teclado);
  raiz.append(cabecera, marcador, zona);
  contenedor.appendChild(raiz);

  estado = {
    contenedor,
    plataforma,
    raiz,
    nivelActual: 0,
    usados: [],
    medioActual: null,
    tecleado: [],
    bloqueado: false,
    escuchado: false,
    timeoutId: null,
    capaTeclado: 'letras',
    mayusActiva: false,
    tildeBase: null,
    tildeObjetivo: null,
    ajustesPista: plataforma.ajustesPista || {
      mayuscula: true,
      mostrar: true,
      resaltarTeclado: true,
      tildesAutomaticas: true,
      mayusculasAutomaticas: true,
      puntuacionAutomatica: true,
      espaciosAutomaticos: true,
      soloTexto: false,
      pulsadorTts: false
    }
  };

  if (!plataforma.medios || plataforma.medios.length < MIN_MATERIAL) {
    mostrarSinMaterial(zona, plataforma);
    return;
  }

  iniciarPartida();
}

function desmontar() {
  if (estado && estado.timeoutId) clearTimeout(estado.timeoutId);
  estado = null;
}

export default {
  id: 'teclea-palabra',
  nombre: 'Teclea la palabra',
  icono: '⌨️',
  estante: 'ESCRITURA',
  montar,
  desmontar
};
