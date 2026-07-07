// Pictosfera — mecánica reutilizable: "arrastra los números de la
// resta".
//
// Variante de "Arrastra los números de la suma" (apps/arrastra-suma):
// en pantalla aparece una resta representada con pictogramas iguales
// (el mismo medio repetido), con los pictogramas del sustraendo
// tachados con una X roja. Las tres partes de la operación
// (minuendo − sustraendo = resultado) tienen una casilla vacía debajo
// donde arrastrar el número correspondiente.
//
// El minuendo está entre 2 y 10; el sustraendo entre 1 y (minuendo−1),
// de modo que el resultado es siempre ≥ 1. El banco fijo de números 1–10
// cubre todos los valores posibles. Las tres casillas se validan de forma
// INDEPENDIENTE en cualquier orden. 10 niveles.
//
// Es "código de confianza del autor": JavaScript nativo, módulo ES, sin
// framework. No importa nada del núcleo directamente: todo lo que
// necesita le llega a través de `plataforma` en montar().

const ESTILOS_ID = 'arrastra-resta-estilos';
const MIN_MATERIAL = 1;
const NIVELES_TOTAL = 10;
const MINUENDO_MIN = 2;
const MINUENDO_MAX = 10;
const NUMERO_MIN = 1;
const NUMERO_MAX = 10;
const UMBRAL_ARRASTRE = 4; // píxeles: por debajo de esto se considera un toque, no un arrastre
const RETRASO_ACIERTO_MS = 700;
const RETRASO_FINAL_MS = 500;

let estado = null;
// { plataforma, contenedor, raiz, nivelActual, usados, medioActual,
//   minuendo, sustraendo, resultado, objetivos, timeoutId }

// --- Lógica pura: qué medio y qué resta toca este nivel ---

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

/**
 * Genera minuendo (minMin–minMax) y sustraendo (1..minuendo-1) al azar,
 * garantizando que el resultado es siempre ≥ 1.
 */
export function operandosAleatorios(minMin = MINUENDO_MIN, minMax = MINUENDO_MAX) {
  const minuendo = minMin + Math.floor(Math.random() * (minMax - minMin + 1));
  const sustraendo = 1 + Math.floor(Math.random() * (minuendo - 1));
  return { minuendo, sustraendo, resultado: minuendo - sustraendo };
}

/** Lista fija de números arrastrables del banco, en orden, del mínimo
 *  al máximo (igual que en "Arrastra los números de la suma"). */
export function numerosArrastrables(min = NUMERO_MIN, max = NUMERO_MAX) {
  const numeros = [];
  for (let n = min; n <= max; n++) numeros.push(n);
  return numeros;
}

/**
 * Genera un nivel: un medio (para repetir en las tres partes) y los
 * operandos de la resta. Lógica pura: no toca el DOM. Devuelve null si
 * no hay material suficiente.
 */
export function generarNivel(medios, { evitarIds = [] } = {}) {
  const medio = elegirSiguienteMedio(medios, { evitarIds });
  if (!medio) return null;
  const { minuendo, sustraendo, resultado } = operandosAleatorios();
  return { medio, minuendo, sustraendo, resultado };
}

/** ¿Este número arrastrado coincide con el valor esperado de la casilla? */
export function esRespuestaCorrecta(numero, valorEsperado) {
  return Number(numero) === Number(valorEsperado);
}

function inyectarEstilosUnaVez() {
  if (document.getElementById(ESTILOS_ID)) return;
  const link = document.createElement('link');
  link.id = ESTILOS_ID;
  link.rel = 'stylesheet';
  link.href = new URL('arrastraResta.css', import.meta.url).href;
  document.head.appendChild(link);
}

function mostrarSinMaterial(zona, plataforma) {
  zona.innerHTML = '';
  const vacio = document.createElement('p');
  vacio.className = 'vacio';
  vacio.textContent = plataforma.t('juegos.sin_material');
  zona.appendChild(vacio);
}

function pintarEstadoObjetivo(objetivo) {
  const { plataforma } = estado;
  objetivo.elemento.classList.toggle('arrastrares-objetivo-correcto', objetivo.resuelta);
  if (objetivo.resuelta) {
    objetivo.elemento.textContent = String(objetivo.valorEsperado);
    objetivo.elemento.setAttribute('aria-label', plataforma.t('arrastraResta.casilla_correcta'));
  } else {
    objetivo.elemento.setAttribute('aria-label', plataforma.t('arrastraResta.casilla_vacia'));
  }
}

function comprobarEjercicioCompleto() {
  if (!estado.objetivos.every((o) => o.resuelta)) return;
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

/** Busca, entre los objetivos sin resolver, el primero cuyo valor
 *  esperado coincide con `numero`. */
function objetivoParaNumero(numero) {
  return estado.objetivos.find((o) => !o.resuelta && esRespuestaCorrecta(numero, o.valorEsperado));
}

function manejarSoltar(numero, elementoNumero, objetivo) {
  if (!estado || !objetivo || objetivo.resuelta) return;

  if (esRespuestaCorrecta(numero, objetivo.valorEsperado)) {
    objetivo.resuelta = true;
    estado.plataforma.sounds.acierto();
    estado.plataforma.tts.speak(String(objetivo.valorEsperado));
    pintarEstadoObjetivo(objetivo);
    elementoNumero.classList.add('arrastrares-numero-acierto');
    setTimeout(() => {
      elementoNumero.classList.remove('arrastrares-numero-acierto');
    }, 500);
    comprobarEjercicioCompleto();
  } else {
    estado.plataforma.sounds.fallo();
    objetivo.elemento.classList.add('arrastrares-objetivo-fallo');
    elementoNumero.classList.add('arrastrares-numero-fallo');
    setTimeout(() => {
      objetivo.elemento.classList.remove('arrastrares-objetivo-fallo');
      elementoNumero.classList.remove('arrastrares-numero-fallo');
    }, 400);
  }
}

function manejarActivacionTeclado(numero, elementoNumero) {
  if (!estado) return;
  const objetivo = objetivoParaNumero(numero);
  if (objetivo) {
    manejarSoltar(numero, elementoNumero, objetivo);
  } else {
    estado.plataforma.sounds.fallo();
    elementoNumero.classList.add('arrastrares-numero-fallo');
    setTimeout(() => elementoNumero.classList.remove('arrastrares-numero-fallo'), 400);
  }
}

function activarArrastre(elementoNumero, numero) {
  let activo = false;
  let arrastrado = false;
  let inicioX = 0;
  let inicioY = 0;

  function dentroDe(elemento, x, y) {
    const r = elemento.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  function objetivoBajoPuntero(x, y) {
    return estado.objetivos.find((o) => !o.resuelta && dentroDe(o.elemento, x, y));
  }

  function onPointerDown(ev) {
    if (!estado) return;
    activo = true;
    arrastrado = false;
    inicioX = ev.clientX;
    inicioY = ev.clientY;
    elementoNumero.style.transition = 'none';
    try { elementoNumero.setPointerCapture(ev.pointerId); } catch { /* no soportado en algún entorno */ }
    elementoNumero.classList.add('arrastrares-numero-activo');
  }

  function onPointerMove(ev) {
    if (!activo) return;
    const dx = ev.clientX - inicioX;
    const dy = ev.clientY - inicioY;
    if (Math.abs(dx) > UMBRAL_ARRASTRE || Math.abs(dy) > UMBRAL_ARRASTRE) arrastrado = true;
    elementoNumero.style.transform = `translate(${dx}px, ${dy}px)`;
    estado.objetivos.forEach((o) => {
      const resaltar = !o.resuelta && dentroDe(o.elemento, ev.clientX, ev.clientY);
      o.elemento.classList.toggle('arrastrares-objetivo-resaltado', resaltar);
    });
  }

  function soltar(ev) {
    if (!activo) return;
    activo = false;
    elementoNumero.classList.remove('arrastrares-numero-activo');
    estado.objetivos.forEach((o) => o.elemento.classList.remove('arrastrares-objetivo-resaltado'));
    elementoNumero.style.transition = 'transform var(--transition-base)';
    elementoNumero.style.transform = 'translate(0, 0)';

    const objetivo = arrastrado ? objetivoBajoPuntero(ev.clientX, ev.clientY) : null;
    if (objetivo) manejarSoltar(numero, elementoNumero, objetivo);
  }

  function onPointerCancel() {
    activo = false;
    elementoNumero.classList.remove('arrastrares-numero-activo');
    estado.objetivos.forEach((o) => o.elemento.classList.remove('arrastrares-objetivo-resaltado'));
    elementoNumero.style.transition = 'transform var(--transition-base)';
    elementoNumero.style.transform = 'translate(0, 0)';
  }

  function onKeyDown(ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault();
    manejarActivacionTeclado(numero, elementoNumero);
  }

  elementoNumero.addEventListener('pointerdown', onPointerDown);
  elementoNumero.addEventListener('pointermove', onPointerMove);
  elementoNumero.addEventListener('pointerup', soltar);
  elementoNumero.addEventListener('pointercancel', onPointerCancel);
  elementoNumero.addEventListener('keydown', onKeyDown);
}

function crearObjetivo(valorEsperado) {
  const elemento = document.createElement('div');
  elemento.className = 'arrastrares-objetivo';
  const objetivo = { valorEsperado, elemento, resuelta: false };
  pintarEstadoObjetivo(objetivo);
  return objetivo;
}

/**
 * Crea una "parte" de la operación: grupo de pictogramas (normal o
 * tachado según `tachado`) + casilla de drop debajo.
 */
function crearParte(medio, cantidad, objetivo, plataforma, tachado) {
  const parte = document.createElement('div');
  parte.className = 'arrastrares-parte';

  const grupo = document.createElement('div');
  grupo.className = 'arrastrares-grupo';
  for (let i = 0; i < cantidad; i++) {
    if (tachado) {
      const envoltorio = document.createElement('div');
      envoltorio.className = 'arrastrares-tachado';
      const img = document.createElement('img');
      img.className = 'arrastrares-grupo-img';
      img.src = plataforma.getDisplayUrl(medio);
      img.alt = medio.nombre;
      const cruz = document.createElement('div');
      cruz.className = 'arrastrares-x';
      cruz.setAttribute('aria-hidden', 'true');
      envoltorio.append(img, cruz);
      grupo.appendChild(envoltorio);
    } else {
      const img = document.createElement('img');
      img.className = 'arrastrares-grupo-img';
      img.src = plataforma.getDisplayUrl(medio);
      img.alt = medio.nombre;
      grupo.appendChild(img);
    }
  }

  parte.append(grupo, objetivo.elemento);
  return parte;
}

function pintarNivel() {
  const { raiz, plataforma, medioActual, minuendo, sustraendo, resultado } = estado;

  raiz.querySelector('.arrastrares-nivel').textContent = plataforma.t('arrastraResta.nivel', {
    n: estado.nivelActual,
    total: NIVELES_TOTAL
  });

  const zona = raiz.querySelector('.arrastrares-zona');
  zona.innerHTML = '';

  const objetivo1 = crearObjetivo(minuendo);
  const objetivo2 = crearObjetivo(sustraendo);
  const objetivo3 = crearObjetivo(resultado);
  estado.objetivos = [objetivo1, objetivo2, objetivo3];

  const operacion = document.createElement('div');
  operacion.className = 'arrastrares-operacion';

  const menos = document.createElement('span');
  menos.className = 'arrastrares-signo';
  menos.textContent = '−';

  const igual = document.createElement('span');
  igual.className = 'arrastrares-signo';
  igual.textContent = '=';

  operacion.append(
    crearParte(medioActual, minuendo, objetivo1, plataforma, false),
    menos,
    crearParte(medioActual, sustraendo, objetivo2, plataforma, true),
    igual,
    crearParte(medioActual, resultado, objetivo3, plataforma, false)
  );
  zona.appendChild(operacion);

  const numeros = document.createElement('div');
  numeros.className = 'arrastrares-numeros';
  numerosArrastrables().forEach((numero) => {
    const elementoNumero = document.createElement('div');
    elementoNumero.className = 'arrastrares-numero';
    elementoNumero.setAttribute('role', 'button');
    elementoNumero.tabIndex = 0;
    elementoNumero.setAttribute('aria-label', String(numero));
    elementoNumero.textContent = String(numero);
    activarArrastre(elementoNumero, numero);
    numeros.appendChild(elementoNumero);
  });
  zona.appendChild(numeros);
}

function siguienteNivel() {
  if (!estado) return;
  estado.nivelActual += 1;
  const nivel = generarNivel(estado.plataforma.medios, { evitarIds: estado.usados });
  if (!nivel) {
    mostrarSinMaterial(estado.raiz.querySelector('.arrastrares-zona'), estado.plataforma);
    return;
  }
  estado.usados.push(nivel.medio.id);
  estado.medioActual = nivel.medio;
  estado.minuendo = nivel.minuendo;
  estado.sustraendo = nivel.sustraendo;
  estado.resultado = nivel.resultado;
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
  raiz.className = 'arrastrares-app';

  const cabecera = document.createElement('header');
  cabecera.className = 'arrastrares-cabecera';
  const titulo = document.createElement('h1');
  titulo.textContent = `${plataforma.icono || ''} ${plataforma.nombre}`.trim();
  const instrucciones = document.createElement('p');
  instrucciones.textContent = plataforma.t('arrastraResta.instrucciones');
  cabecera.append(titulo, instrucciones);

  const marcador = document.createElement('div');
  marcador.className = 'arrastrares-marcador';
  const nivelEl = document.createElement('span');
  nivelEl.className = 'arrastrares-nivel';
  marcador.appendChild(nivelEl);

  const zona = document.createElement('div');
  zona.className = 'arrastrares-zona';

  raiz.append(cabecera, marcador, zona);
  contenedor.appendChild(raiz);

  estado = {
    contenedor,
    plataforma,
    raiz,
    nivelActual: 0,
    usados: [],
    medioActual: null,
    minuendo: 0,
    sustraendo: 0,
    resultado: 0,
    objetivos: [],
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
  id: 'arrastra-resta',
  nombre: 'Arrastra los números de la resta',
  icono: '🔢',
  estante: 'NUMEROS',
  montar,
  desmontar
};
