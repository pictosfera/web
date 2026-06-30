// Pictosfera — mecánica reutilizable: "relaciona el pictograma con su
// palabra".
//
// Cada ronda muestra 3 pictogramas en una columna a la izquierda y, a
// la derecha, 3 casillas de texto con sus nombres (mezcladas, así que
// no coinciden de entrada con el orden de la izquierda). El niño
// arrastra (o toca para seleccionar y luego toca la casilla, igual que
// en "Puzzle de pictograma y palabra") cada pictograma hasta SU casilla
// de texto. Pictograma a la casilla correcta: sonido de acierto, voz
// del nombre, la casilla queda fija en verde y el pictograma se marca
// como colocado, sin desaparecer de su sitio para no desordenar el
// resto de la ronda. Pictograma a la casilla equivocada: sonido de
// fallo, la casilla se sombrea en rojo un instante y se puede
// reintentar sin límite. Al emparejar los 3 a la vez, pasa la ronda (o
// la recompensa final tras la décima).
//
// El material es cualquier pictograma con nombre del pozo
// (`plataforma.medios`): no hace falta ninguna etiqueta concreta, basta
// con que haya al menos 3 nombres distintos (para poder formar un
// grupo de 3 sin ambigüedad de textos repetidos).
//
// Es "código de confianza del autor": JavaScript nativo, módulo ES, sin
// framework. No importa nada del núcleo directamente: todo lo que
// necesita le llega a través de `plataforma` en montar(). El arrastre
// combina la misma dinámica de puntero que "Clasifica los pictogramas
// en dos categorías" (varias zonas posibles) con la selección por
// toque/teclado de "Puzzle de pictograma y palabra" (varios elementos
// simultáneos en juego) — duplicado a propósito: cada mecánica de este
// proyecto es independiente y no importa código de otra.

const ESTILOS_ID = 'relaciona-pictograma-palabra-estilos';
const RONDAS_TOTAL = 10;
const UMBRAL_ARRASTRE = 4; // píxeles: por debajo de esto se considera un toque, no un arrastre
const GRUPO_TOTAL = 3;

let estado = null; // { plataforma, contenedor, raiz, rondaActual, usados, grupoActual, casillasActual, colocadosIds, escuchadosIds, seleccionId, bloqueado, timeoutId, ajustesPista }

// --- Lógica pura: material, grupo de la ronda y aciertos ---

export function mezclar(lista) {
  const copia = [...(lista || [])];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** ¿Hay suficiente material? Hacen falta al menos 3 nombres DISTINTOS
 *  en el pozo: cada ronda enfrenta 3 pictogramas a la vez y dos
 *  casillas con el mismo texto serían ambiguas. */
export function hayMaterialSuficiente(medios) {
  if (!Array.isArray(medios)) return false;
  const nombres = new Set(medios.filter((m) => m && m.nombre).map((m) => m.nombre));
  return nombres.size >= GRUPO_TOTAL;
}

/** Elige al azar 3 pictogramas con nombres distintos entre sí para la
 *  ronda, evitando repetir (mientras se pueda) los ya usados en otras
 *  rondas de esta partida. Si no quedan suficientes sin usar, se
 *  permite repetir. Lógica pura. Devuelve null si no hay material. */
export function elegirGrupoRonda(medios, { evitarIds = [] } = {}) {
  if (!Array.isArray(medios)) return null;
  const vistos = new Set();
  const validos = [];
  medios.forEach((m) => {
    if (!m || !m.nombre || vistos.has(m.nombre)) return;
    vistos.add(m.nombre);
    validos.push(m);
  });
  if (validos.length < GRUPO_TOTAL) return null;

  const evitar = new Set(evitarIds);
  const sinUsar = validos.filter((m) => !evitar.has(m.id));
  const candidatos = sinUsar.length >= GRUPO_TOTAL ? sinUsar : validos;
  return mezclar(candidatos).slice(0, GRUPO_TOTAL);
}

/** Construye las 3 casillas de texto de la derecha: mismos 3
 *  pictogramas del grupo, en un orden mezclado (no necesariamente
 *  distinto del de la izquierda, pero siempre al azar). Lógica pura. */
export function construirCasillas(grupo) {
  return mezclar(grupo || []).map((m) => ({ id: m.id, nombre: m.nombre }));
}

/** ¿El pictograma soltado/seleccionado es el que corresponde a esta
 *  casilla? Comparación por identidad (mismo id), aunque lleguen como
 *  tipos distintos. */
export function esRespuestaCorrecta(idPictograma, idCasilla) {
  return Boolean(idPictograma) && Boolean(idCasilla) && String(idPictograma) === String(idCasilla);
}

/** ¿Ya están los 3 pictogramas del grupo emparejados con su casilla? */
export function grupoCompleto(grupo, colocadosIds) {
  if (!Array.isArray(grupo) || grupo.length !== GRUPO_TOTAL) return false;
  if (!Array.isArray(colocadosIds)) return false;
  return grupo.every((m) => m && colocadosIds.includes(m.id));
}

/** Aplica el ajuste de mayúsculas/minúsculas a un texto. */
export function formatearTexto(texto, mayuscula = true) {
  if (!texto) return '';
  return mayuscula ? texto.toLocaleUpperCase() : texto.toLocaleLowerCase();
}

/** Validación de seguridad del ajuste "pulsador TTS", por pictograma:
 *  mientras esté activo, ESE pictograma en concreto no se puede
 *  arrastrar ni seleccionar hasta haberlo escuchado, aunque los otros
 *  dos del grupo ya estén disponibles. Si el ajuste está desactivado,
 *  siempre se puede responder. */
export function puedeResponderItem(ajustesPista, escuchadosIds, medioId) {
  return !ajustesPista.pulsadorTts || (Array.isArray(escuchadosIds) && escuchadosIds.includes(medioId));
}

// --- Montaje DOM, arrastre y accesibilidad ---

function inyectarEstilosUnaVez() {
  if (document.getElementById(ESTILOS_ID)) return;
  const link = document.createElement('link');
  link.id = ESTILOS_ID;
  link.rel = 'stylesheet';
  link.href = new URL('relacionaPictogramaPalabra.css', import.meta.url).href;
  document.head.appendChild(link);
}

function mostrarSinMaterial(zona, plataforma) {
  zona.innerHTML = '';
  const vacio = document.createElement('p');
  vacio.className = 'vacio';
  vacio.textContent = plataforma.t('juegos.sin_material');
  zona.appendChild(vacio);
}

function detectarCasilla(x, y) {
  // Solo cuentan las casillas TODAVÍA sin resolver: una ya acertada no
  // debe poder "robar" un pictograma nuevo.
  const casillas = Array.from(estado.raiz.querySelectorAll('.relaciona-casilla'));
  return (
    casillas.find((el) => {
      if (el.disabled) return false;
      const r = el.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }) || null
  );
}

function quitarResaltado() {
  estado.raiz.querySelectorAll('.relaciona-casilla-resaltada').forEach((el) => el.classList.remove('relaciona-casilla-resaltada'));
}

/** Selección por toque/teclado (alternativa accesible a arrastrar). */
function alternarSeleccion(medio, elementoItem) {
  if (!estado || estado.bloqueado) return;
  if (estado.colocadosIds.includes(medio.id)) return;
  if (!puedeResponderItem(estado.ajustesPista, estado.escuchadosIds, medio.id)) return;

  if (estado.seleccionId === medio.id) {
    estado.seleccionId = null;
    elementoItem.classList.remove('relaciona-item-seleccionado');
    return;
  }
  estado.raiz.querySelectorAll('.relaciona-item-seleccionado').forEach((el) => el.classList.remove('relaciona-item-seleccionado'));
  estado.seleccionId = medio.id;
  elementoItem.classList.add('relaciona-item-seleccionado');
  estado.plataforma.sounds.click();
}

/** Juzga una colocación (de arrastrar, de tocar con pictograma ya
 *  seleccionado, o de teclado) y aplica el efecto. Al completar el
 *  grupo, pasa a la siguiente ronda tras una breve pausa. */
function manejarColocacion(medio, elementoItem, casillaEl) {
  if (!estado || estado.bloqueado) return;
  if (estado.colocadosIds.includes(medio.id)) return; // ya resuelto: defensivo
  if (!puedeResponderItem(estado.ajustesPista, estado.escuchadosIds, medio.id)) return;

  if (estado.seleccionId === medio.id) {
    estado.seleccionId = null;
    if (elementoItem) elementoItem.classList.remove('relaciona-item-seleccionado');
  }

  if (esRespuestaCorrecta(medio.id, casillaEl.dataset.medioId)) {
    estado.plataforma.sounds.acierto();
    estado.plataforma.tts.speak(medio.nombre);
    estado.colocadosIds.push(medio.id);

    casillaEl.disabled = true;
    casillaEl.classList.add('relaciona-casilla-resuelta');
    casillaEl.setAttribute('aria-label', estado.plataforma.t('relacionaPictogramaPalabra.resuelto', { nombre: medio.nombre }));

    if (elementoItem) {
      elementoItem.classList.add('relaciona-item-colocado');
      elementoItem.setAttribute('aria-disabled', 'true');
      elementoItem.tabIndex = -1;
      const pulsadorInterno = elementoItem.querySelector('.relaciona-pulsador');
      if (pulsadorInterno) pulsadorInterno.disabled = true;
    }

    if (grupoCompleto(estado.grupoActual, estado.colocadosIds)) {
      estado.bloqueado = true;
      if (estado.rondaActual >= RONDAS_TOTAL) {
        estado.timeoutId = setTimeout(() => {
          if (!estado) return;
          estado.plataforma.mostrarRecompensa({ onContinuar: iniciarPartida });
        }, 600);
      } else {
        estado.timeoutId = setTimeout(() => {
          if (!estado) return;
          estado.bloqueado = false;
          siguienteRonda();
        }, 700);
      }
    }
  } else {
    estado.plataforma.sounds.fallo();
    casillaEl.classList.add('relaciona-casilla-fallo');
    if (elementoItem) elementoItem.classList.add('relaciona-item-fallo');
    setTimeout(() => {
      casillaEl.classList.remove('relaciona-casilla-fallo');
      if (elementoItem) elementoItem.classList.remove('relaciona-item-fallo');
    }, 400);
  }
}

/** Tocar (o activar por teclado, ya que las casillas son <button>) una
 *  casilla VACÍA con un pictograma ya seleccionado intenta colocarlo
 *  ahí. */
function intentarColocarSeleccion(casillaEl) {
  if (!estado || estado.bloqueado) return;
  if (casillaEl.disabled) return;
  if (!estado.seleccionId) return;
  const medio = estado.grupoActual.find((m) => m.id === estado.seleccionId);
  if (!medio) return;
  const elementoItem = estado.raiz.querySelector(`[data-medio-id="${medio.id}"]`);
  manejarColocacion(medio, elementoItem, casillaEl);
}

/** Engancha el arrastre (puntero/táctil) de un pictograma contra las 3
 *  casillas posibles. El mismo `pointerup` cubre también el toque
 *  simple (alterna selección) según haya habido arrastre real o no,
 *  igual que en "Puzzle de pictograma y palabra". */
function activarArrastre(elementoItem, medio) {
  let activo = false;
  let arrastrado = false;
  let inicioX = 0;
  let inicioY = 0;

  function resaltar(x, y) {
    const destino = detectarCasilla(x, y);
    quitarResaltado();
    if (destino) destino.classList.add('relaciona-casilla-resaltada');
  }

  function onPointerDown(ev) {
    if (!estado || estado.bloqueado) return;
    if (estado.colocadosIds.includes(medio.id)) return;
    if (!puedeResponderItem(estado.ajustesPista, estado.escuchadosIds, medio.id)) return;
    activo = true;
    arrastrado = false;
    inicioX = ev.clientX;
    inicioY = ev.clientY;
    elementoItem.style.transition = 'none';
    try { elementoItem.setPointerCapture(ev.pointerId); } catch { /* no soportado en algún entorno: no pasa nada */ }
    elementoItem.classList.add('relaciona-item-activo');
  }

  function onPointerMove(ev) {
    if (!activo) return;
    const dx = ev.clientX - inicioX;
    const dy = ev.clientY - inicioY;
    if (Math.abs(dx) > UMBRAL_ARRASTRE || Math.abs(dy) > UMBRAL_ARRASTRE) arrastrado = true;
    elementoItem.style.transform = `translate(${dx}px, ${dy}px)`;
    if (arrastrado) resaltar(ev.clientX, ev.clientY);
  }

  function soltar(ev) {
    if (!activo) return;
    activo = false;
    elementoItem.classList.remove('relaciona-item-activo');
    quitarResaltado();
    elementoItem.style.transition = 'transform var(--transition-base)';
    elementoItem.style.transform = 'translate(0, 0)';

    if (arrastrado) {
      const destino = detectarCasilla(ev.clientX, ev.clientY);
      if (destino) manejarColocacion(medio, elementoItem, destino);
    } else {
      alternarSeleccion(medio, elementoItem);
    }
  }

  function onPointerCancel() {
    activo = false;
    elementoItem.classList.remove('relaciona-item-activo');
    quitarResaltado();
    elementoItem.style.transition = 'transform var(--transition-base)';
    elementoItem.style.transform = 'translate(0, 0)';
  }

  function onKeyDown(ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault();
    alternarSeleccion(medio, elementoItem);
  }

  elementoItem.addEventListener('pointerdown', onPointerDown);
  elementoItem.addEventListener('pointermove', onPointerMove);
  elementoItem.addEventListener('pointerup', soltar);
  elementoItem.addEventListener('pointercancel', onPointerCancel);
  elementoItem.addEventListener('keydown', onKeyDown);
}

/** Pinta un pictograma de la izquierda respetando las mismas variantes
 *  de accesibilidad/configuración que el resto de mecánicas de
 *  arrastrar (solo imagen, con texto de ayuda, mostrar/ocultar texto,
 *  mayúscula/minúscula, pulsador TTS en sustitución del pictograma). */
function crearElementoItem(medio) {
  const { plataforma, ajustesPista } = estado;
  const el = document.createElement('div');
  el.className = 'relaciona-item';
  el.dataset.medioId = medio.id;
  el.setAttribute('role', 'button');
  el.tabIndex = 0;

  function actualizarBloqueo() {
    el.classList.toggle('relaciona-item-bloqueado', !puedeResponderItem(ajustesPista, estado.escuchadosIds, medio.id));
  }

  if (ajustesPista.pulsadorTts) {
    el.setAttribute('aria-label', plataforma.t('comunes.escuchar'));
    const pulsador = document.createElement('button');
    pulsador.type = 'button';
    pulsador.className = 'relaciona-pulsador';
    pulsador.setAttribute('aria-label', plataforma.t('comunes.escuchar'));
    pulsador.textContent = '🔊';
    pulsador.addEventListener('click', (ev) => {
      ev.stopPropagation();
      plataforma.sounds.click();
      plataforma.tts.speak(medio.nombre);
      if (!estado.escuchadosIds.includes(medio.id)) estado.escuchadosIds.push(medio.id);
      pulsador.classList.add('relaciona-pulsador-escuchado');
      actualizarBloqueo();
    });
    el.appendChild(pulsador);
  } else {
    el.setAttribute('aria-label', medio.nombre);
    if (!ajustesPista.soloTexto) {
      const img = document.createElement('img');
      img.className = 'relaciona-img';
      img.src = plataforma.getDisplayUrl(medio);
      img.alt = medio.nombre;
      // Crítico para el arrastre: ver comentario equivalente en
      // clasificaCategorias.js (sin esto, el arrastre nativo de la
      // imagen se adelanta al arrastre por puntero y el drop nunca se
      // registra).
      img.draggable = false;
      el.appendChild(img);
    }

    const pista = document.createElement('p');
    pista.className = 'relaciona-pista';
    pista.textContent = formatearTexto(medio.nombre, ajustesPista.mayuscula);
    // En "solo texto" no hay imagen, así que la pista es el único
    // contenido y se ve siempre, pase lo que pase el ajuste "mostrar".
    pista.hidden = !ajustesPista.mostrar && !ajustesPista.soloTexto;
    el.appendChild(pista);
  }

  activarArrastre(el, medio);
  actualizarBloqueo();
  return el;
}

function crearElementoCasilla(casillaData) {
  const { plataforma, ajustesPista } = estado;
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'relaciona-casilla';
  el.dataset.medioId = casillaData.id;
  el.textContent = formatearTexto(casillaData.nombre, ajustesPista.mayuscula);
  el.setAttribute('aria-label', plataforma.t('relacionaPictogramaPalabra.casilla', { nombre: casillaData.nombre }));
  el.addEventListener('click', () => intentarColocarSeleccion(el));
  return el;
}

function pintarRonda() {
  const { raiz, plataforma } = estado;
  estado.colocadosIds = [];
  estado.escuchadosIds = [];
  estado.seleccionId = null;

  raiz.querySelector('.relaciona-ronda').textContent = plataforma.t('relacionaPictogramaPalabra.ronda', {
    n: estado.rondaActual,
    total: RONDAS_TOTAL
  });

  const colIzq = raiz.querySelector('.relaciona-col-izq');
  colIzq.innerHTML = '';
  estado.grupoActual.forEach((medio) => colIzq.appendChild(crearElementoItem(medio)));

  const colDer = raiz.querySelector('.relaciona-col-der');
  colDer.innerHTML = '';
  estado.casillasActual = construirCasillas(estado.grupoActual);
  estado.casillasActual.forEach((casillaData) => colDer.appendChild(crearElementoCasilla(casillaData)));
}

function siguienteRonda() {
  if (!estado) return;
  estado.rondaActual += 1;
  const grupo = elegirGrupoRonda(estado.plataforma.medios, { evitarIds: estado.usados });
  if (!grupo) {
    mostrarSinMaterial(estado.raiz.querySelector('.relaciona-columnas'), estado.plataforma);
    return;
  }
  estado.usados.push(...grupo.map((m) => m.id));
  estado.grupoActual = grupo;
  pintarRonda();
}

function iniciarPartida() {
  if (!estado) return;
  estado.rondaActual = 0;
  estado.usados = [];
  estado.bloqueado = false;
  siguienteRonda();
}

function montar(contenedor, plataforma) {
  inyectarEstilosUnaVez();
  contenedor.innerHTML = '';

  const raiz = document.createElement('div');
  raiz.className = 'relaciona-app';

  const cabecera = document.createElement('header');
  cabecera.className = 'relaciona-cabecera';
  const titulo = document.createElement('h1');
  titulo.textContent = `${plataforma.icono || ''} ${plataforma.nombre}`.trim();
  const instrucciones = document.createElement('p');
  instrucciones.textContent = plataforma.t('relacionaPictogramaPalabra.instrucciones');
  cabecera.append(titulo, instrucciones);

  const marcador = document.createElement('div');
  marcador.className = 'relaciona-marcador';
  const rondaEl = document.createElement('span');
  rondaEl.className = 'relaciona-ronda';
  marcador.appendChild(rondaEl);

  const columnas = document.createElement('div');
  columnas.className = 'relaciona-columnas';
  // Para que un lector de pantalla ya posado aquí anuncie el contenido
  // de la ronda nueva sin que el niño tenga que volver a buscarlo.
  columnas.setAttribute('aria-live', 'polite');

  const colIzq = document.createElement('div');
  colIzq.className = 'relaciona-col-izq';
  const colDer = document.createElement('div');
  colDer.className = 'relaciona-col-der';
  columnas.append(colIzq, colDer);

  raiz.append(cabecera, marcador, columnas);
  contenedor.appendChild(raiz);

  const ajustesPista = plataforma.ajustesPista || { mayuscula: true, mostrar: true, soloTexto: false, pulsadorTts: false };

  estado = {
    contenedor,
    plataforma,
    raiz,
    rondaActual: 0,
    usados: [],
    grupoActual: [],
    casillasActual: [],
    colocadosIds: [],
    escuchadosIds: [],
    seleccionId: null,
    bloqueado: false,
    timeoutId: null,
    ajustesPista
  };

  if (!hayMaterialSuficiente(plataforma.medios)) {
    mostrarSinMaterial(columnas, plataforma);
    return;
  }

  iniciarPartida();
}

function desmontar() {
  if (estado && estado.timeoutId) clearTimeout(estado.timeoutId);
  estado = null;
}

export default {
  id: 'relaciona-pictograma-palabra',
  nombre: 'Relaciona el pictograma con su palabra',
  icono: '🔗',
  estante: 'LECTURA',
  montar,
  desmontar
};
