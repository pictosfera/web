// Pictosfera — mecánica reutilizable: "bingo de lectura".
//
// Un bombo saca bolas al azar; cada bola lleva el estímulo de un
// elemento. El niño busca y toca esa misma casilla en su cartón. Si
// acierta, la casilla queda marcada y sale la siguiente bola; si
// falla, corrección suave y puede repetir. La partida dura siempre 9
// bolas (una por cada casilla del cartón de 3x3); al completar la
// novena se muestra una animación sencilla de "¡Bingo!" — sin resumen
// de aciertos/fallos ni estadísticas.
//
// Es "código de confianza del autor": JavaScript nativo, módulo ES,
// sin framework. No importa nada del núcleo directamente: todo lo que
// necesita le llega a través de `plataforma` en montar() (ver
// core/js/appLoader.js). Igual que el resto de mecánicas, es
// reutilizable: otra app (otro material, otro nombre, otro estante)
// puede usar este mismo archivo con un descriptor nuevo en
// data/apps.json.
//
// --- Cómo se decide el "modo" de la bola y del cartón ---
//
// La especificación original describe tres modos (1: bola y cartón
// con pictograma+palabra; 2: bola con pictograma+palabra y cartón solo
// de palabras; 3: bola solo con pictograma y cartón solo de palabras),
// pero el modo NO se elige dentro del juego: se deriva de los mismos
// ajustes del PORTAL que ya usan el resto de mecánicas (ver
// core/js/ajustesJuego.js), sin inventar ajustes nuevos:
//
//   ajustesPista.mostrar   → ¿la bola, además de su pictograma, muestra
//                            también la palabra escrita?
//   ajustesPista.soloTexto → ¿las casillas del cartón muestran solo la
//                            palabra, sin la imagen del pictograma?
//
//   mostrar=true,  soloTexto=false → Modo 1 (bola y cartón con dibujo+palabra)
//   mostrar=true,  soloTexto=true  → Modo 2 (bola con dibujo+palabra, cartón solo palabras)
//   mostrar=false, soloTexto=true  → Modo 3 (bola solo dibujo, cartón solo palabras)
//   mostrar=false, soloTexto=false → variante extra, coherente con los ajustes:
//                                    bola solo con dibujo, cartón con dibujo+palabra
//                                    (más fácil que el modo 1: ni la bola ni el cartón
//                                    dan la palabra como pista adicional)
//
// Importante: el pictograma de la bola NUNCA se oculta por "soloTexto".
// Ese ajuste, en el resto de mecánicas, sustituye el pictograma del
// OBJETIVO por su nombre en texto; aquí el objetivo está repartido en
// dos sitios distintos (la bola que sale del bombo y la casilla del
// cartón que hay que encontrar) y el modo 3 exige precisamente que la
// bola siga mostrando su dibujo aunque el cartón ya no lo haga. Por
// eso "soloTexto" se aplica solo al cartón, y "mostrar" solo a si la
// bola añade la palabra junto a su dibujo. Es una decisión de diseño
// deliberada, no un descuido.

const ESTILOS_ID = 'bingo-lectura-estilos';
const MIN_MATERIAL = 9; // hace falta un elemento distinto por casilla del cartón
const TAMANO_CARTON = 9; // cartón de 3x3, como en los ejemplos de la especificación
const BOLAS_TOTAL = 9; // una bola por cada casilla del cartón
const UMBRAL_AYUDA = 2; // fallos seguidos en la misma bola antes de ofrecer ayuda automática
const RETRASO_ACIERTO_MS = 700;
const RETRASO_BINGO_MS = 500;
const DURACION_FALLO_MS = 400;
const DURACION_AYUDA_MS = 1200;

let estado = null; // { plataforma, contenedor, raiz, ajustesPista, carton, marcadasIds, bolaActual, objetivoActual, bloqueado, escuchado, fallosSeguidos, timeoutId }

function mezclar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** ¿La bola debe mostrar también la palabra escrita, además de su
 *  pictograma? Lógica pura: ver la explicación del mapeo de modos al
 *  principio del archivo. */
export function bolaConPalabra(ajustesPista) {
  return Boolean(ajustesPista && ajustesPista.mostrar);
}

/** ¿Las casillas del cartón muestran el pictograma, además de su
 *  nombre escrito? Lógica pura: ver la explicación del mapeo de modos
 *  al principio del archivo. */
export function cartonConPictograma(ajustesPista) {
  return !(ajustesPista && ajustesPista.soloTexto);
}

/** Elige el cartón de la partida: `tamano` elementos distintos del
 *  material disponible, sin repetir. Lógica pura. Devuelve null si no
 *  hay material suficiente. */
export function elegirCarton(medios, tamano = TAMANO_CARTON) {
  if (!Array.isArray(medios) || medios.length < tamano) return null;
  return mezclar(medios).slice(0, tamano);
}

/** Elige el objetivo de la siguiente bola: un elemento del cartón,
 *  preferiblemente uno que todavía no se haya marcado (para que las
 *  bolas vayan cubriendo casillas distintas). Solo si TODAS las
 *  casillas del cartón ya están marcadas (puede pasar si quedan más
 *  bolas que casillas) se vuelve a elegir cualquiera, como repaso.
 *  Lógica pura. */
export function elegirSiguienteBola(carton, marcadasIds = []) {
  if (!Array.isArray(carton) || !carton.length) return null;
  const marcadas = new Set(marcadasIds);
  const sinMarcar = carton.filter((m) => !marcadas.has(m.id));
  const candidatos = sinMarcar.length ? sinMarcar : carton;
  return candidatos[Math.floor(Math.random() * candidatos.length)];
}

/** ¿La casilla tocada es la que pide la bola actual? */
export function esRespuestaCorrecta(medioTocado, medioObjetivo) {
  return Boolean(medioTocado) && Boolean(medioObjetivo) && medioTocado.id === medioObjetivo.id;
}

/** Aplica el ajuste de mayúsculas/minúsculas a una palabra. */
export function formatearPista(nombre, mayuscula = true) {
  if (!nombre) return '';
  return mayuscula ? nombre.toLocaleUpperCase() : nombre.toLocaleLowerCase();
}

/** Validación de seguridad del ajuste "pulsador TTS" (lógica
 *  compartida con el resto de mecánicas, duplicada a propósito):
 *  mientras esté activo, no se puede tocar el cartón hasta haber
 *  pulsado el botón y escuchado la bola una vez. */
export function puedeResponder(ajustesPista, escuchado) {
  return !ajustesPista.pulsadorTts || Boolean(escuchado);
}

function inyectarEstilosUnaVez() {
  if (document.getElementById(ESTILOS_ID)) return;
  const link = document.createElement('link');
  link.id = ESTILOS_ID;
  link.rel = 'stylesheet';
  link.href = new URL('bingoLectura.css', import.meta.url).href;
  document.head.appendChild(link);
}

function mostrarSinMaterial(zona, plataforma) {
  zona.innerHTML = '';
  const vacio = document.createElement('p');
  vacio.className = 'vacio';
  vacio.textContent = plataforma.t('juegos.sin_material');
  zona.appendChild(vacio);
}

/** Repite la bola en voz alta y resalta un instante el borde de la
 *  casilla correcta. Se ofrece sola, sin que el adulto tenga que
 *  activar nada aparte: tras un par de fallos seguidos en la misma
 *  bola, conviene dar una ayuda visible antes de que el niño se
 *  frustre. No depende de ningún ajuste nuevo del portal. */
function ofrecerAyuda() {
  if (!estado) return;
  estado.fallosSeguidos = 0;
  estado.plataforma.tts.speak(estado.objetivoActual.nombre);

  const casilla = estado.raiz.querySelector(`[data-medio-id="${estado.objetivoActual.id}"]`);
  if (!casilla) return;
  casilla.classList.add('bingo-casilla-ayuda');
  setTimeout(() => {
    casilla.classList.remove('bingo-casilla-ayuda');
  }, DURACION_AYUDA_MS);
}

function manejarToqueCasilla(medio, casillaEl) {
  if (!estado || estado.bloqueado) return;
  if (!puedeResponder(estado.ajustesPista, estado.escuchado)) return;

  if (esRespuestaCorrecta(medio, estado.objetivoActual)) {
    estado.bloqueado = true;
    estado.fallosSeguidos = 0;
    estado.plataforma.sounds.acierto();
    estado.plataforma.tts.speak(medio.nombre);

    if (!estado.marcadasIds.includes(medio.id)) {
      estado.marcadasIds.push(medio.id);
      marcarCasilla(casillaEl);
    }

    if (estado.bolaActual >= BOLAS_TOTAL) {
      estado.timeoutId = setTimeout(() => {
        if (!estado) return;
        estado.plataforma.mostrarRecompensa({ mensajeKey: 'bingo.mensaje_final', onContinuar: iniciarPartida });
      }, RETRASO_BINGO_MS);
    } else {
      estado.timeoutId = setTimeout(() => {
        if (!estado) return;
        estado.bloqueado = false;
        siguienteBola();
      }, RETRASO_ACIERTO_MS);
    }
  } else {
    estado.plataforma.sounds.fallo();
    estado.fallosSeguidos += 1;
    casillaEl.classList.add('bingo-casilla-fallo');
    setTimeout(() => {
      casillaEl.classList.remove('bingo-casilla-fallo');
    }, DURACION_FALLO_MS);

    if (estado.fallosSeguidos >= UMBRAL_AYUDA) {
      ofrecerAyuda();
    }
  }
}

function marcarCasilla(casillaEl) {
  casillaEl.classList.add('bingo-casilla-marcada');
  if (!casillaEl.querySelector('.bingo-casilla-sello')) {
    const sello = document.createElement('span');
    sello.className = 'bingo-casilla-sello';
    sello.setAttribute('aria-hidden', 'true');
    sello.textContent = '✓';
    casillaEl.appendChild(sello);
  }
  casillaEl.setAttribute('aria-label', estado.plataforma.t('bingo.casilla_marcada', { nombre: casillaEl.dataset.nombre }));
}

function crearCasilla(medio) {
  const { plataforma, ajustesPista } = estado;
  const casilla = document.createElement('button');
  casilla.type = 'button';
  casilla.className = 'bingo-casilla';
  casilla.dataset.medioId = medio.id;
  casilla.dataset.nombre = medio.nombre;
  casilla.setAttribute('aria-label', medio.nombre);

  if (cartonConPictograma(ajustesPista)) {
    const img = document.createElement('img');
    img.className = 'bingo-casilla-img';
    img.src = plataforma.getDisplayUrl(medio);
    img.alt = medio.nombre;
    casilla.appendChild(img);
  }

  const nombre = document.createElement('span');
  nombre.className = 'bingo-casilla-nombre';
  nombre.textContent = formatearPista(medio.nombre, ajustesPista.mayuscula);
  casilla.appendChild(nombre);

  casilla.addEventListener('click', () => manejarToqueCasilla(medio, casilla));
  return casilla;
}

function pintarCarton() {
  const zona = estado.raiz.querySelector('.bingo-carton');
  zona.innerHTML = '';
  estado.carton.forEach((medio) => {
    zona.appendChild(crearCasilla(medio));
  });
}

function actualizarBloqueo() {
  const zona = estado.raiz.querySelector('.bingo-carton');
  zona.classList.toggle('bingo-carton-bloqueada', !puedeResponder(estado.ajustesPista, estado.escuchado));
}

function pintarBola() {
  const { raiz, plataforma, ajustesPista, objetivoActual } = estado;
  estado.escuchado = false;
  estado.fallosSeguidos = 0;

  raiz.querySelector('.bingo-bola-contador').textContent = plataforma.t('bingo.bola', {
    n: estado.bolaActual,
    total: BOLAS_TOTAL
  });

  const bombo = raiz.querySelector('.bingo-bola');
  bombo.innerHTML = '';

  if (ajustesPista.pulsadorTts) {
    const pulsador = document.createElement('button');
    pulsador.type = 'button';
    pulsador.className = 'bingo-pulsador bingo-bola-aparece';
    pulsador.setAttribute('aria-label', plataforma.t('comunes.escuchar'));
    pulsador.textContent = '🔊';
    pulsador.addEventListener('click', () => {
      plataforma.sounds.click();
      plataforma.tts.speak(objetivoActual.nombre);
      estado.escuchado = true;
      pulsador.classList.add('bingo-pulsador-escuchado');
      actualizarBloqueo();
    });
    bombo.appendChild(pulsador);
  } else {
    const img = document.createElement('img');
    img.className = 'bingo-bola-img bingo-bola-aparece';
    img.src = plataforma.getDisplayUrl(objetivoActual);
    img.alt = objetivoActual.nombre;
    bombo.appendChild(img);

    if (bolaConPalabra(ajustesPista)) {
      const pista = document.createElement('p');
      pista.className = 'bingo-bola-pista';
      pista.textContent = formatearPista(objetivoActual.nombre, ajustesPista.mayuscula);
      bombo.appendChild(pista);
    }
  }

  actualizarBloqueo();
}

function siguienteBola() {
  if (!estado) return;
  estado.bolaActual += 1;
  estado.objetivoActual = elegirSiguienteBola(estado.carton, estado.marcadasIds);
  pintarBola();
}

function iniciarPartida() {
  if (!estado) return;
  const carton = elegirCarton(estado.plataforma.medios, TAMANO_CARTON);
  if (!carton) {
    mostrarSinMaterial(estado.raiz.querySelector('.bingo-zona'), estado.plataforma);
    return;
  }
  estado.carton = carton;
  estado.marcadasIds = [];
  estado.bolaActual = 0;
  estado.bloqueado = false;
  pintarCarton();
  siguienteBola();
}

function montar(contenedor, plataforma) {
  inyectarEstilosUnaVez();
  contenedor.innerHTML = '';

  const raiz = document.createElement('div');
  raiz.className = 'bingo-app';

  const cabecera = document.createElement('header');
  cabecera.className = 'bingo-cabecera';
  const titulo = document.createElement('h1');
  titulo.textContent = `${plataforma.icono || ''} ${plataforma.nombre}`.trim();
  const instrucciones = document.createElement('p');
  instrucciones.textContent = plataforma.t('bingo.instrucciones');
  cabecera.append(titulo, instrucciones);

  const marcador = document.createElement('div');
  marcador.className = 'bingo-marcador';
  const contadorEl = document.createElement('span');
  contadorEl.className = 'bingo-bola-contador';
  marcador.appendChild(contadorEl);

  const zona = document.createElement('div');
  zona.className = 'bingo-zona';

  const bombo = document.createElement('div');
  bombo.className = 'bingo-bombo';
  const bola = document.createElement('div');
  bola.className = 'bingo-bola';
  bombo.appendChild(bola);

  const carton = document.createElement('div');
  carton.className = 'bingo-carton';

  zona.append(bombo, carton);
  raiz.append(cabecera, marcador, zona);
  contenedor.appendChild(raiz);

  estado = {
    contenedor,
    plataforma,
    raiz,
    ajustesPista: plataforma.ajustesPista || { mayuscula: true, mostrar: true, soloTexto: false, pulsadorTts: false },
    carton: [],
    marcadasIds: [],
    bolaActual: 0,
    objetivoActual: null,
    bloqueado: false,
    escuchado: false,
    fallosSeguidos: 0,
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
  id: 'bingo-lectura',
  nombre: 'Bingo de lectura',
  icono: '🅱️',
  estante: 'LECTURA',
  montar,
  desmontar
};
