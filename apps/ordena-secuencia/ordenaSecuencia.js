// Pictosfera — mecánica reutilizable: "ordena la secuencia".
//
// Arriba de la pantalla aparecen N huecos vacíos (uno por paso de la
// rutina); abajo, esos mismos N pictogramas pero desordenados. El niño
// arrastra (o toca/selecciona, ver más abajo) cada pictograma hasta el
// hueco que le corresponde para reconstruir el orden correcto de la
// secuencia (p.ej. "abrir el grifo" → "mojar el cepillo" → ...). Si el
// hueco no es el suyo: sonido de fallo y rebota a su sitio. Si es el
// suyo: sonido de acierto y se queda fijo. Al completar los N huecos
// aparece el siguiente ejercicio, hasta completar 10.
//
// Las secuencias las diseña el adulto en Pictogramas → Secuencias (ver
// core/js/secuencias.js); aquí solo se juega con las que ya llegan
// resueltas y jugables en `plataforma.secuencias` (ver appLoader.js).
//
// Es "código de confianza del autor": JavaScript nativo, módulo ES, sin
// framework, igual que el resto de mecánicas (arrastra-palabra, etc).

const ESTILOS_ID = 'ordena-secuencia-estilos';
const EJERCICIOS_TOTAL = 10;
const UMBRAL_ARRASTRE = 4; // píxeles: por debajo de esto se considera un toque, no un arrastre

let estado = null; // { plataforma, contenedor, raiz, ejercicioActual, secuenciasUsadas, pasosCorrectos, colocados, piezas, seleccionId, bloqueado, timeoutId, ajustesPista }

export function mezclar(lista) {
  const copia = [...(lista || [])];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Elige la siguiente secuencia a jugar, evitando repetir las ya
 *  usadas en esta partida si se puede (igual patrón que
 *  elegirSiguienteMedio en tecleaPalabra.js / generarNivel en
 *  arrastraPalabra.js). Lógica pura. */
export function elegirSiguienteSecuencia(secuencias, { evitarIds = [] } = {}) {
  if (!Array.isArray(secuencias) || secuencias.length < 1) return null;
  const evitar = new Set(evitarIds);
  const sinUsar = secuencias.filter((s) => !evitar.has(s.id));
  const candidatas = sinUsar.length ? sinUsar : secuencias;
  return candidatas[Math.floor(Math.random() * candidatas.length)];
}

/**
 * Genera un ejercicio a partir de una secuencia ya resuelta (sus pasos
 * son medios completos, ver secuenciasJugables en secuencias.js):
 * el orden correcto (`pasos`, sin tocar) y el montón desordenado para
 * arrastrar (`piezas`). Cada pieza lleva un `piezaId` propio (no el id
 * del medio) precisamente para que una rutina que repite un mismo
 * pictograma en dos pasos distintos (p.ej. "abrir el grifo" dos veces)
 * tenga dos piezas independientes en el montón, cada una colocable en
 * su hueco correspondiente. Lógica pura.
 */
export function generarRonda(secuencia) {
  const pasos = (secuencia && secuencia.pasos) || [];
  const piezas = mezclar(pasos.map((medio, indice) => ({ piezaId: `p${indice}`, medio })));
  return { pasos: [...pasos], piezas };
}

/** ¿Esta pieza va en este hueco? Lógica pura: solo compara ids de
 *  medio, nunca el `piezaId` (irrelevante para el acierto). */
export function colocacionCorrecta(pieza, indiceCasilla, pasosCorrectos) {
  if (!pieza || !pieza.medio || !Array.isArray(pasosCorrectos)) return false;
  const esperado = pasosCorrectos[indiceCasilla];
  return Boolean(esperado) && esperado.id === pieza.medio.id;
}

/** ¿Ya están todos los huecos rellenos? Lógica pura. */
export function rondaCompleta(colocados) {
  return Array.isArray(colocados) && colocados.length > 0 && colocados.every(Boolean);
}

/** Aplica el ajuste de mayúsculas/minúsculas al nombre de un medio. */
export function formatearNombre(nombre, mayuscula = true) {
  if (!nombre) return '';
  return mayuscula ? nombre.toLocaleUpperCase() : nombre.toLocaleLowerCase();
}

function inyectarEstilosUnaVez() {
  if (document.getElementById(ESTILOS_ID)) return;
  const link = document.createElement('link');
  link.id = ESTILOS_ID;
  link.rel = 'stylesheet';
  link.href = new URL('ordenaSecuencia.css', import.meta.url).href;
  document.head.appendChild(link);
}

function mostrarSinMaterial(zona, plataforma) {
  zona.innerHTML = '';
  const vacio = document.createElement('p');
  vacio.className = 'vacio';
  vacio.textContent = plataforma.t('ordena.sin_secuencias');
  zona.appendChild(vacio);
}

function limpiarResaltados() {
  estado.raiz.querySelectorAll('.ordena-casilla-resaltada').forEach((el) => el.classList.remove('ordena-casilla-resaltada'));
}

function casillaEnPosicion(x, y) {
  // Solo se evalúan los huecos TODAVÍA VACÍOS: uno ya resuelto
  // correctamente no debe poder "robar" una pieza nueva ni penalizar
  // al niño por soltar cerca de algo que ya hizo bien.
  const casillas = Array.from(estado.raiz.querySelectorAll('.ordena-casilla'));
  return (
    casillas.find((el) => {
      if (el.disabled) return false;
      const r = el.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }) || null
  );
}

/** Selección por toque/teclado (alternativa accesible a arrastrar):
 *  tocar o pulsar Intro/Espacio en una pieza la marca como elegida;
 *  tocarla de nuevo la deselecciona; elegir otra cambia la selección. */
function alternarSeleccion(pieza, elementoPieza) {
  if (!estado || estado.bloqueado) return;
  if (estado.seleccionId === pieza.piezaId) {
    estado.seleccionId = null;
    elementoPieza.classList.remove('ordena-pieza-seleccionada');
    return;
  }
  estado.raiz.querySelectorAll('.ordena-pieza-seleccionada').forEach((el) => el.classList.remove('ordena-pieza-seleccionada'));
  estado.seleccionId = pieza.piezaId;
  elementoPieza.classList.add('ordena-pieza-seleccionada');
  estado.plataforma.sounds.click();
}

/** Juzga una colocación (venga de arrastrar, de tocar con una pieza ya
 *  seleccionada, o de teclado) y aplica el efecto: acierto = sonido +
 *  la pieza se queda fija en su hueco; fallo = sonido + la pieza
 *  rebota (su posición ya se resetea en activarArrastrePieza/soltar
 *  para el caso de arrastre; aquí solo hace falta el destello de
 *  fallo). Cuando se completan todos los huecos, pasa al siguiente
 *  ejercicio (o a la recompensa final tras el décimo). */
function manejarColocacion(pieza, indice, elementoPieza, casillaEl) {
  if (!estado || estado.bloqueado) return;
  if (estado.colocados[indice]) return; // hueco ya resuelto: defensivo

  if (estado.seleccionId === pieza.piezaId) {
    estado.seleccionId = null;
    if (elementoPieza) elementoPieza.classList.remove('ordena-pieza-seleccionada');
  }

  const correcta = colocacionCorrecta(pieza, indice, estado.pasosCorrectos);
  if (correcta) {
    estado.plataforma.sounds.acierto();
    estado.colocados[indice] = pieza;
    pintarCasillaLlena(casillaEl, pieza.medio);
    if (elementoPieza) elementoPieza.remove();

    if (rondaCompleta(estado.colocados)) {
      estado.bloqueado = true;
      estado.timeoutId = setTimeout(() => {
        if (!estado) return;
        if (estado.ejercicioActual >= EJERCICIOS_TOTAL) {
          estado.plataforma.mostrarRecompensa({ onContinuar: iniciarPartida });
        } else {
          estado.bloqueado = false;
          siguienteEjercicio();
        }
      }, 600);
    }
  } else {
    estado.plataforma.sounds.fallo();
    if (elementoPieza) {
      elementoPieza.classList.add('ordena-pieza-fallo');
      setTimeout(() => {
        if (elementoPieza) elementoPieza.classList.remove('ordena-pieza-fallo');
      }, 400);
    }
  }
}

/** Engancha el arrastre (puntero/táctil) de una pieza, generalizado a
 *  VARIOS huecos posibles (a diferencia de arrastra-palabra, que solo
 *  tiene un objetivo). El mismo `pointerup` también cubre el toque
 *  simple (sin arrastre real, según el umbral): en vez de un `click`
 *  aparte —que duplicaría el manejo, porque el navegador dispara
 *  `click` tras `pointerup` incluso después de arrastrar con
 *  movimiento— se reutiliza el booleano `arrastrado` para decidir si
 *  esto fue un arrastre (juzgar contra el hueco, si hay alguno debajo)
 *  o un toque (alternar selección). Intro/Espacio por teclado activa
 *  la misma selección, como vía de accesibilidad para quien no puede
 *  arrastrar. */
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
    elementoPieza.classList.add('ordena-pieza-activa');
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
      if (destino) destino.classList.add('ordena-casilla-resaltada');
    }
  }

  function soltar(ev) {
    if (!activo) return;
    activo = false;
    elementoPieza.classList.remove('ordena-pieza-activa');
    limpiarResaltados();
    elementoPieza.style.transition = 'transform var(--transition-base)';
    elementoPieza.style.transform = 'translate(0, 0)';

    if (arrastrado) {
      // Solo se juzga si se suelta de verdad encima de un hueco vacío;
      // soltar fuera de cualquier hueco solo hace que la pieza rebote a
      // su sitio, sin sonido ni penalización (igual que en
      // arrastra-palabra).
      const destino = casillaEnPosicion(ev.clientX, ev.clientY);
      if (destino) manejarColocacion(pieza, Number(destino.dataset.indice), elementoPieza, destino);
    } else {
      alternarSeleccion(pieza, elementoPieza);
    }
  }

  function onPointerCancel() {
    activo = false;
    elementoPieza.classList.remove('ordena-pieza-activa');
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
 *  seleccionada intenta colocarla ahí; sin selección, no hace nada. Es
 *  la vía accesible equivalente a arrastrar, pensada para quien no
 *  puede arrastrar con el dedo o el ratón. */
function intentarColocarSeleccion(indice, casillaEl) {
  if (!estado || estado.bloqueado) return;
  if (estado.colocados[indice]) return;
  if (!estado.seleccionId) return;
  const pieza = estado.piezas.find((p) => p.piezaId === estado.seleccionId);
  if (!pieza) return;
  const elementoPieza = estado.raiz.querySelector(`[data-pieza-id="${pieza.piezaId}"]`);
  manejarColocacion(pieza, indice, elementoPieza, casillaEl);
}

function pintarCasillaLlena(casillaEl, medio) {
  const { ajustesPista, plataforma } = estado;
  casillaEl.innerHTML = '';
  casillaEl.disabled = true;
  casillaEl.classList.add('ordena-casilla-llena');
  casillaEl.setAttribute('aria-label', medio.nombre);

  if (!ajustesPista.soloTexto) {
    const img = document.createElement('img');
    img.className = 'ordena-casilla-img';
    img.src = plataforma.getDisplayUrl(medio);
    img.alt = medio.nombre;
    casillaEl.appendChild(img);
  }
  const nombre = document.createElement('span');
  nombre.className = 'ordena-casilla-nombre';
  nombre.textContent = formatearNombre(medio.nombre, ajustesPista.mayuscula);
  casillaEl.appendChild(nombre);
}

function crearElementoPieza(pieza) {
  const { plataforma, ajustesPista } = estado;
  const el = document.createElement('div');
  el.className = 'ordena-pieza';
  el.dataset.piezaId = pieza.piezaId;
  el.setAttribute('role', 'button');
  el.tabIndex = 0;
  el.setAttribute('aria-label', pieza.medio.nombre);

  if (!ajustesPista.soloTexto) {
    const img = document.createElement('img');
    img.className = 'ordena-pieza-img';
    img.src = plataforma.getDisplayUrl(pieza.medio);
    img.alt = pieza.medio.nombre;
    el.appendChild(img);
  }
  const nombre = document.createElement('span');
  nombre.className = 'ordena-pieza-nombre';
  nombre.textContent = formatearNombre(pieza.medio.nombre, ajustesPista.mayuscula);
  el.appendChild(nombre);

  activarArrastrePieza(el, pieza);
  return el;
}

function pintarRonda() {
  const { raiz, plataforma, pasosCorrectos } = estado;
  estado.seleccionId = null;

  raiz.querySelector('.ordena-ejercicio').textContent = plataforma.t('ordena.ejercicio', {
    n: estado.ejercicioActual,
    total: EJERCICIOS_TOTAL
  });

  const zonaCasillas = raiz.querySelector('.ordena-casillas');
  zonaCasillas.innerHTML = '';
  pasosCorrectos.forEach((_, indice) => {
    const casilla = document.createElement('button');
    casilla.type = 'button';
    casilla.className = 'ordena-casilla';
    casilla.dataset.indice = String(indice);
    casilla.setAttribute('aria-label', plataforma.t('ordena.casilla_vacia', { n: indice + 1 }));

    const numero = document.createElement('span');
    numero.className = 'ordena-casilla-numero';
    numero.textContent = String(indice + 1);
    casilla.appendChild(numero);

    casilla.addEventListener('click', () => intentarColocarSeleccion(indice, casilla));
    zonaCasillas.appendChild(casilla);
  });

  const zonaPiezas = raiz.querySelector('.ordena-piezas');
  zonaPiezas.innerHTML = '';
  estado.piezas.forEach((pieza) => {
    zonaPiezas.appendChild(crearElementoPieza(pieza));
  });
}

function siguienteEjercicio() {
  if (!estado) return;
  estado.ejercicioActual += 1;
  const secuencia = elegirSiguienteSecuencia(estado.plataforma.secuencias, { evitarIds: estado.secuenciasUsadas });
  if (!secuencia) {
    mostrarSinMaterial(estado.raiz.querySelector('.ordena-zona'), estado.plataforma);
    return;
  }
  estado.secuenciasUsadas.push(secuencia.id);
  const ronda = generarRonda(secuencia);
  estado.pasosCorrectos = ronda.pasos;
  estado.colocados = new Array(ronda.pasos.length).fill(null);
  estado.piezas = ronda.piezas;
  pintarRonda();
}

function iniciarPartida() {
  if (!estado) return;
  estado.ejercicioActual = 0;
  estado.secuenciasUsadas = [];
  estado.bloqueado = false;
  siguienteEjercicio();
}

function montar(contenedor, plataforma) {
  inyectarEstilosUnaVez();
  contenedor.innerHTML = '';

  const raiz = document.createElement('div');
  raiz.className = 'ordena-app';

  const cabecera = document.createElement('header');
  cabecera.className = 'ordena-cabecera';
  const titulo = document.createElement('h1');
  titulo.textContent = `${plataforma.icono || ''} ${plataforma.nombre}`.trim();
  const instrucciones = document.createElement('p');
  instrucciones.textContent = plataforma.t('ordena.instrucciones');
  cabecera.append(titulo, instrucciones);

  const marcador = document.createElement('div');
  marcador.className = 'ordena-marcador';
  const ejercicioEl = document.createElement('span');
  ejercicioEl.className = 'ordena-ejercicio';
  marcador.appendChild(ejercicioEl);

  const zona = document.createElement('div');
  zona.className = 'ordena-zona';
  const casillasEl = document.createElement('div');
  casillasEl.className = 'ordena-casillas';
  const piezasEl = document.createElement('div');
  piezasEl.className = 'ordena-piezas';
  zona.append(casillasEl, piezasEl);

  raiz.append(cabecera, marcador, zona);
  contenedor.appendChild(raiz);

  estado = {
    contenedor,
    plataforma,
    raiz,
    ejercicioActual: 0,
    secuenciasUsadas: [],
    pasosCorrectos: [],
    colocados: [],
    piezas: [],
    seleccionId: null,
    bloqueado: false,
    timeoutId: null,
    ajustesPista: plataforma.ajustesPista || { mayuscula: true, soloTexto: false }
  };

  if (!plataforma.secuencias || plataforma.secuencias.length < 1) {
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
  id: 'ordena-secuencia',
  nombre: 'Ordena la secuencia',
  icono: '🪥',
  estante: 'RUTINAS',
  montar,
  desmontar
};
