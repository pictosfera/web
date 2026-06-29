// Pictosfera — mecánica: "Reconoce emociones".
//
// Aparece en el centro la cara de un personaje generada al azar
// (core/js/cabezas.js, expuesta aquí como plataforma.cabezas: ver la
// nota de aislamiento más abajo) con una de cuatro expresiones:
// contento, triste, enfadado o asustado. Debajo, los cuatro
// pictogramas FIJOS de ARASAAC que representan esas mismas cuatro
// emociones (ver `descriptor.material.fijos` en data/apps.json y
// `plataforma.fijos` en core/js/appLoader.js), siempre los mismos,
// pero en una posición distinta cada ronda. El niño pulsa (no
// arrastra) el pictograma que corresponde a la expresión de la cara.
//
// A diferencia de toda otra mecánica de este proyecto, AQUÍ NO HAY
// "pozo" de pictogramas (`plataforma.medios`) ni por tanto un estado
// "sin material suficiente": la cara es un dibujo generado al vuelo
// por cabezas.js, no un pictograma de ARASAAC, así que esta
// actividad es siempre jugable. Solo los 4 pictogramas de respuesta
// dependen de red la primera vez; si alguno no se pudo cargar, cae a
// un emoji equivalente (igual que en "Me gusta / no me gusta" y
// "Lista de la compra": ver pintarFijo), así que el juego nunca se
// queda sin poder mostrar las cuatro opciones.
//
// El texto visible de cada pictograma de respuesta (su etiqueta de
// ayuda) es siempre una cadena propia del portal (locales/*.json,
// bloque "reconoceEmociones"), NO el nombre que ARASAAC le dé a ese
// pictograma en cada idioma: son las cuatro emociones "chrome" de
// esta pantalla, no material editable por el adulto (mismo criterio
// que el plato/cubo de "Me gusta / no me gusta").
//
// IMPORTANTE (accesibilidad): la cara nunca lleva una etiqueta que
// revele la expresión (ver la nota en cabezas.js) — sería darle la
// respuesta a quien usa un lector de pantalla antes de mirarla. Aquí
// se le pasa una etiqueta genérica y neutra ("Cara de un personaje").
//
// Código de confianza del autor del proyecto: esta mecánica no
// importa nada del núcleo directamente (no hay `import` de
// core/js/*): todo lo que necesita (generador de cabezas, sonidos,
// voz, traducciones, pictogramas fijos, ajustes...) le llega ya
// resuelto a través de `plataforma` en montar(), igual que el resto
// de mecánicas del proyecto.

const RONDAS_TOTAL = 10;
const ESTILOS_ID = 'reconoce-emociones-estilos';

// Las cuatro emociones de esta actividad, independientes del catálogo
// interno de cabezas.js (que solo sabe dibujar esas mismas cuatro,
// pero esta lista es la propia de la mecánica: la que casa con los
// cuatro pictogramas fijos declarados en apps.json).
const EXPRESIONES = ['contento', 'triste', 'enfadado', 'asustado'];

// emoji: respaldo si el pictograma fijo no se pudo cargar (sin red).
// etiquetaClave: clave de traducción del texto/aria-label del botón.
const DEFINICIONES_EMOCION = [
  { clave: 'contento', emoji: '😊', etiquetaClave: 'reconoceEmociones.contento' },
  { clave: 'triste', emoji: '😢', etiquetaClave: 'reconoceEmociones.triste' },
  { clave: 'enfadado', emoji: '😠', etiquetaClave: 'reconoceEmociones.enfadado' },
  { clave: 'asustado', emoji: '😨', etiquetaClave: 'reconoceEmociones.asustado' }
];

function definicionPara(clave) {
  return DEFINICIONES_EMOCION.find((def) => def.clave === clave);
}

/** Baraja de Fisher-Yates, sin mutar la lista original. Se repite en
 *  cada mecánica que la necesita en vez de compartir un helper de
 *  núcleo (es lógica trivial y mantiene cada módulo independiente). */
export function mezclar(lista) {
  const copia = [...(lista || [])];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Elige la siguiente expresión a mostrar, evitando repetir alguna ya
 *  usada esta partida mientras queden otras sin usar (igual criterio
 *  que el resto de mecánicas al elegir el siguiente pictograma del
 *  pozo): con solo 4 expresiones, esto reparte las cuatro entre las
 *  primeras rondas en vez de poder repetir la misma varias veces de
 *  seguido por puro azar. */
export function elegirSiguienteExpresion(usadas = []) {
  const evitar = new Set(usadas);
  const sinUsar = EXPRESIONES.filter((expresion) => !evitar.has(expresion));
  const candidatas = sinUsar.length ? sinUsar : EXPRESIONES;
  return candidatas[Math.floor(Math.random() * candidatas.length)];
}

/** ¿La clave del botón pulsado coincide con la expresión que toca
 *  esta ronda? Lógica pura, separada del DOM para poder probarla. */
export function esRespuestaCorrecta(claveBoton, expresionActual) {
  return Boolean(claveBoton) && claveBoton === expresionActual;
}

/** Mayúscula/minúscula según el ajuste del portal (mismo criterio que
 *  el resto de mecánicas: `ajustesPista.mayuscula`). */
export function formatearTexto(texto, mayuscula = true) {
  if (!texto) return '';
  return mayuscula ? texto.toLocaleUpperCase() : texto.toLocaleLowerCase();
}

/** Las cuatro definiciones de emoción, en un orden distinto cada vez:
 *  es lo que decide en qué posición sale cada pictograma de respuesta
 *  esta ronda. */
export function construirOpciones() {
  return mezclar(DEFINICIONES_EMOCION);
}

function inyectarEstilosUnaVez() {
  if (document.getElementById(ESTILOS_ID)) return;
  const link = document.createElement('link');
  link.id = ESTILOS_ID;
  link.rel = 'stylesheet';
  link.href = new URL('reconoceEmociones.css', import.meta.url).href;
  document.head.appendChild(link);
}

/** Pinta el pictograma fijo de una opción, o su emoji de respaldo si
 *  no se pudo cargar (sin red la primera vez). Mismo patrón que
 *  pintarFijo() en "Me gusta / no me gusta". */
function pintarFijo(contenedor, medioFijo, emojiReserva, plataforma) {
  contenedor.innerHTML = '';
  if (medioFijo) {
    const img = document.createElement('img');
    img.className = 'emociones-opcion-imagen';
    img.src = plataforma.getDisplayUrl(medioFijo);
    img.alt = medioFijo.nombre;
    contenedor.appendChild(img);
  } else {
    const span = document.createElement('span');
    span.className = 'emociones-opcion-emoji';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = emojiReserva;
    contenedor.appendChild(span);
  }
}

/** Dibuja la cara de esta ronda dentro de `contenedor`, vía el
 *  generador de cabezas del núcleo (plataforma.cabezas). La etiqueta
 *  es deliberadamente genérica: ver la nota de accesibilidad al
 *  principio del archivo. */
function pintarCara(contenedor, expresion, plataforma) {
  contenedor.innerHTML = plataforma.cabezas.generarCabezaAleatoriaSVG({
    expresion,
    etiqueta: plataforma.t('reconoceEmociones.cara_personaje')
  });
}

function pintarOpciones(contenedor, ajustesPista, plataforma) {
  contenedor.innerHTML = '';
  const opciones = construirOpciones();

  opciones.forEach((def) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'emociones-opcion';
    // aria-label explícito: así el botón se anuncia con el texto fijo
    // de la emoción, sin depender del alt de la imagen interna (que
    // es la propia palabra clave de ARASAAC, no necesariamente igual
    // a la etiqueta del portal) ni de tener que leer todo su interior.
    boton.setAttribute('aria-label', plataforma.t(def.etiquetaClave));

    if (!ajustesPista.soloTexto) {
      const imagen = document.createElement('div');
      imagen.className = 'emociones-opcion-imagen-caja';
      pintarFijo(imagen, plataforma.fijos[def.clave], def.emoji, plataforma);
      boton.appendChild(imagen);
    }

    const etiqueta = document.createElement('span');
    etiqueta.className = 'emociones-opcion-etiqueta';
    etiqueta.textContent = formatearTexto(plataforma.t(def.etiquetaClave), ajustesPista.mayuscula);
    boton.appendChild(etiqueta);

    boton.addEventListener('click', () => manejarRespuesta(def.clave, boton));
    contenedor.appendChild(boton);
  });
}

let estado = null;

function pintarRonda() {
  const { raiz, plataforma, ajustesPista } = estado;
  raiz.querySelector('.emociones-ronda').textContent = plataforma.t('reconoceEmociones.ronda', {
    n: estado.rondaActual,
    total: RONDAS_TOTAL
  });
  pintarCara(raiz.querySelector('.emociones-cara'), estado.expresionActual, plataforma);
  pintarOpciones(raiz.querySelector('.emociones-opciones'), ajustesPista, plataforma);
}

function siguienteRonda() {
  if (!estado) return;
  estado.rondaActual += 1;
  const expresion = elegirSiguienteExpresion(estado.usadas);
  estado.usadas.push(expresion);
  estado.expresionActual = expresion;
  pintarRonda();
}

function iniciarPartida() {
  if (!estado) return;
  estado.rondaActual = 0;
  estado.usadas = [];
  estado.bloqueado = false;
  siguienteRonda();
}

function manejarRespuesta(claveBoton, boton) {
  if (!estado || estado.bloqueado) return;
  const { plataforma } = estado;

  if (esRespuestaCorrecta(claveBoton, estado.expresionActual)) {
    estado.bloqueado = true;
    plataforma.sounds.acierto();
    plataforma.tts.speak(plataforma.t(definicionPara(claveBoton).etiquetaClave));
    boton.classList.add('emociones-opcion-correcta');

    estado.timeoutId = setTimeout(() => {
      if (!estado) return;
      if (estado.rondaActual >= RONDAS_TOTAL) {
        plataforma.mostrarRecompensa({ onContinuar: iniciarPartida });
      } else {
        estado.bloqueado = false;
        siguienteRonda();
      }
    }, 700);
  } else {
    plataforma.sounds.fallo();
    boton.classList.add('emociones-opcion-fallo');
    setTimeout(() => {
      boton.classList.remove('emociones-opcion-fallo');
    }, 400);
  }
}

function montar(contenedor, plataforma) {
  inyectarEstilosUnaVez();
  contenedor.innerHTML = '';

  const raiz = document.createElement('div');
  raiz.className = 'emociones-app';

  const cabecera = document.createElement('header');
  cabecera.className = 'emociones-cabecera';
  const titulo = document.createElement('h1');
  titulo.textContent = `${plataforma.icono || ''} ${plataforma.nombre}`.trim();
  const instrucciones = document.createElement('p');
  instrucciones.textContent = plataforma.t('reconoceEmociones.instrucciones');
  cabecera.append(titulo, instrucciones);

  const marcador = document.createElement('div');
  marcador.className = 'emociones-marcador';
  const rondaEl = document.createElement('span');
  rondaEl.className = 'emociones-ronda';
  marcador.appendChild(rondaEl);

  const zona = document.createElement('div');
  zona.className = 'emociones-zona';
  // aria-live: la cara y las opciones se repintan cada ronda; la
  // etiqueta de la cara es genérica (ver pintarCara), así que avisar
  // del cambio no desvela la respuesta.
  zona.setAttribute('aria-live', 'polite');

  const cara = document.createElement('div');
  cara.className = 'emociones-cara';

  const pregunta = document.createElement('p');
  pregunta.className = 'emociones-pregunta';
  pregunta.textContent = plataforma.t('reconoceEmociones.pregunta');

  const opciones = document.createElement('div');
  opciones.className = 'emociones-opciones';

  zona.append(cara, pregunta, opciones);
  raiz.append(cabecera, marcador, zona);
  contenedor.appendChild(raiz);

  const ajustesPista = plataforma.ajustesPista || { mayuscula: true, soloTexto: false };

  estado = {
    contenedor,
    plataforma,
    raiz,
    rondaActual: 0,
    usadas: [],
    expresionActual: null,
    bloqueado: false,
    timeoutId: null,
    ajustesPista
  };

  iniciarPartida();
}

function desmontar() {
  if (estado && estado.timeoutId) clearTimeout(estado.timeoutId);
  estado = null;
}

export default {
  id: 'reconoce-emociones',
  nombre: 'Reconoce emociones',
  icono: '🙂',
  estante: 'CONCEPTOS',
  montar,
  desmontar
};
