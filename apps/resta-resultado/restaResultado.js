// Pictosfera — mecánica reutilizable: "resta pictogramas y elige el
// resultado".
//
// En pantalla aparecen dos grupos del mismo pictograma:
// «minuendo» copias (normales) − «sustraendo» copias (tachadas con una
// X roja). El niño cuenta el grupo grande, descuenta visualmente los
// tachados y elige el resultado entre tres números. No hay límite de
// fallos: puede volver a intentarlo. 10 niveles.
//
// El minuendo está entre 2 y 10; el sustraendo entre 1 y (minuendo − 1),
// por lo que el resultado es siempre ≥ 1. El visual de "tachado" se
// obtiene superponiendo una X roja (dos gradientes lineales en un <div>
// absoluto) sobre el pictograma con opacidad reducida.
//
// Es "código de confianza del autor": JavaScript nativo, módulo ES, sin
// framework. No importa nada del núcleo directamente: todo lo que
// necesita le llega a través de `plataforma` en montar().

const ESTILOS_ID = 'resta-resultado-estilos';
const MIN_MATERIAL = 1;
const NIVELES_TOTAL = 10;
const MINUENDO_MIN = 2;
const MINUENDO_MAX = 10;
const NUM_OPCIONES = 3;
const OPCION_MIN = 0;
const OPCION_MAX = 9;

let estado = null;
// { plataforma, contenedor, raiz, nivelActual, usados, medioActual,
//   minuendo, sustraendo, resultado, opciones, bloqueado, timeoutId }

function mezclar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// --- Lógica pura: qué medio, qué resta y qué opciones toca este nivel ---

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

/** Tres opciones (por defecto) para elegir: el resultado correcto más
 *  distractores distintos entre sí y del resultado, dentro del rango
 *  dado, en orden aleatorio. Lógica pura: solo aritmética y mezcla. */
export function generarOpciones(resultado, { cantidad = NUM_OPCIONES, min = OPCION_MIN, max = OPCION_MAX } = {}) {
  const candidatos = [];
  for (let n = min; n <= max; n++) {
    if (n !== resultado) candidatos.push(n);
  }
  const distractores = mezclar(candidatos).slice(0, Math.max(0, cantidad - 1));
  return mezclar([resultado, ...distractores]);
}

/**
 * Genera un nivel: un medio, los operandos de la resta y las opciones
 * ya barajadas. Lógica pura: no toca el DOM. Devuelve null si no hay
 * material suficiente.
 */
export function generarNivel(medios, { evitarIds = [] } = {}) {
  const medio = elegirSiguienteMedio(medios, { evitarIds });
  if (!medio) return null;
  const { minuendo, sustraendo, resultado } = operandosAleatorios();
  const opciones = generarOpciones(resultado);
  return { medio, minuendo, sustraendo, resultado, opciones };
}

/** ¿Esta opción pulsada es el resultado correcto? */
export function esRespuestaCorrecta(opcion, resultado) {
  return Number(opcion) === Number(resultado);
}

function inyectarEstilosUnaVez() {
  if (document.getElementById(ESTILOS_ID)) return;
  const link = document.createElement('link');
  link.id = ESTILOS_ID;
  link.rel = 'stylesheet';
  link.href = new URL('restaResultado.css', import.meta.url).href;
  document.head.appendChild(link);
}

function mostrarSinMaterial(zona, plataforma) {
  zona.innerHTML = '';
  const vacio = document.createElement('p');
  vacio.className = 'vacio';
  vacio.textContent = plataforma.t('juegos.sin_material');
  zona.appendChild(vacio);
}

function manejarRespuesta(opcion, elementoOpcion) {
  if (!estado || estado.bloqueado) return;

  if (esRespuestaCorrecta(opcion, estado.resultado)) {
    estado.bloqueado = true;
    estado.plataforma.sounds.acierto();
    estado.plataforma.tts.speak(String(estado.resultado));
    elementoOpcion.classList.add('restares-opcion-correcta');

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
    elementoOpcion.classList.add('restares-opcion-fallo');
    setTimeout(() => {
      elementoOpcion.classList.remove('restares-opcion-fallo');
    }, 400);
  }
}

/** Grupo de pictogramas NORMALES (minuendo o resultado). */
function crearGrupoPictogramas(medio, cantidad, plataforma) {
  const grupo = document.createElement('div');
  grupo.className = 'restares-grupo';
  for (let i = 0; i < cantidad; i++) {
    const img = document.createElement('img');
    img.className = 'restares-grupo-img';
    img.src = plataforma.getDisplayUrl(medio);
    img.alt = medio.nombre;
    grupo.appendChild(img);
  }
  return grupo;
}

/** Grupo de pictogramas TACHADOS con X roja (sustraendo). */
function crearGrupoPictogramasTachados(medio, cantidad, plataforma) {
  const grupo = document.createElement('div');
  grupo.className = 'restares-grupo';
  for (let i = 0; i < cantidad; i++) {
    const envoltorio = document.createElement('div');
    envoltorio.className = 'restares-tachado';
    const img = document.createElement('img');
    img.className = 'restares-grupo-img';
    img.src = plataforma.getDisplayUrl(medio);
    img.alt = medio.nombre;
    const cruz = document.createElement('div');
    cruz.className = 'restares-x';
    cruz.setAttribute('aria-hidden', 'true');
    envoltorio.append(img, cruz);
    grupo.appendChild(envoltorio);
  }
  return grupo;
}

function pintarNivel() {
  const { raiz, plataforma, medioActual, minuendo, sustraendo, opciones } = estado;

  raiz.querySelector('.restares-nivel').textContent = plataforma.t('restaResultado.nivel', {
    n: estado.nivelActual,
    total: NIVELES_TOTAL
  });

  const zona = raiz.querySelector('.restares-zona');
  zona.innerHTML = '';

  const operacion = document.createElement('div');
  operacion.className = 'restares-operacion';

  operacion.appendChild(crearGrupoPictogramas(medioActual, minuendo, plataforma));

  const menos = document.createElement('span');
  menos.className = 'restares-signo';
  menos.textContent = '−';
  operacion.appendChild(menos);

  operacion.appendChild(crearGrupoPictogramasTachados(medioActual, sustraendo, plataforma));

  const igual = document.createElement('span');
  igual.className = 'restares-signo';
  igual.textContent = '=';
  operacion.appendChild(igual);

  const interrogante = document.createElement('span');
  interrogante.className = 'restares-signo restares-interrogante';
  interrogante.textContent = '?';
  operacion.appendChild(interrogante);

  zona.appendChild(operacion);

  const listaOpciones = document.createElement('div');
  listaOpciones.className = 'restares-opciones';
  opciones.forEach((opcion) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'restares-opcion';
    boton.textContent = String(opcion);
    boton.addEventListener('click', () => {
      plataforma.sounds.click();
      manejarRespuesta(opcion, boton);
    });
    listaOpciones.appendChild(boton);
  });
  zona.appendChild(listaOpciones);
}

function siguienteNivel() {
  if (!estado) return;
  estado.nivelActual += 1;
  const nivel = generarNivel(estado.plataforma.medios, { evitarIds: estado.usados });
  if (!nivel) {
    mostrarSinMaterial(estado.raiz.querySelector('.restares-zona'), estado.plataforma);
    return;
  }
  estado.usados.push(nivel.medio.id);
  estado.medioActual = nivel.medio;
  estado.minuendo = nivel.minuendo;
  estado.sustraendo = nivel.sustraendo;
  estado.resultado = nivel.resultado;
  estado.opciones = nivel.opciones;
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
  raiz.className = 'restares-app';

  const cabecera = document.createElement('header');
  cabecera.className = 'restares-cabecera';
  const titulo = document.createElement('h1');
  titulo.textContent = `${plataforma.icono || ''} ${plataforma.nombre}`.trim();
  const instrucciones = document.createElement('p');
  instrucciones.textContent = plataforma.t('restaResultado.instrucciones');
  cabecera.append(titulo, instrucciones);

  const marcador = document.createElement('div');
  marcador.className = 'restares-marcador';
  const nivelEl = document.createElement('span');
  nivelEl.className = 'restares-nivel';
  marcador.appendChild(nivelEl);

  const zona = document.createElement('div');
  zona.className = 'restares-zona';

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
    opciones: [],
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
  id: 'resta-resultado',
  nombre: 'Resta pictogramas y elige el resultado',
  icono: '➖',
  estante: 'NUMEROS',
  montar,
  desmontar
};
