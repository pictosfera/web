// Pictosfera — mecánica: cuadrícula de multiplicación por áreas.
//
// El niño ve una operación (A × B =) y tiene que seleccionar sobre una
// cuadrícula de 10×10 el rectángulo que tenga exactamente A filas y B
// columnas (o B filas y A columnas, propiedad conmutativa). Mientras
// arrastra o toca celda a clic, un cuadro en tiempo real muestra
// [filas] × [cols] = [producto]. Un botón verde "?" dispara la
// validación (accesibilidad: permite seleccionar de un clic a la vez).
//
// Dos modos de selección unificados:
//   · Arrastre: pointerdown fija el ancla, pointermove actualiza el
//     extremo en tiempo real, pointerup finaliza el extremo.
//   · Clic a clic: el primer toque fija el ancla, cada toque posterior
//     mueve el extremo (ancla fija). "?" valida en ambos casos.
//
// 10 rondas por partida. No requiere material de pictogramas.

const ESTILOS_ID = 'cuadricula-multiplicacion-estilos';
const FILAS = 10;
const COLS  = 10;
const RONDAS_TOTAL = 10;

let estado = null;

// ── Lógica pura (testable sin DOM) ───────────────────────────────────────────

/** Genera un par aleatorio (a, b) con a,b en [1..10]. */
export function generarEjercicio() {
  return {
    a: Math.floor(Math.random() * 10) + 1,
    b: Math.floor(Math.random() * 10) + 1
  };
}

/** Calcula las dimensiones del rectángulo entre dos celdas.
 *  Funciona con cualquier orden de coordenadas. */
export function calcularSeleccion(filaInicio, colInicio, filaFin, colFin) {
  const filas = Math.abs(filaFin - filaInicio) + 1;
  const cols  = Math.abs(colFin  - colInicio ) + 1;
  return { filas, cols, total: filas * cols };
}

/** True si el area (filas x cols) representa a x b, aceptando
 *  la propiedad conmutativa. */
export function esCorrecta(filas, cols, a, b) {
  return (filas === a && cols === b) || (filas === b && cols === a);
}

/** Normaliza dos esquinas al rango min/max para iterar celdas. */
export function rangoDesde(filaAncla, colAncla, filaFin, colFin) {
  return {
    filaMin: Math.min(filaAncla, filaFin),
    filaMax: Math.max(filaAncla, filaFin),
    colMin:  Math.min(colAncla,  colFin ),
    colMax:  Math.max(colAncla,  colFin )
  };
}

// ── CSS ───────────────────────────────────────────────────────────────────────

function inyectarEstilosUnaVez() {
  if (document.getElementById(ESTILOS_ID)) return;
  const link = document.createElement('link');
  link.id   = ESTILOS_ID;
  link.rel  = 'stylesheet';
  link.href = new URL('cuadriculaMultiplicacion.css', import.meta.url).href;
  document.head.appendChild(link);
}

// ── Construccion del DOM ──────────────────────────────────────────────────────

/** Crea la tabla 10x10 con esquina, etiquetas de columna (azul) y
 *  etiquetas de fila (rojo). Devuelve { tabla, celdas } donde
 *  celdas[f][c] es el elemento div de la fila f, columna c (base 1). */
function crearTabla() {
  const tabla = document.createElement('div');
  tabla.className = 'cuadri-tabla';

  // Esquina vacia (posicion 0,0)
  const corner = document.createElement('div');
  corner.className = 'cuadri-corner';
  tabla.appendChild(corner);

  // Etiquetas de columna (1-10)
  for (let c = 1; c <= COLS; c++) {
    const etq = document.createElement('div');
    etq.className = 'cuadri-etiqueta-col';
    etq.textContent = c;
    tabla.appendChild(etq);
  }

  // Filas: etiqueta + 10 celdas
  const celdas = Array.from({ length: FILAS + 1 }, () => new Array(COLS + 1).fill(null));
  for (let f = 1; f <= FILAS; f++) {
    const etqFila = document.createElement('div');
    etqFila.className = 'cuadri-etiqueta-fila';
    etqFila.textContent = f;
    tabla.appendChild(etqFila);

    for (let c = 1; c <= COLS; c++) {
      const celda = document.createElement('div');
      celda.className = 'cuadri-celda';
      celda.dataset.fila = f;
      celda.dataset.col  = c;
      celda.tabIndex     = 0;
      celda.setAttribute('role', 'gridcell');
      celda.setAttribute('aria-label', 'Fila ' + f + ', columna ' + c);
      tabla.appendChild(celda);
      celdas[f][c] = celda;
    }
  }

  return { tabla, celdas };
}

// ── Estados visuales de celdas ────────────────────────────────────────────────

function actualizarResaltado(celdas, rango) {
  for (let f = 1; f <= FILAS; f++) {
    for (let c = 1; c <= COLS; c++) {
      const enRango = f >= rango.filaMin && f <= rango.filaMax &&
                      c >= rango.colMin  && c <= rango.colMax;
      celdas[f][c].classList.toggle('cuadri-seleccionada', enRango);
    }
  }
}

function limpiarResaltado(celdas) {
  for (let f = 1; f <= FILAS; f++) {
    for (let c = 1; c <= COLS; c++) {
      celdas[f][c].classList.remove('cuadri-seleccionada', 'cuadri-error');
    }
  }
}

function marcarCompletadas(celdas, rango) {
  for (let f = rango.filaMin; f <= rango.filaMax; f++) {
    for (let c = rango.colMin; c <= rango.colMax; c++) {
      celdas[f][c].classList.remove('cuadri-seleccionada');
      celdas[f][c].classList.add('cuadri-completada');
    }
  }
}

function marcarError(celdas, rango) {
  for (let f = rango.filaMin; f <= rango.filaMax; f++) {
    for (let c = rango.colMin; c <= rango.colMax; c++) {
      celdas[f][c].classList.add('cuadri-error');
    }
  }
}

function limpiarTodasLasCeldas(celdas) {
  for (let f = 1; f <= FILAS; f++) {
    for (let c = 1; c <= COLS; c++) {
      celdas[f][c].className = 'cuadri-celda';
    }
  }
}

// ── Live box ─────────────────────────────────────────────────────────────────

function actualizarLiveBox(spanFilas, spanCols, spanTotal, filas, cols) {
  if (filas == null) {
    spanFilas.textContent = '—';
    spanCols.textContent  = '—';
    spanTotal.textContent = '—';
  } else {
    spanFilas.textContent = filas;
    spanCols.textContent  = cols;
    spanTotal.textContent = filas * cols;
  }
}

// ── Interaccion: arrastre + clic a clic ──────────────────────────────────────

function activarInteraccion(tabla, celdas, spanFilas, spanCols, spanTotal, btnValidar) {
  let ancla       = null;   // { fila, col } — esquina fija del rectangulo
  let finSel      = null;   // { fila, col } — esquina movil
  let faseDos     = false;  // true tras fijar el ancla
  let pointerHeld = false;  // true mientras hay un pointer down activo

  function celdaBajoPunto(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    let cur = el;
    while (cur && !cur.classList.contains('cuadri-celda')) {
      cur = cur.parentElement;
    }
    return cur && cur.dataset.fila ? cur : null;
  }

  function coordsDe(celda) {
    return { fila: parseInt(celda.dataset.fila, 10), col: parseInt(celda.dataset.col, 10) };
  }

  function aplicarExtremo(celda) {
    if (!celda || !ancla) return;
    const { fila, col } = coordsDe(celda);
    finSel = { fila, col };
    const { filas, cols } = calcularSeleccion(ancla.fila, ancla.col, finSel.fila, finSel.col);
    const rango = rangoDesde(ancla.fila, ancla.col, finSel.fila, finSel.col);
    actualizarResaltado(celdas, rango);
    actualizarLiveBox(spanFilas, spanCols, spanTotal, filas, cols);
  }

  // Puntero (arrastre y toque)
  tabla.addEventListener('pointerdown', (ev) => {
    if (!estado || estado.bloqueado) return;
    const celda = celdaBajoPunto(ev.clientX, ev.clientY);
    if (!celda) return;
    ev.preventDefault();
    pointerHeld = true;
    try { tabla.setPointerCapture(ev.pointerId); } catch (_) { /* no critico */ }

    const { fila, col } = coordsDe(celda);
    if (!faseDos) {
      // Fase A → Fase B: fijar ancla
      ancla  = { fila, col };
      finSel = { fila, col };
      faseDos = true;
    } else {
      // Fase B: nuevo pointerdown mueve solo el extremo
      finSel = { fila, col };
    }
    const { filas, cols } = calcularSeleccion(ancla.fila, ancla.col, finSel.fila, finSel.col);
    const rango = rangoDesde(ancla.fila, ancla.col, finSel.fila, finSel.col);
    actualizarResaltado(celdas, rango);
    actualizarLiveBox(spanFilas, spanCols, spanTotal, filas, cols);
  });

  tabla.addEventListener('pointermove', (ev) => {
    if (!estado || estado.bloqueado || !pointerHeld || !ancla) return;
    ev.preventDefault();
    aplicarExtremo(celdaBajoPunto(ev.clientX, ev.clientY));
  });

  tabla.addEventListener('pointerup', (ev) => {
    if (!pointerHeld) return;
    pointerHeld = false;
    if (ancla) aplicarExtremo(celdaBajoPunto(ev.clientX, ev.clientY));
  });

  tabla.addEventListener('pointercancel', () => { pointerHeld = false; });

  // Teclado (accesibilidad)
  tabla.addEventListener('keydown', (ev) => {
    if (!estado || estado.bloqueado) return;
    const celda = document.activeElement;
    if (!celda || !celda.classList.contains('cuadri-celda')) return;
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault();
    const { fila, col } = coordsDe(celda);
    if (!faseDos) {
      ancla  = { fila, col };
      finSel = { fila, col };
      faseDos = true;
    } else {
      finSel = { fila, col };
    }
    const { filas, cols } = calcularSeleccion(ancla.fila, ancla.col, finSel.fila, finSel.col);
    const rango = rangoDesde(ancla.fila, ancla.col, finSel.fila, finSel.col);
    actualizarResaltado(celdas, rango);
    actualizarLiveBox(spanFilas, spanCols, spanTotal, filas, cols);
  });

  // Reset de seleccion
  function resetSeleccion() {
    ancla       = null;
    finSel      = null;
    faseDos     = false;
    pointerHeld = false;
    limpiarResaltado(celdas);
    actualizarLiveBox(spanFilas, spanCols, spanTotal, null, null);
  }

  // Boton ?
  btnValidar.addEventListener('click', () => {
    if (!estado || estado.bloqueado || !faseDos || !ancla || !finSel) return;

    const { filas, cols } = calcularSeleccion(ancla.fila, ancla.col, finSel.fila, finSel.col);
    const rango = rangoDesde(ancla.fila, ancla.col, finSel.fila, finSel.col);
    const { a, b } = estado.ejercicioActual;

    if (esCorrecta(filas, cols, a, b)) {
      // Correcto
      estado.bloqueado = true;
      estado.plataforma.sounds.acierto();
      estado.plataforma.tts.speak(
        estado.plataforma.t('cuadriculaMultiplicacion.tts_correcto', { a, b, resultado: a * b })
      );
      marcarCompletadas(celdas, rango);

      const esUltima = estado.rondaActual >= RONDAS_TOTAL;
      estado.timeoutId = setTimeout(() => {
        if (!estado) return;
        limpiarTodasLasCeldas(celdas);
        resetSeleccion();
        if (esUltima) {
          estado.plataforma.mostrarRecompensa({ onContinuar: iniciarPartida });
        } else {
          estado.rondaActual++;
          estado.bloqueado = false;
          siguienteRonda();
        }
      }, 2000);

    } else {
      // Incorrecto
      marcarError(celdas, rango);
      estado.plataforma.tts.speak(
        estado.plataforma.t('cuadriculaMultiplicacion.tts_incorrecto')
      );
      estado.timeoutId = setTimeout(() => {
        if (!estado) return;
        resetSeleccion();
      }, 800);
    }
  });

  return { resetSeleccion };
}

// ── Flujo del juego ───────────────────────────────────────────────────────────

function pintarRonda() {
  const { plataforma, ejercicioActual, rondaActual } = estado;
  const { a, b } = ejercicioActual;

  estado.raiz.querySelector('.cuadri-ronda').textContent =
    plataforma.t('cuadriculaMultiplicacion.nivel', { n: rondaActual, total: RONDAS_TOTAL });

  estado.raiz.querySelector('.cuadri-problema-texto').textContent = a + ' × ' + b + ' =';

  plataforma.tts.speak(
    plataforma.t('cuadriculaMultiplicacion.tts_enunciado', { a, b })
  );
}

function siguienteRonda() {
  if (!estado) return;
  estado.ejercicioActual = generarEjercicio();
  pintarRonda();
}

function iniciarPartida() {
  if (!estado) return;
  estado.rondaActual   = 1;
  estado.bloqueado     = false;
  limpiarTodasLasCeldas(estado.celdas);
  estado.resetSeleccion();
  siguienteRonda();
}

// ── Montaje / desmontaje ──────────────────────────────────────────────────────

function montar(contenedor, plataforma) {
  inyectarEstilosUnaVez();
  contenedor.innerHTML = '';

  const raiz = document.createElement('div');
  raiz.className = 'cuadri-app';

  // Cabecera
  const cab   = document.createElement('header');
  cab.className = 'cuadri-cabecera';
  const h1    = document.createElement('h1');
  h1.textContent = ((plataforma.icono || '') + ' ' + plataforma.nombre).trim();
  const instr = document.createElement('p');
  instr.textContent = plataforma.t('cuadriculaMultiplicacion.instrucciones');
  cab.append(h1, instr);

  // Marcador de ronda
  const marcador = document.createElement('div');
  marcador.className = 'cuadri-marcador';
  const rondaEl  = document.createElement('span');
  rondaEl.className = 'cuadri-ronda';
  marcador.appendChild(rondaEl);

  // Cuadro del problema: "A x B ="
  const problemaZona = document.createElement('div');
  problemaZona.className = 'cuadri-problema';
  const problemaTxt  = document.createElement('span');
  problemaTxt.className = 'cuadri-problema-texto';
  problemaZona.appendChild(problemaTxt);

  // Zona de respuesta: live box + boton ?
  const respuestaZona = document.createElement('div');
  respuestaZona.className = 'cuadri-respuesta-zona';

  const liveBox   = document.createElement('div');
  liveBox.className = 'cuadri-live-box';

  const spanFilas = document.createElement('span');
  spanFilas.className = 'cuadri-live-filas';

  const por1 = document.createElement('span');
  por1.className = 'cuadri-live-op';
  por1.textContent = ' × ';

  const spanCols = document.createElement('span');
  spanCols.className = 'cuadri-live-cols';

  const igual = document.createElement('span');
  igual.className = 'cuadri-live-op';
  igual.textContent = ' = ';

  const spanTotal = document.createElement('span');
  spanTotal.className = 'cuadri-live-total';

  liveBox.append(spanFilas, por1, spanCols, igual, spanTotal);

  const btnValidar = document.createElement('button');
  btnValidar.className = 'cuadri-btn-validar';
  btnValidar.textContent = '?';
  btnValidar.setAttribute('aria-label', plataforma.t('cuadriculaMultiplicacion.validar_aria'));

  respuestaZona.append(liveBox, btnValidar);

  // Cuadricula
  const { tabla, celdas } = crearTabla();

  raiz.append(cab, marcador, problemaZona, respuestaZona, tabla);
  contenedor.appendChild(raiz);

  estado = {
    contenedor,
    plataforma,
    raiz,
    celdas,
    rondaActual:     1,
    ejercicioActual: null,
    bloqueado:       false,
    timeoutId:       null,
    resetSeleccion:  null
  };

  const { resetSeleccion } = activarInteraccion(
    tabla, celdas, spanFilas, spanCols, spanTotal, btnValidar
  );
  estado.resetSeleccion = resetSeleccion;

  iniciarPartida();
}

function desmontar() {
  if (estado && estado.timeoutId) clearTimeout(estado.timeoutId);
  estado = null;
}

export default {
  id:       'cuadricula-multiplicacion',
  nombre:   'Cuadricula de multiplicacion',
  icono:    '✖️',
  estante:  'MULTIPLICAR',
  montar,
  desmontar
};
