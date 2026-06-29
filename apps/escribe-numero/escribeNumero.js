// Pictosfera — mecánica reutilizable: "cuenta y escribe el número".
//
// Variante de "Cuenta y arrastra el número": en pantalla aparece una
// serie de pictogramas IGUALES en línea (el mismo medio repetido
// «cantidad» veces) seguida de UN recuadro vacío de mayor tamaño. El
// niño cuenta la serie y escribe a mano (dedo o stylus) el número
// correspondiente dentro del recuadro. La cantidad puede ser de una o
// dos cifras (1 a 10), así que el recuadro es más ancho que alto para
// dar espacio cómodo a "10". 10 niveles.
//
// El motor de reconocimiento de trazo (rasterizar a una rejilla lógica
// y comparar cobertura/desvío/zonas) es el MISMO algoritmo que en
// "Escribe la letra" (apps/escribe-letra/escribeLetra.js), duplicado a
// propósito en vez de extraído a un módulo común — igual que el resto
// de lógica pura compartida entre mecánicas de este proyecto, cada
// mecánica es independiente y no importa código de otra—. La única
// diferencia real es que aquí solo hay UNA casilla por nivel (no una
// por letra) y puede contener 1 o 2 caracteres (p.ej. "10"), así que el
// lienzo de referencia ajusta el tamaño de fuente para que quepa.
//
// Esta mecánica reutiliza los ajustes de pista "letraPunteada" y
// "toleranciaTrazo" del portal (mismo significado que en "Escribe la
// letra"), pero no usa el resto (no hay una palabra que mostrar como
// pista: el objetivo es contar una imagen repetida, no leer un nombre).
//
// No importa nada del núcleo directamente: todo lo que necesita le
// llega a través de `plataforma` en montar().

const ESTILOS_ID = 'escribe-numero-estilos';
const MIN_MATERIAL = 1;
const NIVELES_TOTAL = 10;
const CANTIDAD_MIN = 1;
const CANTIDAD_MAX = 10;
const RETRASO_EVALUACION_MS = 2000; // 2 segundos completos sin tocar la casilla, igual que en "Escribe la letra"
const RETRASO_ACIERTO_MS = 700;
const RETRASO_FINAL_MS = 500;

const ANCHO_CASILLA = 150; // píxeles del <canvas>: más ancho que alto para que quepa "10" con comodidad
const ALTO_CASILLA = 110;
const GRID_X = 24; // resolución lógica de las máscaras de comparación (no del canvas)
const GRID_Y = 18;

let estado = null;
// { plataforma, contenedor, raiz, nivelActual, usados, medioActual,
//   cantidad, ajustesPista, casilla, timeoutId }

// --- Lógica pura: qué medio y qué cantidad toca este nivel ---

/** Elige el siguiente pictograma a repetir, evitando repetir el del
 *  nivel anterior si hay más de un medio disponible. */
export function elegirSiguienteMedio(medios, { evitarIds = [] } = {}) {
  if (!Array.isArray(medios) || !medios.length) return null;
  const evitar = new Set(evitarIds);
  const sinUsar = medios.filter((m) => m && !evitar.has(m.id));
  const candidatos = sinUsar.length ? sinUsar : medios.filter(Boolean);
  if (!candidatos.length) return null;
  return candidatos[Math.floor(Math.random() * candidatos.length)];
}

/** Cantidad al azar (entera, entre min y max inclusive) para un nivel. */
export function cantidadAleatoria(min = CANTIDAD_MIN, max = CANTIDAD_MAX) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * Genera un nivel: un medio (para repetir) más la cantidad de veces que
 * hay que repetirlo. Lógica pura: no toca el DOM. Devuelve null si no
 * hay material suficiente (al menos un medio).
 */
export function generarNivel(medios, { evitarIds = [] } = {}) {
  const medio = elegirSiguienteMedio(medios, { evitarIds });
  if (!medio) return null;
  return { medio, cantidad: cantidadAleatoria() };
}

// --- Lógica pura: comparación de máscaras (rejillas de 0/1) — motor de
// reconocimiento de trazo, idéntico al de "Escribe la letra" ---

/** Ensancha una máscara: cada píxel a 1 "contagia" a 1 a sus vecinos
 *  dentro del radio dado (distancia de Chebyshov, simple y barata).
 *  Con radio 0 devuelve una copia igual. */
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
 *  `mascaraB` (0 si `mascaraA` no tiene ningún píxel). */
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
 *  `divisiones` zonas y devuelve, para cada zona, la lista de índices
 *  de celda que le pertenecen. */
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

/** Comprueba que el trazo pasa por TODAS las zonas donde el número de
 *  referencia tiene tinta "de sobra" (ver explicación detallada en
 *  apps/escribe-letra/escribeLetra.js, función equivalente). */
export function cubreTodasLasZonas(mascaraReferencia, mascaraTrazo, zonas, minPixelesZona) {
  return zonas.every((indices) => {
    const tintaReferencia = indices.reduce((total, i) => total + (mascaraReferencia[i] ? 1 : 0), 0);
    if (tintaReferencia < minPixelesZona) return true;
    return indices.some((i) => mascaraTrazo[i]);
  });
}

/** Configuración de tolerancia para cada nivel ("facil" por defecto):
 *  ver explicación detallada en apps/escribe-letra/escribeLetra.js. */
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
 *  cae al más permisivo ("facil"). */
export function configTolerancia(nivel) {
  return NIVELES_TRAZO[nivel] || NIVELES_TRAZO.facil;
}

/**
 * Decide si un trazo (su máscara) es un número válido, comparándolo con
 * la máscara de referencia de ese número. Lógica pura: no toca el DOM.
 */
export function evaluarTrazo({ mascaraReferencia, mascaraTrazo, ancho, alto }, nivel = 'facil') {
  const cfg = configTolerancia(nivel);
  const totalTrazo = contarPixeles(mascaraTrazo);
  if (totalTrazo < cfg.minPixelesTrazo) {
    return { correcto: false, cobertura: 0, desvio: 1 };
  }
  const totalReferencia = contarPixeles(mascaraReferencia);
  if (totalReferencia > 0 && totalTrazo < totalReferencia * cfg.minRatioTrazo) {
    return { correcto: false, cobertura: 0, desvio: 1 };
  }
  const trazoDilatado = dilatarMascara(mascaraTrazo, ancho, alto, cfg.radio);
  const referenciaDilatada = dilatarMascara(mascaraReferencia, ancho, alto, cfg.radio);

  const cobertura = proporcionDentro(mascaraReferencia, trazoDilatado);
  const desvio = 1 - proporcionDentro(mascaraTrazo, referenciaDilatada);

  const zonas = indicesPorZona(ancho, alto, cfg.divisionesZona);
  const zonasCubiertas = cubreTodasLasZonas(mascaraReferencia, trazoDilatado, zonas, cfg.minPixelesZona);

  return {
    correcto: cobertura >= cfg.minCobertura && desvio <= cfg.maxDesvio && zonasCubiertas,
    cobertura,
    desvio,
    zonasCubiertas
  };
}

function inyectarEstilosUnaVez() {
  if (document.getElementById(ESTILOS_ID)) return;
  const link = document.createElement('link');
  link.id = ESTILOS_ID;
  link.rel = 'stylesheet';
  link.href = new URL('escribeNumero.css', import.meta.url).href;
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

/** Rasteriza el número a una rejilla GRID_X×GRID_Y de 0/1: dibuja el
 *  texto en un <canvas> oculto del tamaño de la casilla (reduciendo la
 *  fuente si es necesario para que un número de dos cifras, como "10",
 *  quepa con holgura) y muestrea su canal alfa en el centro de cada
 *  celda de la rejilla. */
function crearMascaraReferencia(texto) {
  const lienzo = document.createElement('canvas');
  lienzo.width = ANCHO_CASILLA;
  lienzo.height = ALTO_CASILLA;
  const ctx = lienzo.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let tamanoFuente = Math.round(ALTO_CASILLA * 0.72);
  ctx.font = `bold ${tamanoFuente}px sans-serif`;
  const anchoMaximo = ANCHO_CASILLA * 0.82;
  while (ctx.measureText(texto).width > anchoMaximo && tamanoFuente > 10) {
    tamanoFuente -= 2;
    ctx.font = `bold ${tamanoFuente}px sans-serif`;
  }
  ctx.fillText(texto, ANCHO_CASILLA / 2, ALTO_CASILLA / 2 + ALTO_CASILLA * 0.04);

  const datos = ctx.getImageData(0, 0, ANCHO_CASILLA, ALTO_CASILLA).data;
  const mascara = new Array(GRID_X * GRID_Y).fill(0);
  const pasoX = ANCHO_CASILLA / GRID_X;
  const pasoY = ALTO_CASILLA / GRID_Y;
  for (let gy = 0; gy < GRID_Y; gy++) {
    for (let gx = 0; gx < GRID_X; gx++) {
      const px = Math.min(ANCHO_CASILLA - 1, Math.floor((gx + 0.5) * pasoX));
      const py = Math.min(ALTO_CASILLA - 1, Math.floor((gy + 0.5) * pasoY));
      const alpha = datos[(py * ANCHO_CASILLA + px) * 4 + 3];
      mascara[gy * GRID_X + gx] = alpha > 100 ? 1 : 0;
    }
  }
  return mascara;
}

/** Dibuja la pista visual del número punteado en el canvas visible de
 *  la casilla (trazo discontinuo, no relleno): solo apariencia, no
 *  afecta a la evaluación. */
function dibujarPistaPunteada(casilla) {
  const { ctx } = casilla;
  ctx.save();
  ctx.strokeStyle = colorToken('--color-border');
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 5]);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${casilla.tamanoFuente}px sans-serif`;
  ctx.strokeText(casilla.texto, ANCHO_CASILLA / 2, ALTO_CASILLA / 2 + ALTO_CASILLA * 0.04);
  ctx.restore();
}

function limpiarCasilla(casilla) {
  casilla.ctx.clearRect(0, 0, ANCHO_CASILLA, ALTO_CASILLA);
  casilla.mascaraTrazo = new Array(GRID_X * GRID_Y).fill(0);
  if (estado.ajustesPista.letraPunteada) dibujarPistaPunteada(casilla);
}

function puntoDesdeEvento(casilla, ev) {
  const rect = casilla.canvas.getBoundingClientRect();
  const escalaX = rect.width ? casilla.canvas.width / rect.width : 1;
  const escalaY = rect.height ? casilla.canvas.height / rect.height : 1;
  const x = (ev.clientX - rect.left) * escalaX;
  const y = (ev.clientY - rect.top) * escalaY;
  return {
    x: Math.min(ANCHO_CASILLA - 1, Math.max(0, x)),
    y: Math.min(ALTO_CASILLA - 1, Math.max(0, y))
  };
}

function marcarPuntoEnMascara(casilla, x, y) {
  const gx = Math.min(GRID_X - 1, Math.max(0, Math.floor((x / ANCHO_CASILLA) * GRID_X)));
  const gy = Math.min(GRID_Y - 1, Math.max(0, Math.floor((y / ALTO_CASILLA) * GRID_Y)));
  for (let dy = -1; dy <= 1; dy++) {
    const ny = gy + dy;
    if (ny < 0 || ny >= GRID_Y) continue;
    for (let dx = -1; dx <= 1; dx++) {
      const nx = gx + dx;
      if (nx < 0 || nx >= GRID_X) continue;
      casilla.mascaraTrazo[ny * GRID_X + nx] = 1;
    }
  }
}

function marcarSegmentoEnMascara(casilla, p0, p1) {
  const distancia = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  const pasoMedio = (ANCHO_CASILLA / GRID_X + ALTO_CASILLA / GRID_Y) / 4;
  const pasos = Math.max(1, Math.ceil(distancia / Math.max(1, pasoMedio)));
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
  envoltorio.classList.remove('escribenum-casilla-correcta');
  if (casilla.resuelta) {
    envoltorio.classList.add('escribenum-casilla-correcta');
    canvas.setAttribute('aria-label', plataforma.t('escribeNumero.casilla_correcta'));
  } else {
    canvas.setAttribute('aria-label', plataforma.t('escribeNumero.casilla_vacia'));
  }
}

function evaluarCasillaActual(casilla) {
  if (!estado) return;
  casilla.timeoutEvaluacion = null;
  const resultado = evaluarTrazo(
    { mascaraReferencia: casilla.mascaraReferencia, mascaraTrazo: casilla.mascaraTrazo, ancho: GRID_X, alto: GRID_Y },
    estado.ajustesPista.toleranciaTrazo
  );
  if (resultado.correcto) {
    resolverNumeroCorrecto(casilla);
  } else {
    resolverNumeroIncorrecto(casilla);
  }
}

function resolverNumeroCorrecto(casilla) {
  estado.plataforma.sounds.acierto();
  estado.plataforma.tts.speak(casilla.texto);
  casilla.resuelta = true;
  pintarEstadoCasilla(casilla);

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

function resolverNumeroIncorrecto(casilla) {
  estado.plataforma.sounds.fallo();
  casilla.envoltorio.classList.add('escribenum-casilla-fallo');
  limpiarCasilla(casilla);
  setTimeout(() => {
    if (casilla && casilla.envoltorio) casilla.envoltorio.classList.remove('escribenum-casilla-fallo');
  }, 400);
}

function registrarEventosCasilla(casilla) {
  const { canvas } = casilla;

  canvas.addEventListener('pointerdown', (ev) => {
    if (!estado || casilla.resuelta) return;
    ev.preventDefault();
    try {
      canvas.setPointerCapture(ev.pointerId);
    } catch {
      /* algunos entornos (p.ej. pruebas) no implementan captura de puntero */
    }
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
    casilla.timeoutEvaluacion = setTimeout(() => evaluarCasillaActual(casilla), RETRASO_EVALUACION_MS);
  };

  canvas.addEventListener('pointerup', terminarTrazo);
  canvas.addEventListener('pointercancel', terminarTrazo);
}

function crearCasilla(texto, mostrarPunteada) {
  const envoltorio = document.createElement('div');
  envoltorio.className = 'escribenum-casilla';

  const canvas = document.createElement('canvas');
  canvas.className = 'escribenum-casilla-lienzo';
  canvas.width = ANCHO_CASILLA;
  canvas.height = ALTO_CASILLA;
  canvas.style.touchAction = 'none';

  envoltorio.appendChild(canvas);

  let tamanoFuente = Math.round(ALTO_CASILLA * 0.72);
  const ctxMedida = canvas.getContext('2d');
  ctxMedida.font = `bold ${tamanoFuente}px sans-serif`;
  const anchoMaximo = ANCHO_CASILLA * 0.82;
  while (ctxMedida.measureText(texto).width > anchoMaximo && tamanoFuente > 10) {
    tamanoFuente -= 2;
    ctxMedida.font = `bold ${tamanoFuente}px sans-serif`;
  }

  const casilla = {
    texto,
    tamanoFuente,
    envoltorio,
    canvas,
    ctx: canvas.getContext('2d'),
    mascaraReferencia: crearMascaraReferencia(texto),
    mascaraTrazo: new Array(GRID_X * GRID_Y).fill(0),
    trazando: false,
    ultimoPunto: null,
    timeoutEvaluacion: null,
    resuelta: false
  };

  if (mostrarPunteada) dibujarPistaPunteada(casilla);
  registrarEventosCasilla(casilla);
  return casilla;
}

function pintarNivel() {
  const { raiz, plataforma, medioActual, cantidad, ajustesPista } = estado;

  raiz.querySelector('.escribenum-nivel').textContent = plataforma.t('escribeNumero.nivel', {
    n: estado.nivelActual,
    total: NIVELES_TOTAL
  });

  const zona = raiz.querySelector('.escribenum-zona');
  zona.innerHTML = '';

  const serie = document.createElement('div');
  serie.className = 'escribenum-serie';
  for (let i = 0; i < cantidad; i++) {
    const img = document.createElement('img');
    img.className = 'escribenum-serie-img';
    img.src = plataforma.getDisplayUrl(medioActual);
    img.alt = medioActual.nombre;
    serie.appendChild(img);
  }
  zona.appendChild(serie);

  estado.casilla = crearCasilla(String(cantidad), ajustesPista.letraPunteada);
  zona.appendChild(estado.casilla.envoltorio);
  pintarEstadoCasilla(estado.casilla);
}

function siguienteNivel() {
  if (!estado) return;
  if (estado.casilla && estado.casilla.timeoutEvaluacion) clearTimeout(estado.casilla.timeoutEvaluacion);
  estado.nivelActual += 1;
  const nivel = generarNivel(estado.plataforma.medios, { evitarIds: estado.usados });
  if (!nivel) {
    mostrarSinMaterial(estado.raiz.querySelector('.escribenum-zona'), estado.plataforma);
    return;
  }
  estado.usados.push(nivel.medio.id);
  estado.medioActual = nivel.medio;
  estado.cantidad = nivel.cantidad;
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
  raiz.className = 'escribenum-app';

  const cabecera = document.createElement('header');
  cabecera.className = 'escribenum-cabecera';
  const titulo = document.createElement('h1');
  titulo.textContent = `${plataforma.icono || ''} ${plataforma.nombre}`.trim();
  const instrucciones = document.createElement('p');
  instrucciones.textContent = plataforma.t('escribeNumero.instrucciones');
  cabecera.append(titulo, instrucciones);

  const marcador = document.createElement('div');
  marcador.className = 'escribenum-marcador';
  const nivelEl = document.createElement('span');
  nivelEl.className = 'escribenum-nivel';
  marcador.appendChild(nivelEl);

  const zona = document.createElement('div');
  zona.className = 'escribenum-zona';

  raiz.append(cabecera, marcador, zona);
  contenedor.appendChild(raiz);

  estado = {
    contenedor,
    plataforma,
    raiz,
    nivelActual: 0,
    usados: [],
    medioActual: null,
    cantidad: 0,
    casilla: null,
    timeoutId: null,
    ajustesPista: plataforma.ajustesPista || { letraPunteada: true, toleranciaTrazo: 'facil' }
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
  if (estado.casilla && estado.casilla.timeoutEvaluacion) clearTimeout(estado.casilla.timeoutEvaluacion);
  estado = null;
}

export default {
  id: 'escribe-numero',
  nombre: 'Cuenta y escribe el número',
  icono: '✏️',
  estante: 'NUMEROS',
  montar,
  desmontar
};
