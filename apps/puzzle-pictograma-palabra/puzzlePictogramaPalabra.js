// Pictosfera — mecánica reutilizable: "puzzle de pictograma y
// selección de palabra".
//
// Cada ronda muestra arriba un pictograma "modelo" completo y, debajo,
// sus 4 piezas (los cuatro cuadrantes de esa misma imagen, repartidos
// 2x2) desordenadas en una bandeja. El niño arrastra (o toca/selecciona
// con el dedo y luego el hueco, igual que en "Ordena la secuencia")
// cada pieza hasta el hueco del cuadrante que le corresponde. Pieza en
// el hueco equivocado: sonido de fallo, el hueco se sombrea en rojo un
// instante y la pieza vuelve a la bandeja para reintentarlo, sin
// límite de intentos. Pieza correcta: sonido de acierto y el hueco se
// queda fijo con su trozo de imagen, en verde.
//
// Al completar las 4 piezas aparecen tres palabras (el nombre real del
// pictograma y dos "intrusas", nombres de otros pictogramas del
// material): el niño toca la que corresponde. Acierto -> sonido +
// voz + siguiente ronda (o recompensa final tras la décima). Fallo ->
// sonido de error, la palabra tocada se sombrea un instante y se puede
// reintentar sin límite, igual que el resto de mecánicas del proyecto.
//
// A diferencia del resto de mecánicas de "arrastrar", el material aquí
// es cualquier pictograma con nombre del pozo (`plataforma.medios`): no
// hace falta ninguna etiqueta concreta, basta con que haya al menos 3
// distintos (1 para la ronda, 2 para poder ofrecer palabras intrusas
// distintas).
//
// Es "código de confianza del autor": JavaScript nativo, módulo ES, sin
// framework. No importa nada del núcleo directamente: todo lo que
// necesita le llega a través de `plataforma` en montar(). El arrastre
// reutiliza la misma dinámica de puntero que "Ordena la secuencia"
// (duplicada a propósito: cada mecánica de este proyecto es
// independiente y no importa código de otra).

const ESTILOS_ID = 'puzzle-pictograma-palabra-estilos';
const RONDAS_TOTAL = 10;
const UMBRAL_ARRASTRE = 4; // píxeles: por debajo de esto se considera un toque, no un arrastre
const CUADRANTES_TOTAL = 4;

// Posición del fondo (background-position), en porcentaje, para que
// cada pieza/casilla muestre solo su cuadrante de la imagen completa:
// 0=arriba-izda, 1=arriba-dcha, 2=abajo-izda, 3=abajo-dcha. Funciona
// con `background-size: 200% 200%` (ver CSS), sea cual sea el tamaño
// real de la imagen: los porcentajes de background-position/size son
// siempre relativos a la caja del propio elemento.
const POSICIONES_CUADRANTE = ['0% 0%', '100% 0%', '0% 100%', '100% 100%'];

let estado = null; // { plataforma, contenedor, raiz, rondaActual, usados, medioActual, piezas, colocadas, seleccionId, bloqueado, timeoutId, ajustesPista }

// --- Lógica pura: material, piezas y palabras de cada ronda ---

export function mezclar(lista) {
  const copia = [...(lista || [])];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** ¿Hay suficiente material? Hace falta al menos un pictograma para la
 *  ronda y, entre todos, al menos 3 nombres para poder construir
 *  siempre 3 opciones de palabra (1 correcta + 2 intrusas). */
export function hayMaterialSuficiente(medios) {
  return Array.isArray(medios) && medios.filter((m) => m && m.nombre).length >= 3;
}

/** Elige al azar un pictograma que no se haya usado todavía en esta
 *  partida (si ya se usaron todos, se puede repetir). Lógica pura. */
export function elegirSiguienteMedio(medios, { evitarIds = [] } = {}) {
  const validos = (medios || []).filter((m) => m && m.nombre);
  if (!validos.length) return null;
  const evitar = new Set(evitarIds);
  const sinUsar = validos.filter((m) => !evitar.has(m.id));
  const candidatos = sinUsar.length ? sinUsar : validos;
  return candidatos[Math.floor(Math.random() * candidatos.length)];
}

/** Genera las 4 piezas del puzzle (una por cuadrante), desordenadas
 *  para la bandeja. Lógica pura. */
export function generarPiezas() {
  const piezas = Array.from({ length: CUADRANTES_TOTAL }, (_, cuadrante) => ({ piezaId: `p${cuadrante}`, cuadrante }));
  return mezclar(piezas);
}

/** ¿Esta pieza va en este hueco? Lógica pura. */
export function colocacionCorrecta(pieza, indiceCasilla) {
  return Boolean(pieza) && pieza.cuadrante === indiceCasilla;
}

/** ¿Ya están las 4 piezas colocadas? Lógica pura. */
export function piezasCompletas(colocadas) {
  return Array.isArray(colocadas) && colocadas.length === CUADRANTES_TOTAL && colocadas.every(Boolean);
}

/**
 * Construye las 3 opciones de la pregunta "¿cómo se llama?": la
 * palabra correcta (el nombre del pictograma de esta ronda) y dos
 * intrusas, nombres de otros pictogramas del pozo que NO sean igual al
 * correcto (para no repetir el mismo texto en dos botones). Si el pozo
 * es tan pequeño que no llega a tener 2 nombres distintos disponibles,
 * repite lo que haya en vez de devolver menos de 3 opciones: siempre
 * hay tres botones, aunque el material sea mínimo. Lógica pura, ya
 * mezclada (el orden de los tres botones también es al azar).
 */
export function generarOpcionesPalabra(medioCorrecto, pool) {
  const nombreCorrecto = medioCorrecto && medioCorrecto.nombre;
  const candidatos = (pool || []).filter((m) => m && m.nombre && m.nombre !== nombreCorrecto);
  const vistos = new Set();
  const distractores = [];
  mezclar(candidatos).forEach((medio) => {
    if (distractores.length >= 2 || vistos.has(medio.nombre)) return;
    vistos.add(medio.nombre);
    distractores.push(medio.nombre);
  });
  while (distractores.length < 2) {
    distractores.push(distractores[0] || nombreCorrecto);
  }
  const opciones = [
    { texto: nombreCorrecto, correcta: true },
    { texto: distractores[0], correcta: false },
    { texto: distractores[1], correcta: false }
  ];
  return mezclar(opciones);
}

/** Aplica el ajuste de mayúsculas/minúsculas a un texto. */
export function formatearTexto(texto, mayuscula = true) {
  if (!texto) return '';
  return mayuscula ? texto.toLocaleUpperCase() : texto.toLocaleLowerCase();
}

function inyectarEstilosUnaVez() {
  if (document.getElementById(ESTILOS_ID)) return;
  const link = document.createElement('link');
  link.id = ESTILOS_ID;
  link.rel = 'stylesheet';
  link.href = new URL('puzzlePictogramaPalabra.css', import.meta.url).href;
  document.head.appendChild(link);
}

function mostrarSinMaterial(zona, plataforma) {
  zona.innerHTML = '';
  const vacio = document.createElement('p');
  vacio.className = 'vacio';
  vacio.textContent = plataforma.t('juegos.sin_material');
  zona.appendChild(vacio);
}

function limpiarResaltados() {
  estado.raiz.querySelectorAll('.puzzle-casilla-resaltada').forEach((el) => el.classList.remove('puzzle-casilla-resaltada'));
}

function casillaEnPosicion(x, y) {
  // Solo se evalúan los huecos TODAVÍA VACÍOS, igual que en "Ordena la
  // secuencia": uno ya resuelto no debe poder "robar" una pieza nueva.
  const casillas = Array.from(estado.raiz.querySelectorAll('.puzzle-casilla'));
  return (
    casillas.find((el) => {
      if (el.disabled) return false;
      const r = el.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }) || null
  );
}

/** Selección por toque/teclado (alternativa accesible a arrastrar). */
function alternarSeleccion(pieza, elementoPieza) {
  if (!estado || estado.bloqueado) return;
  if (estado.seleccionId === pieza.piezaId) {
    estado.seleccionId = null;
    elementoPieza.classList.remove('puzzle-pieza-seleccionada');
    return;
  }
  estado.raiz.querySelectorAll('.puzzle-pieza-seleccionada').forEach((el) => el.classList.remove('puzzle-pieza-seleccionada'));
  estado.seleccionId = pieza.piezaId;
  elementoPieza.classList.add('puzzle-pieza-seleccionada');
  estado.plataforma.sounds.click();
}

function pintarCasillaLlena(casillaEl, cuadrante) {
  const { plataforma } = estado;
  casillaEl.innerHTML = '';
  casillaEl.disabled = true;
  casillaEl.classList.add('puzzle-casilla-llena');
  casillaEl.setAttribute('aria-label', plataforma.t('puzzle.casilla_completa', { n: cuadrante + 1 }));
  const trozo = document.createElement('div');
  trozo.className = 'puzzle-trozo';
  trozo.style.backgroundImage = `url("${plataforma.getDisplayUrl(estado.medioActual)}")`;
  trozo.style.backgroundPosition = POSICIONES_CUADRANTE[cuadrante];
  casillaEl.appendChild(trozo);
}

/** Juzga una colocación (de arrastrar, de tocar con pieza ya
 *  seleccionada, o de teclado) y aplica el efecto. Al completar las 4
 *  piezas, pasa a la pregunta de la palabra tras una breve pausa. */
function manejarColocacion(pieza, indice, elementoPieza, casillaEl) {
  if (!estado || estado.bloqueado) return;
  if (estado.colocadas[indice]) return; // hueco ya resuelto: defensivo

  if (estado.seleccionId === pieza.piezaId) {
    estado.seleccionId = null;
    if (elementoPieza) elementoPieza.classList.remove('puzzle-pieza-seleccionada');
  }

  if (colocacionCorrecta(pieza, indice)) {
    estado.plataforma.sounds.acierto();
    estado.colocadas[indice] = pieza;
    pintarCasillaLlena(casillaEl, pieza.cuadrante);
    if (elementoPieza) elementoPieza.remove();

    if (piezasCompletas(estado.colocadas)) {
      estado.bloqueado = true;
      estado.timeoutId = setTimeout(() => {
        if (!estado) return;
        estado.bloqueado = false;
        mostrarSeleccionPalabra();
      }, 600);
    }
  } else {
    estado.plataforma.sounds.fallo();
    casillaEl.classList.add('puzzle-casilla-fallo');
    if (elementoPieza) elementoPieza.classList.add('puzzle-pieza-fallo');
    setTimeout(() => {
      casillaEl.classList.remove('puzzle-casilla-fallo');
      if (elementoPieza) elementoPieza.classList.remove('puzzle-pieza-fallo');
    }, 400);
  }
}

/** Engancha el arrastre (puntero/táctil) de una pieza contra los 4
 *  huecos posibles, igual que en "Ordena la secuencia": el mismo
 *  `pointerup` cubre también el toque simple (alterna selección) según
 *  haya habido arrastre real o no. */
function activarArrastrePieza(elementoPieza, pieza) {
  let activo = false;
  let arrastrado = false;
  let inicioX = 0;
  let inicioY = 0;

  function onPointerDown(ev) {
    if (!estado || estado.bloqueado) return;
    activo = true;
    arrastrado = false;
    inicioX = ev.clientX;
    inicioY = ev.clientY;
    elementoPieza.style.transition = 'none';
    try { elementoPieza.setPointerCapture(ev.pointerId); } catch { /* no soportado en algún entorno: no pasa nada */ }
    elementoPieza.classList.add('puzzle-pieza-activa');
  }

  function onPointerMove(ev) {
    if (!activo) return;
    const dx = ev.clientX - inicioX;
    const dy = ev.clientY - inicioY;
    if (Math.abs(dx) > UMBRAL_ARRASTRE || Math.abs(dy) > UMBRAL_ARRASTRE) arrastrado = true;
    elementoPieza.style.transform = `translate(${dx}px, ${dy}px)`;
    limpiarResaltados();
    if (arrastrado) {
      const destino = casillaEnPosicion(ev.clientX, ev.clientY);
      if (destino) destino.classList.add('puzzle-casilla-resaltada');
    }
  }

  function soltar(ev) {
    if (!activo) return;
    activo = false;
    elementoPieza.classList.remove('puzzle-pieza-activa');
    limpiarResaltados();
    elementoPieza.style.transition = 'transform var(--transition-base)';
    elementoPieza.style.transform = 'translate(0, 0)';

    if (arrastrado) {
      const destino = casillaEnPosicion(ev.clientX, ev.clientY);
      if (destino) manejarColocacion(pieza, Number(destino.dataset.indice), elementoPieza, destino);
    } else {
      alternarSeleccion(pieza, elementoPieza);
    }
  }

  function onPointerCancel() {
    activo = false;
    elementoPieza.classList.remove('puzzle-pieza-activa');
    limpiarResaltados();
    elementoPieza.style.transition = 'transform var(--transition-base)';
    elementoPieza.style.transform = 'translate(0, 0)';
  }

  function onKeyDown(ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault();
    alternarSeleccion(pieza, elementoPieza);
  }

  elementoPieza.addEventListener('pointerdown', onPointerDown);
  elementoPieza.addEventListener('pointermove', onPointerMove);
  elementoPieza.addEventListener('pointerup', soltar);
  elementoPieza.addEventListener('pointercancel', onPointerCancel);
  elementoPieza.addEventListener('keydown', onKeyDown);
}

/** Tocar (o activar por teclado) un hueco VACÍO con una pieza ya
 *  seleccionada intenta colocarla ahí. */
function intentarColocarSeleccion(indice, casillaEl) {
  if (!estado || estado.bloqueado) return;
  if (estado.colocadas[indice]) return;
  if (!estado.seleccionId) return;
  const pieza = estado.piezas.find((p) => p.piezaId === estado.seleccionId);
  if (!pieza) return;
  const elementoPieza = estado.raiz.querySelector(`[data-pieza-id="${pieza.piezaId}"]`);
  manejarColocacion(pieza, indice, elementoPieza, casillaEl);
}

function crearElementoPieza(pieza) {
  const { plataforma } = estado;
  const el = document.createElement('div');
  el.className = 'puzzle-pieza';
  el.dataset.piezaId = pieza.piezaId;
  el.setAttribute('role', 'button');
  el.tabIndex = 0;
  el.setAttribute('aria-label', plataforma.t('puzzle.pieza', { n: pieza.cuadrante + 1 }));
  el.style.backgroundImage = `url("${plataforma.getDisplayUrl(estado.medioActual)}")`;
  el.style.backgroundPosition = POSICIONES_CUADRANTE[pieza.cuadrante];

  activarArrastrePieza(el, pieza);
  return el;
}

function manejarRespuestaPalabra(opcion, boton) {
  if (!estado || estado.bloqueado) return;

  if (opcion.correcta) {
    estado.bloqueado = true;
    estado.plataforma.sounds.acierto();
    estado.plataforma.tts.speak(estado.medioActual.nombre);
    boton.classList.add('puzzle-opcion-correcta');

    if (estado.rondaActual >= RONDAS_TOTAL) {
      estado.timeoutId = setTimeout(() => {
        if (!estado) return;
        estado.plataforma.mostrarRecompensa({ onContinuar: iniciarPartida });
      }, 700);
    } else {
      estado.timeoutId = setTimeout(() => {
        if (!estado) return;
        estado.bloqueado = false;
        siguienteRonda();
      }, 700);
    }
  } else {
    estado.plataforma.sounds.fallo();
    boton.classList.add('puzzle-opcion-fallo');
    setTimeout(() => {
      if (boton) boton.classList.remove('puzzle-opcion-fallo');
    }, 400);
  }
}

function mostrarSeleccionPalabra() {
  const { raiz, plataforma } = estado;
  raiz.querySelector('.puzzle-zona-puzzle').hidden = true;
  const zonaPalabra = raiz.querySelector('.puzzle-zona-palabra');
  zonaPalabra.hidden = false;
  zonaPalabra.innerHTML = '';

  const pregunta = document.createElement('p');
  pregunta.className = 'puzzle-palabra-pregunta';
  pregunta.textContent = plataforma.t('puzzle.pregunta_palabra');
  zonaPalabra.appendChild(pregunta);

  const opcionesEl = document.createElement('div');
  opcionesEl.className = 'puzzle-opciones';
  const opciones = generarOpcionesPalabra(estado.medioActual, plataforma.medios);
  opciones.forEach((opcion) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'puzzle-opcion';
    boton.textContent = formatearTexto(opcion.texto, estado.ajustesPista.mayuscula);
    boton.addEventListener('click', () => manejarRespuestaPalabra(opcion, boton));
    opcionesEl.appendChild(boton);
  });
  zonaPalabra.appendChild(opcionesEl);
}

function pintarRonda() {
  const { raiz, plataforma } = estado;
  estado.seleccionId = null;
  estado.colocadas = new Array(CUADRANTES_TOTAL).fill(null);

  raiz.querySelector('.puzzle-ronda').textContent = plataforma.t('puzzle.ronda', {
    n: estado.rondaActual,
    total: RONDAS_TOTAL
  });

  const modeloImg = raiz.querySelector('.puzzle-modelo-img');
  modeloImg.src = plataforma.getDisplayUrl(estado.medioActual);
  modeloImg.alt = estado.medioActual.nombre;

  const zonaCasillas = raiz.querySelector('.puzzle-casillas');
  zonaCasillas.innerHTML = '';
  for (let indice = 0; indice < CUADRANTES_TOTAL; indice += 1) {
    const casilla = document.createElement('button');
    casilla.type = 'button';
    casilla.className = 'puzzle-casilla';
    casilla.dataset.indice = String(indice);
    casilla.setAttribute('aria-label', plataforma.t('puzzle.casilla_vacia', { n: indice + 1 }));
    casilla.addEventListener('click', () => intentarColocarSeleccion(indice, casilla));
    zonaCasillas.appendChild(casilla);
  }

  const zonaPiezas = raiz.querySelector('.puzzle-piezas');
  zonaPiezas.innerHTML = '';
  estado.piezas = generarPiezas();
  estado.piezas.forEach((pieza) => zonaPiezas.appendChild(crearElementoPieza(pieza)));

  raiz.querySelector('.puzzle-zona-puzzle').hidden = false;
  // Ocultar la zona de palabras Y vaciarla: aunque el CSS [hidden]
  // corrija la visibilidad, limpiar el innerHTML es un seguro adicional
  // para que los botones de la ronda anterior no queden en el DOM.
  const zonaPalabraEl = raiz.querySelector('.puzzle-zona-palabra');
  zonaPalabraEl.hidden = true;
  zonaPalabraEl.innerHTML = '';
}

function siguienteRonda() {
  if (!estado) return;
  estado.rondaActual += 1;
  const medio = elegirSiguienteMedio(estado.plataforma.medios, { evitarIds: estado.usados });
  if (!medio) {
    mostrarSinMaterial(estado.raiz.querySelector('.puzzle-zona-puzzle'), estado.plataforma);
    return;
  }
  estado.usados.push(medio.id);
  estado.medioActual = medio;
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
  raiz.className = 'puzzle-app';

  const cabecera = document.createElement('header');
  cabecera.className = 'puzzle-cabecera';
  const titulo = document.createElement('h1');
  titulo.textContent = `${plataforma.icono || ''} ${plataforma.nombre}`.trim();
  const instrucciones = document.createElement('p');
  instrucciones.textContent = plataforma.t('puzzle.instrucciones');
  cabecera.append(titulo, instrucciones);

  const marcador = document.createElement('div');
  marcador.className = 'puzzle-marcador';
  const rondaEl = document.createElement('span');
  rondaEl.className = 'puzzle-ronda';
  marcador.appendChild(rondaEl);

  const zonaPuzzle = document.createElement('div');
  zonaPuzzle.className = 'puzzle-zona-puzzle';

  const modelo = document.createElement('div');
  modelo.className = 'puzzle-modelo';
  const modeloImg = document.createElement('img');
  modeloImg.className = 'puzzle-modelo-img';
  modeloImg.draggable = false;
  modelo.appendChild(modeloImg);

  const casillasEl = document.createElement('div');
  casillasEl.className = 'puzzle-casillas';
  const piezasEl = document.createElement('div');
  piezasEl.className = 'puzzle-piezas';
  zonaPuzzle.append(modelo, casillasEl, piezasEl);

  const zonaPalabra = document.createElement('div');
  zonaPalabra.className = 'puzzle-zona-palabra';
  zonaPalabra.hidden = true;
  zonaPalabra.setAttribute('aria-live', 'polite');

  raiz.append(cabecera, marcador, zonaPuzzle, zonaPalabra);
  contenedor.appendChild(raiz);

  estado = {
    contenedor,
    plataforma,
    raiz,
    rondaActual: 0,
    usados: [],
    medioActual: null,
    piezas: [],
    colocadas: [],
    seleccionId: null,
    bloqueado: false,
    timeoutId: null,
    ajustesPista: plataforma.ajustesPista || { mayuscula: true }
  };

  if (!hayMaterialSuficiente(plataforma.medios)) {
    mostrarSinMaterial(zonaPuzzle, plataforma);
    return;
  }

  iniciarPartida();
}

function desmontar() {
  if (estado && estado.timeoutId) clearTimeout(estado.timeoutId);
  estado = null;
}

export default {
  id: 'puzzle-pictograma-palabra',
  nombre: 'Puzzle de pictograma y palabra',
  icono: '🖼️',
  estante: 'LECTURA',
  montar,
  desmontar
};
