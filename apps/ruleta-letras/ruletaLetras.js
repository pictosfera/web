// Pictosfera — mecánica reutilizable: "Ruleta de letras con pictograma
// oculto".
//
// El niño debe completar una palabra oculta asociada a un pictograma.
// La palabra se muestra en un panel de casillas (una por letra): las
// letras ocultas se ven en azul, las recién acertadas se iluminan un
// instante en naranja y, ya asentadas, quedan en blanco con letra
// negra. Debajo del panel aparece el abecedario completo (o uno
// reducido, en dificultad "facil"): sus letras se bloquean en cuanto se
// usan, acierten o no. A un lado aparece el pictograma de la palabra,
// oculto bajo una retícula de 3x3 de la que al principio solo se ve
// una casilla (dos en "facil").
//
// En cada turno el niño gira una ruleta visual con cuatro resultados
// posibles: "Elige una letra", "Pista" (revela una casilla más del
// pictograma), "Vocal gratis" y "Consonante gratis" (el sistema regala
// una vocal/consonante de la palabra, con todas sus apariciones). La
// ruleta NO es azar puro: el resultado se calcula ANTES de empezar la
// animación de giro, según reglas fijas (ver resultadosDisponibles y
// pesosResultados más abajo) que dan mucho peso a "Elige una letra" y
// solo permiten un resultado si todavía tiene efecto real (p.ej. no
// puede salir "Pista" si el pictograma ya está del todo descubierto).
//
// La partida dura siempre 10 palabras; al completar la última se
// muestra la recompensa general del portal. No hay resumen de
// aciertos/fallos: ver la mecánica "Bingo de lectura", que sigue el
// mismo criterio.
//
// Es "código de confianza del autor": JavaScript nativo, módulo ES, sin
// framework. Toda la lógica de qué resultado toca, qué letra conviene
// regalar, qué casilla del pictograma revelar a continuación, etc. es
// pura (sin DOM) y se prueba con node --test; solo el montaje en el
// DOM (rueda animada, botones, temporizadores) queda fuera de las
// pruebas automáticas, igual que en el resto de mecánicas del proyecto.
//
// No importa nada del núcleo directamente: todo lo que necesita
// (idioma, voz, sonidos, recompensa, material, ajustes de pista) le
// llega a través del objeto `plataforma` que recibe en montar(). Esta
// mecánica no usa los ajustes "soloTexto" ni "pulsadorTts" del resto de
// juegos: aquí el pictograma TIENE que verse (aunque sea tapado a
// trozos) porque descubrirlo poco a poco es el corazón del juego, así
// que sustituirlo por texto o por un botón de escucha no tendría
// sentido estructural, a diferencia de otras mecánicas donde el
// pictograma es solo una pista acompañante.

const ESTILOS_ID = 'ruleta-letras-estilos';
const MIN_MATERIAL = 3;
const PALABRAS_TOTAL = 10; // partida de longitud fija, como el resto de mecánicas del proyecto
const TAMANO_RETICULA = 9; // pictograma tapado por una retícula de 3x3
const DISTRACTORAS_FACIL = 4; // letras "de relleno" que se añaden al abecedario reducido de la dificultad fácil

const RETRASO_GIRO_MS = 1100; // debe coincidir con la transición CSS de .ruleta-rueda
const RETRASO_ACIERTO_MS = 700;
const RETRASO_FINAL_MS = 600;
const DURACION_FALLO_MS = 400;

const MARCAS_DIACRITICAS = /[̀-ͯ]/g;
const ES_LETRA = /\p{L}/u;

// --- Lógica pura: letras de la palabra, normalización para comparar
// contra el abecedario (que no tiene teclas con tilde) ---

/** Letras (en orden, con repetidos) de una palabra: se ignoran espacios
 *  y cualquier carácter que no sea una letra. Lógica pura, sin DOM
 *  (duplicada a propósito respecto a otras mecánicas: cada una es
 *  independiente, ver escribeLetra.js/tecleaPalabra.js). */
export function letrasDePalabra(nombre) {
  if (!nombre) return [];
  return Array.from(nombre).filter((ch) => ch !== ' ' && ES_LETRA.test(ch));
}

/** Normaliza una letra a la forma con la que se compara contra el
 *  abecedario seleccionable (mayúscula, sin tilde): el abecedario solo
 *  tiene una tecla por letra (A-Z y Ñ), así que pulsar "A" debe
 *  encontrar también las "Á" de la palabra. La Ñ nunca se toca: es una
 *  letra propia, no una variante con diacrítico (mismo cuidado que en
 *  escribeLetra.js/tecleaPalabra.js). */
export function normalizarLetra(caracter) {
  if (!caracter) return '';
  const mayuscula = caracter.toLocaleUpperCase('es');
  if (mayuscula === 'Ñ') return 'Ñ';
  return mayuscula.normalize('NFD').replace(MARCAS_DIACRITICAS, '');
}

/** Letras de la palabra ya normalizadas, en el mismo orden que
 *  letrasDePalabra (una entrada por casilla del panel). */
export function letrasNormalizadasDePalabra(nombre) {
  return letrasDePalabra(nombre).map(normalizarLetra);
}

/** Aplica el ajuste de mayúsculas/minúsculas del portal a una letra ya
 *  revelada del panel (la letra ORIGINAL de la palabra, con su tilde si
 *  la tenía: solo cambia el caso, nunca el acento). */
export function formatearLetra(caracter, mayuscula = true) {
  if (!caracter) return '';
  return mayuscula === false ? caracter.toLocaleLowerCase('es') : caracter.toLocaleUpperCase('es');
}

const VOCALES = ['A', 'E', 'I', 'O', 'U'];

/** ¿Es una vocal (sin tilde, ya normalizada)? */
export function esVocal(letraNormalizada) {
  return VOCALES.includes(letraNormalizada);
}

/** Letras normalizadas distintas de la palabra que todavía no se han
 *  usado (ni acertadas ni falladas) en el abecedario. */
export function letrasOcultasUnicas(letrasNormalizadas, usadas = []) {
  const usadasSet = new Set(usadas);
  return [...new Set(letrasNormalizadas)].filter((l) => !usadasSet.has(l));
}

/** ¿Ya se ha revelado toda la palabra? (todas sus letras, una por una,
 *  están entre las usadas). */
export function palabraCompleta(letrasNormalizadas, usadas = []) {
  if (!Array.isArray(letrasNormalizadas) || !letrasNormalizadas.length) return false;
  const usadasSet = new Set(usadas);
  return letrasNormalizadas.every((l) => usadasSet.has(l));
}

/** Índices (posiciones dentro de la palabra) donde aparece una letra ya
 *  normalizada: puede ser más de uno ("banana" + "A" → varios índices).
 *  Se usa tanto al elegir una letra a mano como al regalar una
 *  vocal/consonante: en ambos casos se revelan TODAS sus apariciones a
 *  la vez. */
export function indicesDeLetraEnPalabra(letrasNormalizadas, letraNormalizada) {
  if (!Array.isArray(letrasNormalizadas) || !letraNormalizada) return [];
  const indices = [];
  letrasNormalizadas.forEach((letra, indice) => {
    if (letra === letraNormalizada) indices.push(indice);
  });
  return indices;
}

/** Elige qué letra regalar entre varias candidatas (vocales o
 *  consonantes todavía ocultas), con el criterio "pedagógico" que pide
 *  la especificación: prioriza la letra que aparece más veces en la
 *  palabra (revelar varias casillas de golpe ayuda más a adivinarla) y,
 *  si hay empate, la que aparece antes (ayuda a reconocer el principio
 *  de la palabra cuanto antes). No se usa una tabla de frecuencia del
 *  idioma: con estos dos criterios ya se cubre lo más útil de la
 *  especificación sin añadir un diccionario externo innecesario. */
export function elegirLetraRegalada(candidatas, letrasNormalizadas) {
  if (!Array.isArray(candidatas) || !candidatas.length) return null;
  let mejor = null;
  candidatas.forEach((letra) => {
    const apariciones = letrasNormalizadas.filter((l) => l === letra).length;
    const primeraPosicion = letrasNormalizadas.indexOf(letra);
    if (
      !mejor ||
      apariciones > mejor.apariciones ||
      (apariciones === mejor.apariciones && primeraPosicion < mejor.primeraPosicion)
    ) {
      mejor = { letra, apariciones, primeraPosicion };
    }
  });
  return mejor.letra;
}

// --- Lógica pura: qué resultados puede dar la ruleta y con qué peso
// (ver cabecera del archivo: el resultado se calcula ANTES de animar) ---

/** Qué resultados de la ruleta tienen, ahora mismo, efecto real. Nunca
 *  puede salir un resultado que no cambiaría nada (p.ej. "Pista" si el
 *  pictograma ya está completo). Lógica pura: recibe ya calculadas las
 *  cuatro condiciones de disponibilidad. */
export function resultadosDisponibles(disponibilidad = {}) {
  const resultados = [];
  if (disponibilidad.quedanLetrasAbecedario) resultados.push('letra');
  if (disponibilidad.quedanCasillasPictograma) resultados.push('pista');
  if (disponibilidad.quedanVocales) resultados.push('vocal');
  if (disponibilidad.quedanConsonantes) resultados.push('consonante');
  return resultados;
}

/** Pesos base (todas las opciones disponibles) por dificultad. El de
 *  "normal" es exactamente el de la especificación (75/10/8/7); "facil"
 *  reparte más ayuda (menos peso para "elige letra", más para el
 *  resto) y "dificil" reparte menos, siguiendo la misma idea cualitativa
 *  que describe la especificación para sus tres niveles. */
const PESOS_BASE_POR_DIFICULTAD = {
  facil: { letra: 60, pista: 16, vocal: 14, consonante: 10 },
  normal: { letra: 75, pista: 10, vocal: 8, consonante: 7 },
  dificil: { letra: 85, pista: 5, vocal: 5, consonante: 5 }
};

/** Peso que recibe cada opción "extra" (pista/vocal/consonante) cuando
 *  alguna de las cuatro no está disponible y hay que recalcular: en
 *  "normal" es 10, que es justo lo que hace falta para reproducir los
 *  ejemplos de la especificación (p.ej. sin pistas pendientes: elige
 *  letra 80, vocal 10, consonante 10). "Facil"/"dificil" extrapolan la
 *  misma idea (más o menos generosos) al no tener ejemplos propios. */
const PESO_EXTRA_DEGRADADO_POR_DIFICULTAD = { facil: 15, normal: 10, dificil: 5 };

const TODOS_LOS_EXTRA = ['pista', 'vocal', 'consonante'];

/** Pesos de la ruleta para los resultados que de verdad están
 *  disponibles ahora, dada la dificultad. Lógica pura: ver comentarios
 *  de PESOS_BASE_POR_DIFICULTAD/PESO_EXTRA_DEGRADADO_POR_DIFICULTAD. */
export function pesosResultados(disponibles, dificultad = 'normal') {
  const base = PESOS_BASE_POR_DIFICULTAD[dificultad] || PESOS_BASE_POR_DIFICULTAD.normal;
  const extrasDisponibles = TODOS_LOS_EXTRA.filter((r) => disponibles.includes(r));
  const hayLetra = disponibles.includes('letra');

  // Caso base: las cuatro opciones tienen efecto, se usan los pesos de
  // la especificación (o su equivalente por dificultad) tal cual.
  if (hayLetra && extrasDisponibles.length === TODOS_LOS_EXTRA.length) {
    return { ...base };
  }

  const pesoExtra = PESO_EXTRA_DEGRADADO_POR_DIFICULTAD[dificultad] || PESO_EXTRA_DEGRADADO_POR_DIFICULTAD.normal;
  const pesos = {};
  extrasDisponibles.forEach((r) => {
    pesos[r] = pesoExtra;
  });
  if (hayLetra) {
    pesos.letra = Math.max(0, 100 - extrasDisponibles.length * pesoExtra);
  } else if (extrasDisponibles.length) {
    // Caso límite, no debería darse en una partida normal (si no quedan
    // letras del abecedario es que la palabra ya está resuelta): reparto
    // igual entre lo que quede, por no dejar la ruleta sin pesos.
    const repartido = 100 / extrasDisponibles.length;
    extrasDisponibles.forEach((r) => {
      pesos[r] = repartido;
    });
  }
  return pesos;
}

/** Elige un resultado al azar entre los pesos dados. `azar` es un
 *  número entre 0 (inclusive) y 1 (exclusivo) que SIEMPRE hay que pasar
 *  explícitamente (quien llama decide si usa Math.random() o, en una
 *  prueba, un valor fijo): así esta función sigue siendo pura y se
 *  puede comprobar con exactitud, sin depender de azar real ni de
 *  repetir la prueba muchas veces para que salga bien estadísticamente. */
export function elegirResultadoRuleta(pesos, azar) {
  const entradas = Object.entries(pesos || {}).filter(([, peso]) => peso > 0);
  const total = entradas.reduce((suma, [, peso]) => suma + peso, 0);
  if (!total) return null;
  let umbral = Math.max(0, Math.min(0.999999, azar)) * total;
  for (const [resultado, peso] of entradas) {
    if (umbral < peso) return resultado;
    umbral -= peso;
  }
  return entradas[entradas.length - 1][0];
}

// --- Lógica pura: retícula del pictograma (3x3, una casilla visible al
// principio, "Pista" descubre la siguiente) ---

/** Orden en el que se descubren las 9 casillas de la retícula: primero
 *  la central (la más informativa, recomendación de la especificación),
 *  luego las de los lados y, al final, las esquinas. Los índices son
 *  posiciones 0-8 en una rejilla de 3x3 en orden de fila (0,1,2 arriba;
 *  3,4,5 en medio; 6,7,8 abajo): el 4 es, justo, la casilla central. */
export const ORDEN_REVELADO_RETICULA = [4, 1, 3, 5, 7, 0, 2, 6, 8];

const CASILLAS_INICIALES_POR_DIFICULTAD = { facil: 2, normal: 1, dificil: 1 };

/** Casillas de la retícula visibles desde el principio de cada palabra,
 *  según la dificultad (la especificación recomienda 1, y 2 en fácil
 *  como ayuda extra). */
export function casillasInicialesPictograma(dificultad) {
  const cantidad = CASILLAS_INICIALES_POR_DIFICULTAD[dificultad] ?? CASILLAS_INICIALES_POR_DIFICULTAD.normal;
  return ORDEN_REVELADO_RETICULA.slice(0, cantidad);
}

/** Siguiente casilla a revelar cuando toca "Pista", o null si ya están
 *  las 9 visibles. */
export function siguienteCasillaPictograma(visibles = []) {
  const vistos = new Set(visibles);
  const siguiente = ORDEN_REVELADO_RETICULA.find((indice) => !vistos.has(indice));
  return siguiente === undefined ? null : siguiente;
}

// --- Lógica pura: qué palabras encajan en cada dificultad y cómo se
// elige la siguiente, y qué abecedario (completo o reducido) usar ---

const RANGOS_LONGITUD_PALABRA = {
  facil: [2, 4],
  normal: [4, 6],
  dificil: [6, Infinity]
};

/** ¿La longitud (en letras, sin contar espacios ni signos) de esta
 *  palabra encaja en el rango recomendado para la dificultad dada? */
export function palabraEncajaDificultad(nombre, dificultad) {
  const [minimo, maximo] = RANGOS_LONGITUD_PALABRA[dificultad] || RANGOS_LONGITUD_PALABRA.normal;
  const longitud = letrasDePalabra(nombre).length;
  return longitud >= minimo && longitud <= maximo;
}

/** Del material disponible, qué medios se pueden jugar con la
 *  dificultad elegida. Si ninguno encaja exactamente en el rango (poco
 *  material, o muy variado), es mejor jugar con palabras de al menos 2
 *  letras que bloquear el juego del todo: la falta TOTAL de material ya
 *  la cubre mostrarSinMaterial más abajo. */
export function elegirPalabrasJugables(medios, dificultad) {
  if (!Array.isArray(medios)) return [];
  const encajan = medios.filter((medio) => medio && palabraEncajaDificultad(medio.nombre, dificultad));
  if (encajan.length) return encajan;
  return medios.filter((medio) => medio && letrasDePalabra(medio.nombre).length >= 2);
}

/** Elige la siguiente palabra de la partida: del material que encaja en
 *  la dificultad, evitando repetir las ya usadas mientras quede alguna
 *  sin usar (mismo criterio que el resto de mecánicas, ver
 *  escribeLetra.js/elegirSiguienteMedio). */
export function elegirSiguientePalabra(medios, dificultad, evitarIds = []) {
  const jugables = elegirPalabrasJugables(medios, dificultad);
  if (!jugables.length) return null;
  const evitar = new Set(evitarIds);
  const sinUsar = jugables.filter((medio) => !evitar.has(medio.id));
  const candidatos = sinUsar.length ? sinUsar : jugables;
  return candidatos[Math.floor(Math.random() * candidatos.length)];
}

/** Abecedario español completo: A-Z y Ñ, en orden, tal y como lo lista
 *  la especificación. */
export const ABECEDARIO_COMPLETO = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N',
  'Ñ', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
];

function mezclar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Abecedario seleccionable para esta palabra: completo salvo en
 *  dificultad "facil", donde se reduce a las letras de la propia
 *  palabra más unas pocas "de relleno" (distractoras), igual que el
 *  ejemplo de la especificación para "SOL" (S O L + cuatro más).
 *  Siempre se devuelve en el mismo orden que ABECEDARIO_COMPLETO, para
 *  que el teclado en pantalla salga ordenado. */
export function crearAbecedario(letrasNormalizadasUnicas, dificultad) {
  if (dificultad !== 'facil') return ABECEDARIO_COMPLETO.slice();
  const propias = [...new Set(letrasNormalizadasUnicas)].filter((l) => ABECEDARIO_COMPLETO.includes(l));
  const distractorasPosibles = ABECEDARIO_COMPLETO.filter((l) => !propias.includes(l));
  const distractoras = mezclar(distractorasPosibles).slice(0, DISTRACTORAS_FACIL);
  return ABECEDARIO_COMPLETO.filter((l) => propias.includes(l) || distractoras.includes(l));
}

// --- A partir de aquí: montaje en el DOM (rueda animada, botones,
// temporizadores). No es lógica pura: no tiene pruebas automáticas,
// igual que el resto de mecánicas de este proyecto. ---

const SECTORES_RUEDA = ['letra', 'pista', 'vocal', 'consonante'];
const GRADOS_POR_SECTOR = 360 / SECTORES_RUEDA.length;
const VUELTAS_EXTRA_GIRO = 4;

let estado = null;
// { plataforma, contenedor, raiz, ajustesPista, dificultad, palabraActual,
//   usadosIds, medioActual, letrasOriginales, letrasNormalizadas, usadas,
//   abecedario, casillasVisiblesPictograma, fase, girando,
//   rotacionAcumulada, timeouts }

function inyectarEstilosUnaVez() {
  if (document.getElementById(ESTILOS_ID)) return;
  const link = document.createElement('link');
  link.id = ESTILOS_ID;
  link.rel = 'stylesheet';
  link.href = new URL('ruletaLetras.css', import.meta.url).href;
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
  const id = setTimeout(() => {
    if (!estado) return;
    estado.timeouts = estado.timeouts.filter((t) => t !== id);
    fn();
  }, ms);
  estado.timeouts.push(id);
  return id;
}

function mostrarMensaje(texto) {
  estado.raiz.querySelector('.ruleta-mensaje').textContent = texto || '';
}

function calcularDisponibilidad() {
  const { letrasNormalizadas, usadas, abecedario, casillasVisiblesPictograma } = estado;
  const ocultasUnicas = letrasOcultasUnicas(letrasNormalizadas, usadas);
  return {
    quedanLetrasAbecedario: abecedario.some((letra) => !usadas.includes(letra)),
    quedanCasillasPictograma: casillasVisiblesPictograma.length < TAMANO_RETICULA,
    quedanVocales: ocultasUnicas.some(esVocal),
    quedanConsonantes: ocultasUnicas.some((letra) => !esVocal(letra))
  };
}

// --- Panel de la palabra (una casilla por letra) ---

function pintarPanel() {
  const zona = estado.raiz.querySelector('.ruleta-panel');
  zona.innerHTML = '';
  estado.casillasPanel = estado.letrasOriginales.map((letraOriginal, indice) => {
    const casilla = document.createElement('div');
    casilla.className = 'ruleta-casilla';
    casilla.dataset.indice = String(indice);
    const letraEl = document.createElement('span');
    letraEl.className = 'ruleta-casilla-letra';
    casilla.appendChild(letraEl);
    casilla.setAttribute('aria-label', estado.plataforma.t('ruleta.casilla_oculta'));
    zona.appendChild(casilla);
    return { el: casilla, letraEl, letraOriginal };
  });
}

function revelarLetrasEnPanel(indices, temporal) {
  const { plataforma, ajustesPista } = estado;
  indices.forEach((indice) => {
    const casilla = estado.casillasPanel[indice];
    if (!casilla) return;
    casilla.letraEl.textContent = formatearLetra(casilla.letraOriginal, ajustesPista.mayuscula);
    casilla.el.classList.add(temporal ? 'ruleta-casilla-temporal' : 'ruleta-casilla-revelada');
    casilla.el.setAttribute('aria-label', plataforma.t('ruleta.casilla_revelada', { letra: casilla.letraEl.textContent }));
  });
  if (temporal) {
    programarTimeout(() => {
      indices.forEach((indice) => {
        const casilla = estado.casillasPanel[indice];
        if (!casilla) return;
        casilla.el.classList.remove('ruleta-casilla-temporal');
        casilla.el.classList.add('ruleta-casilla-revelada');
      });
    }, RETRASO_ACIERTO_MS);
  }
}

// --- Pictograma tapado por una retícula de 3x3 ---

function pintarPictograma() {
  const { plataforma, medioActual } = estado;
  const cont = estado.raiz.querySelector('.ruleta-pictograma');
  cont.innerHTML = '';

  const img = document.createElement('img');
  img.className = 'ruleta-pictograma-img';
  img.src = plataforma.getDisplayUrl(medioActual);
  img.alt = medioActual.nombre;
  cont.appendChild(img);

  const reticula = document.createElement('div');
  reticula.className = 'ruleta-reticula';
  estado.celdasReticula = [];
  for (let indice = 0; indice < TAMANO_RETICULA; indice++) {
    const celda = document.createElement('div');
    celda.className = 'ruleta-celda';
    if (estado.casillasVisiblesPictograma.includes(indice)) celda.classList.add('ruleta-celda-revelada');
    reticula.appendChild(celda);
    estado.celdasReticula.push(celda);
  }
  cont.appendChild(reticula);
}

function revelarCasillaPictograma(indice) {
  if (indice === null || estado.casillasVisiblesPictograma.includes(indice)) return;
  estado.casillasVisiblesPictograma.push(indice);
  const celda = estado.celdasReticula[indice];
  if (celda) celda.classList.add('ruleta-celda-revelada');
}

function revelarPictogramaCompleto() {
  for (let indice = 0; indice < TAMANO_RETICULA; indice++) revelarCasillaPictograma(indice);
}

// --- Abecedario seleccionable ---

function pintarAbecedario() {
  const { plataforma, ajustesPista } = estado;
  const zona = estado.raiz.querySelector('.ruleta-abecedario');
  zona.innerHTML = '';
  estado.botonesAbecedario = {};
  estado.abecedario.forEach((letra) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'ruleta-tecla';
    boton.textContent = formatearLetra(letra, ajustesPista.mayuscula);
    boton.disabled = true;
    if (estado.usadas.includes(letra)) boton.classList.add('ruleta-tecla-usada');
    boton.addEventListener('click', () => manejarLetraElegida(letra, boton));
    zona.appendChild(boton);
    estado.botonesAbecedario[letra] = boton;
  });
  actualizarBloqueoAbecedario();
}

function actualizarBloqueoAbecedario() {
  const zona = estado.raiz.querySelector('.ruleta-abecedario');
  const activo = estado.fase === 'elige-letra';
  zona.classList.toggle('ruleta-abecedario-bloqueado', !activo);
  estado.raiz.querySelector('.ruleta-abecedario-ayuda').hidden = activo;
  Object.entries(estado.botonesAbecedario).forEach(([letra, boton]) => {
    boton.disabled = !activo || estado.usadas.includes(letra);
  });
}

function manejarLetraElegida(letraNormalizada, boton) {
  if (!estado || estado.fase !== 'elige-letra' || boton.disabled) return;
  boton.disabled = true;
  boton.classList.add('ruleta-tecla-usada');
  estado.usadas.push(letraNormalizada);

  const indices = indicesDeLetraEnPalabra(estado.letrasNormalizadas, letraNormalizada);
  if (indices.length) {
    estado.plataforma.sounds.acierto();
    mostrarMensaje('');
    revelarLetrasEnPanel(indices, true);
  } else {
    estado.plataforma.sounds.fallo();
    mostrarMensaje(estado.plataforma.t('ruleta.letra_no_esta', { letra: formatearLetra(letraNormalizada, estado.ajustesPista.mayuscula) }));
  }

  estado.fase = 'esperando-giro';
  actualizarBloqueoAbecedario();
  programarTimeout(continuarTrasTurno, indices.length ? RETRASO_ACIERTO_MS : DURACION_FALLO_MS);
}

// --- La ruleta: cálculo del resultado y animación de giro ---

function anguloCentroSector(resultado) {
  const indice = SECTORES_RUEDA.indexOf(resultado);
  return indice * GRADOS_POR_SECTOR + GRADOS_POR_SECTOR / 2;
}

function calcularRotacionSiguiente(actual, resultado) {
  const centro = anguloCentroSector(resultado);
  const objetivoMod = ((360 - centro) % 360 + 360) % 360;
  const vueltasYaDadas = Math.floor(actual / 360);
  let siguiente = (vueltasYaDadas + VUELTAS_EXTRA_GIRO) * 360 + objetivoMod;
  while (siguiente <= actual) siguiente += 360;
  return siguiente;
}

function animarRuedaHasta(resultado, alTerminar) {
  const rueda = estado.raiz.querySelector('.ruleta-rueda');
  estado.rotacionAcumulada = calcularRotacionSiguiente(estado.rotacionAcumulada, resultado);
  rueda.style.transform = `rotate(${estado.rotacionAcumulada}deg)`;
  programarTimeout(alTerminar, RETRASO_GIRO_MS);
}

function actualizarBotonGirar() {
  const boton = estado.raiz.querySelector('.ruleta-girar');
  boton.disabled = estado.girando || estado.fase === 'elige-letra';
  boton.textContent = estado.girando
    ? estado.plataforma.t('ruleta.girando')
    : `🎡 ${estado.plataforma.t('ruleta.girar')}`;
}

function girar() {
  if (!estado || estado.girando || estado.fase === 'elige-letra') return;
  const disponibles = resultadosDisponibles(calcularDisponibilidad());
  if (!disponibles.length) return; // no debería pasar: significaría que la palabra ya está completa
  const pesos = pesosResultados(disponibles, estado.dificultad);
  const resultado = elegirResultadoRuleta(pesos, Math.random());

  estado.girando = true;
  actualizarBotonGirar();
  estado.plataforma.sounds.click();
  mostrarMensaje(estado.plataforma.t(`ruleta.resultado_${resultado}`));
  animarRuedaHasta(resultado, () => resolverResultado(resultado));
}

function resolverResultado(resultado) {
  estado.girando = false;
  if (resultado === 'letra') {
    estado.fase = 'elige-letra';
    actualizarBloqueoAbecedario();
    actualizarBotonGirar();
    return;
  }
  if (resultado === 'pista') {
    revelarCasillaPictograma(siguienteCasillaPictograma(estado.casillasVisiblesPictograma));
    programarTimeout(continuarTrasTurno, RETRASO_ACIERTO_MS);
    return;
  }
  // 'vocal' o 'consonante': el sistema elige y regala la mejor letra
  // disponible de ese tipo (ver elegirLetraRegalada).
  const ocultas = letrasOcultasUnicas(estado.letrasNormalizadas, estado.usadas);
  const candidatas = ocultas.filter((letra) => (resultado === 'vocal' ? esVocal(letra) : !esVocal(letra)));
  const letraRegalada = elegirLetraRegalada(candidatas, estado.letrasNormalizadas);
  if (letraRegalada) {
    estado.usadas.push(letraRegalada);
    const boton = estado.botonesAbecedario[letraRegalada];
    if (boton) boton.classList.add('ruleta-tecla-usada');
    estado.plataforma.sounds.acierto();
    revelarLetrasEnPanel(indicesDeLetraEnPalabra(estado.letrasNormalizadas, letraRegalada), true);
  }
  programarTimeout(continuarTrasTurno, RETRASO_ACIERTO_MS);
}

function continuarTrasTurno() {
  if (!estado) return;
  estado.fase = 'esperando-giro';
  actualizarBloqueoAbecedario();
  if (palabraCompleta(estado.letrasNormalizadas, estado.usadas)) {
    resolverPalabraCompleta();
  } else {
    actualizarBotonGirar();
  }
}

function resolverPalabraCompleta() {
  const { plataforma, medioActual } = estado;
  estado.fase = 'palabra-completa';
  actualizarBotonGirar();
  revelarPictogramaCompleto();
  plataforma.sounds.recompensa();
  plataforma.tts.speak(medioActual.nombre);
  mostrarMensaje(plataforma.t('ruleta.mensaje_final'));

  programarTimeout(() => {
    if (estado.palabraActual >= PALABRAS_TOTAL) {
      plataforma.mostrarRecompensa({ onContinuar: iniciarPartida });
    } else {
      siguientePalabra();
    }
  }, RETRASO_FINAL_MS);
}

// --- Flujo de palabra / partida ---

function pintarPalabra() {
  const { raiz, plataforma } = estado;
  raiz.querySelector('.ruleta-palabra-contador').textContent = plataforma.t('ruleta.palabra', {
    n: estado.palabraActual,
    total: PALABRAS_TOTAL
  });
  mostrarMensaje('');
  pintarPictograma();
  pintarPanel();
  pintarAbecedario();
  actualizarBotonGirar();
}

function siguientePalabra() {
  if (!estado) return;
  estado.palabraActual += 1;
  const medio = elegirSiguientePalabra(estado.plataforma.medios, estado.dificultad, estado.usadosIds);
  if (!medio) {
    mostrarSinMaterial(estado.raiz.querySelector('.ruleta-zona'), estado.plataforma);
    return;
  }
  estado.usadosIds.push(medio.id);
  estado.medioActual = medio;
  estado.letrasOriginales = letrasDePalabra(medio.nombre);
  estado.letrasNormalizadas = letrasNormalizadasDePalabra(medio.nombre);
  estado.usadas = [];
  estado.abecedario = crearAbecedario(estado.letrasNormalizadas, estado.dificultad);
  estado.casillasVisiblesPictograma = casillasInicialesPictograma(estado.dificultad);
  estado.fase = 'esperando-giro';
  estado.girando = false;
  pintarPalabra();
}

function iniciarPartida() {
  if (!estado) return;
  estado.palabraActual = 0;
  estado.usadosIds = [];
  estado.rotacionAcumulada = 0;
  siguientePalabra();
}

function crearRuedaDom() {
  const cont = document.createElement('div');
  cont.className = 'ruleta-rueda-cont';

  const puntero = document.createElement('div');
  puntero.className = 'ruleta-puntero';
  puntero.setAttribute('aria-hidden', 'true');
  puntero.textContent = '▼';

  const rueda = document.createElement('div');
  rueda.className = 'ruleta-rueda';
  rueda.setAttribute('aria-hidden', 'true');

  const ICONOS_SECTOR = { letra: '🔤', pista: '🧩', vocal: '🔓', consonante: '🔑' };
  SECTORES_RUEDA.forEach((sector, indice) => {
    const etiqueta = document.createElement('span');
    etiqueta.className = `ruleta-rueda-etiqueta ruleta-rueda-etiqueta-${indice}`;
    etiqueta.textContent = ICONOS_SECTOR[sector] || '';
    rueda.appendChild(etiqueta);
  });

  cont.append(rueda, puntero);
  return cont;
}

function montar(contenedor, plataforma) {
  inyectarEstilosUnaVez();
  contenedor.innerHTML = '';

  const raiz = document.createElement('div');
  raiz.className = 'ruleta-app';

  const cabecera = document.createElement('header');
  cabecera.className = 'ruleta-cabecera';
  const titulo = document.createElement('h1');
  titulo.textContent = `${plataforma.icono || ''} ${plataforma.nombre}`.trim();
  const instrucciones = document.createElement('p');
  instrucciones.textContent = plataforma.t('ruleta.instrucciones');
  cabecera.append(titulo, instrucciones);

  const marcador = document.createElement('div');
  marcador.className = 'ruleta-marcador';
  const contadorEl = document.createElement('span');
  contadorEl.className = 'ruleta-palabra-contador';
  marcador.appendChild(contadorEl);

  const zona = document.createElement('div');
  zona.className = 'ruleta-zona';

  const pictograma = document.createElement('div');
  pictograma.className = 'ruleta-pictograma';

  const centro = document.createElement('div');
  centro.className = 'ruleta-centro';

  const panel = document.createElement('div');
  panel.className = 'ruleta-panel';

  const ruedaZona = document.createElement('div');
  ruedaZona.className = 'ruleta-rueda-zona';
  ruedaZona.appendChild(crearRuedaDom());
  const botonGirar = document.createElement('button');
  botonGirar.type = 'button';
  botonGirar.className = 'ruleta-girar';
  botonGirar.addEventListener('click', girar);
  ruedaZona.appendChild(botonGirar);

  const mensaje = document.createElement('p');
  mensaje.className = 'ruleta-mensaje';
  mensaje.setAttribute('aria-live', 'polite');

  const ayudaAbecedario = document.createElement('p');
  ayudaAbecedario.className = 'ruleta-abecedario-ayuda ayuda';
  ayudaAbecedario.textContent = plataforma.t('ruleta.abecedario_bloqueado');

  const abecedario = document.createElement('div');
  abecedario.className = 'ruleta-abecedario';

  centro.append(panel, ruedaZona, mensaje, ayudaAbecedario, abecedario);
  zona.append(pictograma, centro);
  raiz.append(cabecera, marcador, zona);
  contenedor.appendChild(raiz);

  estado = {
    contenedor,
    plataforma,
    raiz,
    ajustesPista: plataforma.ajustesPista || { mayuscula: true, dificultadRuleta: 'facil' },
    dificultad: (plataforma.ajustesPista && plataforma.ajustesPista.dificultadRuleta) || 'facil',
    palabraActual: 0,
    usadosIds: [],
    medioActual: null,
    letrasOriginales: [],
    letrasNormalizadas: [],
    usadas: [],
    abecedario: [],
    botonesAbecedario: {},
    casillasPanel: [],
    casillasVisiblesPictograma: [],
    celdasReticula: [],
    fase: 'esperando-giro',
    girando: false,
    rotacionAcumulada: 0,
    timeouts: []
  };

  if (!plataforma.medios || plataforma.medios.length < MIN_MATERIAL) {
    mostrarSinMaterial(zona, plataforma);
    return;
  }

  iniciarPartida();
}

function desmontar() {
  if (!estado) return;
  estado.timeouts.forEach((id) => clearTimeout(id));
  estado = null;
}

export default {
  id: 'ruleta-letras',
  nombre: 'Ruleta de letras',
  icono: '🎡',
  estante: 'ESCRITURA',
  montar,
  desmontar
};
