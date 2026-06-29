// Pictosfera — mecánica reutilizable: "escribe la letra" (escritura
// guiada letra a letra).
//
// El pictograma aparece arriba con su nombre debajo como pista
// (mismos ajustes del PORTAL que el resto de mecánicas: mostrar/ocultar
// pista, mayúsculas/minúsculas, solo texto, pulsador TTS — ver
// core/js/ajustesJuego.js). En la parte inferior aparece una casilla
// por cada letra de la palabra. El niño escribe cada letra dentro de su
// casilla con el dedo o un stylus; dentro de cada casilla puede verse,
// como pista, la letra en trazo punteado (ajuste "letraPunteada").
//
// Solo se puede escribir en la casilla ACTUAL: las siguientes están
// bloqueadas hasta que la letra de la casilla actual se complete bien.
// Si el trazo no es correcto, sonido de fallo y se borra la casilla
// para volver a intentarlo; si es correcto, sonido de acierto y se
// desbloquea la siguiente.
//
// La evaluación de una letra NO ocurre al levantar el dedo/stylus de la
// casilla: empieza un cronómetro de 2 segundos. Si el niño vuelve a
// tocar esa misma casilla antes de que pasen, se entiende que sigue
// trazando la letra (es habitual levantar el dedo varias veces al
// trazar, p.ej. al cruzar una "t" o una "f") y el cronómetro se
// reinicia. Solo si pasan 2 segundos completos sin volver a tocarla se
// evalúa el trazo.
//
// Es "código de confianza del autor": JavaScript nativo, módulo ES, sin
// framework ni librerías de reconocimiento de escritura. La evaluación
// del trazo no usa inteligencia artificial: rasteriza tanto la letra de
// referencia como lo que ha dibujado el niño sobre una rejilla lógica
// pequeña (independiente del tamaño en pantalla) y compara cuánta de la
// letra se ha cubierto y cuánto se ha dibujado fuera de ella. Esa
// comparación (evaluarTrazo y sus piezas) es lógica pura, sin DOM, así
// que se puede probar con node --test igual que el resto de mecánicas;
// solo la parte que de verdad pinta en un <canvas> y escucha eventos de
// puntero queda fuera de las pruebas automáticas (como en el resto del
// proyecto: lo que toca el DOM se prueba a mano en el navegador).
//
// No importa nada del núcleo directamente: todo lo que necesita
// (idioma, voz, sonidos, recompensa, material, ajustes de pista) le
// llega a través del objeto `plataforma` que recibe en montar().

const ESTILOS_ID = 'escribe-letra-estilos';
const MIN_MATERIAL = 3;
const NIVELES_TOTAL = 10;
const RETRASO_EVALUACION_MS = 2000; // 2 segundos completos sin tocar la casilla, como pide la especificación
const RETRASO_ACIERTO_MS = 700;
const RETRASO_FINAL_MS = 500;

const TAMANO_CASILLA = 84; // píxeles del <canvas> de cada casilla (cuadrado)
const GRID = 18; // resolución lógica de las máscaras de comparación (no del canvas)

const MARCAS_DIACRITICAS = /[̀-ͯ]/g;
const ES_LETRA = /\p{L}/u;

// --- Lógica pura: qué letras hay que trazar y en qué forma exacta ---

/** Letras (en orden, con repetidos) de una palabra: se ignoran espacios,
 *  signos y cifras porque no se puede "trazar" nada de eso en una
 *  casilla. Lógica pura, sin DOM. */
export function letrasDePalabra(nombre) {
  if (!nombre) return [];
  return Array.from(nombre).filter((ch) => ch !== ' ' && ES_LETRA.test(ch));
}

/** Forma exacta que debe trazarse para una letra concreta de la
 *  palabra, según los ajustes de pista vigentes: si las tildes
 *  automáticas están activadas (por defecto), se traza y evalúa la
 *  letra sin su acento (el niño no necesita acertar la tilde); si están
 *  desactivadas, hay que trazar la letra con su acento. El caso
 *  (mayúscula/minúscula) sigue el mismo ajuste de pista que usan
 *  "Teclea la palabra" y "Arrastra la palabra". La Ñ nunca se toca: es
 *  una letra propia, no una variante con diacrítico (mismo cuidado que
 *  en tecleaPalabra.js). */
export function letraEsperada(caracter, ajustesPista = {}) {
  let letra = caracter;
  if (ajustesPista.tildesAutomaticas !== false && letra !== 'ñ' && letra !== 'Ñ') {
    letra = letra.normalize('NFD').replace(MARCAS_DIACRITICAS, '');
  }
  return ajustesPista.mayuscula === false ? letra.toLocaleLowerCase('es') : letra.toLocaleUpperCase('es');
}

/** Secuencia completa de letras a trazar para una palabra: una por
 *  casilla, en orden. Lógica pura. */
export function casillasObjetivo(nombre, ajustesPista = {}) {
  return letrasDePalabra(nombre).map((letra) => letraEsperada(letra, ajustesPista));
}

// --- Lógica pura: comparación de máscaras (rejillas de 0/1) ---

/** Ensancha una máscara: cada píxel a 1 "contagia" a 1 a sus vecinos
 *  dentro del radio dado (distancia de Chebyshov, simple y barata).
 *  Con radio 0 devuelve una copia igual. Lógica pura: opera sobre
 *  arrays planos, no sobre un canvas real. */
export function dilatarMascara(mascara, ancho, alto, radio) {
  if (!radio) return mascara.slice();
  const resultado = new Array(ancho * alto).fill(0);
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      if (!mascara[y * ancho + x]) continue;
      for (let dy = -radio; dy <= radio; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= alto) continue;
        for (let dx = -radio; dx <= radio; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= ancho) continue;
          resultado[ny * ancho + nx] = 1;
        }
      }
    }
  }
  return resultado;
}

/** Cuántos píxeles a 1 tiene una máscara. */
export function contarPixeles(mascara) {
  return mascara.reduce((total, valor) => total + (valor ? 1 : 0), 0);
}

/** De los píxeles a 1 en `mascaraA`, qué proporción también está a 1 en
 *  `mascaraB` (0 si `mascaraA` no tiene ningún píxel). Lógica pura,
 *  reutilizada tanto para "cobertura" (¿se ha trazado la letra?) como
 *  para el complementario de "desvío" (¿se ha trazado fuera de ella?). */
export function proporcionDentro(mascaraA, mascaraB) {
  let totalA = 0;
  let dentro = 0;
  for (let i = 0; i < mascaraA.length; i++) {
    if (!mascaraA[i]) continue;
    totalA++;
    if (mascaraB[i]) dentro++;
  }
  return totalA ? dentro / totalA : 0;
}

/** Divide una rejilla ancho×alto en una cuadrícula de `divisiones` x
 *  `divisiones` zonas (a trozos lo más iguales posible) y devuelve,
 *  para cada zona, la lista de índices de celda que le pertenecen.
 *  Lógica pura: solo aritmética sobre índices, ningún canvas. */
export function indicesPorZona(ancho, alto, divisiones) {
  const zonas = Array.from({ length: divisiones * divisiones }, () => []);
  for (let y = 0; y < alto; y++) {
    const zy = Math.min(divisiones - 1, Math.floor((y / alto) * divisiones));
    for (let x = 0; x < ancho; x++) {
      const zx = Math.min(divisiones - 1, Math.floor((x / ancho) * divisiones));
      zonas[zy * divisiones + zx].push(y * ancho + x);
    }
  }
  return zonas;
}

/**
 * Comprueba que el trazo pasa por TODAS las zonas donde la letra de
 * referencia tiene tinta "de sobra" (al menos `minPixelesZona`
 * píxeles): no basta con que el trazo tenga, en total, la cantidad y
 * la forma agregada adecuadas (eso ya lo miran cobertura/desvío); aquí
 * se exige que el trazo haya pasado por CADA región estructural de la
 * letra. Esto es justo lo que cobertura/desvío no detectan: un trazo
 * concentrado en una sola zona puede, dilatado, solapar una fracción
 * grande de una letra de referencia también dilatada (sobre todo en
 * "facil", con radio de dilatación generoso) sin haber pasado nunca
 * por el resto de la letra — por ejemplo, un único brazo de una "V" o
 * una sola pata de una "M". Lógica pura: opera sobre máscaras y listas
 * de índices, nada de DOM. */
export function cubreTodasLasZonas(mascaraReferencia, mascaraTrazo, zonas, minPixelesZona) {
  return zonas.every((indices) => {
    const tintaReferencia = indices.reduce((total, i) => total + (mascaraReferencia[i] ? 1 : 0), 0);
    if (tintaReferencia < minPixelesZona) return true; // zona casi sin letra: no exige nada
    return indices.some((i) => mascaraTrazo[i]);
  });
}

/** Configuración de tolerancia para cada nivel ("facil" por defecto,
 *  pensado para un niño que está aprendiendo y no traza perfecto):
 *   - radio: cuánto se "perdona" la posición exacta del trazo, al
 *     ensanchar tanto la letra de referencia como el trazo antes de
 *     compararlos.
 *   - minCobertura: qué proporción de la letra hay que haber trazado
 *     como mínimo para darla por buena.
 *   - maxDesvio: qué proporción del trazo puede quedar fuera de la
 *     letra (ensanchada) como máximo.
 *   - minPixelesTrazo: por debajo de esto se considera que casi no se
 *     ha dibujado nada (p.ej. un toque accidental), y no se da por
 *     válido aunque "coincida" por pura casualidad.
 *   - minRatioTrazo: cuánta "tinta" hay que haber puesto como mínimo,
 *     en proporción a la tinta de la propia letra de referencia. Sin
 *     este mínimo, un trazo corto y simple (p.ej. una sola raya recta)
 *     puede coincidir por pura casualidad con UNA parte de una letra
 *     con varios trazos (como "A" o "V") y darse por válido sin haber
 *     dibujado el resto de la letra; este ratio obliga a que la
 *     cantidad de trazo dibujado sea acorde a la complejidad real de
 *     la letra antes de mirar siquiera la cobertura o el desvío.
 *   - divisionesZona/minPixelesZona: control de trazo por ZONAS,
 *     adicional e independiente de cobertura/desvío (ver
 *     cubreTodasLasZonas). cobertura/desvío solo miran el AGREGADO de
 *     la letra, así que un trazo concentrado en una sola parte puede
 *     "colar" si esa parte es grande y el radio de dilatación generoso
 *     (el caso real reportado: trazos que apenas se parecen a la letra
 *     pero pasan). divisionesZona parte la rejilla en esa cantidad de
 *     filas/columnas; minPixelesZona es cuánta tinta de referencia hace
 *     falta en una zona para que esa zona pase a ser obligatoria. A
 *     más nivel, más zonas (divisionesZona) y menos tinta exigida para
 *     activarlas (minPixelesZona), o sea: más exigente. */
export const NIVELES_TRAZO = {
  facil: {
    radio: 3,
    minCobertura: 0.3,
    maxDesvio: 0.6,
    minPixelesTrazo: 3,
    minRatioTrazo: 0.75,
    divisionesZona: 2,
    minPixelesZona: 4
  },
  normal: {
    radio: 2,
    minCobertura: 0.5,
    maxDesvio: 0.4,
    minPixelesTrazo: 5,
    minRatioTrazo: 0.9,
    divisionesZona: 3,
    minPixelesZona: 3
  },
  dificil: {
    radio: 1,
    minCobertura: 0.7,
    maxDesvio: 0.25,
    minPixelesTrazo: 6,
    minRatioTrazo: 1,
    divisionesZona: 4,
    minPixelesZona: 2
  }
};

/** Configuración de tolerancia para un nivel dado; si no se reconoce,
 *  cae al más permisivo ("facil"), igual que el resto de ajustes con
 *  valores cerrados de este proyecto. */
export function configTolerancia(nivel) {
  return NIVELES_TRAZO[nivel] || NIVELES_TRAZO.facil;
}

/**
 * Decide si un trazo (su máscara) es una letra válida, comparándolo con
 * la máscara de referencia de esa letra. Lógica pura: no toca el DOM,
 * solo arrays de 0/1 y números, así que se puede probar igual que
 * cualquier otra función de este proyecto.
 */
export function evaluarTrazo({ mascaraReferencia, mascaraTrazo, ancho, alto }, nivel = 'facil') {
  const cfg = configTolerancia(nivel);
  const totalTrazo = contarPixeles(mascaraTrazo);
  if (totalTrazo < cfg.minPixelesTrazo) {
    return { correcto: false, cobertura: 0, desvio: 1 };
  }
  // Antes de comparar formas: ¿hay suficiente tinta dibujada para la
  // complejidad de esta letra? Si no, ni se calcula cobertura/desvío:
  // una raya corta no puede "valer" para una letra con varios trazos.
  const totalReferencia = contarPixeles(mascaraReferencia);
  if (totalReferencia > 0 && totalTrazo < totalReferencia * cfg.minRatioTrazo) {
    return { correcto: false, cobertura: 0, desvio: 1 };
  }
  const trazoDilatado = dilatarMascara(mascaraTrazo, ancho, alto, cfg.radio);
  const referenciaDilatada = dilatarMascara(mascaraReferencia, ancho, alto, cfg.radio);

  const cobertura = proporcionDentro(mascaraReferencia, trazoDilatado);
  const desvio = 1 - proporcionDentro(mascaraTrazo, referenciaDilatada);

  // Control adicional por zonas (ver cubreTodasLasZonas más arriba): no
  // basta con que el agregado de cobertura/desvío salga bien, el trazo
  // (con el mismo radio de tolerancia que el resto del nivel) tiene que
  // haber pasado por CADA región de la letra que tenga tinta de sobra.
  // Esto es justo lo que detecta un trazo que "se parece poco" a la
  // letra real aunque coincida en cantidad y posición aproximada.
  const zonas = indicesPorZona(ancho, alto, cfg.divisionesZona);
  const zonasCubiertas = cubreTodasLasZonas(mascaraReferencia, trazoDilatado, zonas, cfg.minPixelesZona);

  return {
    correcto: cobertura >= cfg.minCobertura && desvio <= cfg.maxDesvio && zonasCubiertas,
    cobertura,
    desvio,
    zonasCubiertas
  };
}

// --- Lógica pura compartida con el resto de mecánicas (duplicada a
// propósito, igual que en tecleaPalabra.js/arrastraPalabra.js: cada
// mecánica es independiente y no importa código de otra) ---

/** Aplica el ajuste de mayúsculas/minúsculas de visualización a un
 *  texto (la pista de palabra, no las casillas). */
export function formatearTexto(texto, mayuscula = true) {
  if (!texto) return '';
  return mayuscula ? texto.toLocaleUpperCase('es') : texto.toLocaleLowerCase('es');
}

/** Elige el siguiente pictograma, evitando repetir los ya usados en
 *  esta partida si todavía queda alguno sin usar. */
export function elegirSiguienteMedio(medios, { evitarIds = [] } = {}) {
  if (!Array.isArray(medios) || !medios.length) return null;
  const evitar = new Set(evitarIds);
  const sinUsar = medios.filter((m) => m && !evitar.has(m.id));
  const candidatos = sinUsar.length ? sinUsar : medios.filter(Boolean);
  if (!candidatos.length) return null;
  return candidatos[Math.floor(Math.random() * candidatos.length)];
}

/** Validación de seguridad del ajuste "pulsador TTS": mientras esté
 *  activo, no se puede escribir en ninguna casilla hasta haber pulsado
 *  el botón y escuchado la palabra una vez por nivel. */
export function puedeResponder(ajustesPista, escuchado) {
  return !ajustesPista.pulsadorTts || Boolean(escuchado);
}

// --- A partir de aquí: montaje en el DOM (canvas, eventos de puntero,
// temporizadores). No es lógica pura: no tiene pruebas automáticas,
// igual que el resto de mecánicas de este proyecto. ---

let estado = null;
// { plataforma, contenedor, raiz, nivelActual, usados, medioActual,
//   letras, indiceActual, escuchado, ajustesPista, casillas, timeoutId }

function inyectarEstilosUnaVez() {
  if (document.getElementById(ESTILOS_ID)) return;
  const link = document.createElement('link');
  link.id = ESTILOS_ID;
  link.rel = 'stylesheet';
  link.href = new URL('escribeLetra.css', import.meta.url).href;
  document.head.appendChild(link);
}

function mostrarSinMaterial(zona, plataforma) {
  zona.innerHTML = '';
  const vacio = document.createElement('p');
  vacio.className = 'vacio';
  vacio.textContent = plataforma.t('juegos.sin_material');
  zona.appendChild(vacio);
}

function colorToken(nombre) {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim() || '#333';
  } catch {
    return '#333';
  }
}

/** Rasteriza una letra a una rejilla GRID×GRID de 0/1: dibuja la letra
 *  en un <canvas> oculto del tamaño de la casilla y muestrea su canal
 *  alfa en el centro de cada celda de la rejilla. Esta es la "forma
 *  real" contra la que se evalúa el trazo, exista o no la pista
 *  punteada en pantalla. */
function crearMascaraReferencia(letra) {
  const lienzo = document.createElement('canvas');
  lienzo.width = TAMANO_CASILLA;
  lienzo.height = TAMANO_CASILLA;
  const ctx = lienzo.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.font = `bold ${Math.round(TAMANO_CASILLA * 0.72)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letra, TAMANO_CASILLA / 2, TAMANO_CASILLA / 2 + TAMANO_CASILLA * 0.04);

  const datos = ctx.getImageData(0, 0, TAMANO_CASILLA, TAMANO_CASILLA).data;
  const mascara = new Array(GRID * GRID).fill(0);
  const paso = TAMANO_CASILLA / GRID;
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const px = Math.min(TAMANO_CASILLA - 1, Math.floor((gx + 0.5) * paso));
      const py = Math.min(TAMANO_CASILLA - 1, Math.floor((gy + 0.5) * paso));
      const alpha = datos[(py * TAMANO_CASILLA + px) * 4 + 3];
      mascara[gy * GRID + gx] = alpha > 100 ? 1 : 0;
    }
  }
  return mascara;
}

/** Dibuja la pista visual de la letra punteada en el canvas visible de
 *  la casilla (trazo discontinuo, no relleno): solo apariencia, no
 *  afecta a la evaluación. */
function dibujarPistaPunteada(casilla) {
  const { ctx } = casilla;
  ctx.save();
  ctx.strokeStyle = colorToken('--color-border');
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 5]);
  ctx.font = `bold ${Math.round(TAMANO_CASILLA * 0.72)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText(casilla.letra, TAMANO_CASILLA / 2, TAMANO_CASILLA / 2 + TAMANO_CASILLA * 0.04);
  ctx.restore();
}

function limpiarCasilla(casilla) {
  casilla.ctx.clearRect(0, 0, TAMANO_CASILLA, TAMANO_CASILLA);
  casilla.mascaraTrazo = new Array(GRID * GRID).fill(0);
  if (estado.ajustesPista.letraPunteada) dibujarPistaPunteada(casilla);
}

function puntoDesdeEvento(casilla, ev) {
  const rect = casilla.canvas.getBoundingClientRect();
  const escalaX = rect.width ? casilla.canvas.width / rect.width : 1;
  const escalaY = rect.height ? casilla.canvas.height / rect.height : 1;
  const x = (ev.clientX - rect.left) * escalaX;
  const y = (ev.clientY - rect.top) * escalaY;
  return {
    x: Math.min(TAMANO_CASILLA - 1, Math.max(0, x)),
    y: Math.min(TAMANO_CASILLA - 1, Math.max(0, y))
  };
}

function marcarPuntoEnMascara(casilla, x, y) {
  const gx = Math.min(GRID - 1, Math.max(0, Math.floor((x / TAMANO_CASILLA) * GRID)));
  const gy = Math.min(GRID - 1, Math.max(0, Math.floor((y / TAMANO_CASILLA) * GRID)));
  for (let dy = -1; dy <= 1; dy++) {
    const ny = gy + dy;
    if (ny < 0 || ny >= GRID) continue;
    for (let dx = -1; dx <= 1; dx++) {
      const nx = gx + dx;
      if (nx < 0 || nx >= GRID) continue;
      casilla.mascaraTrazo[ny * GRID + nx] = 1;
    }
  }
}

function marcarSegmentoEnMascara(casilla, p0, p1) {
  const distancia = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  const pasos = Math.max(1, Math.ceil(distancia / (TAMANO_CASILLA / GRID / 2)));
  for (let i = 0; i <= pasos; i++) {
    const x = p0.x + (p1.x - p0.x) * (i / pasos);
    const y = p0.y + (p1.y - p0.y) * (i / pasos);
    marcarPuntoEnMascara(casilla, x, y);
  }
}

function dibujarSegmentoVisual(casilla, p0, p1) {
  const { ctx } = casilla;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = colorToken('--color-primary-dark');
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.stroke();
}

function dibujarPuntoVisual(casilla, p) {
  const { ctx } = casilla;
  ctx.fillStyle = colorToken('--color-primary-dark');
  ctx.beginPath();
  ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
  ctx.fill();
}

function pintarEstadoCasilla(casilla) {
  const { plataforma } = estado;
  const { envoltorio, canvas } = casilla;
  envoltorio.classList.remove('escribe-casilla-activa', 'escribe-casilla-correcta', 'escribe-casilla-bloqueada');
  if (casilla.estadoCasilla === 'activa') {
    envoltorio.classList.add('escribe-casilla-activa');
    canvas.setAttribute('aria-label', plataforma.t('escribe.casilla_actual', { letra: casilla.letra }));
  } else if (casilla.estadoCasilla === 'correcta') {
    envoltorio.classList.add('escribe-casilla-correcta');
    canvas.setAttribute('aria-label', plataforma.t('escribe.casilla_correcta', { letra: casilla.letra }));
  } else {
    envoltorio.classList.add('escribe-casilla-bloqueada');
    canvas.setAttribute('aria-label', plataforma.t('escribe.casilla_bloqueada'));
  }
}

function actualizarEstadosCasillas() {
  estado.casillas.forEach((casilla, indice) => {
    if (indice < estado.indiceActual) casilla.estadoCasilla = 'correcta';
    else if (indice === estado.indiceActual) casilla.estadoCasilla = 'activa';
    else casilla.estadoCasilla = 'pendiente';
    pintarEstadoCasilla(casilla);
  });
}

function evaluarCasillaActual(casilla) {
  if (!estado) return;
  casilla.timeoutEvaluacion = null;
  const resultado = evaluarTrazo(
    { mascaraReferencia: casilla.mascaraReferencia, mascaraTrazo: casilla.mascaraTrazo, ancho: GRID, alto: GRID },
    estado.ajustesPista.toleranciaTrazo
  );
  if (resultado.correcto) {
    resolverLetraCorrecta(casilla);
  } else {
    resolverLetraIncorrecta(casilla);
  }
}

function resolverLetraCorrecta(casilla) {
  estado.plataforma.sounds.acierto();
  estado.indiceActual += 1;
  actualizarEstadosCasillas();
  if (estado.indiceActual >= estado.letras.length) {
    resolverPalabraCompleta();
  }
}

function resolverLetraIncorrecta(casilla) {
  estado.plataforma.sounds.fallo();
  casilla.envoltorio.classList.add('escribe-casilla-fallo');
  limpiarCasilla(casilla);
  setTimeout(() => {
    if (casilla && casilla.envoltorio) casilla.envoltorio.classList.remove('escribe-casilla-fallo');
  }, 400);
}

function resolverPalabraCompleta() {
  estado.plataforma.tts.speak(estado.medioActual.nombre);
  if (estado.nivelActual >= NIVELES_TOTAL) {
    estado.timeoutId = setTimeout(() => {
      if (!estado) return;
      estado.plataforma.mostrarRecompensa({ onContinuar: iniciarPartida });
    }, RETRASO_FINAL_MS);
  } else {
    estado.timeoutId = setTimeout(() => {
      if (!estado) return;
      siguienteNivel();
    }, RETRASO_ACIERTO_MS);
  }
}

function registrarEventosCasilla(casilla) {
  const { canvas } = casilla;

  canvas.addEventListener('pointerdown', (ev) => {
    if (!estado || casilla.estadoCasilla !== 'activa') return;
    if (!puedeResponder(estado.ajustesPista, estado.escuchado)) return;
    ev.preventDefault();
    try {
      canvas.setPointerCapture(ev.pointerId);
    } catch {
      /* algunos entornos (p.ej. pruebas) no implementan captura de puntero */
    }
    // Si había un cronómetro de evaluación pendiente de un levantamiento
    // anterior, se cancela: volver a tocar la MISMA casilla significa
    // que el niño sigue trazando la letra (ver cabecera del archivo).
    if (casilla.timeoutEvaluacion) {
      clearTimeout(casilla.timeoutEvaluacion);
      casilla.timeoutEvaluacion = null;
    }
    casilla.trazando = true;
    casilla.ultimoPunto = puntoDesdeEvento(casilla, ev);
    marcarPuntoEnMascara(casilla, casilla.ultimoPunto.x, casilla.ultimoPunto.y);
    dibujarPuntoVisual(casilla, casilla.ultimoPunto);
  });

  canvas.addEventListener('pointermove', (ev) => {
    if (!casilla.trazando) return;
    ev.preventDefault();
    const punto = puntoDesdeEvento(casilla, ev);
    dibujarSegmentoVisual(casilla, casilla.ultimoPunto, punto);
    marcarSegmentoEnMascara(casilla, casilla.ultimoPunto, punto);
    casilla.ultimoPunto = punto;
  });

  const terminarTrazo = () => {
    if (!casilla.trazando) return;
    casilla.trazando = false;
    // No se evalúa ahora mismo: hay que esperar 2 segundos completos sin
    // que el niño vuelva a tocar esta casilla (ver cabecera del archivo).
    casilla.timeoutEvaluacion = setTimeout(() => evaluarCasillaActual(casilla), RETRASO_EVALUACION_MS);
  };

  canvas.addEventListener('pointerup', terminarTrazo);
  canvas.addEventListener('pointercancel', terminarTrazo);
}

function crearCasilla(letra, mostrarPunteada) {
  const envoltorio = document.createElement('div');
  envoltorio.className = 'escribe-casilla';

  const canvas = document.createElement('canvas');
  canvas.className = 'escribe-casilla-lienzo';
  canvas.width = TAMANO_CASILLA;
  canvas.height = TAMANO_CASILLA;
  canvas.style.touchAction = 'none'; // evita que el navegador haga scroll/zoom al trazar con el dedo

  envoltorio.appendChild(canvas);

  const casilla = {
    letra,
    envoltorio,
    canvas,
    ctx: canvas.getContext('2d'),
    mascaraReferencia: crearMascaraReferencia(letra),
    mascaraTrazo: new Array(GRID * GRID).fill(0),
    trazando: false,
    ultimoPunto: null,
    timeoutEvaluacion: null,
    estadoCasilla: 'pendiente'
  };

  if (mostrarPunteada) dibujarPistaPunteada(casilla);
  registrarEventosCasilla(casilla);
  return casilla;
}

function pintarCasillas() {
  const { raiz, ajustesPista } = estado;
  const zona = raiz.querySelector('.escribe-casillas');
  zona.innerHTML = '';
  estado.indiceActual = 0;
  estado.casillas = estado.letras.map((letra) => crearCasilla(letra, ajustesPista.letraPunteada));
  estado.casillas.forEach((casilla) => zona.appendChild(casilla.envoltorio));
  actualizarEstadosCasillas();
}

function pintarNivel() {
  const { raiz, plataforma, medioActual, ajustesPista } = estado;
  // Cada nivel nuevo trae una palabra distinta: con el "pulsador TTS"
  // hay que volver a escucharla antes de poder escribir nada.
  estado.escuchado = false;

  raiz.querySelector('.escribe-nivel').textContent = plataforma.t('escribe.nivel', {
    n: estado.nivelActual,
    total: NIVELES_TOTAL
  });

  const objetivo = raiz.querySelector('.escribe-objetivo');
  objetivo.innerHTML = '';

  if (ajustesPista.pulsadorTts) {
    const pulsador = document.createElement('button');
    pulsador.type = 'button';
    pulsador.className = 'escribe-pulsador';
    pulsador.setAttribute('aria-label', plataforma.t('comunes.escuchar'));
    pulsador.textContent = '🔊';
    pulsador.addEventListener('click', () => {
      plataforma.sounds.click();
      plataforma.tts.speak(medioActual.nombre);
      estado.escuchado = true;
      pulsador.classList.add('escribe-pulsador-escuchado');
    });
    objetivo.appendChild(pulsador);
  } else {
    if (!ajustesPista.soloTexto) {
      const img = document.createElement('img');
      img.className = 'escribe-objetivo-img';
      img.src = plataforma.getDisplayUrl(medioActual);
      img.alt = medioActual.nombre;
      objetivo.appendChild(img);
    }

    const pista = document.createElement('p');
    pista.className = 'escribe-pista';
    pista.textContent = formatearTexto(medioActual.nombre, ajustesPista.mayuscula);
    pista.hidden = !ajustesPista.mostrar && !ajustesPista.soloTexto;
    objetivo.appendChild(pista);
  }

  estado.letras = casillasObjetivo(medioActual.nombre, ajustesPista);
  pintarCasillas();
}

function siguienteNivel() {
  if (!estado) return;
  estado.nivelActual += 1;
  const medio = elegirSiguienteMedio(estado.plataforma.medios, { evitarIds: estado.usados });
  if (!medio) {
    mostrarSinMaterial(estado.raiz.querySelector('.escribe-zona'), estado.plataforma);
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
  siguienteNivel();
}

function montar(contenedor, plataforma) {
  inyectarEstilosUnaVez();
  contenedor.innerHTML = '';

  const raiz = document.createElement('div');
  raiz.className = 'escribe-app';

  const cabecera = document.createElement('header');
  cabecera.className = 'escribe-cabecera';
  const titulo = document.createElement('h1');
  titulo.textContent = `${plataforma.icono || ''} ${plataforma.nombre}`.trim();
  const instrucciones = document.createElement('p');
  instrucciones.textContent = plataforma.t('escribe.instrucciones');
  cabecera.append(titulo, instrucciones);

  const marcador = document.createElement('div');
  marcador.className = 'escribe-marcador';
  const nivelEl = document.createElement('span');
  nivelEl.className = 'escribe-nivel';
  marcador.appendChild(nivelEl);

  const zona = document.createElement('div');
  zona.className = 'escribe-zona';

  const objetivo = document.createElement('div');
  objetivo.className = 'escribe-objetivo';

  const casillas = document.createElement('div');
  casillas.className = 'escribe-casillas';

  zona.append(objetivo, casillas);
  raiz.append(cabecera, marcador, zona);
  contenedor.appendChild(raiz);

  estado = {
    contenedor,
    plataforma,
    raiz,
    nivelActual: 0,
    usados: [],
    medioActual: null,
    letras: [],
    indiceActual: 0,
    casillas: [],
    escuchado: false,
    timeoutId: null,
    ajustesPista: plataforma.ajustesPista || {
      mayuscula: true,
      mostrar: true,
      tildesAutomaticas: true,
      soloTexto: false,
      pulsadorTts: false,
      letraPunteada: true,
      toleranciaTrazo: 'facil'
    }
  };

  if (!plataforma.medios || plataforma.medios.length < MIN_MATERIAL) {
    mostrarSinMaterial(zona, plataforma);
    return;
  }

  iniciarPartida();
}

function desmontar() {
  if (!estado) return;
  if (estado.timeoutId) clearTimeout(estado.timeoutId);
  estado.casillas.forEach((casilla) => {
    if (casilla.timeoutEvaluacion) clearTimeout(casilla.timeoutEvaluacion);
  });
  estado = null;
}

export default {
  id: 'escribe-letra',
  nombre: 'Escribe la letra',
  icono: '✍️',
  estante: 'ESCRITURA',
  montar,
  desmontar
};
