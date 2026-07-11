// Pictosfera — mecánica reutilizable: "rosco de pictogramas".
//
// Un rosco con las 26 letras de la A a la Z rodea el centro de la
// pantalla. En el centro se muestran cuatro pictogramas grandes. En
// cada turno una letra del rosco queda "activa" y el sistema dice por
// TTS la consigna a resolver. El niño toca, entre los cuatro
// pictogramas, el único que cumple esa consigna; los otros tres son
// distractores. Sin tiempo límite, sin marcador de puntos, sin límite
// de fallos: el niño responde a su ritmo y puede seguir intentándolo
// tras un fallo.
//
// Es "código de confianza del autor": JavaScript nativo, módulo ES,
// sin framework. No importa nada del núcleo directamente: todo lo que
// necesita le llega a través de `plataforma` en montar() (ver
// core/js/appLoader.js). Igual que el resto de mecánicas, es
// reutilizable: otra app (otro material, otro nombre, otro estante)
// puede usar este mismo archivo con un descriptor nuevo en
// data/apps.json.
//
// --- Las dos consignas posibles ---
//
//   "Empieza por la letra X" (modo "empieza", la habitual): el
//   pictograma correcto es aquel cuya palabra EMPIEZA por la letra
//   activa.
//
//   "Tiene la letra X" (modo "tiene", solo como respaldo): se usa
//   ÚNICAMENTE cuando, con el material disponible, ninguna palabra
//   empieza por esa letra (letras poco frecuentes como inicial en el
//   idioma configurado). En ese caso el pictograma correcto es aquel
//   cuya palabra CONTIENE la letra en cualquier posición.
//
// El modo se decide letra por letra, según el material real de cada
// partida (ver determinarModoConsigna): no es una lista fija de
// letras "difíciles", sino una comprobación contra las palabras
// disponibles. Si una letra no tiene ninguna palabra que la empiece
// NI que la contenga, esa letra no se puede jugar y se omite de la
// partida (ver construirSecuenciaRosco).
//
// --- Por qué 26 letras, sin Ñ ---
//
// La especificación pide expresamente "las letras de la A a la Z",
// distinto del resto de mecánicas de este proyecto (que usan el
// abecedario español de 27 letras, con Ñ). Aquí se respeta la letra
// de la especificación. Aun así, se reutiliza la misma normalización
// segura de "Ñ" que el resto del proyecto (ver normalizarLetra) para
// que una palabra con "ñ" nunca cuente por error como si tuviera "n".
//
// --- Por qué no se usa "soloTexto" ni "pulsadorTts" aquí ---
//
// Igual que en "Ruleta de letras" (ver ruletaLetras.js): el pictograma
// en sí ES el rompecabezas que hay que resolver a la vista. Sustituir
// el dibujo por su nombre en texto (soloTexto) anularía el juego, y
// "pulsadorTts" no pinta nada porque no hay una "pista de audio" que
// reproducir aparte de la propia consigna, que ya se dice siempre en
// voz alta sin necesidad de pulsador.
//
// --- Qué pasa al fallar y al acertar ---
//
// Fallo: sonido de error, el pictograma se sombrea en rojo y queda
// descartado (no se puede volver a tocar) durante el resto de esa
// ronda: así el niño va descartando opciones por eliminación sin
// poder repetir un error ya señalado, sin ningún tipo de penalización
// acumulada entre rondas.
//
// Acierto: sonido de acierto, el pictograma se marca en verde, la
// letra correspondiente del rosco queda "resuelta" y, tras una breve
// pausa, el juego pasa a la siguiente letra activa. Al completar la
// secuencia entera se muestra la pantalla genérica de recompensa del
// portal. No hay resumen de aciertos/fallos: ver la mecánica "Bingo de
// lectura", que sigue el mismo criterio.

const ESTILOS_ID = 'rosco-pictogramas-estilos';
const MIN_MATERIAL = 4; // hace falta material suficiente para 1 objetivo + al menos 3 distractores
const PICTOGRAMAS_POR_RONDA = 4;
const DISTRACTORES_POR_RONDA = PICTOGRAMAS_POR_RONDA - 1;
const RETRASO_ACIERTO_MS = 2500;
const RETRASO_FINAL_MS = 500;

export const ABECEDARIO_ROSCO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const ES_LETRA = /\p{L}/u;

let estado = null; // { plataforma, contenedor, raiz, ajustesPista, secuencia, indice, rondaActual, bloqueado, timeoutId }

// --- Lógica pura (testable con node --test, sin DOM) ---

/** Normaliza un carácter a mayúscula sin acentos, protegiendo la "Ñ"
 *  (que NUNCA debe convertirse en "N"): misma idea que en
 *  ruletaLetras.js, duplicada a propósito porque cada mecánica es un
 *  archivo independiente y autocontenido. */
export function normalizarLetra(caracter) {
  if (!caracter) return '';
  const letra = String(caracter).charAt(0);
  if (letra.toLocaleUpperCase() === 'Ñ') return 'Ñ';
  return letra
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleUpperCase();
}

/** Primera letra normalizada del nombre de un medio (o cadena vacía
 *  si no hay nombre, o no empieza por una letra). */
export function primeraLetraNormalizada(nombre) {
  if (!nombre) return '';
  const primerCaracter = Array.from(String(nombre)).find((ch) => ES_LETRA.test(ch));
  return primerCaracter ? normalizarLetra(primerCaracter) : '';
}

/** Todas las letras normalizadas que aparecen en el nombre de un
 *  medio, en orden, ignorando espacios y otros símbolos. */
export function letrasNormalizadasDePalabra(nombre) {
  if (!nombre) return [];
  return Array.from(String(nombre))
    .filter((ch) => ES_LETRA.test(ch))
    .map(normalizarLetra);
}

/** ¿La palabra de `medio` EMPIEZA por `letraNormalizada`? */
export function medioEmpiezaPorLetra(medio, letraNormalizada) {
  if (!medio) return false;
  return primeraLetraNormalizada(medio.nombre) === letraNormalizada;
}

/** ¿La palabra de `medio` CONTIENE `letraNormalizada` en cualquier
 *  posición? */
export function medioTieneLetra(medio, letraNormalizada) {
  if (!medio) return false;
  return letrasNormalizadasDePalabra(medio.nombre).includes(letraNormalizada);
}

/** ¿El medio cumple la consigna activa, según el modo ("empieza" o
 *  "tiene")? */
export function medioSatisfaceConsigna(medio, letraNormalizada, modo) {
  return modo === 'tiene'
    ? medioTieneLetra(medio, letraNormalizada)
    : medioEmpiezaPorLetra(medio, letraNormalizada);
}

/** Decide el modo de la consigna para una letra, según el material
 *  disponible: "empieza" si hay al menos una palabra que empieza por
 *  esa letra; si no, "tiene" si hay al menos una palabra que la
 *  contiene; si ninguna palabra la tiene de ninguna forma, null (esa
 *  letra no se puede jugar con este material). */
export function determinarModoConsigna(medios, letraNormalizada) {
  if (!Array.isArray(medios) || !medios.length) return null;
  if (medios.some((m) => medioEmpiezaPorLetra(m, letraNormalizada))) return 'empieza';
  if (medios.some((m) => medioTieneLetra(m, letraNormalizada))) return 'tiene';
  return null;
}

/** Medios que podrían ser el objetivo de la ronda (cumplen la
 *  consigna). */
export function candidatosObjetivo(medios, letraNormalizada, modo) {
  if (!Array.isArray(medios)) return [];
  return medios.filter((m) => medioSatisfaceConsigna(m, letraNormalizada, modo));
}

/** Medios que podrían ser distractores: no son el objetivo elegido y
 *  NO cumplen la consigna (para que solo haya una respuesta posible
 *  entre los cuatro pictogramas). */
export function candidatosDistractor(medios, objetivoId, letraNormalizada, modo) {
  if (!Array.isArray(medios)) return [];
  return medios.filter((m) => m.id !== objetivoId && !medioSatisfaceConsigna(m, letraNormalizada, modo));
}

function mezclar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Construye una ronda jugable para una letra concreta: elige el modo
 *  de consigna, un objetivo al azar entre los candidatos válidos y
 *  tres distractores al azar que no cumplan la consigna. Devuelve
 *  null si, con el material disponible, esa letra no se puede jugar
 *  (ni "empieza" ni "tiene" tienen candidato, o no quedan al menos
 *  tres distractores válidos). Usa Math.random() internamente: no es
 *  una función de valor exacto, se prueba por pertenencia/estructura
 *  (igual que elegirSiguientePalabra/crearAbecedario en otras
 *  mecánicas). */
export function construirRonda(medios, letraNormalizada) {
  if (!Array.isArray(medios) || !medios.length) return null;
  const modo = determinarModoConsigna(medios, letraNormalizada);
  if (!modo) return null;

  const objetivoCandidatos = candidatosObjetivo(medios, letraNormalizada, modo);
  if (!objetivoCandidatos.length) return null;
  const objetivo = objetivoCandidatos[Math.floor(Math.random() * objetivoCandidatos.length)];

  const distractorCandidatos = candidatosDistractor(medios, objetivo.id, letraNormalizada, modo);
  if (distractorCandidatos.length < DISTRACTORES_POR_RONDA) return null;
  const distractores = mezclar(distractorCandidatos).slice(0, DISTRACTORES_POR_RONDA);

  return {
    letra: letraNormalizada,
    modo,
    objetivo,
    distractores,
    pictogramas: mezclar([objetivo, ...distractores])
  };
}

/** Construye la secuencia de turnos de una partida entera: recorre el
 *  abecedario de la A a la Z en orden y, para cada letra, intenta
 *  construir una ronda jugable con el material disponible. Las letras
 *  que no se pueden jugar (sin candidato válido) se omiten: la
 *  partida resultante puede tener menos de 26 turnos según cuánto
 *  material haya en la biblioteca. */
export function construirSecuenciaRosco(medios) {
  if (!Array.isArray(medios)) return [];
  return ABECEDARIO_ROSCO.map((letra) => construirRonda(medios, letra)).filter(Boolean);
}

/** ¿El medio tocado es el objetivo de la ronda activa? */
export function esSeleccionCorrecta(ronda, medioId) {
  if (!ronda || !ronda.objetivo) return false;
  if (medioId === undefined || medioId === null) return false;
  return ronda.objetivo.id === medioId;
}

/** Clave de i18n de la consigna a anunciar, según el modo de la
 *  ronda. Por defecto (modo desconocido) cae en "empieza", la
 *  consigna principal de la especificación. */
export function claveConsigna(modo) {
  return modo === 'tiene' ? 'rosco.consigna_tiene' : 'rosco.consigna_empieza';
}

// --- Capa de DOM (no se prueba con node --test: solo a mano en el navegador) ---

function inyectarEstilosUnaVez() {
  if (document.getElementById(ESTILOS_ID)) return;
  const link = document.createElement('link');
  link.id = ESTILOS_ID;
  link.rel = 'stylesheet';
  link.href = new URL('roscoPictogramas.css', import.meta.url).href;
  document.head.appendChild(link);
}

function mostrarSinMaterial(zona, plataforma) {
  zona.innerHTML = '';
  const vacio = document.createElement('p');
  vacio.className = 'vacio';
  vacio.textContent = plataforma.t('juegos.sin_material');
  zona.appendChild(vacio);
}

function programarTimeout(fn, ms) {
  if (!estado) return;
  estado.timeoutId = setTimeout(() => {
    if (!estado) return;
    estado.timeoutId = null;
    fn();
  }, ms);
}

/** Posición (en porcentaje, sobre el contenedor cuadrado del rosco)
 *  de la letra `indice` de un total de `total`, repartidas en círculo
 *  empezando arriba (12 en punto) y avanzando en el sentido del
 *  reloj. Puramente presentacional. */
function posicionEnAnillo(indice, total) {
  const angulo = (indice / total) * 2 * Math.PI - Math.PI / 2;
  const radio = 44; // porcentaje del radio del anillo, deja margen para el tamaño de cada letra
  return {
    left: `${50 + Math.cos(angulo) * radio}%`,
    top: `${50 + Math.sin(angulo) * radio}%`
  };
}

function pintarAnillo() {
  const anillo = estado.raiz.querySelector('.rosco-anillo');
  anillo.innerHTML = '';
  const total = ABECEDARIO_ROSCO.length;
  const letraActiva = estado.rondaActual ? estado.rondaActual.letra : null;

  ABECEDARIO_ROSCO.forEach((letra, indice) => {
    const celda = document.createElement('span');
    celda.className = 'rosco-letra';
    if (estado.resueltas.has(letra)) celda.classList.add('rosco-letra-resuelta');
    if (letra === letraActiva) celda.classList.add('rosco-letra-activa');
    celda.textContent = letra;
    const { left, top } = posicionEnAnillo(indice, total);
    celda.style.left = left;
    celda.style.top = top;
    anillo.appendChild(celda);
  });
}

function actualizarProgreso() {
  const progreso = estado.raiz.querySelector('.rosco-progreso');
  progreso.textContent = estado.plataforma.t('rosco.progreso', {
    n: estado.indice + 1,
    total: estado.secuencia.length
  });
}

function manejarToquePictograma(medio, boton) {
  if (!estado || estado.bloqueado) return;
  if (boton.disabled) return;

  if (esSeleccionCorrecta(estado.rondaActual, medio.id)) {
    estado.bloqueado = true;
    estado.plataforma.sounds.acierto();
    boton.classList.add('rosco-pictograma-correcto');
    estado.resueltas.add(estado.rondaActual.letra);
    pintarAnillo();
    const consignaTexto = estado.plataforma.t(claveConsigna(estado.rondaActual.modo), { letra: estado.rondaActual.letra });
    estado.plataforma.tts.speak(`${estado.plataforma.t('rosco.tts_si')} ${medio.nombre}. ${consignaTexto}`);

    programarTimeout(() => {
      siguienteTurno();
    }, RETRASO_ACIERTO_MS);
  } else {
    estado.plataforma.sounds.fallo();
    boton.disabled = true;
    boton.classList.add('rosco-pictograma-incorrecto');
    const consignaTextoFallo = estado.plataforma.t(claveConsigna(estado.rondaActual.modo), { letra: estado.rondaActual.letra });
    estado.plataforma.tts.speak(consignaTextoFallo);
  }
}

function crearPictograma(medio) {
  const { plataforma } = estado;
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'rosco-pictograma';
  boton.dataset.medioId = medio.id;
  boton.setAttribute('aria-label', medio.nombre);

  const img = document.createElement('img');
  img.className = 'rosco-pictograma-img';
  img.src = plataforma.getDisplayUrl(medio);
  img.alt = medio.nombre;
  boton.appendChild(img);

  boton.addEventListener('click', () => manejarToquePictograma(medio, boton));
  return boton;
}

function pintarRonda() {
  const { plataforma, rondaActual } = estado;

  const zonaPictogramas = estado.raiz.querySelector('.rosco-pictogramas');
  zonaPictogramas.innerHTML = '';
  rondaActual.pictogramas.forEach((medio) => {
    zonaPictogramas.appendChild(crearPictograma(medio));
  });

  const consignaEl = estado.raiz.querySelector('.rosco-consigna');
  const texto = plataforma.t(claveConsigna(rondaActual.modo), { letra: rondaActual.letra });
  consignaEl.textContent = texto;
  plataforma.tts.speak(texto);

  pintarAnillo();
  actualizarProgreso();
}

function siguienteTurno() {
  if (!estado) return;
  estado.indice += 1;

  if (estado.indice >= estado.secuencia.length) {
    programarTimeout(() => {
      if (!estado) return;
      estado.plataforma.mostrarRecompensa({ mensajeKey: 'rosco.mensaje_final', onContinuar: iniciarPartida });
    }, RETRASO_FINAL_MS);
    return;
  }

  estado.bloqueado = false;
  estado.rondaActual = estado.secuencia[estado.indice];
  pintarRonda();
}

function iniciarPartida() {
  if (!estado) return;
  const secuencia = construirSecuenciaRosco(estado.plataforma.medios);
  if (!secuencia.length) {
    mostrarSinMaterial(estado.raiz.querySelector('.rosco-zona'), estado.plataforma);
    return;
  }
  estado.secuencia = secuencia;
  estado.indice = 0;
  estado.bloqueado = false;
  estado.resueltas = new Set();
  estado.rondaActual = secuencia[0];
  pintarRonda();
}

function montar(contenedor, plataforma) {
  inyectarEstilosUnaVez();
  contenedor.innerHTML = '';

  const raiz = document.createElement('div');
  raiz.className = 'rosco-app';

  const cabecera = document.createElement('header');
  cabecera.className = 'rosco-cabecera';
  const titulo = document.createElement('h1');
  titulo.textContent = `${plataforma.icono || ''} ${plataforma.nombre}`.trim();
  const instrucciones = document.createElement('p');
  instrucciones.textContent = plataforma.t('rosco.instrucciones');
  cabecera.append(titulo, instrucciones);

  const progreso = document.createElement('div');
  progreso.className = 'rosco-progreso';

  const zona = document.createElement('div');
  zona.className = 'rosco-zona';

  const anilloCont = document.createElement('div');
  anilloCont.className = 'rosco-anillo-cont';
  const anillo = document.createElement('div');
  anillo.className = 'rosco-anillo';
  anillo.setAttribute('aria-hidden', 'true');
  anilloCont.appendChild(anillo);

  const centro = document.createElement('div');
  centro.className = 'rosco-centro';
  const consigna = document.createElement('p');
  consigna.className = 'rosco-consigna';
  consigna.setAttribute('aria-live', 'polite');
  const pictogramas = document.createElement('div');
  pictogramas.className = 'rosco-pictogramas';
  centro.append(consigna, pictogramas);
  anilloCont.appendChild(centro);

  zona.appendChild(anilloCont);
  raiz.append(cabecera, progreso, zona);
  contenedor.appendChild(raiz);

  estado = {
    contenedor,
    plataforma,
    raiz,
    ajustesPista: plataforma.ajustesPista || { mayuscula: true },
    secuencia: [],
    indice: 0,
    rondaActual: null,
    resueltas: new Set(),
    bloqueado: false,
    timeoutId: null
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
  id: 'rosco-pictogramas',
  nombre: 'Rosco de pictogramas',
  icono: '🔠',
  estante: 'LECTURA',
  montar,
  desmontar
};
