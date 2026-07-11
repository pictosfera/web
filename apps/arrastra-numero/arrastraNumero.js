// Pictosfera — mecánica reutilizable: "cuenta y arrastra el número".
//
// En pantalla aparece una serie de pictogramas IGUALES en línea (el
// mismo medio repetido «cantidad» veces) seguida de una casilla vacía.
// Debajo aparecen los números del 1 al 10 como elementos arrastrables.
// El niño cuenta la serie y arrastra hasta la casilla el número que
// coincide con la cantidad. 10 niveles.
//
// A diferencia del resto de mecánicas de pictogramas, aquí NO hay una
// "palabra" que mostrar como pista: el objetivo es contar una imagen
// repetida y reconocer su grafía numérica, así que esta mecánica no usa
// los ajustes de pista del portal (mayúsculas, solo texto, pulsador
// TTS...): siempre se ve la imagen, tantas veces como toque.
//
// Es "código de confianza del autor": JavaScript nativo, módulo ES, sin
// framework. No importa nada del núcleo directamente: todo lo que
// necesita le llega a través de `plataforma` en montar(). El arrastre
// reutiliza la misma dinámica de puntero que "Arrastra la palabra"
// (duplicada a propósito: cada mecánica de este proyecto es
// independiente y no importa código de otra mecánica).

const ESTILOS_ID = 'arrastra-numero-estilos';
const MIN_MATERIAL = 1;
const NIVELES_TOTAL = 10;
const CANTIDAD_MIN = 1;
const CANTIDAD_MAX = 10;
const UMBRAL_ARRASTRE = 4; // píxeles: por debajo de esto se considera un toque, no un arrastre

let estado = null; // { plataforma, contenedor, raiz, nivelActual, usados, medioActual, cantidad, bloqueado, timeoutId }

// --- Lógica pura: qué medio y qué cantidad toca este nivel ---

/** Lista fija de números arrastrables, en orden, del mínimo al máximo. */
export function numerosArrastrables(min = CANTIDAD_MIN, max = CANTIDAD_MAX) {
  const numeros = [];
  for (let n = min; n <= max; n++) numeros.push(n);
  return numeros;
}

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

/** ¿Este número arrastrado es la cantidad correcta? */
export function esRespuestaCorrecta(numero, cantidad) {
  return Number(numero) === Number(cantidad);
}

function inyectarEstilosUnaVez() {
  if (document.getElementById(ESTILOS_ID)) return;
  const link = document.createElement('link');
  link.id = ESTILOS_ID;
  link.rel = 'stylesheet';
  link.href = new URL('arrastraNumero.css', import.meta.url).href;
  document.head.appendChild(link);
}

function mostrarSinMaterial(zona, plataforma) {
  zona.innerHTML = '';
  const vacio = document.createElement('p');
  vacio.className = 'vacio';
  vacio.textContent = plataforma.t('juegos.sin_material');
  zona.appendChild(vacio);
}

function manejarRespuesta(numero, elementoNumero, objetivo) {
  if (!estado || estado.bloqueado) return;

  if (esRespuestaCorrecta(numero, estado.cantidad)) {
    estado.bloqueado = true;
    estado.plataforma.sounds.acierto();
    estado.plataforma.tts.speak(String(estado.cantidad));
    objetivo.textContent = String(estado.cantidad);
    objetivo.classList.add('arrastranum-objetivo-correcto');
    elementoNumero.classList.add('arrastranum-numero-correcto');

    if (estado.nivelActual >= NIVELES_TOTAL) {
      estado.timeoutId = setTimeout(() => {
        if (!estado) return;
        estado.plataforma.mostrarRecompensa({ onContinuar: iniciarPartida });
      }, 500);
    } else {
      estado.timeoutId = setTimeout(() => {
        if (!estado) return;
        estado.bloqueado = false;
        siguienteNivel();
      }, 700);
    }
  } else {
    estado.plataforma.sounds.fallo();
    objetivo.classList.add('arrastranum-objetivo-fallo');
    elementoNumero.classList.add('arrastranum-numero-fallo');
    setTimeout(() => {
      objetivo.classList.remove('arrastranum-objetivo-fallo');
      elementoNumero.classList.remove('arrastranum-numero-fallo');
    }, 400);
  }
}

/** Engancha el arrastre (puntero/táctil), igual dinámica que en
 *  "Arrastra la palabra": un simple toque sin arrastre no cuenta como
 *  respuesta. Intro/Espacio por teclado como vía de accesibilidad. */
function activarArrastre(elementoNumero, numero, objetivo) {
  let activo = false;
  let arrastrado = false;
  let inicioX = 0;
  let inicioY = 0;

  function dentroDelObjetivo(x, y) {
    const r = objetivo.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  function onPointerDown(ev) {
    if (!estado || estado.bloqueado) return;
    activo = true;
    arrastrado = false;
    inicioX = ev.clientX;
    inicioY = ev.clientY;
    elementoNumero.style.transition = 'none';
    try { elementoNumero.setPointerCapture(ev.pointerId); } catch { /* no soportado en algún entorno: no pasa nada */ }
    elementoNumero.classList.add('arrastranum-numero-activo');
  }

  function onPointerMove(ev) {
    if (!activo) return;
    const dx = ev.clientX - inicioX;
    const dy = ev.clientY - inicioY;
    if (Math.abs(dx) > UMBRAL_ARRASTRE || Math.abs(dy) > UMBRAL_ARRASTRE) arrastrado = true;
    elementoNumero.style.transform = `translate(${dx}px, ${dy}px)`;
    objetivo.classList.toggle('arrastranum-objetivo-resaltado', dentroDelObjetivo(ev.clientX, ev.clientY));
  }

  function soltar(ev) {
    if (!activo) return;
    activo = false;
    elementoNumero.classList.remove('arrastranum-numero-activo');
    objetivo.classList.remove('arrastranum-objetivo-resaltado');
    elementoNumero.style.transition = 'transform var(--transition-base)';
    elementoNumero.style.transform = 'translate(0, 0)';

    const sobreObjetivo = arrastrado && dentroDelObjetivo(ev.clientX, ev.clientY);
    if (sobreObjetivo) manejarRespuesta(numero, elementoNumero, objetivo);
  }

  function onPointerCancel() {
    activo = false;
    elementoNumero.classList.remove('arrastranum-numero-activo');
    objetivo.classList.remove('arrastranum-objetivo-resaltado');
    elementoNumero.style.transition = 'transform var(--transition-base)';
    elementoNumero.style.transform = 'translate(0, 0)';
  }

  function onKeyDown(ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault();
    manejarRespuesta(numero, elementoNumero, objetivo);
  }

  elementoNumero.addEventListener('pointerdown', onPointerDown);
  elementoNumero.addEventListener('pointermove', onPointerMove);
  elementoNumero.addEventListener('pointerup', soltar);
  elementoNumero.addEventListener('pointercancel', onPointerCancel);
  elementoNumero.addEventListener('keydown', onKeyDown);
}

function pintarNivel() {
  const { raiz, plataforma, medioActual, cantidad } = estado;
  plataforma.tts.speak(plataforma.t('arrastraNumero.tts_instruccion'));

  raiz.querySelector('.arrastranum-nivel').textContent = plataforma.t('arrastraNumero.nivel', {
    n: estado.nivelActual,
    total: NIVELES_TOTAL
  });

  const zona = raiz.querySelector('.arrastranum-zona');
  zona.innerHTML = '';

  const serie = document.createElement('div');
  serie.className = 'arrastranum-serie';
  for (let i = 0; i < cantidad; i++) {
    const img = document.createElement('img');
    img.className = 'arrastranum-serie-img';
    img.src = plataforma.getDisplayUrl(medioActual);
    img.alt = medioActual.nombre;
    serie.appendChild(img);
  }

  const objetivo = document.createElement('div');
  objetivo.className = 'arrastranum-objetivo';
  objetivo.setAttribute('aria-label', plataforma.t('arrastraNumero.casilla_vacia'));

  serie.appendChild(objetivo);
  zona.appendChild(serie);

  const numeros = document.createElement('div');
  numeros.className = 'arrastranum-numeros';
  numerosArrastrables().forEach((numero) => {
    const elementoNumero = document.createElement('div');
    elementoNumero.className = 'arrastranum-numero';
    elementoNumero.setAttribute('role', 'button');
    elementoNumero.tabIndex = 0;
    elementoNumero.setAttribute('aria-label', String(numero));
    elementoNumero.textContent = String(numero);
    activarArrastre(elementoNumero, numero, objetivo);
    numeros.appendChild(elementoNumero);
  });
  zona.appendChild(numeros);
}

function siguienteNivel() {
  if (!estado) return;
  estado.nivelActual += 1;
  const nivel = generarNivel(estado.plataforma.medios, { evitarIds: estado.usados });
  if (!nivel) {
    mostrarSinMaterial(estado.raiz.querySelector('.arrastranum-zona'), estado.plataforma);
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
  estado.bloqueado = false;
  siguienteNivel();
}

function montar(contenedor, plataforma) {
  inyectarEstilosUnaVez();
  contenedor.innerHTML = '';

  const raiz = document.createElement('div');
  raiz.className = 'arrastranum-app';

  const cabecera = document.createElement('header');
  cabecera.className = 'arrastranum-cabecera';
  const titulo = document.createElement('h1');
  titulo.textContent = `${plataforma.icono || ''} ${plataforma.nombre}`.trim();
  const instrucciones = document.createElement('p');
  instrucciones.textContent = plataforma.t('arrastraNumero.instrucciones');
  cabecera.append(titulo, instrucciones);

  const marcador = document.createElement('div');
  marcador.className = 'arrastranum-marcador';
  const nivelEl = document.createElement('span');
  nivelEl.className = 'arrastranum-nivel';
  marcador.appendChild(nivelEl);

  const zona = document.createElement('div');
  zona.className = 'arrastranum-zona';

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
    bloqueado: false,
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
  id: 'arrastra-numero',
  nombre: 'Cuenta y arrastra el número',
  icono: '🔢',
  estante: 'NUMEROS',
  montar,
  desmontar
};
