// Pictosfera — apps/balanza/balanza.js
// Motor compartido para 10 modos de juego de balanza con rama de árbol
// y monitos colgantes. Torque = valor de la posición (1–10 por lado).
// Todos los pesos son idénticos; la fuerza viene de la posición.

const ESTILOS_ID   = 'balanza-estilos';
const POSICIONES   = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const NIVELES_TOTAL = 8;
const PASO_PX      = 34;   // píxeles entre posiciones en el SVG
const CENTRO_X     = 400;  // centro horizontal del SVG
const PIVOT_Y      = 168;  // punto donde la cuerda toca la rama
const RAMA_Y       = 182;  // centro vertical de la rama
const TILT_MAX_DEG = 22;   // inclinación máxima en grados

let estado = null;

// Variables de arrastre (drag-and-drop entre bandeja y ganchos)
let _ghost                  = null;
let _onMoveGlobal           = null;
let _onUpGlobal             = null;
let _ganchoResaltado        = null;
let _ganchoOrigen           = null;  // gancho SVG desde el que se inició el arrastre (reubicación)
let _ignorarSiguienteClick  = false; // suprimir click post-arrastre en el SVG   // gancho con clase bz-gancho-candidato durante el arrastre

// ── Utilidades ───────────────────────────────────────────────────────────────

function mezclar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function aleatorio(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// ── Motor puro (exportable, testable) ────────────────────────────────────────

/** Torque de un lado = suma de las posiciones ocupadas. */
export function calcularTorque(posiciones) {
  return posiciones.reduce((s, p) => s + p, 0);
}

/** Estado de la balanza a partir de los torques. */
export function estadoBalanza(torqIzq, torqDer) {
  if (torqIzq === torqDer) return 'equilibrio';
  return torqIzq > torqDer ? 'izquierda' : 'derecha';
}

/** Ángulo de inclinación en grados: positivo (CW) → lado derecho baja. */
export function calcularAngulo(torqIzq, torqDer) {
  // CSS rotate(+) = giro horario = lado derecho baja
  const diff = torqDer - torqIzq;
  return Math.max(-TILT_MAX_DEG, Math.min(TILT_MAX_DEG, diff * 0.5));
}

/**
 * Genera un subconjunto aleatorio de POSICIONES (sin repetición) cuya
 * suma sea `objetivo`. Devuelve [] si no encuentra solución.
 */
export function generarCombinacion(objetivo, { maxPiezas = 5, excluir = [] } = {}) {
  const disponibles = POSICIONES.filter(p => !excluir.includes(p));
  for (let intento = 0; intento < 400; intento++) {
    const pool = mezclar([...disponibles]);
    const piezas = [];
    let restante = objetivo;
    for (const p of pool) {
      if (p <= restante) {
        piezas.push(p);
        restante -= p;
        if (restante === 0) break;
      }
      if (piezas.length >= maxPiezas) break;
    }
    if (restante === 0) return piezas.sort((a, b) => a - b);
  }
  return [];
}

/**
 * Devuelve TODAS las combinaciones de posiciones (sin repetición)
 * cuya suma sea igual a `objetivo`.
 */
export function todasLasCombinaciones(objetivo) {
  const n = POSICIONES.length;
  const resultado = [];
  for (let mask = 1; mask < (1 << n); mask++) {
    let torq = 0;
    const combo = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) { torq += POSICIONES[i]; combo.push(POSICIONES[i]); }
    }
    if (torq === objetivo) resultado.push(combo);
  }
  return resultado;
}

/**
 * Genera `n` posiciones distractor distintas de `correcto`, en orden
 * aleatorio.
 */
export function generarDistractores(correcto, n = 2) {
  return mezclar(POSICIONES.filter(p => p !== correcto)).slice(0, n);
}

// ── Generadores de ronda ─────────────────────────────────────────────────────

function difNivel(nivel) {
  if (nivel <= 2) return { maxPiezas: 2, minT:  1, maxT:  6 };
  if (nivel <= 5) return { maxPiezas: 3, minT:  3, maxT: 15 };
               return { maxPiezas: 4, minT:  8, maxT: 25 };
}

/**
 * Modo «equilibra»: lado izquierdo fijo, el jugador coloca monitos
 * en el derecho hasta igualar el torque.
 */
export function generarRondaEquilibra(nivel = 1) {
  const { maxPiezas, minT, maxT } = difNivel(nivel);
  const objetivo = aleatorio(minT, maxT);
  const izquierda = generarCombinacion(objetivo, { maxPiezas });
  if (!izquierda.length) return generarRondaEquilibra(nivel);
  return {
    modo: 'equilibra',
    izquierda, derecha: [],
    fijo: { izquierda: [...izquierda], derecha: [] },
    interactivo: { izquierda: false, derecha: true },
    objetivo, piezasMaximas: maxPiezas * 2, piezasBandeja: maxPiezas, tipo: 'interactivo',
  };
}

/**
 * Modo «completa»: ambos lados con piezas pero falta una en la derecha.
 * El jugador elige entre tres opciones.
 */
export function generarRondaCompleta(nivel = 1) {
  const { maxPiezas, minT, maxT } = difNivel(nivel);
  const objetivo = aleatorio(minT, maxT);
  const izquierda = generarCombinacion(objetivo, { maxPiezas });
  if (!izquierda.length) return generarRondaCompleta(nivel);
  const derechaCompleta = generarCombinacion(objetivo, { maxPiezas, excluir: izquierda });
  if (!derechaCompleta.length) return generarRondaCompleta(nivel);
  const idxHueco = aleatorio(0, derechaCompleta.length - 1);
  const piezaFaltante = derechaCompleta[idxHueco];
  const derechaVisible = derechaCompleta.filter((_, i) => i !== idxHueco);
  const distractores = generarDistractores(piezaFaltante, 2);
  return {
    modo: 'completa',
    izquierda, derecha: derechaVisible,
    fijo: { izquierda: [...izquierda], derecha: [...derechaVisible] },
    interactivo: { izquierda: false, derecha: false },
    objetivo, piezaFaltante,
    opciones: mezclar([piezaFaltante, ...distractores]),
    tipo: 'mc-posicion',
  };
}

/**
 * Modo «suma»: varias piezas en la izquierda; el jugador elige la
 * posición única del lado derecho que equilibra (valor 1–10).
 */
export function generarRondaSuma(nivel = 1) {
  const { maxPiezas } = difNivel(nivel);
  let objetivo, izquierda, intentos = 0;
  do {
    objetivo = aleatorio(1, 10);
    izquierda = generarCombinacion(objetivo, { maxPiezas, excluir: [objetivo] });
    intentos++;
  } while (!izquierda.length && intentos < 80);
  if (!izquierda.length) return generarRondaSuma(nivel);
  const distractores = generarDistractores(objetivo, 2);
  return {
    modo: 'suma',
    izquierda, derecha: [],
    fijo: { izquierda: [...izquierda], derecha: [] },
    interactivo: { izquierda: false, derecha: false },
    objetivo, opciones: mezclar([objetivo, ...distractores]),
    tipo: 'mc-posicion',
  };
}

/**
 * Modo «descompone»: un monito en la derecha en posición `objetivo`;
 * el jugador coloca piezas en la izquierda para igualar el torque.
 */
export function generarRondaDescompone(nivel = 1) {
  const { maxPiezas, minT, maxT } = difNivel(nivel);
  const objetivo = aleatorio(Math.max(minT, 2), Math.min(maxT, 10));
  return {
    modo: 'descompone',
    izquierda: [], derecha: [objetivo],
    fijo: { izquierda: [], derecha: [objetivo] },
    interactivo: { izquierda: true, derecha: false },
    objetivo, piezasMaximas: maxPiezas, piezasBandeja: maxPiezas, tipo: 'interactivo',
  };
}

/**
 * Modo «copia»: se muestra una configuración de referencia equilibrada
 * y el jugador la reproduce en la balanza interactiva.
 */
export function generarRondaCopia(nivel = 1) {
  const { maxPiezas, minT, maxT } = difNivel(nivel);
  const objetivo = aleatorio(minT, maxT);
  const izqRef = generarCombinacion(objetivo, { maxPiezas });
  const derRef = generarCombinacion(objetivo, { maxPiezas, excluir: izqRef });
  if (!izqRef.length || !derRef.length) return generarRondaCopia(nivel);
  return {
    modo: 'copia',
    referencia: { izquierda: [...izqRef], derecha: [...derRef] },
    izquierda: [], derecha: [],
    fijo: { izquierda: [], derecha: [] },
    interactivo: { izquierda: true, derecha: true },
    objetivo, piezasBandeja: (izqRef.length + derRef.length), tipo: 'interactivo',
  };
}

/**
 * Modo «falta»: igual que «completa» pero el faltante puede estar en
 * cualquiera de los dos lados.
 */
export function generarRondaFalta(nivel = 1) {
  const ronda = generarRondaCompleta(nivel);
  return { ...ronda, modo: 'falta' };
}

/**
 * Modo «cual-pesa»: configuración equilibrada o desequilibrada; el
 * jugador elige qué lado pesa más (o si están equilibrados).
 */
export function generarRondaCualPesa(nivel = 1) {
  const { maxPiezas } = difNivel(nivel);
  const equilibrado = Math.random() < 0.33;
  let izquierda, derecha, respuestaCorrecta;
  if (equilibrado) {
    const t = aleatorio(2, 18);
    izquierda = generarCombinacion(t, { maxPiezas });
    derecha   = generarCombinacion(t, { maxPiezas, excluir: izquierda });
    if (!izquierda.length || !derecha.length) return generarRondaCualPesa(nivel);
    respuestaCorrecta = 'equilibrio';
  } else {
    const t1 = aleatorio(2, 20);
    let t2;
    let iter = 0;
    do { t2 = aleatorio(2, 20); iter++; } while (t2 === t1 && iter < 30);
    izquierda = generarCombinacion(t1, { maxPiezas });
    derecha   = generarCombinacion(t2, { maxPiezas });
    if (!izquierda.length || !derecha.length) return generarRondaCualPesa(nivel);
    respuestaCorrecta = t1 > t2 ? 'izquierda' : 'derecha';
  }
  return {
    modo: 'cual-pesa',
    izquierda, derecha,
    fijo: { izquierda: [...izquierda], derecha: [...derecha] },
    interactivo: { izquierda: false, derecha: false },
    respuestaCorrecta,
    opciones: mezclar(['izquierda', 'derecha', 'equilibrio']),
    tipo: 'mc-lado',
  };
}

/**
 * Modo «corrige»: balanza casi equilibrada con un monito mal puesto;
 * el jugador mueve piezas hasta equilibrar.
 */
export function generarRondaCorrige(nivel = 1) {
  const { maxPiezas, minT, maxT } = difNivel(nivel);
  const objetivo = aleatorio(minT, maxT);
  const izquierda = generarCombinacion(objetivo, { maxPiezas });
  if (!izquierda.length) return generarRondaCorrige(nivel);
  const derechaCorrecta = generarCombinacion(objetivo, { maxPiezas, excluir: izquierda });
  if (!derechaCorrecta.length) return generarRondaCorrige(nivel);
  const idxCambio = aleatorio(0, derechaCorrecta.length - 1);
  const piezaMal = derechaCorrecta[idxCambio];
  const libres = POSICIONES.filter(p => !derechaCorrecta.includes(p) && p !== piezaMal);
  if (!libres.length) return generarRondaCorrige(nivel);
  const piezaErronea = libres[aleatorio(0, libres.length - 1)];
  const derechaErronea = [...derechaCorrecta];
  derechaErronea[idxCambio] = piezaErronea;
  return {
    modo: 'corrige',
    izquierda, derecha: derechaErronea,
    fijo: { izquierda: [...izquierda], derecha: [] },
    interactivo: { izquierda: false, derecha: true },
    objetivo, piezasBandeja: derechaErronea.length, tipo: 'interactivo',
  };
}

/**
 * Modo «limitado»: equilibrar usando exactamente N monitos en total
 * (distribuidos entre ambos lados como quiera el jugador).
 */
export function generarRondaLimitado(nivel = 1) {
  const n = nivel <= 2 ? 2 : nivel <= 5 ? 3 : 4;
  for (let intento = 0; intento < 300; intento++) {
    const nIzq = aleatorio(1, n - 1);
    const nDer = n - nIzq;
    const izq  = mezclar([...POSICIONES]).slice(0, nIzq);
    const torqIzq = calcularTorque(izq);
    // Los lados pueden compartir número de posición (distintos ganchos),
    // así que NO excluimos las posiciones del izquierdo aquí.
    const der = generarCombinacion(torqIzq, { maxPiezas: nDer });
    if (der.length === nDer) {
      return {
        modo: 'limitado',
        izquierda: [], derecha: [],
        fijo: { izquierda: [], derecha: [] },
        interactivo: { izquierda: true, derecha: true },
        piezasMaximas: n, tipo: 'interactivo',
        // guardamos un objetivo interno para saber que hay solución
        _hayMeta: true,
      };
    }
  }
  // Si no encontramos con este nivel, probar con el siguiente (nunca infinito)
  return generarRondaLimitado(Math.min(nivel + 1, 8));
}

/**
 * Modo «soluciones»: el jugador debe encontrar `meta` configuraciones
 * distintas que equilibren el mismo objetivo.
 */
export function generarRondaSoluciones(nivel = 1) {
  const objetivo = nivel <= 3 ? aleatorio(3, 8) : nivel <= 6 ? aleatorio(5, 15) : aleatorio(10, 20);
  const todas = todasLasCombinaciones(objetivo);
  const meta  = nivel <= 2 ? 2 : nivel <= 5 ? 3 : 4;
  if (todas.length < meta) return generarRondaSoluciones(nivel);
  return {
    modo: 'soluciones',
    izquierda: [], derecha: [],
    fijo: { izquierda: [], derecha: [] },
    interactivo: { izquierda: true, derecha: true },
    objetivo, meta, encontradas: [], tipo: 'interactivo',
  };
}

// ── SVG ─────────────────────────────────────────────────────────────────────

/** SVG de un monito en la posición cx,ropeY dentro del grupo .balanza-rama. */
function svgMonito(cx, ropeY, fijo = false, lado = null, pos = null) {
  const colCuerpo  = fijo ? '#6B3A2A' : '#A0522D';
  const colCara    = fijo ? '#B8651F' : '#CD853F';
  const colOscuro  = fijo ? '#4A2218' : '#7B3A1A';
  const y = ropeY;
  const dataAttrs  = lado != null ? ` data-lado="${lado}" data-pos="${pos}"` : '';
  return `<g class="bz-mono${fijo ? ' bz-mono-fijo' : ''}"${dataAttrs} transform="translate(${cx},${y})">
  <line x1="0" y1="0" x2="0" y2="18" stroke="#8B6914" stroke-width="8" stroke-linecap="round"/>
  <line x1="0" y1="12" x2="-11" y2="23" stroke="${colOscuro}" stroke-width="3.5" stroke-linecap="round"/>
  <line x1="0" y1="12" x2="11" y2="23" stroke="${colOscuro}" stroke-width="3.5" stroke-linecap="round"/>
  <circle cx="-19" cy="33" r="8" fill="${colCuerpo}"/>
  <circle cx="19" cy="33" r="8" fill="${colCuerpo}"/>
  <circle cx="-19" cy="33" r="5" fill="${colCara}"/>
  <circle cx="19" cy="33" r="5" fill="${colCara}"/>
  <circle cx="0" cy="33" r="19" fill="${colCuerpo}"/>
  <ellipse cx="0" cy="37" rx="13" ry="11" fill="${colCara}"/>
  <circle cx="-7" cy="29" r="3.5" fill="white"/>
  <circle cx="7" cy="29" r="3.5" fill="white"/>
  <circle cx="-6" cy="29" r="1.8" fill="#111"/>
  <circle cx="8" cy="29" r="1.8" fill="#111"/>
  <ellipse cx="0" cy="36" rx="4" ry="3" fill="${colOscuro}"/>
  <path d="M-6 43 Q0 49 6 43" stroke="${colOscuro}" stroke-width="2" fill="none" stroke-linecap="round"/>
  <ellipse cx="0" cy="64" rx="13" ry="18" fill="${colCuerpo}"/>
  <ellipse cx="0" cy="64" rx="8" ry="11" fill="${colCara}"/>
  <line x1="-6" y1="79" x2="-9" y2="96" stroke="${colOscuro}" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="6" y1="79" x2="9" y2="96" stroke="${colOscuro}" stroke-width="4.5" stroke-linecap="round"/>
  <ellipse cx="-9" cy="98" rx="8" ry="4.5" fill="${colOscuro}"/>
  <ellipse cx="9" cy="98" rx="8" ry="4.5" fill="${colOscuro}"/>
  <path d="M11 65 Q33 58 31 78 Q29 92 18 90" stroke="${colOscuro}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
</g>`;
}

/** Construye el SVG base de la balanza (rama + ganchos; sin monitos). */
function svgBalanzaBase(interactivo) {
  let ganchos = '';
  for (const pos of POSICIONES) {
    const cxIzq = CENTRO_X - pos * PASO_PX;
    const cxDer = CENTRO_X + pos * PASO_PX;
    const clIzq = `bz-gancho${interactivo.izquierda ? ' bz-gancho-activo' : ' bz-gancho-inactivo'}`;
    const clDer = `bz-gancho${interactivo.derecha   ? ' bz-gancho-activo' : ' bz-gancho-inactivo'}`;
    ganchos += `
<circle cx="${cxIzq}" cy="${RAMA_Y}" r="7" class="${clIzq}" data-lado="izquierda" data-pos="${pos}"/>
<circle cx="${cxDer}" cy="${RAMA_Y}" r="7" class="${clDer}" data-lado="derecha" data-pos="${pos}"/>
<text x="${cxIzq}" y="${RAMA_Y - 19}" class="bz-num-pos">${pos}</text>
<text x="${cxDer}" y="${RAMA_Y - 19}" class="bz-num-pos">${pos}</text>`;
  }
  return `<svg class="bz-svg" viewBox="0 0 800 380" xmlns="http://www.w3.org/2000/svg" aria-label="Balanza">
<defs>
  <linearGradient id="bz-madera" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#D2A679"/>
    <stop offset="50%" stop-color="#A0522D"/>
    <stop offset="100%" stop-color="#7A3B1E"/>
  </linearGradient>
  <linearGradient id="bz-tronco" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#4A2910"/>
    <stop offset="40%" stop-color="#6B3A1E"/>
    <stop offset="100%" stop-color="#4A2910"/>
  </linearGradient>
  <filter id="bz-sombra" x="-10%" y="-10%" width="120%" height="120%">
    <feDropShadow dx="0" dy="3" stdDeviation="4" flood-opacity="0.25"/>
  </filter>
</defs>
<!-- Fondo -->
<rect width="800" height="380" fill="#EAF5EA" rx="16"/>
<!-- Tronco -->
<rect x="376" y="0" width="48" height="154" rx="24" fill="url(#bz-tronco)"/>
<rect x="382" y="0" width="10" height="154" rx="5" fill="#8B5E3C" opacity="0.35"/>
<!-- Líquen en el tronco (decorativo) -->
<circle cx="390" cy="60" r="6" fill="#5D8A3C" opacity="0.4"/>
<circle cx="410" cy="90" r="5" fill="#5D8A3C" opacity="0.35"/>
<circle cx="385" cy="115" r="4" fill="#5D8A3C" opacity="0.3"/>
<!-- Cuerda de soporte -->
<line x1="400" y1="150" x2="400" y2="${PIVOT_Y}" stroke="#7A5C18" stroke-width="7" stroke-linecap="round"/>
<!-- Grupo de la rama (rota con CSS) -->
<g class="bz-rama">
  <!-- Madera de la rama -->
  <rect x="40" y="${RAMA_Y - 14}" width="720" height="28" rx="14"
        fill="url(#bz-madera)" stroke="#5C2E0E" stroke-width="2" filter="url(#bz-sombra)"/>
  <line x1="42" y1="${RAMA_Y - 4}" x2="758" y2="${RAMA_Y - 4}" stroke="#C8965A" stroke-width="1.5" opacity="0.4"/>
  <line x1="42" y1="${RAMA_Y + 6}" x2="758" y2="${RAMA_Y + 6}" stroke="#7A3B1E" stroke-width="1" opacity="0.3"/>
  <!-- Nudos decorativos en la madera -->
  <ellipse cx="200" cy="${RAMA_Y}" rx="10" ry="6" fill="#8B4513" opacity="0.2"/>
  <ellipse cx="600" cy="${RAMA_Y}" rx="8" ry="5" fill="#8B4513" opacity="0.2"/>
  <!-- Ganchos y etiquetas de posición -->
  ${ganchos}
  <!-- Capa de monitos (se actualiza dinámicamente) -->
  <g class="bz-monitos"></g>
</g>
</svg>`;
}

// ── DOM y flujo del juego ────────────────────────────────────────────────────

function inyectarEstilosUnaVez() {
  if (document.getElementById(ESTILOS_ID)) return;
  const link = document.createElement('link');
  link.id   = ESTILOS_ID;
  link.rel  = 'stylesheet';
  link.href = new URL('balanza.css', import.meta.url).href;
  document.head.appendChild(link);
}

function actualizarMonitos() {
  if (!estado) return;
  const { ronda } = estado;
  const contenedor = estado.raiz.querySelector('.bz-monitos');
  if (!contenedor) return;
  const fijoIzq = new Set(ronda.fijo.izquierda);
  const fijoDer = new Set(ronda.fijo.derecha);
  const svgMonitos = [
    ...ronda.izquierda.map(p => svgMonito(CENTRO_X - p * PASO_PX, RAMA_Y, fijoIzq.has(p), 'izquierda', p)),
    ...ronda.derecha.map(p  => svgMonito(CENTRO_X + p * PASO_PX, RAMA_Y, fijoDer.has(p), 'derecha',    p)),
  ].join('');
  contenedor.innerHTML = svgMonitos;
}

function actualizarGanchos() {
  if (!estado) return;
  const { ronda } = estado;
  const svg = estado.raiz.querySelector('.bz-svg');
  if (!svg) return;
  const izqSet = new Set(ronda.izquierda);
  const derSet = new Set(ronda.derecha);
  for (const pos of POSICIONES) {
    const gIzq = svg.querySelector(`[data-lado="izquierda"][data-pos="${pos}"]`);
    const gDer = svg.querySelector(`[data-lado="derecha"][data-pos="${pos}"]`);
    if (gIzq) {
      const cl = ronda.interactivo.izquierda
        ? `bz-gancho bz-gancho-activo${izqSet.has(pos) ? ' bz-gancho-ocupado' : ''}`
        : 'bz-gancho bz-gancho-inactivo';
      gIzq.setAttribute('class', cl);
    }
    if (gDer) {
      const cl = ronda.interactivo.derecha
        ? `bz-gancho bz-gancho-activo${derSet.has(pos) ? ' bz-gancho-ocupado' : ''}`
        : 'bz-gancho bz-gancho-inactivo';
      gDer.setAttribute('class', cl);
    }
  }
}

function actualizarTilt() {
  if (!estado) return;
  const { ronda } = estado;
  const torqIzq = calcularTorque(ronda.izquierda);
  const torqDer = calcularTorque(ronda.derecha);
  const ang = calcularAngulo(torqIzq, torqDer);
  const rama = estado.raiz.querySelector('.bz-rama');
  if (rama) rama.style.transform = `rotate(${ang}deg)`;
}

function actualizarInfoExtra() {
  if (!estado) return;
  const { ronda, plataforma } = estado;
  const infoEl = estado.raiz.querySelector('.bz-info-extra');
  if (!infoEl) return;
  if (ronda.modo === 'limitado') {
    const usadas = ronda.izquierda.length + ronda.derecha.length;
    infoEl.textContent = plataforma.t('balanza.limitado.piezas_restantes', {
      n: ronda.piezasMaximas - usadas,
    });
  } else if (ronda.modo === 'soluciones') {
    infoEl.textContent = plataforma.t('balanza.soluciones.progreso', {
      n: ronda.encontradas.length,
      meta: ronda.meta,
    });
  } else {
    infoEl.textContent = '';
  }
}

function actualizarVista() {
  actualizarGanchos();
  actualizarMonitos();
  actualizarTilt();
  actualizarInfoExtra();
  pintarBandeja();
}

/** SVG autónomo de monito para la bandeja de piezas. */
function svgFicha() {
  const colCuerpo = '#A0522D';
  const colCara   = '#CD853F';
  const colOscuro = '#7B3A1A';
  return `<svg viewBox="-28 -2 66 112" class="bz-ficha-svg" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    ${svgMonito(0, 0, false)}
  </svg>`;
}

/** Actualiza la bandeja de piezas disponibles. */
function pintarBandeja() {
  if (!estado) return;
  const { ronda } = estado;
  const bandejaEl = estado.raiz.querySelector('.bz-bandeja');
  if (!bandejaEl) return;

  // Solo en modos en que el niño coloca piezas
  if (ronda.tipo !== 'interactivo') { bandejaEl.innerHTML = ''; return; }

  let nPiezas;
  if (ronda.modo === 'limitado') {
    const usadas = ronda.izquierda.length + ronda.derecha.length;
    nPiezas = Math.max(0, ronda.piezasMaximas - usadas);
  } else if (ronda.piezasBandeja != null) {
    // Modos con presupuesto fijo: restar las piezas colocadas en lados interactivos
    const interaIzq = ronda.interactivo.izquierda ? ronda.izquierda.length : 0;
    const interaDer = ronda.interactivo.derecha   ? ronda.derecha.length   : 0;
    nPiezas = Math.max(0, ronda.piezasBandeja - interaIzq - interaDer);
  } else {
    nPiezas = 5; // suministro ilimitado (ej. soluciones)
  }

  bandejaEl.innerHTML = '';
  for (let i = 0; i < nPiezas; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bz-ficha';
    btn.setAttribute('aria-label', 'Monito – arrastra al gancho');
    btn.setAttribute('draggable', 'false'); // se usa pointer events, no HTML drag
    btn.innerHTML = svgFicha();
    btn.addEventListener('pointerdown', iniciarArrastre);
    bandejaEl.appendChild(btn);
  }
}

/**
 * Encuentra el gancho SVG más cercano al punto de pantalla (clientX, clientY).
 * getBoundingClientRect() en círculos SVG dentro de un grupo con CSS rotate()
 * devuelve posiciones erróneas en muchos navegadores, así que calculamos la
 * posición real manualmente:
 *   1) Leemos el ángulo de la rama desde rama.style.transform.
 *   2) Rotamos el cx/cy del gancho alrededor del pivote (CENTRO_X, PIVOT_Y).
 *   3) Convertimos las coordenadas SVG rotadas a pantalla con getScreenCTM().
 */
function encontrarGanchoDestino(clientX, clientY) {
  if (!estado) return null;
  const svgEl  = estado.raiz.querySelector('.bz-svg');
  const ramaEl = estado.raiz.querySelector('.bz-rama');
  if (!svgEl || !ramaEl) return null;

  // Ángulo de rotación actual de la rama (rad)
  const angStr = ramaEl.style.transform || 'rotate(0deg)';
  const angDeg = parseFloat(angStr.replace('rotate(', '').replace('deg)', '') || '0');
  const angRad = angDeg * Math.PI / 180;
  const cosA   = Math.cos(angRad);
  const sinA   = Math.sin(angRad);

  // Transformación del viewport SVG → pantalla
  const ctm = svgEl.getScreenCTM();
  if (!ctm) return null;

  const UMBRAL_PX = 56; // radio de captura generoso en píxeles de pantalla
  let mejor     = null;
  let mejorDist = UMBRAL_PX;

  const ganchos = estado.raiz.querySelectorAll('circle[data-lado][data-pos]'); // solo <circle>, no <g> monitos
  for (const g of ganchos) {
    if (g.classList.contains('bz-gancho-inactivo')) continue;

    // Posición del gancho en el espacio local de la rama (antes de la rotación CSS)
    const cx = parseFloat(g.getAttribute('cx'));
    const cy = parseFloat(g.getAttribute('cy'));

    // Aplicar la rotación de la rama (pivote en CENTRO_X, PIVOT_Y)
    const dx     = cx - CENTRO_X;
    const dy     = cy - PIVOT_Y;
    const cxRot  = CENTRO_X + dx * cosA - dy * sinA;
    const cyRot  = PIVOT_Y  + dx * sinA + dy * cosA;

    // Convertir coordenadas SVG rotadas → pantalla
    const pt = svgEl.createSVGPoint();
    pt.x = cxRot;
    pt.y = cyRot;
    const ptScreen = pt.matrixTransform(ctm);

    const dist = Math.hypot(clientX - ptScreen.x, clientY - ptScreen.y);
    if (dist < mejorDist) {
      mejorDist = dist;
      mejor = g;
    }
  }

  return mejor;
}

function iniciarArrastre(e) {
  if (!estado || estado.bloqueado) return;
  e.preventDefault();
  // Liberar captura implícita del botón para que pointermove/up alcancen el document
  if (e.target.hasPointerCapture && e.target.hasPointerCapture(e.pointerId)) {
    e.target.releasePointerCapture(e.pointerId);
  }

  // Crear el fantasma visual que sigue al puntero
  _ghost = document.createElement('div');
  _ghost.className = 'bz-arrastre-ghost';
  _ghost.innerHTML = svgFicha();
  _ghost.style.left = (e.clientX - 30) + 'px';
  _ghost.style.top  = (e.clientY - 40) + 'px';
  document.body.appendChild(_ghost);

  // Indicar al SVG que hay un arrastre activo (pulsa los ganchos disponibles)
  estado.raiz.classList.add('bz-modo-colocacion');

  _onMoveGlobal = (ev) => {
    if (!_ghost) return;
    _ghost.style.left = (ev.clientX - 30) + 'px';
    _ghost.style.top  = (ev.clientY - 40) + 'px';

    // Resaltar el gancho candidato bajo el puntero
    const candidato = encontrarGanchoDestino(ev.clientX, ev.clientY);
    if (candidato !== _ganchoResaltado) {
      if (_ganchoResaltado) _ganchoResaltado.classList.remove('bz-gancho-candidato');
      _ganchoResaltado = candidato;
      if (_ganchoResaltado) _ganchoResaltado.classList.add('bz-gancho-candidato');
    }
  };

  _onUpGlobal = (ev) => terminarArrastre(ev);

  document.addEventListener('pointermove',   _onMoveGlobal);
  document.addEventListener('pointerup',     _onUpGlobal);
  document.addEventListener('pointercancel', _onUpGlobal);
}

function terminarArrastre(e) {
  document.removeEventListener('pointermove',   _onMoveGlobal);
  document.removeEventListener('pointerup',     _onUpGlobal);
  document.removeEventListener('pointercancel', _onUpGlobal);

  if (estado) estado.raiz.classList.remove('bz-modo-colocacion');

  // Quitar resaltado del gancho candidato
  if (_ganchoResaltado) {
    _ganchoResaltado.classList.remove('bz-gancho-candidato');
    _ganchoResaltado = null;
  }

  // Suprimir el click en el SVG que seguirá a este pointerup
  _ignorarSiguienteClick = true;
  setTimeout(() => { _ignorarSiguienteClick = false; }, 200);

  if (_ghost) {
    _ghost.remove();
    _ghost = null;

    const origen = _ganchoOrigen;
    _ganchoOrigen = null;

    // Buscar el gancho más cercano al punto de suelta
    const gancho = encontrarGanchoDestino(e.clientX, e.clientY);

    // Si se soltó en el mismo gancho → tap para quitar (ya fue quitado en manejarPointerdownSVG)
    const esOrigen = gancho && origen &&
      gancho.dataset.lado === origen.lado &&
      parseInt(gancho.dataset.pos, 10) === origen.pos;

    if (gancho && !esOrigen) {
      colocarPiezaEnGancho(gancho.dataset.lado, parseInt(gancho.dataset.pos, 10));
    } else if (origen && estado && !estado.bloqueado) {
      // Monito soltado sin recolocar: comprobar si el estado actual ya equilibra
      verificarVictoria();
    }
  } else {
    _ganchoOrigen = null;
  }

  _onMoveGlobal = null;
  _onUpGlobal   = null;
}

function colocarPiezaEnGancho(lado, pos) {
  if (!estado || estado.bloqueado) return;
  const { ronda, plataforma } = estado;
  if (!ronda.interactivo[lado]) return;
  if (new Set(ronda.fijo[lado]).has(pos)) return; // posición fija

  const arr = ronda[lado];
  if (arr.includes(pos)) return; // ya ocupada

  if (ronda.modo === 'limitado') {
    const total = ronda.izquierda.length + ronda.derecha.length;
    if (total >= ronda.piezasMaximas) { plataforma.sounds.fallo(); return; }
  }

  arr.push(pos);
  plataforma.sounds.click();
  actualizarVista();
  verificarVictoria();
}

function celebrarVictoria() {
  if (!estado) return;
  estado.bloqueado = true;
  estado.plataforma.sounds.acierto();
  const rama = estado.raiz.querySelector('.bz-rama');
  if (rama) rama.classList.add('bz-equilibrio');

  if (estado.nivelActual >= NIVELES_TOTAL) {
    estado.timeoutId = setTimeout(() => {
      if (!estado) return;
      estado.plataforma.mostrarRecompensa({ onContinuar: iniciarPartida });
    }, 1800);
  } else {
    estado.timeoutId = setTimeout(() => {
      if (!estado) return;
      estado.bloqueado = false;
      estado.nivelActual += 1;
      pintarRonda();
    }, 1800);
  }
}

function verificarVictoria() {
  if (!estado || estado.bloqueado) return;
  const { ronda } = estado;
  const torqIzq = calcularTorque(ronda.izquierda);
  const torqDer = calcularTorque(ronda.derecha);
  const eq = torqIzq === torqDer && torqIzq > 0;

  if (ronda.modo === 'soluciones') {
    if (!eq || !ronda.izquierda.length || !ronda.derecha.length) return;
    const llave = [...ronda.izquierda].sort((a,b)=>a-b).join(',') + '|' + [...ronda.derecha].sort((a,b)=>a-b).join(',');
    if (ronda.encontradas.includes(llave)) return; // ya encontrada
    ronda.encontradas.push(llave);
    actualizarInfoExtra();
    if (ronda.encontradas.length >= ronda.meta) {
      celebrarVictoria();
    } else {
      estado.plataforma.sounds.acierto();
      const rama = estado.raiz.querySelector('.bz-rama');
      if (rama) {
        rama.classList.add('bz-equilibrio');
        setTimeout(() => {
          if (!rama) return;
          rama.classList.remove('bz-equilibrio');
          ronda.izquierda = [];
          ronda.derecha = [];
          actualizarVista();
        }, 1500);
      }
    }
    return;
  }

  if (ronda.modo === 'limitado') {
    const total = ronda.izquierda.length + ronda.derecha.length;
    if (eq && total === ronda.piezasMaximas) celebrarVictoria();
    return;
  }

  if (eq) celebrarVictoria();
}

function manejarClicGancho(lado, pos) {
  if (!estado || estado.bloqueado) return;
  const { ronda, plataforma } = estado;
  if (!ronda.interactivo[lado]) return;
  const fijoSet = new Set(ronda.fijo[lado]);
  if (fijoSet.has(pos)) return;

  const arr = ronda[lado];
  const idx = arr.indexOf(pos);

  if (idx >= 0) {
    // Toca posición ocupada (y no fija) → quitar pieza, vuelve a la bandeja
    arr.splice(idx, 1);
    plataforma.sounds.click();
    actualizarVista();
    verificarVictoria();
  }
  // Posición libre: el niño debe arrastrar un monito desde la bandeja
}

/** Inicia arrastre desde el cuerpo de un monito para reubicarlo. */
function manejarPointerdownSVG(e) {
  // El drag se detecta sobre el <g class="bz-mono"> con data-lado/data-pos
  const mono = e.target.closest('.bz-mono[data-lado][data-pos]');
  if (!mono) return;
  if (!estado || estado.bloqueado) return;
  const { ronda } = estado;
  const lado = mono.dataset.lado;
  const pos  = parseInt(mono.dataset.pos, 10);
  if (new Set(ronda.fijo[lado]).has(pos)) return; // monito fijo: no mover
  const arr = ronda[lado];
  const idx = arr.indexOf(pos);
  if (idx < 0) return;
  // Quitar el monito de la rama e iniciar arrastre
  arr.splice(idx, 1);
  actualizarVista();
  _ganchoOrigen = { lado, pos }; // para detectar "soltar en el mismo sitio = quitar"
  iniciarArrastre(e);
}

function manejarClicSVG(e) {
  if (_ignorarSiguienteClick) return; // viene de un arrastre, ya procesado
  const gancho = e.target.closest('[data-lado][data-pos]');
  if (!gancho) return;
  manejarClicGancho(gancho.dataset.lado, parseInt(gancho.dataset.pos, 10));
}

function manejarClicOpcion(valor, btnEl) {
  if (!estado || estado.bloqueado) return;
  const { ronda, plataforma } = estado;
  let correcto = false;

  if (ronda.tipo === 'mc-lado') {
    correcto = valor === ronda.respuestaCorrecta;
  } else {
    correcto = Number(valor) === ronda.piezaFaltante || Number(valor) === ronda.objetivo;
  }

  if (correcto) {
    btnEl.classList.add('bz-opcion-ok');
    // Mostrar la pieza colocada visualmente en modo MC
    if (ronda.tipo === 'mc-posicion') {
      const posNum = Number(valor);
      if (ronda.modo === 'suma') {
        ronda.derecha = [posNum];
      } else {
        // completa/falta: añadir la pieza faltante al lado derecho
        ronda.derecha.push(posNum);
      }
      actualizarVista();
    }
    estado.bloqueado = true;
    plataforma.sounds.acierto();
    if (estado.nivelActual >= NIVELES_TOTAL) {
      estado.timeoutId = setTimeout(() => {
        if (!estado) return;
        plataforma.mostrarRecompensa({ onContinuar: iniciarPartida });
      }, 1800);
    } else {
      estado.timeoutId = setTimeout(() => {
        if (!estado) return;
        estado.bloqueado = false;
        estado.nivelActual += 1;
        pintarRonda();
      }, 1800);
    }
  } else {
    plataforma.sounds.fallo();
    btnEl.classList.add('bz-opcion-mal');
    setTimeout(() => btnEl.classList.remove('bz-opcion-mal'), 420);
  }
}

function pintarReferencia(contenedor, izq, der) {
  // Minibalanza de referencia (solo lectura)
  const wrap = document.createElement('div');
  wrap.className = 'bz-referencia-wrap';
  const lbl = document.createElement('p');
  lbl.className = 'bz-referencia-lbl';
  lbl.textContent = estado.plataforma.t('balanza.copia.referencia');
  wrap.appendChild(lbl);

  const svgWrap = document.createElement('div');
  svgWrap.className = 'bz-referencia-svg';
  svgWrap.innerHTML = svgBalanzaBase({ izquierda: false, derecha: false });
  wrap.appendChild(svgWrap);
  contenedor.appendChild(wrap);

  // Colocar monitos de referencia
  const monitosEl = svgWrap.querySelector('.bz-monitos');
  if (monitosEl) {
    monitosEl.innerHTML = [
      ...izq.map(p => svgMonito(CENTRO_X - p * PASO_PX, RAMA_Y, true)),
      ...der.map(p => svgMonito(CENTRO_X + p * PASO_PX, RAMA_Y, true)),
    ].join('');
  }
  const rama = svgWrap.querySelector('.bz-rama');
  if (rama) rama.style.transform = 'rotate(0deg)';
}

function pintarRonda() {
  if (!estado) return;
  const { plataforma, modo } = estado;

  // Generar la ronda del nivel actual
  const generadores = {
    'equilibra':  generarRondaEquilibra,
    'completa':   generarRondaCompleta,
    'suma':       generarRondaSuma,
    'descompone': generarRondaDescompone,
    'copia':      generarRondaCopia,
    'falta':      generarRondaFalta,
    'cual-pesa':  generarRondaCualPesa,
    'corrige':    generarRondaCorrige,
    'limitado':   generarRondaLimitado,
    'soluciones': generarRondaSoluciones,
  };
  estado.ronda = generadores[modo](estado.nivelActual);

  const raiz = estado.raiz;
  raiz.innerHTML = '';

  // ── Cabecera ──
  const cabecera = document.createElement('header');
  cabecera.className = 'bz-cabecera';
  const h1 = document.createElement('h1');
  h1.textContent = `${plataforma.icono || ''} ${plataforma.nombre}`.trim();
  const instrEl = document.createElement('p');
  instrEl.className = 'bz-instrucciones';
  instrEl.textContent = plataforma.t(`balanza.${modo}.instrucciones`);
  cabecera.append(h1, instrEl);

  // TTS de instrucción para los modos que tienen clave propia
  const clavesTts = ['equilibra', 'completa', 'cual-pesa'];
  if (clavesTts.includes(modo)) {
    plataforma.tts.speak(plataforma.t(`balanza.${modo}.tts`));
  }
  raiz.appendChild(cabecera);

  // ── Contador de nivel ──
  const nivelEl = document.createElement('div');
  nivelEl.className = 'bz-nivel';
  nivelEl.textContent = plataforma.t('balanza.nivel', {
    n: estado.nivelActual, total: NIVELES_TOTAL,
  });
  raiz.appendChild(nivelEl);

  // ── Referencia visual (solo modo copia) ──
  if (modo === 'copia') {
    pintarReferencia(raiz, estado.ronda.referencia.izquierda, estado.ronda.referencia.derecha);
  }

  // ── SVG principal ──
  const svgContenedor = document.createElement('div');
  svgContenedor.className = 'bz-svg-contenedor';
  svgContenedor.innerHTML = svgBalanzaBase(estado.ronda.interactivo);
  raiz.appendChild(svgContenedor);

  const svgEl = svgContenedor.querySelector('.bz-svg');
  svgEl.addEventListener('click',       manejarClicSVG);
  svgEl.addEventListener('pointerdown', manejarPointerdownSVG);

  // ── Info extra (limitado, soluciones) ──
  const infoEl = document.createElement('div');
  infoEl.className = 'bz-info-extra';
  raiz.appendChild(infoEl);

  // ── Bandeja de piezas disponibles ──
  const bandejaEl = document.createElement('div');
  bandejaEl.className = 'bz-bandeja';
  raiz.appendChild(bandejaEl);

  // ── Opciones MC ──
  const { ronda } = estado;
  if (ronda.tipo === 'mc-posicion' || ronda.tipo === 'mc-lado') {
    const opcionesContenedor = document.createElement('div');
    opcionesContenedor.className = 'bz-opciones';
    ronda.opciones.forEach(val => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bz-opcion';
      if (ronda.tipo === 'mc-lado') {
        btn.textContent = plataforma.t(`balanza.lado.${val}`);
        btn.dataset.icono = val === 'izquierda' ? '⬅️' : val === 'derecha' ? '➡️' : '⚖️';
      } else {
        btn.textContent = String(val);
      }
      btn.addEventListener('click', () => {
        plataforma.sounds.click();
        manejarClicOpcion(val, btn);
      });
      opcionesContenedor.appendChild(btn);
    });
    raiz.appendChild(opcionesContenedor);
  }

  // ── Pintado inicial de la vista ──
  actualizarVista();
}

function iniciarPartida() {
  if (!estado) return;
  estado.nivelActual = 1;
  estado.bloqueado   = false;
  pintarRonda();
}

function montar(contenedor, plataforma) {
  inyectarEstilosUnaVez();
  contenedor.innerHTML = '';

  const raiz = document.createElement('div');
  raiz.className = 'bz-app';
  contenedor.appendChild(raiz);

  // Extraer el modo del appId, p.ej. 'balanza-equilibra' → 'equilibra'
  const modo = (plataforma.appId || '').replace('balanza-', '') || 'equilibra';

  estado = {
    contenedor, plataforma, raiz,
    modo, ronda: null,
    nivelActual: 1, bloqueado: false,
  };

  iniciarPartida();
}

function desmontar() {
  estado = null;
}

export default { id: 'balanza', icono: '⚖️', montar, desmontar };
