// Pictosfera — mecánica reutilizable: "arrastra la palabra".
//
// El pictograma aparece a un lado con su nombre debajo como pista
// (mayúsculas/minúsculas y mostrar/ocultar son ajustes del PORTAL, ver
// core/js/ajustesJuego.js). Al otro lado aparecen 3 cajas de palabra:
// la correcta y dos distractores. El niño arrastra la caja correcta
// hasta el pictograma; si acierta, sonido positivo y nivel nuevo; si
// falla, la caja vuelve a su sitio y sonido de fallo. 10 niveles.
//
// Es "código de confianza del autor": JavaScript nativo, módulo ES, sin
// framework. No importa nada del núcleo directamente: todo lo que
// necesita (idioma, voz, sonidos, recompensa, material, ajustes de
// pista) le llega a través del objeto `plataforma` que recibe en
// montar(). Esto es lo que la hace reutilizable: otra app distinta
// (otro material, otro nombre, otro estante) puede usar este mismo
// archivo con solo un descriptor JSON nuevo en data/apps.json.

const ESTILOS_ID = 'arrastra-palabra-estilos';
const MIN_MATERIAL = 3;
const NUM_DISTRACTORES = 2;
const NIVELES_TOTAL = 10;
const UMBRAL_ARRASTRE = 4; // píxeles: por debajo de esto se considera un toque, no un arrastre

let estado = null; // { plataforma, contenedor, raiz, nivelActual, usados, medioCorrecto, opciones, bloqueado, timeoutId, ajustesPista }

function mezclar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Elige distractores distintos del medio correcto (lógica pura). */
export function elegirDistractores(medios, medioCorrectoId, cantidad = NUM_DISTRACTORES) {
  const candidatos = (medios || []).filter((m) => m.id !== medioCorrectoId);
  return mezclar(candidatos).slice(0, Math.min(cantidad, candidatos.length));
}

/**
 * Genera un nivel: el medio correcto (preferiblemente uno que no se
 * haya usado todavía en esta partida) más sus opciones ya barajadas
 * (correcta + distractores). Lógica pura: no toca el DOM, así se puede
 * probar directamente. Devuelve null si no hay material suficiente.
 */
export function generarNivel(medios, { evitarIds = [] } = {}) {
  if (!Array.isArray(medios) || medios.length < MIN_MATERIAL) return null;

  const evitar = new Set(evitarIds);
  const sinUsar = medios.filter((m) => !evitar.has(m.id));
  const candidatosCorrecto = sinUsar.length ? sinUsar : medios;
  const medioCorrecto = candidatosCorrecto[Math.floor(Math.random() * candidatosCorrecto.length)];

  const distractores = elegirDistractores(medios, medioCorrecto.id, NUM_DISTRACTORES);
  const opciones = mezclar([
    { medio: medioCorrecto, esCorrecta: true },
    ...distractores.map((medio) => ({ medio, esCorrecta: false }))
  ]);

  return { medioCorrecto, opciones };
}

/** ¿Esta opción es la palabra correcta para el medio objetivo? */
export function esRespuestaCorrecta(opcion, medioCorrecto) {
  return Boolean(opcion) && Boolean(opcion.medio) && Boolean(medioCorrecto) && opcion.medio.id === medioCorrecto.id;
}

/** Aplica el ajuste de mayúsculas/minúsculas a una palabra. */
export function formatearPista(nombre, mayuscula = true) {
  if (!nombre) return '';
  return mayuscula ? nombre.toLocaleUpperCase() : nombre.toLocaleLowerCase();
}

/** Validación de seguridad del ajuste "pulsador TTS": mientras esté
 *  activo, no se puede responder (ni arrastrar ni usar teclado) hasta
 *  haber pulsado el botón y escuchado la palabra una vez por nivel. Si
 *  el ajuste está desactivado, siempre se puede responder. Lógica
 *  pura, fácil de probar. */
export function puedeResponder(ajustesPista, escuchado) {
  return !ajustesPista.pulsadorTts || Boolean(escuchado);
}

function inyectarEstilosUnaVez() {
  if (document.getElementById(ESTILOS_ID)) return;
  const link = document.createElement('link');
  link.id = ESTILOS_ID;
  link.rel = 'stylesheet';
  link.href = new URL('arrastraPalabra.css', import.meta.url).href;
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
  if (!puedeResponder(estado.ajustesPista, estado.escuchado)) return;

  if (esRespuestaCorrecta(opcion, estado.medioCorrecto)) {
    estado.bloqueado = true;
    estado.plataforma.sounds.acierto();
    estado.plataforma.tts.speak(estado.medioCorrecto.nombre);
    elementoOpcion.classList.add('arrastra-opcion-correcta');

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
    elementoOpcion.classList.add('arrastra-opcion-fallo');
    setTimeout(() => {
      elementoOpcion.classList.remove('arrastra-opcion-fallo');
    }, 400);
  }
}

/** Engancha el arrastre (puntero/táctil). La dinámica de esta
 *  actividad es "arrastrar y soltar": un simple toque sin arrastre NO
 *  cuenta como respuesta (eso dejaría de ser un juego de arrastrar).
 *  Se mantiene Intro/Espacio por teclado como vía de accesibilidad
 *  deliberada para quien no puede arrastrar con el dedo o el ratón
 *  (navegación por Tab, no un toque accidental): esa es una decisión
 *  consciente distinta de "tocar para elegir". */
function activarArrastre(elementoOpcion, opcion, objetivo) {
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
    if (!puedeResponder(estado.ajustesPista, estado.escuchado)) return;
    activo = true;
    arrastrado = false;
    inicioX = ev.clientX;
    inicioY = ev.clientY;
    elementoOpcion.style.transition = 'none';
    try { elementoOpcion.setPointerCapture(ev.pointerId); } catch { /* no soportado en algún entorno: no pasa nada */ }
    elementoOpcion.classList.add('arrastra-opcion-activa');
  }

  function onPointerMove(ev) {
    if (!activo) return;
    const dx = ev.clientX - inicioX;
    const dy = ev.clientY - inicioY;
    if (Math.abs(dx) > UMBRAL_ARRASTRE || Math.abs(dy) > UMBRAL_ARRASTRE) arrastrado = true;
    elementoOpcion.style.transform = `translate(${dx}px, ${dy}px)`;
    objetivo.classList.toggle('arrastra-objetivo-resaltado', dentroDelObjetivo(ev.clientX, ev.clientY));
  }

  function soltar(ev) {
    if (!activo) return;
    activo = false;
    elementoOpcion.classList.remove('arrastra-opcion-activa');
    objetivo.classList.remove('arrastra-objetivo-resaltado');
    elementoOpcion.style.transition = 'transform var(--transition-base)';
    elementoOpcion.style.transform = 'translate(0, 0)';

    const sobreObjetivo = arrastrado && dentroDelObjetivo(ev.clientX, ev.clientY);
    // Solo se juzga la respuesta si ha habido un arrastre real y se ha
    // soltado sobre el pictograma. Un toque simple (sin arrastre) no
    // cuenta como intento: la caja solo vuelve a su sitio, sin sonido
    // ni penalización, igual que cuando se arrastra y se suelta fuera.
    if (sobreObjetivo) {
      manejarRespuesta(opcion, elementoOpcion);
    }
  }

  function onPointerCancel() {
    activo = false;
    elementoOpcion.classList.remove('arrastra-opcion-activa');
    objetivo.classList.remove('arrastra-objetivo-resaltado');
    elementoOpcion.style.transition = 'transform var(--transition-base)';
    elementoOpcion.style.transform = 'translate(0, 0)';
  }

  function onKeyDown(ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault();
    manejarRespuesta(opcion, elementoOpcion);
  }

  elementoOpcion.addEventListener('pointerdown', onPointerDown);
  elementoOpcion.addEventListener('pointermove', onPointerMove);
  elementoOpcion.addEventListener('pointerup', soltar);
  elementoOpcion.addEventListener('pointercancel', onPointerCancel);
  elementoOpcion.addEventListener('keydown', onKeyDown);
}

function pintarNivel() {
  const { raiz, plataforma, opciones, medioCorrecto, ajustesPista } = estado;
  // Cada nivel nuevo trae una palabra distinta: con el "pulsador TTS"
  // hay que volver a escucharla antes de poder responder.
  estado.escuchado = false;

  raiz.querySelector('.arrastra-nivel').textContent = plataforma.t('arrastra.nivel', {
    n: estado.nivelActual,
    total: NIVELES_TOTAL
  });

  const zona = raiz.querySelector('.arrastra-zona');
  zona.innerHTML = '';

  const objetivo = document.createElement('div');
  objetivo.className = 'arrastra-objetivo';

  const listaOpciones = document.createElement('div');
  listaOpciones.className = 'arrastra-opciones';

  function actualizarBloqueo() {
    listaOpciones.classList.toggle('arrastra-opciones-bloqueada', !puedeResponder(ajustesPista, estado.escuchado));
  }

  if (ajustesPista.pulsadorTts) {
    // "Pulsador TTS": se sustituye el pictograma y su pista por un
    // botón animado. Validación de seguridad: no se puede arrastrar
    // ninguna caja hasta haberlo pulsado (ver puedeResponder() y los
    // guardas en manejarRespuesta()/onPointerDown()).
    const pulsador = document.createElement('button');
    pulsador.type = 'button';
    pulsador.className = 'arrastra-pulsador';
    pulsador.setAttribute('aria-label', plataforma.t('comunes.escuchar'));
    pulsador.textContent = '🔊';
    pulsador.addEventListener('click', () => {
      plataforma.sounds.click();
      plataforma.tts.speak(medioCorrecto.nombre);
      estado.escuchado = true;
      pulsador.classList.add('arrastra-pulsador-escuchado');
      actualizarBloqueo();
    });
    objetivo.appendChild(pulsador);
  } else {
    if (!ajustesPista.soloTexto) {
      const img = document.createElement('img');
      img.className = 'arrastra-objetivo-img';
      img.src = plataforma.getDisplayUrl(medioCorrecto);
      img.alt = medioCorrecto.nombre;
      objetivo.appendChild(img);
    }

    const pista = document.createElement('p');
    pista.className = 'arrastra-pista';
    pista.textContent = formatearPista(medioCorrecto.nombre, ajustesPista.mayuscula);
    // En "solo texto" no hay imagen, así que la pista de texto es el
    // único contenido y se ve siempre, pase lo que pase el ajuste
    // "mostrar pista" (si no, la carta quedaría vacía).
    pista.hidden = !ajustesPista.mostrar && !ajustesPista.soloTexto;
    objetivo.appendChild(pista);
  }

  opciones.forEach((opcion) => {
    const caja = document.createElement('div');
    caja.className = 'arrastra-opcion';
    caja.setAttribute('role', 'button');
    caja.tabIndex = 0;
    caja.setAttribute('aria-label', opcion.medio.nombre);
    caja.textContent = formatearPista(opcion.medio.nombre, ajustesPista.mayuscula);
    activarArrastre(caja, opcion, objetivo);
    listaOpciones.appendChild(caja);
  });

  actualizarBloqueo();
  zona.append(objetivo, listaOpciones);
}

function siguienteNivel() {
  if (!estado) return;
  estado.nivelActual += 1;
  const nivel = generarNivel(estado.plataforma.medios, { evitarIds: estado.usados });
  if (!nivel) {
    mostrarSinMaterial(estado.raiz.querySelector('.arrastra-zona'), estado.plataforma);
    return;
  }
  estado.usados.push(nivel.medioCorrecto.id);
  estado.medioCorrecto = nivel.medioCorrecto;
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
  raiz.className = 'arrastra-app';

  const cabecera = document.createElement('header');
  cabecera.className = 'arrastra-cabecera';
  const titulo = document.createElement('h1');
  titulo.textContent = `${plataforma.icono || ''} ${plataforma.nombre}`.trim();
  const instrucciones = document.createElement('p');
  instrucciones.textContent = plataforma.t('arrastra.instrucciones');
  cabecera.append(titulo, instrucciones);

  const marcador = document.createElement('div');
  marcador.className = 'arrastra-marcador';
  const nivelEl = document.createElement('span');
  nivelEl.className = 'arrastra-nivel';
  marcador.appendChild(nivelEl);

  const zona = document.createElement('div');
  zona.className = 'arrastra-zona';

  raiz.append(cabecera, marcador, zona);
  contenedor.appendChild(raiz);

  estado = {
    contenedor,
    plataforma,
    raiz,
    nivelActual: 0,
    usados: [],
    medioCorrecto: null,
    opciones: [],
    bloqueado: false,
    escuchado: false,
    timeoutId: null,
    ajustesPista: plataforma.ajustesPista || { mayuscula: true, mostrar: true, soloTexto: false, pulsadorTts: false }
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
  id: 'arrastra-palabra',
  nombre: 'Arrastra la palabra',
  icono: '🔤',
  estante: 'LECTURA',
  montar,
  desmontar
};
