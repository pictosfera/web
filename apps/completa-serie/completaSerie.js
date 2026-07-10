// Pictosfera — mecánica: "completa la serie".
//
// Tres variantes detectadas automáticamente por plataforma.appId:
//   - 'series-pictogramas-*' → tipo 'pictogramas': patrón AB con imágenes
//     de la biblioteca del usuario.
//   - 'series-colores-*'     → tipo 'colores':     patrón AB con esferas
//     de colores predefinidos (no necesita material externo).
//   - 'series-numeros-*'     → tipo 'numeros':     secuencia aritmética
//     con paso constante (no necesita material externo).
//
// En pantalla: fila de 6 celdas con 2 huecos en blanco. Debajo: banco
// de 3 piezas arrastrables (las 2 necesarias para rellenar los huecos +
// 1 distractor). El niño arrastra las piezas correctas a los huecos.
// 5 rondas por partida; al terminar, pantalla de recompensa.
//
// El ajuste "huecosLibres" (zona adulto > Ajustes) controla la posición
// de los huecos: desactivado = siempre al final de la serie; activado =
// cualquier posición. Para patrones AB garantiza un hueco en una
// posición del elemento A y otro del elemento B, independientemente de
// la dificultad elegida.
//
// Es "código de confianza del autor": JavaScript nativo, módulo ES, sin
// framework. Todo lo que necesita llega a través de `plataforma`.
// El arrastre reutiliza la dinámica de puntero de otras mecánicas del
// proyecto (duplicada a propósito: cada mecánica es independiente).

const ESTILOS_ID   = 'completa-serie-estilos';
const RONDAS_TOTAL = 5;
const SERIE_LARGO  = 6;
const UMBRAL_ARRASTRE = 4; // px; por debajo de esto se considera toque, no arrastre

let estado = null;
// estado: { plataforma, tipo, medios, ajustesPista, raiz, contenedor,
//           rondaActual, serie, huecos, banco, huecoEls, piezaEls,
//           colocadas, bloqueado, timeoutId }

// ── COLORES PREDEFINIDOS ─────────────────────────────────────────────────────

/** Paleta de 8 colores para la variante "colores". Se elige una pareja
 *  aleatoria en cada ronda y un tercer color como distractor. */
export const COLORES_SERIE = [
  { id: 'rojo',     nombre: 'rojo',     hex: '#E83030' },
  { id: 'azul',     nombre: 'azul',     hex: '#2850D0' },
  { id: 'amarillo', nombre: 'amarillo', hex: '#F5C518' },
  { id: 'verde',    nombre: 'verde',    hex: '#28A028' },
  { id: 'naranja',  nombre: 'naranja',  hex: '#F08020' },
  { id: 'morado',   nombre: 'morado',   hex: '#8030C0' },
  { id: 'rosa',     nombre: 'rosa',     hex: '#F060A0' },
  { id: 'turquesa', nombre: 'turquesa', hex: '#20B0B0' },
];

// ── UTILIDADES ───────────────────────────────────────────────────────────────

/** Mezcla `arr` en sitio (Fisher-Yates) y lo devuelve. */
function mezclar(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Devuelve un nuevo array con `n` elementos distintos elegidos al azar
 *  de `arr`. No muta el original. */
function elegirDistintos(arr, n) {
  return mezclar([...arr]).slice(0, n);
}

// ── LÓGICA PURA (exportada) ──────────────────────────────────────────────────

/** ¿Hay suficiente material para jugar esta variante?
 *  Los tipos 'colores' y 'numeros' son procedurales y siempre pueden
 *  jugar. El tipo 'pictogramas' necesita al menos 3 medios distintos. */
export function hayMaterialSuficiente(tipo, medios) {
  if (tipo === 'pictogramas') {
    return Array.isArray(medios) && medios.filter(Boolean).length >= 3;
  }
  return true;
}

/** Posiciones de los 2 huecos para un patrón AB.
 *  Garantiza siempre un hueco en posición par (elemento A) y otro en
 *  posición impar (elemento B), para que el banco tenga siempre las
 *  dos piezas distintas. */
function huecosParaAB(huecosLibres) {
  if (!huecosLibres) return [4, 5]; // fin de serie: posición par 4, impar 5
  const pares   = [0, 2, 4];
  const impares = [1, 3, 5];
  const p = pares[Math.floor(Math.random() * pares.length)];
  const i = impares[Math.floor(Math.random() * impares.length)];
  return [p, i].sort((a, b) => a - b);
}

/** Posiciones de los 2 huecos para una secuencia aritmética.
 *  Si huecosLibres = false, siempre al final (posiciones 4 y 5).
 *  Si huecosLibres = true, cualquier par de posiciones distintas. */
function huecosParaArit(huecosLibres) {
  if (!huecosLibres) return [4, 5];
  const indices = [0, 1, 2, 3, 4, 5];
  mezclar(indices);
  return indices.slice(0, 2).sort((a, b) => a - b);
}

/**
 * Genera una serie completa con sus huecos y banco de piezas.
 * Devuelve null si no hay material suficiente.
 *
 * @param {string} tipo       - 'pictogramas' | 'colores' | 'numeros'
 * @param {Array}  medios     - Array de medios del portal (solo para 'pictogramas')
 * @param {boolean} huecosLibres - Ajuste de posición de huecos
 * @returns {{ serie, huecos, banco } | null}
 *
 * Elemento: objeto con al menos { tipo, id }; campos extra según tipo:
 *   pictograma → { tipo:'pictograma', id:string, medio:object }
 *   color      → { tipo:'color',      id:string, nombre:string, hex:string }
 *   numero     → { tipo:'numero',     id:string, valor:number }
 *
 * banco: array[3] de Elemento mezclados; el distractor lleva además
 *   { esDistractor: true }. Cada pieza lleva { clave: 0|1|2 } para
 *   identificar su elemento DOM en el banco.
 */
export function generarSerie(tipo, medios, huecosLibres) {
  if (tipo === 'pictogramas') {
    const pool = (medios || []).filter(Boolean);
    if (pool.length < 3) return null;
    const [mA, mB, mD] = elegirDistintos(pool, 3);
    const elA    = { tipo: 'pictograma', id: String(mA.id), medio: mA };
    const elB    = { tipo: 'pictograma', id: String(mB.id), medio: mB };
    const elDist = { tipo: 'pictograma', id: String(mD.id), medio: mD, esDistractor: true };
    const serie  = Array.from({ length: SERIE_LARGO }, (_, i) => (i % 2 === 0 ? { ...elA } : { ...elB }));
    const huecos = huecosParaAB(Boolean(huecosLibres));
    const banco  = mezclar([
      { ...serie[huecos[0]], clave: 0 },
      { ...serie[huecos[1]], clave: 1 },
      { ...elDist, clave: 2 },
    ]);
    return { serie, huecos, banco };
  }

  if (tipo === 'colores') {
    const [cA, cB, cD] = elegirDistintos(COLORES_SERIE, 3);
    const elA    = { tipo: 'color', id: cA.id, nombre: cA.nombre, hex: cA.hex };
    const elB    = { tipo: 'color', id: cB.id, nombre: cB.nombre, hex: cB.hex };
    const elDist = { tipo: 'color', id: cD.id, nombre: cD.nombre, hex: cD.hex, esDistractor: true };
    const serie  = Array.from({ length: SERIE_LARGO }, (_, i) => (i % 2 === 0 ? { ...elA } : { ...elB }));
    const huecos = huecosParaAB(Boolean(huecosLibres));
    const banco  = mezclar([
      { ...serie[huecos[0]], clave: 0 },
      { ...serie[huecos[1]], clave: 1 },
      { ...elDist, clave: 2 },
    ]);
    return { serie, huecos, banco };
  }

  if (tipo === 'numeros') {
    // Secuencia aritmética: inicio aleatorio (1–9), paso aleatorio (1–3)
    const inicio = 1 + Math.floor(Math.random() * 9);
    const paso   = 1 + Math.floor(Math.random() * 3);
    const serie  = Array.from({ length: SERIE_LARGO }, (_, i) => {
      const v = inicio + i * paso;
      return { tipo: 'numero', id: String(v), valor: v };
    });
    const huecos = huecosParaArit(Boolean(huecosLibres));
    // Distractor: el siguiente valor tras el último de la serie
    const siguienteValor = inicio + SERIE_LARGO * paso;
    const elDist = { tipo: 'numero', id: String(siguienteValor), valor: siguienteValor, esDistractor: true };
    const banco  = mezclar([
      { ...serie[huecos[0]], clave: 0 },
      { ...serie[huecos[1]], clave: 1 },
      { ...elDist, clave: 2 },
    ]);
    return { serie, huecos, banco };
  }

  return null;
}

/** ¿La pieza que el niño ha arrastrado a `posicion` es la correcta? */
export function esColocacionCorrecta(serie, posicion, pieza) {
  if (!Array.isArray(serie) || posicion < 0 || posicion >= serie.length || !pieza) return false;
  return serie[posicion].id === pieza.id;
}

/** ¿Todos los huecos de la serie tienen una pieza correcta colocada? */
export function serieCompleta(serie, huecos, colocadas) {
  if (!Array.isArray(huecos) || !huecos.length) return false;
  return huecos.every((pos) => {
    const pieza = colocadas && colocadas[pos];
    return pieza != null && esColocacionCorrecta(serie, pos, pieza);
  });
}

// ── CSS ──────────────────────────────────────────────────────────────────────

function inyectarEstilos() {
  if (document.getElementById(ESTILOS_ID)) return;
  const link = document.createElement('link');
  link.id   = ESTILOS_ID;
  link.rel  = 'stylesheet';
  link.href = new URL('completaSerie.css', import.meta.url).href;
  document.head.appendChild(link);
}

// ── DETECCIÓN DE TIPO ─────────────────────────────────────────────────────────

function detectarTipo(appId) {
  if (!appId) return 'pictogramas';
  if (appId.startsWith('series-colores')) return 'colores';
  if (appId.startsWith('series-numeros')) return 'numeros';
  return 'pictogramas';
}

// ── RENDERIZADO DE CONTENIDO ─────────────────────────────────────────────────

/** Vacía `contenedor` y pinta en él el contenido visual del `elemento`. */
function pintarElemento(contenedor, elemento, plataforma) {
  contenedor.innerHTML = '';
  if (!elemento) return;

  if (elemento.tipo === 'pictograma') {
    const img = document.createElement('img');
    img.className   = 'cs-img';
    img.src         = plataforma.getDisplayUrl(elemento.medio);
    img.alt         = elemento.medio.nombre || '';
    img.draggable   = false;
    contenedor.appendChild(img);
  } else if (elemento.tipo === 'color') {
    const esfera = document.createElement('div');
    esfera.className = 'cs-esfera';
    esfera.style.background = elemento.hex;
    esfera.setAttribute('aria-label', elemento.nombre);
    contenedor.appendChild(esfera);
  } else if (elemento.tipo === 'numero') {
    const num = document.createElement('span');
    num.className   = 'cs-numero-txt';
    num.textContent = String(elemento.valor);
    contenedor.appendChild(num);
  }
}

// ── CONSTRUCCIÓN DE LA UI ─────────────────────────────────────────────────────

function construirRonda() {
  const { raiz, serie, huecos, banco, plataforma, rondaActual } = estado;
  raiz.innerHTML = '';

  // Cabecera
  const instrEl = document.createElement('p');
  instrEl.className   = 'cs-instrucciones';
  instrEl.textContent = plataforma.t('completaSerie.instrucciones');
  raiz.appendChild(instrEl);

  const progresoEl = document.createElement('p');
  progresoEl.className   = 'cs-progreso';
  progresoEl.textContent = plataforma.t('completaSerie.ronda', { n: rondaActual, total: RONDAS_TOTAL });
  raiz.appendChild(progresoEl);

  // Fila de serie
  const filaEl    = document.createElement('div');
  filaEl.className = 'cs-serie';
  const huecoEls  = []; // [{ pos, el }]

  for (let i = 0; i < SERIE_LARGO; i++) {
    const celda = document.createElement('div');
    celda.className = 'cs-celda';

    if (huecos.includes(i)) {
      celda.classList.add('cs-hueco');
      celda.dataset.pos = String(i);
      celda.setAttribute('aria-label', plataforma.t('completaSerie.hueco_vacio'));
      huecoEls.push({ pos: i, el: celda });
    } else {
      celda.classList.add('cs-conocido');
      pintarElemento(celda, serie[i], plataforma);
    }
    filaEl.appendChild(celda);
  }
  raiz.appendChild(filaEl);

  // Banco de piezas
  const bancoEl  = document.createElement('div');
  bancoEl.className = 'cs-banco';
  const piezaEls = []; // [{ clave, el }]

  banco.forEach((pieza) => {
    const piezaEl = document.createElement('div');
    piezaEl.className        = 'cs-pieza';
    piezaEl.dataset.clave    = String(pieza.clave);
    piezaEl.setAttribute('role', 'button');
    piezaEl.setAttribute('tabindex', '0');
    pintarElemento(piezaEl, pieza, plataforma);
    piezaEls.push({ clave: pieza.clave, el: piezaEl });
    activarArrastre(piezaEl, pieza, huecoEls);
    bancoEl.appendChild(piezaEl);
  });
  raiz.appendChild(bancoEl);

  estado.huecoEls  = huecoEls;
  estado.piezaEls  = piezaEls;
  estado.colocadas = {};
}

// ── ARRASTRE ──────────────────────────────────────────────────────────────────

function detectarHueco(huecoEls, x, y) {
  return huecoEls.find(({ el }) => {
    if (!el.classList.contains('cs-hueco')) return false; // ya relleno
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }) || null;
}

function activarArrastre(piezaEl, pieza, huecoEls) {
  let activo    = false;
  let arrastrado = false;
  let inicioX   = 0;
  let inicioY   = 0;

  function resaltarHuecos(x, y) {
    const sobre = detectarHueco(huecoEls, x, y);
    huecoEls.forEach(({ el }) => {
      if (!el.classList.contains('cs-hueco')) return;
      el.classList.toggle('cs-hueco-resaltado', Boolean(sobre) && sobre.el === el);
    });
  }

  function quitarResaltados() {
    huecoEls.forEach(({ el }) => el.classList.remove('cs-hueco-resaltado'));
  }

  function onPointerDown(ev) {
    if (!estado || estado.bloqueado) return;
    activo     = true;
    arrastrado = false;
    inicioX    = ev.clientX;
    inicioY    = ev.clientY;
    piezaEl.style.transition = 'none';
    try { piezaEl.setPointerCapture(ev.pointerId); } catch { /* sin soporte: no pasa nada */ }
    piezaEl.classList.add('cs-pieza-activa');
  }

  function onPointerMove(ev) {
    if (!activo) return;
    const dx = ev.clientX - inicioX;
    const dy = ev.clientY - inicioY;
    if (Math.abs(dx) > UMBRAL_ARRASTRE || Math.abs(dy) > UMBRAL_ARRASTRE) arrastrado = true;
    piezaEl.style.transform = `translate(${dx}px, ${dy}px)`;
    resaltarHuecos(ev.clientX, ev.clientY);
  }

  function soltar(ev) {
    if (!activo) return;
    activo = false;
    piezaEl.classList.remove('cs-pieza-activa');
    quitarResaltados();
    piezaEl.style.transition = 'transform var(--transition-base)';
    piezaEl.style.transform  = 'translate(0, 0)';

    const huecoSoltado = arrastrado ? detectarHueco(huecoEls, ev.clientX, ev.clientY) : null;
    if (huecoSoltado) intentarColocar(pieza, huecoSoltado);
  }

  function cancelar() {
    activo = false;
    piezaEl.classList.remove('cs-pieza-activa');
    quitarResaltados();
    piezaEl.style.transition = 'transform var(--transition-base)';
    piezaEl.style.transform  = 'translate(0, 0)';
  }

  piezaEl.addEventListener('pointerdown',   onPointerDown);
  piezaEl.addEventListener('pointermove',   onPointerMove);
  piezaEl.addEventListener('pointerup',     soltar);
  piezaEl.addEventListener('pointercancel', cancelar);
}

// ── RESPUESTA ─────────────────────────────────────────────────────────────────

function intentarColocar(pieza, { pos, el: huecoEl }) {
  if (!estado || estado.bloqueado) return;
  if (!huecoEl.classList.contains('cs-hueco')) return; // hueco ya relleno

  if (esColocacionCorrecta(estado.serie, pos, pieza)) {
    // Acierto
    estado.bloqueado = true;
    estado.plataforma.sounds.acierto();

    // TTS: pronunciar el nombre/valor colocado
    if (pieza.tipo === 'pictograma') estado.plataforma.tts.speak(pieza.medio.nombre);
    else if (pieza.tipo === 'color')  estado.plataforma.tts.speak(pieza.nombre);
    else if (pieza.tipo === 'numero') estado.plataforma.tts.speak(String(pieza.valor));

    // Rellenar el hueco visualmente
    huecoEl.classList.remove('cs-hueco', 'cs-hueco-resaltado');
    huecoEl.classList.add('cs-conocido', 'cs-hueco-acierto');
    pintarElemento(huecoEl, pieza, estado.plataforma);

    // Ocultar la pieza en el banco
    const piezaEntry = estado.piezaEls.find((p) => p.clave === pieza.clave);
    if (piezaEntry) piezaEntry.el.classList.add('cs-pieza-usada');

    // Registrar colocación
    estado.colocadas[pos] = pieza;

    // ¿Serie completa?
    if (serieCompleta(estado.serie, estado.huecos, estado.colocadas)) {
      estado.timeoutId = setTimeout(() => {
        if (!estado) return;
        if (estado.rondaActual >= RONDAS_TOTAL) {
          estado.plataforma.mostrarRecompensa({ onContinuar: iniciarPartida });
        } else {
          estado.rondaActual++;
          siguienteRonda();
        }
      }, 900);
    } else {
      estado.bloqueado = false;
    }
  } else {
    // Fallo
    estado.plataforma.sounds.fallo();
    huecoEl.classList.add('cs-hueco-error');
    const piezaEntry = estado.piezaEls.find((p) => p.clave === pieza.clave);
    if (piezaEntry) {
      piezaEntry.el.classList.add('cs-pieza-error');
      setTimeout(() => {
        if (piezaEntry && piezaEntry.el) piezaEntry.el.classList.remove('cs-pieza-error');
      }, 420);
    }
    setTimeout(() => {
      if (huecoEl) huecoEl.classList.remove('cs-hueco-error');
    }, 420);
  }
}

// ── CONTROL DE RONDA ──────────────────────────────────────────────────────────

function siguienteRonda() {
  const datos = generarSerie(
    estado.tipo,
    estado.medios,
    estado.ajustesPista && estado.ajustesPista.huecosLibres,
  );
  if (!datos) {
    estado.raiz.innerHTML = `<p class="cs-sin-material">${estado.plataforma.t('juegos.sin_material')}</p>`;
    return;
  }
  estado.serie    = datos.serie;
  estado.huecos   = datos.huecos;
  estado.banco    = datos.banco;
  estado.bloqueado = false;
  construirRonda();
}

function iniciarPartida() {
  estado.rondaActual = 1;
  siguienteRonda();
}

// ── PUNTO DE ENTRADA ──────────────────────────────────────────────────────────

function montar(contenedor, plataforma) {
  if (estado) desmontar();

  const tipo          = detectarTipo(plataforma.appId);
  const medios        = plataforma.medios || [];
  const ajustesPista  = plataforma.ajustesPista || {};

  if (!hayMaterialSuficiente(tipo, medios)) {
    contenedor.innerHTML = `<p class="cs-sin-material">${plataforma.t('juegos.sin_material')}</p>`;
    return;
  }

  inyectarEstilos();

  const raiz = document.createElement('div');
  raiz.className = 'cs-raiz';
  contenedor.appendChild(raiz);

  estado = {
    plataforma,
    tipo,
    medios,
    ajustesPista,
    raiz,
    contenedor,
    rondaActual: 1,
    serie:       null,
    huecos:      null,
    banco:       null,
    huecoEls:    [],
    piezaEls:    [],
    colocadas:   {},
    bloqueado:   false,
    timeoutId:   null,
  };

  iniciarPartida();
}

function desmontar() {
  if (estado && estado.timeoutId) clearTimeout(estado.timeoutId);
  estado = null;
}

export default { id: 'completa-serie', icono: '🔢', montar, desmontar };
