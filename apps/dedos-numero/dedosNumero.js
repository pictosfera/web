// Pictosfera — mecánica reutilizable: "relaciona los dedos con el
// número escrito".
//
// En pantalla aparecen 1 o 2 iconos de mano, cada uno mostrando entre 1
// y 5 dedos levantados. El niño suma el total de dedos y pulsa, entre
// tres números (el correcto y dos distractores), el que coincide con
// esa cantidad. No hay límite de fallos. 10 niveles.
//
// Esta mecánica no necesita pictogramas: no usa material de la
// biblioteca ni, por tanto, los ajustes de pista del portal.
//
// Es "código de confianza del autor": JavaScript nativo, módulo ES, sin
// framework. No importa nada del núcleo directamente: todo lo que
// necesita le llega a través de `plataforma` en montar().

const ESTILOS_ID = 'dedos-numero-estilos';
const NIVELES_TOTAL = 10;
const DEDOS_MIN = 1;
const DEDOS_MAX = 5;
const NUM_OPCIONES = 3;
const OPCION_MIN = 1;
const OPCION_MAX = 10;

let estado = null; // { plataforma, contenedor, raiz, nivelActual, manos, total, opciones, bloqueado, timeoutId }

function mezclar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// --- Lógica pura: icono de mano (SVG plano, abstracto: no es anatomía
// exacta, solo un recurso visual claro para contar dedos levantados) ---

const ICONOMANO_ANCHO = 120;
const ICONOMANO_ALTO = 150;
const ICONOMANO_COLOR_PIEL = '#ffd9ad';
const ICONOMANO_COLOR_BORDE = '#c98a4b';

/** Icono SVG de una mano con `n` dedos levantados (1 a 5): una palma
 *  con tantas "cápsulas" de dedo como se pida, en abanico. Lógica
 *  pura: genera una cadena SVG, no toca el DOM.
 *
 *  Con 5 dedos, el quinto es el pulgar: a diferencia del resto (que se
 *  cuenta sumando dedos rectos en el borde superior de la palma —
 *  índice, medio, anular y corazón), una mano real no tiene 5 dedos en
 *  abanico, todos iguales: el pulgar es más corto, más grueso, y sale
 *  del lateral de la palma girado hacia fuera, opuesto a los demás. */
export function iconoMano(n) {
  const cantidad = Math.max(1, Math.min(5, Math.round(n)));
  const anchoPalma = 70;
  const altoPalma = 60;
  const xPalma = (ICONOMANO_ANCHO - anchoPalma) / 2;
  const yPalma = ICONOMANO_ALTO - altoPalma - 10;
  const anchoDedo = 16;
  const altoDedo = 58;

  // Con 5, el pulgar (ver más abajo) se dibuja aparte: los 4 dedos
  // rectos son índice, medio, anular y corazón, igual que si fueran
  // n=4; por debajo de 5 no hay pulgar que distinguir.
  const numDedosRectos = cantidad === 5 ? 4 : cantidad;
  const espacio = anchoPalma / (numDedosRectos + 1);

  const dedos = [];
  for (let i = 0; i < numDedosRectos; i++) {
    const cx = xPalma + espacio * (i + 1);
    const yDedo = yPalma - altoDedo + 14;
    dedos.push(
      `<rect class="iconomano-dedo" x="${(cx - anchoDedo / 2).toFixed(1)}" y="${yDedo.toFixed(1)}" width="${anchoDedo}" height="${altoDedo}" rx="${anchoDedo / 2}" fill="${ICONOMANO_COLOR_PIEL}" stroke="${ICONOMANO_COLOR_BORDE}" stroke-width="3"/>`
    );
  }

  let pulgar = '';
  if (cantidad === 5) {
    const anchoPulgar = 20;
    const altoPulgar = 44;
    // Punto de "articulación" del pulgar con la palma: en el lateral
    // izquierdo, más abajo que los demás dedos (así es como nace el
    // pulgar en una mano real). El rect se dibuja vertical, con la
    // base anclada justo ahí, y luego se gira hacia fuera/abajo con
    // "transform" para separarlo visualmente del resto.
    const baseX = xPalma - 2;
    const baseY = yPalma + altoPalma * 0.62;
    const xPulgar = baseX - anchoPulgar / 2;
    const yPulgar = baseY - altoPulgar;
    pulgar = `<rect class="iconomano-dedo iconomano-pulgar" x="${xPulgar.toFixed(1)}" y="${yPulgar.toFixed(1)}" width="${anchoPulgar}" height="${altoPulgar}" rx="${anchoPulgar / 2}" fill="${ICONOMANO_COLOR_PIEL}" stroke="${ICONOMANO_COLOR_BORDE}" stroke-width="3" transform="rotate(-28 ${baseX.toFixed(1)} ${baseY.toFixed(1)})"/>`;
  }

  return `<svg class="iconomano" viewBox="0 0 ${ICONOMANO_ANCHO} ${ICONOMANO_ALTO}" role="img" aria-label="${cantidad}">
    ${dedos.join('\n    ')}${pulgar ? `\n    ${pulgar}` : ''}
    <rect class="iconomano-palma" x="${xPalma}" y="${yPalma}" width="${anchoPalma}" height="${altoPalma}" rx="18" fill="${ICONOMANO_COLOR_PIEL}" stroke="${ICONOMANO_COLOR_BORDE}" stroke-width="3"/>
  </svg>`;
}

// --- Lógica pura: cuántas manos, con cuántos dedos, y qué opciones ---

/** Genera 1 o 2 "manos", cada una con un número de dedos entre
 *  `minDedos` y `maxDedos`. Lógica pura: devuelve un array de enteros
 *  (uno por mano), nunca vacío. */
export function generarManos({ minManos = 1, maxManos = 2, minDedos = DEDOS_MIN, maxDedos = DEDOS_MAX } = {}) {
  const numManos = minManos + Math.floor(Math.random() * (maxManos - minManos + 1));
  const manos = [];
  for (let i = 0; i < numManos; i++) {
    manos.push(minDedos + Math.floor(Math.random() * (maxDedos - minDedos + 1)));
  }
  return manos;
}

/** Suma de dedos de todas las manos. */
export function totalDedos(manos) {
  return (manos || []).reduce((total, n) => total + n, 0);
}

/** Tres opciones (por defecto) para elegir: el total correcto más
 *  distractores distintos entre sí y del total, dentro del rango dado,
 *  en orden aleatorio. Lógica pura. */
export function generarOpciones(total, { cantidad = NUM_OPCIONES, min = OPCION_MIN, max = OPCION_MAX } = {}) {
  const candidatos = [];
  for (let n = min; n <= max; n++) {
    if (n !== total) candidatos.push(n);
  }
  const distractores = mezclar(candidatos).slice(0, Math.max(0, cantidad - 1));
  return mezclar([total, ...distractores]);
}

/** Genera un nivel completo: las manos, el total y las opciones ya
 *  barajadas. Lógica pura: no toca el DOM, nunca devuelve null (esta
 *  mecánica no depende de material de la biblioteca). */
export function generarNivel() {
  const manos = generarManos();
  const total = totalDedos(manos);
  const opciones = generarOpciones(total);
  return { manos, total, opciones };
}

/** ¿Esta opción pulsada es el total correcto? */
export function esRespuestaCorrecta(opcion, total) {
  return Number(opcion) === Number(total);
}

function inyectarEstilosUnaVez() {
  if (document.getElementById(ESTILOS_ID)) return;
  const link = document.createElement('link');
  link.id = ESTILOS_ID;
  link.rel = 'stylesheet';
  link.href = new URL('dedosNumero.css', import.meta.url).href;
  document.head.appendChild(link);
}

function manejarRespuesta(opcion, elementoOpcion) {
  if (!estado || estado.bloqueado) return;

  if (esRespuestaCorrecta(opcion, estado.total)) {
    estado.bloqueado = true;
    estado.plataforma.sounds.acierto();
    estado.plataforma.tts.speak(String(estado.total));
    elementoOpcion.classList.add('dedosnum-opcion-correcta');

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
    elementoOpcion.classList.add('dedosnum-opcion-fallo');
    setTimeout(() => {
      elementoOpcion.classList.remove('dedosnum-opcion-fallo');
    }, 400);
  }
}

function pintarNivel() {
  const { raiz, plataforma, manos, opciones } = estado;
  plataforma.tts.speak(plataforma.t('dedosNumero.tts_instruccion'));

  raiz.querySelector('.dedosnum-nivel').textContent = plataforma.t('dedosNumero.nivel', {
    n: estado.nivelActual,
    total: NIVELES_TOTAL
  });

  const zona = raiz.querySelector('.dedosnum-zona');
  zona.innerHTML = '';

  const manosEl = document.createElement('div');
  manosEl.className = 'dedosnum-manos';
  manos.forEach((dedos, indice) => {
    if (indice > 0) {
      const mas = document.createElement('span');
      mas.className = 'dedosnum-signo';
      mas.textContent = '+';
      manosEl.appendChild(mas);
    }
    const envoltorio = document.createElement('div');
    envoltorio.className = 'dedosnum-mano';
    envoltorio.innerHTML = iconoMano(dedos);
    manosEl.appendChild(envoltorio);
  });
  zona.appendChild(manosEl);

  const listaOpciones = document.createElement('div');
  listaOpciones.className = 'dedosnum-opciones';
  opciones.forEach((opcion) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'dedosnum-opcion';
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
  const nivel = generarNivel();
  estado.manos = nivel.manos;
  estado.total = nivel.total;
  estado.opciones = nivel.opciones;
  pintarNivel();
}

function iniciarPartida() {
  if (!estado) return;
  estado.nivelActual = 0;
  estado.bloqueado = false;
  siguienteNivel();
}

function montar(contenedor, plataforma) {
  inyectarEstilosUnaVez();
  contenedor.innerHTML = '';

  const raiz = document.createElement('div');
  raiz.className = 'dedosnum-app';

  const cabecera = document.createElement('header');
  cabecera.className = 'dedosnum-cabecera';
  const titulo = document.createElement('h1');
  titulo.textContent = `${plataforma.icono || ''} ${plataforma.nombre}`.trim();
  const instrucciones = document.createElement('p');
  instrucciones.textContent = plataforma.t('dedosNumero.instrucciones');
  cabecera.append(titulo, instrucciones);

  const marcador = document.createElement('div');
  marcador.className = 'dedosnum-marcador';
  const nivelEl = document.createElement('span');
  nivelEl.className = 'dedosnum-nivel';
  marcador.appendChild(nivelEl);

  const zona = document.createElement('div');
  zona.className = 'dedosnum-zona';

  raiz.append(cabecera, marcador, zona);
  contenedor.appendChild(raiz);

  estado = {
    contenedor,
    plataforma,
    raiz,
    nivelActual: 0,
    manos: [],
    total: 0,
    opciones: [],
    bloqueado: false,
    timeoutId: null
  };

  iniciarPartida();
}

function desmontar() {
  if (estado && estado.timeoutId) clearTimeout(estado.timeoutId);
  estado = null;
}

export default {
  id: 'dedos-numero',
  nombre: 'Relaciona los dedos con el número',
  icono: '🖐️',
  estante: 'NUMEROS',
  montar,
  desmontar
};
