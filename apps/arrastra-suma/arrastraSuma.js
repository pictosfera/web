// Pictosfera — mecánica reutilizable: "arrastra los números de la
// suma".
//
// Variante de "Escribe los números de la suma" (apps/completa-suma):
// en pantalla aparece la misma suma representada con pictogramas
// (sumando1 copias + sumando2 copias = resultado copias, todo con el
// mismo medio repetido), pero las tres casillas ya NO son recuadros
// para escribir a mano: son zonas para SOLTAR un número. Debajo de la
// suma aparece un banco fijo con los números del 1 al 10, igual que en
// "Cuenta y arrastra el número" (apps/arrastra-numero), que sirve a la
// vez para las tres casillas.
//
// Las tres casillas se validan de forma INDEPENDIENTE y en cualquier
// orden, igual que en "Escribe los números de la suma". Un número del
// banco se queda siempre disponible después de soltarlo correctamente
// en una casilla: puede hacer falta arrastrarlo más de una vez en el
// mismo nivel si los dos sumandos coinciden (p. ej. 3+3=6 necesita el
// «3» dos veces). El ejercicio se da por resuelto cuando las tres
// casillas están en verde. 10 niveles (ejercicios).
//
// Es "código de confianza del autor": JavaScript nativo, módulo ES,
// sin framework. No importa nada del núcleo directamente: todo lo que
// necesita le llega a través de `plataforma` en montar(). La lógica de
// arrastre reutiliza la misma dinámica de puntero que "Cuenta y
// arrastra el número" (duplicada a propósito: cada mecánica de este
// proyecto es independiente y no importa código de otra mecánica).

const ESTILOS_ID = 'arrastra-suma-estilos';
const MIN_MATERIAL = 1;
const NIVELES_TOTAL = 10;
const SUMANDO_MIN = 1;
const SUMANDO_MAX = 5;
const NUMERO_MIN = 1;
const NUMERO_MAX = 10;
const UMBRAL_ARRASTRE = 4; // píxeles: por debajo de esto se considera un toque, no un arrastre
const RETRASO_ACIERTO_MS = 700;
const RETRASO_FINAL_MS = 500;

let estado = null;
// { plataforma, contenedor, raiz, nivelActual, usados, medioActual,
//   sumando1, sumando2, resultado, objetivos, timeoutId }

// --- Lógica pura: qué medio y qué suma toca este nivel ---

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

/** Sumando al azar, entero, entre min y max inclusive. */
export function sumandoAleatorio(min = SUMANDO_MIN, max = SUMANDO_MAX) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Lista fija de números arrastrables del banco, en orden, del mínimo
 *  al máximo (igual que en "Cuenta y arrastra el número"). */
export function numerosArrastrables(min = NUMERO_MIN, max = NUMERO_MAX) {
  const numeros = [];
  for (let n = min; n <= max; n++) numeros.push(n);
  return numeros;
}

/**
 * Genera un nivel: un medio (para repetir en las tres partes) y los
 * dos sumandos (el resultado se deriva de ellos). Lógica pura: no toca
 * el DOM. Devuelve null si no hay material suficiente.
 */
export function generarNivel(medios, { evitarIds = [] } = {}) {
  const medio = elegirSiguienteMedio(medios, { evitarIds });
  if (!medio) return null;
  const sumando1 = sumandoAleatorio();
  const sumando2 = sumandoAleatorio();
  return { medio, sumando1, sumando2, resultado: sumando1 + sumando2 };
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
  link.href = new URL('arrastraSuma.css', import.meta.url).href;
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
  objetivo.elemento.classList.toggle('arrastrasuma-objetivo-correcto', objetivo.resuelta);
  if (objetivo.resuelta) {
    objetivo.elemento.textContent = String(objetivo.valorEsperado);
    objetivo.elemento.setAttribute('aria-label', plataforma.t('arrastraSuma.casilla_correcta'));
  } else {
    objetivo.elemento.setAttribute('aria-label', plataforma.t('arrastraSuma.casilla_vacia'));
  }
}

function comprobarEjercicioCompleto() {
  if (!estado.objetivos.every((o) => o.resuelta)) return;
  estado.plataforma.tts.speak(
    `${estado.sumando1} ${estado.plataforma.t('sumaResultado.tts_mas')} ${estado.sumando2} ${estado.plataforma.t('sumaResultado.tts_igual')} ${estado.resultado}`
  );
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
 *  esperado coincide con `numero` (usado tanto al soltar sobre una
 *  casilla concreta como al activar por teclado, donde no hay una
 *  posición de puntero que indique sobre qué casilla se suelta). */
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
    elementoNumero.classList.add('arrastrasuma-numero-acierto');
    setTimeout(() => {
      elementoNumero.classList.remove('arrastrasuma-numero-acierto');
    }, 500);
    comprobarEjercicioCompleto();
  } else {
    estado.plataforma.sounds.fallo();
    objetivo.elemento.classList.add('arrastrasuma-objetivo-fallo');
    elementoNumero.classList.add('arrastrasuma-numero-fallo');
    setTimeout(() => {
      objetivo.elemento.classList.remove('arrastrasuma-objetivo-fallo');
      elementoNumero.classList.remove('arrastrasuma-numero-fallo');
    }, 400);
  }
}

/** Activación por teclado (Intro/Espacio): sin posición de puntero, se
 *  busca automáticamente la primera casilla sin resolver que ese
 *  número complete. Si ninguna casilla abierta necesita ese número, se
 *  marca el propio número como fallo (no hay una casilla concreta que
 *  señalar). */
function manejarActivacionTeclado(numero, elementoNumero) {
  if (!estado) return;
  const objetivo = objetivoParaNumero(numero);
  if (objetivo) {
    manejarSoltar(numero, elementoNumero, objetivo);
  } else {
    estado.plataforma.sounds.fallo();
    elementoNumero.classList.add('arrastrasuma-numero-fallo');
    setTimeout(() => elementoNumero.classList.remove('arrastrasuma-numero-fallo'), 400);
  }
}

/** Engancha el arrastre (puntero/táctil), igual dinámica que en
 *  "Cuenta y arrastra el número": un simple toque sin arrastre no
 *  cuenta como respuesta. Intro/Espacio por teclado como vía de
 *  accesibilidad. A diferencia de esa mecánica, aquí hay varias
 *  casillas a la vez, así que se busca cuál de ellas está bajo el
 *  puntero al soltar. */
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
    try { elementoNumero.setPointerCapture(ev.pointerId); } catch { /* no soportado en algún entorno: no pasa nada */ }
    elementoNumero.classList.add('arrastrasuma-numero-activo');
  }

  function onPointerMove(ev) {
    if (!activo) return;
    const dx = ev.clientX - inicioX;
    const dy = ev.clientY - inicioY;
    if (Math.abs(dx) > UMBRAL_ARRASTRE || Math.abs(dy) > UMBRAL_ARRASTRE) arrastrado = true;
    elementoNumero.style.transform = `translate(${dx}px, ${dy}px)`;
    estado.objetivos.forEach((o) => {
      const resaltar = !o.resuelta && dentroDe(o.elemento, ev.clientX, ev.clientY);
      o.elemento.classList.toggle('arrastrasuma-objetivo-resaltado', resaltar);
    });
  }

  function soltar(ev) {
    if (!activo) return;
    activo = false;
    elementoNumero.classList.remove('arrastrasuma-numero-activo');
    estado.objetivos.forEach((o) => o.elemento.classList.remove('arrastrasuma-objetivo-resaltado'));
    elementoNumero.style.transition = 'transform var(--transition-base)';
    elementoNumero.style.transform = 'translate(0, 0)';

    const objetivo = arrastrado ? objetivoBajoPuntero(ev.clientX, ev.clientY) : null;
    if (objetivo) manejarSoltar(numero, elementoNumero, objetivo);
  }

  function onPointerCancel() {
    activo = false;
    elementoNumero.classList.remove('arrastrasuma-numero-activo');
    estado.objetivos.forEach((o) => o.elemento.classList.remove('arrastrasuma-objetivo-resaltado'));
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
  elemento.className = 'arrastrasuma-objetivo';
  const objetivo = { valorEsperado, elemento, resuelta: false };
  pintarEstadoObjetivo(objetivo);
  return objetivo;
}

function crearParte(medio, cantidad, objetivo, plataforma) {
  const parte = document.createElement('div');
  parte.className = 'arrastrasuma-parte';

  const grupo = document.createElement('div');
  grupo.className = 'arrastrasuma-grupo';
  for (let i = 0; i < cantidad; i++) {
    const img = document.createElement('img');
    img.className = 'arrastrasuma-grupo-img';
    img.src = plataforma.getDisplayUrl(medio);
    img.alt = medio.nombre;
    grupo.appendChild(img);
  }

  parte.append(grupo, objetivo.elemento);
  return parte;
}

function pintarNivel() {
  const { raiz, plataforma, medioActual, sumando1, sumando2, resultado } = estado;
  plataforma.tts.speak(plataforma.t('arrastraSuma.tts_instruccion'));

  raiz.querySelector('.arrastrasuma-nivel').textContent = plataforma.t('arrastraSuma.nivel', {
    n: estado.nivelActual,
    total: NIVELES_TOTAL
  });

  const zona = raiz.querySelector('.arrastrasuma-zona');
  zona.innerHTML = '';

  const objetivo1 = crearObjetivo(sumando1);
  const objetivo2 = crearObjetivo(sumando2);
  const objetivo3 = crearObjetivo(resultado);
  estado.objetivos = [objetivo1, objetivo2, objetivo3];

  const operacion = document.createElement('div');
  operacion.className = 'arrastrasuma-operacion';

  const mas = document.createElement('span');
  mas.className = 'arrastrasuma-signo';
  mas.textContent = '+';

  const igual = document.createElement('span');
  igual.className = 'arrastrasuma-signo';
  igual.textContent = '=';

  operacion.append(
    crearParte(medioActual, sumando1, objetivo1, plataforma),
    mas,
    crearParte(medioActual, sumando2, objetivo2, plataforma),
    igual,
    crearParte(medioActual, resultado, objetivo3, plataforma)
  );
  zona.appendChild(operacion);

  const numeros = document.createElement('div');
  numeros.className = 'arrastrasuma-numeros';
  numerosArrastrables().forEach((numero) => {
    const elementoNumero = document.createElement('div');
    elementoNumero.className = 'arrastrasuma-numero';
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
    mostrarSinMaterial(estado.raiz.querySelector('.arrastrasuma-zona'), estado.plataforma);
    return;
  }
  estado.usados.push(nivel.medio.id);
  estado.medioActual = nivel.medio;
  estado.sumando1 = nivel.sumando1;
  estado.sumando2 = nivel.sumando2;
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
  raiz.className = 'arrastrasuma-app';

  const cabecera = document.createElement('header');
  cabecera.className = 'arrastrasuma-cabecera';
  const titulo = document.createElement('h1');
  titulo.textContent = `${plataforma.icono || ''} ${plataforma.nombre}`.trim();
  const instrucciones = document.createElement('p');
  instrucciones.textContent = plataforma.t('arrastraSuma.instrucciones');
  cabecera.append(titulo, instrucciones);

  const marcador = document.createElement('div');
  marcador.className = 'arrastrasuma-marcador';
  const nivelEl = document.createElement('span');
  nivelEl.className = 'arrastrasuma-nivel';
  marcador.appendChild(nivelEl);

  const zona = document.createElement('div');
  zona.className = 'arrastrasuma-zona';

  raiz.append(cabecera, marcador, zona);
  contenedor.appendChild(raiz);

  estado = {
    contenedor,
    plataforma,
    raiz,
    nivelActual: 0,
    usados: [],
    medioActual: null,
    sumando1: 0,
    sumando2: 0,
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
  id: 'arrastra-suma',
  nombre: 'Arrastra los números de la suma',
  icono: '🧩',
  estante: 'NUMEROS',
  montar,
  desmontar
};
