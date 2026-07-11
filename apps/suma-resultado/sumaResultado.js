// Pictosfera — mecánica reutilizable: "suma pictogramas y elige el
// resultado".
//
// En pantalla aparecen dos grupos de pictogramas IGUALES (el mismo
// medio repetido en ambos grupos, para que la suma se vea como una
// sola cantidad creciendo): «sumando1» copias + «sumando2» copias, con
// un «+» entre ambos grupos y un «=» seguido de tres números para
// elegir (el resultado correcto y dos distractores). El niño cuenta
// cada grupo, suma mentalmente y pulsa el número correcto. No hay
// límite de fallos: puede volver a intentarlo. 10 niveles.
//
// Igual que "Cuenta y arrastra el número", esta mecánica no usa los
// ajustes de pista del portal (no hay palabra que mostrar como pista):
// siempre se ven las imágenes de los pictogramas.
//
// Es "código de confianza del autor": JavaScript nativo, módulo ES, sin
// framework. No importa nada del núcleo directamente: todo lo que
// necesita le llega a través de `plataforma` en montar().

const ESTILOS_ID = 'suma-resultado-estilos';
const MIN_MATERIAL = 1;
const NIVELES_TOTAL = 10;
const SUMANDO_MIN = 1;
const SUMANDO_MAX = 5;
const NUM_OPCIONES = 3;
const OPCION_MIN = 1;
const OPCION_MAX = 10;

let estado = null; // { plataforma, contenedor, raiz, nivelActual, usados, medioActual, sumando1, sumando2, resultado, opciones, bloqueado, timeoutId }

function mezclar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// --- Lógica pura: qué medio, qué suma y qué opciones toca este nivel ---

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

/** Tres opciones (por defecto) para elegir: el resultado correcto más
 *  distractores distintos entre sí y del resultado, dentro del rango
 *  dado, en orden aleatorio. Lógica pura: solo aritmética y mezcla, sin
 *  DOM, así que se puede probar con node --test. */
export function generarOpciones(resultado, { cantidad = NUM_OPCIONES, min = OPCION_MIN, max = OPCION_MAX } = {}) {
  const candidatos = [];
  for (let n = min; n <= max; n++) {
    if (n !== resultado) candidatos.push(n);
  }
  const distractores = mezclar(candidatos).slice(0, Math.max(0, cantidad - 1));
  return mezclar([resultado, ...distractores]);
}

/**
 * Genera un nivel: un medio (para repetir en ambos sumandos), los dos
 * sumandos, el resultado y las opciones ya barajadas. Lógica pura: no
 * toca el DOM. Devuelve null si no hay material suficiente.
 */
export function generarNivel(medios, { evitarIds = [] } = {}) {
  const medio = elegirSiguienteMedio(medios, { evitarIds });
  if (!medio) return null;
  const sumando1 = sumandoAleatorio();
  const sumando2 = sumandoAleatorio();
  const resultado = sumando1 + sumando2;
  const opciones = generarOpciones(resultado);
  return { medio, sumando1, sumando2, resultado, opciones };
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
  link.href = new URL('sumaResultado.css', import.meta.url).href;
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
    estado.plataforma.tts.speak(
      `${estado.sumando1} ${estado.plataforma.t('sumaResultado.tts_mas')} ${estado.sumando2} ${estado.plataforma.t('sumaResultado.tts_igual')} ${estado.resultado}`
    );
    elementoOpcion.classList.add('sumares-opcion-correcta');

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
    elementoOpcion.classList.add('sumares-opcion-fallo');
    setTimeout(() => {
      elementoOpcion.classList.remove('sumares-opcion-fallo');
    }, 400);
  }
}

function crearGrupoPictogramas(medio, cantidad, plataforma) {
  const grupo = document.createElement('div');
  grupo.className = 'sumares-grupo';
  for (let i = 0; i < cantidad; i++) {
    const img = document.createElement('img');
    img.className = 'sumares-grupo-img';
    img.src = plataforma.getDisplayUrl(medio);
    img.alt = medio.nombre;
    grupo.appendChild(img);
  }
  return grupo;
}

function pintarNivel() {
  const { raiz, plataforma, medioActual, sumando1, sumando2, opciones } = estado;

  raiz.querySelector('.sumares-nivel').textContent = plataforma.t('sumaResultado.nivel', {
    n: estado.nivelActual,
    total: NIVELES_TOTAL
  });

  const zona = raiz.querySelector('.sumares-zona');
  zona.innerHTML = '';

  const operacion = document.createElement('div');
  operacion.className = 'sumares-operacion';

  operacion.appendChild(crearGrupoPictogramas(medioActual, sumando1, plataforma));

  const mas = document.createElement('span');
  mas.className = 'sumares-signo';
  mas.textContent = '+';
  operacion.appendChild(mas);

  operacion.appendChild(crearGrupoPictogramas(medioActual, sumando2, plataforma));

  const igual = document.createElement('span');
  igual.className = 'sumares-signo';
  igual.textContent = '=';
  operacion.appendChild(igual);

  const interrogante = document.createElement('span');
  interrogante.className = 'sumares-signo sumares-interrogante';
  interrogante.textContent = '?';
  operacion.appendChild(interrogante);

  zona.appendChild(operacion);

  const listaOpciones = document.createElement('div');
  listaOpciones.className = 'sumares-opciones';
  opciones.forEach((opcion) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'sumares-opcion';
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
    mostrarSinMaterial(estado.raiz.querySelector('.sumares-zona'), estado.plataforma);
    return;
  }
  estado.usados.push(nivel.medio.id);
  estado.medioActual = nivel.medio;
  estado.sumando1 = nivel.sumando1;
  estado.sumando2 = nivel.sumando2;
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
  raiz.className = 'sumares-app';

  const cabecera = document.createElement('header');
  cabecera.className = 'sumares-cabecera';
  const titulo = document.createElement('h1');
  titulo.textContent = `${plataforma.icono || ''} ${plataforma.nombre}`.trim();
  const instrucciones = document.createElement('p');
  instrucciones.textContent = plataforma.t('sumaResultado.instrucciones');
  cabecera.append(titulo, instrucciones);

  const marcador = document.createElement('div');
  marcador.className = 'sumares-marcador';
  const nivelEl = document.createElement('span');
  nivelEl.className = 'sumares-nivel';
  marcador.appendChild(nivelEl);

  const zona = document.createElement('div');
  zona.className = 'sumares-zona';

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
  id: 'suma-resultado',
  nombre: 'Suma pictogramas y elige el resultado',
  icono: '➕',
  estante: 'NUMEROS',
  montar,
  desmontar
};
