// Pictosfera — mecánica reutilizable: "clasifica los pictogramas en dos
// categorías".
//
// En pantalla hay dos zonas de clasificación fijas, cada una con su
// propio pictograma "cabecera" (uno dedicado por categoría, p.ej. el
// concepto "grande" o "pequeño": no es un ejemplo más del pozo, es el
// concepto en sí). Debajo va apareciendo, de uno en uno, un pictograma
// que pertenece SOLO a una de las dos categorías. El niño lo arrastra
// (o, por teclado, navega hasta la zona y pulsa Intro/Espacio) hasta la
// zona que crea correcta. Si acierta, la zona se marca en verde, el
// pictograma queda colocado dentro (en la "bandeja" de esa categoría) y
// aparece uno nuevo. Si falla, sonido de error, la zona se sombrea en
// rojo un instante y el mismo pictograma vuelve a estar disponible para
// reintentarlo: no hay límite de fallos. La actividad termina al
// clasificar correctamente 10 pictogramas.
//
// A diferencia del resto de mecánicas de "arrastrar", aquí el material
// no es un único pozo con una etiqueta (`plataforma.medios`): son DOS
// categorías ya resueltas en `plataforma.categorias` (ver
// `resolverCategorias` en appLoader.js), cada una con su propio array de
// medios y su propio pictograma de cabecera.
//
// Es "código de confianza del autor": JavaScript nativo, módulo ES, sin
// framework. No importa nada del núcleo directamente: todo lo que
// necesita le llega a través de `plataforma` en montar(). El arrastre
// reutiliza la misma dinámica de puntero que "Arrastra la palabra"
// (duplicada a propósito: cada mecánica de este proyecto es
// independiente y no importa código de otra).

const ESTILOS_ID = 'clasifica-categorias-estilos';
const NIVELES_TOTAL = 10;
const UMBRAL_ARRASTRE = 4; // píxeles: por debajo de esto se considera un toque, no un arrastre

let estado = null; // { plataforma, contenedor, raiz, nivelActual, usados, retoActual, itemElementoActual, zonas, bandejas, bloqueado, escuchado, timeoutId, ajustesPista }

// --- Lógica pura: qué categoría y qué medio toca este nivel ---

/** ¿Hay suficiente material para jugar? Hacen falta las dos categorías
 *  y que, entre las dos, haya al menos un pictograma para clasificar. */
export function hayMaterialSuficiente(categorias) {
  return Array.isArray(categorias) && categorias.length === 2 &&
    categorias.some((c) => c && Array.isArray(c.medios) && c.medios.length);
}

/** Elige al azar una de las categorías con material disponible y,
 *  dentro de ella, un pictograma que no se haya usado todavía en esta
 *  partida (si ya se usaron todos los suyos, se puede repetir). Lógica
 *  pura. Devuelve null si ninguna categoría tiene material. */
export function elegirSiguienteReto(categorias, { evitarIds = [] } = {}) {
  const disponibles = (categorias || []).filter((c) => c && Array.isArray(c.medios) && c.medios.length);
  if (!disponibles.length) return null;

  const categoria = disponibles[Math.floor(Math.random() * disponibles.length)];
  const evitar = new Set(evitarIds);
  const sinUsar = categoria.medios.filter((m) => m && !evitar.has(m.id));
  const candidatos = sinUsar.length ? sinUsar : categoria.medios.filter(Boolean);
  const medio = candidatos[Math.floor(Math.random() * candidatos.length)];
  return { categoriaId: categoria.id, medio };
}

/** ¿La zona donde se ha soltado/elegido el pictograma es su categoría
 *  correcta? */
export function esRespuestaCorrecta(categoriaIdElegida, categoriaIdCorrecta) {
  return Boolean(categoriaIdElegida) && Boolean(categoriaIdCorrecta) &&
    String(categoriaIdElegida) === String(categoriaIdCorrecta);
}

/** Aplica el ajuste de mayúsculas/minúsculas a un texto. */
export function formatearPista(nombre, mayuscula = true) {
  if (!nombre) return '';
  return mayuscula ? nombre.toLocaleUpperCase() : nombre.toLocaleLowerCase();
}

/** Validación de seguridad del ajuste "pulsador TTS" del pictograma a
 *  clasificar: mientras esté activo, no se puede responder (ni
 *  arrastrar ni usar teclado) hasta haber pulsado el botón y escuchado
 *  el nombre una vez por nivel. Si el ajuste está desactivado, siempre
 *  se puede responder. No afecta a los pulsadores de las cabeceras de
 *  categoría (esos se pueden escuchar en cualquier momento: no cambian
 *  de nivel a nivel). */
export function puedeResponder(ajustesPista, escuchado) {
  return !ajustesPista.pulsadorTts || Boolean(escuchado);
}

function inyectarEstilosUnaVez() {
  if (document.getElementById(ESTILOS_ID)) return;
  const link = document.createElement('link');
  link.id = ESTILOS_ID;
  link.rel = 'stylesheet';
  link.href = new URL('clasificaCategorias.css', import.meta.url).href;
  document.head.appendChild(link);
}

function mostrarSinMaterial(zona, plataforma) {
  zona.innerHTML = '';
  const vacio = document.createElement('p');
  vacio.className = 'vacio';
  vacio.textContent = plataforma.t('juegos.sin_material');
  zona.appendChild(vacio);
}

/** Pinta, dentro de `contenedor`, un pictograma respetando las mismas 7
 *  variantes de accesibilidad/configuración del portal que el resto de
 *  mecánicas de arrastrar (pictograma solo, con texto de ayuda,
 *  mostrar/ocultar texto, mayúscula/minúscula, pulsador TTS en
 *  sustitución del pictograma...). La usan tanto las cabeceras de
 *  categoría como -parcialmente, ver pintarItem()- el pictograma que
 *  hay que clasificar: así ambos comparten exactamente el mismo
 *  comportamiento visual. Si no hay medio todavía (p.ej. la cabecera no
 *  se ha podido sembrar aún), pinta `textoReserva` como texto simple. */
function pintarPictograma(contenedor, medio, ajustesPista, plataforma, { textoReserva = '' } = {}) {
  contenedor.innerHTML = '';

  if (!medio) {
    const texto = document.createElement('p');
    texto.className = 'clasifica-pista';
    texto.textContent = formatearPista(textoReserva, ajustesPista.mayuscula);
    contenedor.appendChild(texto);
    return;
  }

  if (ajustesPista.pulsadorTts) {
    const pulsador = document.createElement('button');
    pulsador.type = 'button';
    pulsador.className = 'clasifica-pulsador';
    pulsador.setAttribute('aria-label', plataforma.t('comunes.escuchar'));
    pulsador.textContent = '🔊';
    pulsador.addEventListener('click', (ev) => {
      ev.stopPropagation();
      plataforma.sounds.click();
      plataforma.tts.speak(medio.nombre);
    });
    contenedor.appendChild(pulsador);
    return;
  }

  if (!ajustesPista.soloTexto) {
    const img = document.createElement('img');
    img.className = 'clasifica-img';
    img.src = plataforma.getDisplayUrl(medio);
    img.alt = medio.nombre;
    // Crítico para el arrastre: sin esto, el navegador arranca su
    // propio arrastre nativo de imagen (toda <img> es "draggable" de
    // serie) en cuanto se mueve el dedo/ratón, que se adelanta al
    // arrastre por puntero de activarArrastre() y lo deja a medias —
    // pointerup nunca llega a disparar soltar() como toca, así que el
    // drop no se registra nunca. El resto de mecánicas de "arrastrar"
    // del proyecto no lo sufren porque arrastran texto o casillas, no
    // una <img> suelta.
    img.draggable = false;
    contenedor.appendChild(img);
  }

  const pista = document.createElement('p');
  pista.className = 'clasifica-pista';
  pista.textContent = formatearPista(medio.nombre, ajustesPista.mayuscula);
  // En "solo texto" no hay imagen, así que la pista es el único
  // contenido y se ve siempre, pase lo que pase el ajuste "mostrar".
  pista.hidden = !ajustesPista.mostrar && !ajustesPista.soloTexto;
  contenedor.appendChild(pista);
}

/** Añade, dentro de la "bandeja" de pictogramas ya clasificados de una
 *  zona, una pequeña miniatura del medio recién acertado. */
function agregarColocado(zonaId, medio) {
  const bandeja = estado.bandejas[zonaId];
  if (!bandeja) return;
  const chip = document.createElement('div');
  chip.className = 'clasifica-colocado';
  if (estado.ajustesPista.soloTexto) {
    chip.classList.add('clasifica-colocado-texto');
    chip.textContent = formatearPista(medio.nombre, estado.ajustesPista.mayuscula);
  } else {
    const img = document.createElement('img');
    img.className = 'clasifica-colocado-img';
    img.src = estado.plataforma.getDisplayUrl(medio);
    img.alt = medio.nombre;
    img.draggable = false;
    chip.appendChild(img);
  }
  bandeja.appendChild(chip);
}

function manejarRespuesta(reto, elementoItem, zona) {
  if (!estado || estado.bloqueado) return;
  if (!puedeResponder(estado.ajustesPista, estado.escuchado)) return;

  if (esRespuestaCorrecta(zona.id, reto.categoriaId)) {
    estado.bloqueado = true;
    estado.plataforma.sounds.acierto();
    estado.plataforma.tts.speak(reto.medio.nombre);
    zona.el.classList.add('clasifica-zona-correcta');
    agregarColocado(zona.id, reto.medio);
    elementoItem.classList.add('clasifica-item-colocado');

    if (estado.nivelActual >= NIVELES_TOTAL) {
      estado.timeoutId = setTimeout(() => {
        if (!estado) return;
        estado.plataforma.mostrarRecompensa({ onContinuar: iniciarPartida });
      }, 500);
    } else {
      estado.timeoutId = setTimeout(() => {
        if (!estado) return;
        zona.el.classList.remove('clasifica-zona-correcta');
        estado.bloqueado = false;
        siguienteNivel();
      }, 700);
    }
  } else {
    estado.plataforma.sounds.fallo();
    zona.el.classList.add('clasifica-zona-fallo');
    elementoItem.classList.add('clasifica-item-fallo');
    setTimeout(() => {
      zona.el.classList.remove('clasifica-zona-fallo');
      if (estado) elementoItem.classList.remove('clasifica-item-fallo');
    }, 400);
  }
}

function detectarZona(zonas, x, y) {
  return zonas.find(({ el }) => {
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }) || null;
}

/** Engancha el arrastre (puntero/táctil) del único pictograma a
 *  clasificar contra las DOS zonas posibles. Un simple toque sin
 *  arrastre no cuenta como respuesta. La vía de teclado no va por aquí:
 *  cada zona es su propio elemento activable (ver construirZonas), ya
 *  que con dos destinos posibles no basta con pulsar Intro/Espacio
 *  sobre el pictograma: hay que elegir A CUÁL de las dos zonas se
 *  clasifica. */
function activarArrastre(elementoItem, reto, zonas) {
  let activo = false;
  let arrastrado = false;
  let inicioX = 0;
  let inicioY = 0;

  function resaltar(x, y) {
    const zonaActiva = detectarZona(zonas, x, y);
    zonas.forEach(({ el }) => el.classList.toggle('clasifica-zona-resaltada', Boolean(zonaActiva) && zonaActiva.el === el));
  }

  function quitarResaltado() {
    zonas.forEach(({ el }) => el.classList.remove('clasifica-zona-resaltada'));
  }

  function onPointerDown(ev) {
    if (!estado || estado.bloqueado) return;
    if (!puedeResponder(estado.ajustesPista, estado.escuchado)) return;
    activo = true;
    arrastrado = false;
    inicioX = ev.clientX;
    inicioY = ev.clientY;
    elementoItem.style.transition = 'none';
    try { elementoItem.setPointerCapture(ev.pointerId); } catch { /* no soportado en algún entorno: no pasa nada */ }
    elementoItem.classList.add('clasifica-item-activo');
  }

  function onPointerMove(ev) {
    if (!activo) return;
    const dx = ev.clientX - inicioX;
    const dy = ev.clientY - inicioY;
    if (Math.abs(dx) > UMBRAL_ARRASTRE || Math.abs(dy) > UMBRAL_ARRASTRE) arrastrado = true;
    elementoItem.style.transform = `translate(${dx}px, ${dy}px)`;
    resaltar(ev.clientX, ev.clientY);
  }

  function soltar(ev) {
    if (!activo) return;
    activo = false;
    elementoItem.classList.remove('clasifica-item-activo');
    quitarResaltado();
    elementoItem.style.transition = 'transform var(--transition-base)';
    elementoItem.style.transform = 'translate(0, 0)';

    const zonaSoltada = arrastrado ? detectarZona(zonas, ev.clientX, ev.clientY) : null;
    // Solo cuenta como intento si ha habido arrastre real y se ha
    // soltado dentro de una zona: un toque simple, o soltar fuera de
    // las dos zonas, no penaliza ni acierta, igual que en el resto de
    // mecánicas de "arrastrar".
    if (zonaSoltada) manejarRespuesta(reto, elementoItem, zonaSoltada);
  }

  function onPointerCancel() {
    activo = false;
    elementoItem.classList.remove('clasifica-item-activo');
    quitarResaltado();
    elementoItem.style.transition = 'transform var(--transition-base)';
    elementoItem.style.transform = 'translate(0, 0)';
  }

  elementoItem.addEventListener('pointerdown', onPointerDown);
  elementoItem.addEventListener('pointermove', onPointerMove);
  elementoItem.addEventListener('pointerup', soltar);
  elementoItem.addEventListener('pointercancel', onPointerCancel);
}

/** Construye, UNA SOLA VEZ por partida, las dos zonas de clasificación
 *  (cabecera + bandeja de colocados) y las engancha por teclado: cada
 *  zona es un elemento activable (Intro/Espacio) que clasifica AHÍ el
 *  pictograma que esté en juego en ese momento (`estado.retoActual`).
 *  Se reconstruyen solo al montar la app, no en cada nivel: lo único
 *  que cambia nivel a nivel es el pictograma a clasificar (ver
 *  pintarItem) y, al acertar, lo que se añade a la bandeja. */
function construirZonas(contenedorZonas, categorias, ajustesPista, plataforma) {
  contenedorZonas.innerHTML = '';
  const zonas = [];
  const bandejas = {};

  categorias.forEach((categoria) => {
    const zonaEl = document.createElement('div');
    zonaEl.className = 'clasifica-zona';
    zonaEl.setAttribute('role', 'button');
    zonaEl.tabIndex = 0;

    const nombreCategoria = (categoria.cabecera && categoria.cabecera.nombre) || categoria.id;
    zonaEl.setAttribute('aria-label', plataforma.t('clasificaCategorias.zona_categoria', { nombre: nombreCategoria }));

    const cabeceraEl = document.createElement('div');
    cabeceraEl.className = 'clasifica-zona-cabecera';
    pintarPictograma(cabeceraEl, categoria.cabecera, ajustesPista, plataforma, { textoReserva: categoria.id });

    const bandejaEl = document.createElement('div');
    bandejaEl.className = 'clasifica-zona-colocados';

    zonaEl.append(cabeceraEl, bandejaEl);
    zonaEl.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
      if (!estado || !estado.retoActual || !estado.itemElementoActual) return;
      manejarRespuesta(estado.retoActual, estado.itemElementoActual, { id: categoria.id, el: zonaEl });
    });

    contenedorZonas.appendChild(zonaEl);
    zonas.push({ id: categoria.id, el: zonaEl });
    bandejas[categoria.id] = bandejaEl;
  });

  return { zonas, bandejas };
}

function pintarItem() {
  const { raiz, plataforma, retoActual, ajustesPista } = estado;
  // Cada pictograma nuevo hay que volver a "escucharlo" antes de poder
  // clasificarlo, si el ajuste "pulsador TTS" está activo.
  estado.escuchado = false;

  raiz.querySelector('.clasifica-nivel').textContent = plataforma.t('clasificaCategorias.nivel', {
    n: estado.nivelActual,
    total: NIVELES_TOTAL
  });

  const zonaItem = raiz.querySelector('.clasifica-item-zona');
  zonaItem.innerHTML = '';

  const item = document.createElement('div');
  item.className = 'clasifica-item';

  function actualizarBloqueo() {
    item.classList.toggle('clasifica-item-bloqueado', !puedeResponder(ajustesPista, estado.escuchado));
  }

  if (ajustesPista.pulsadorTts) {
    // Igual que en "Arrastra la palabra": mientras no se pulse y se
    // escuche el nombre, el pictograma no se puede arrastrar ni
    // clasificar por teclado (ver los guardas en manejarRespuesta(),
    // onPointerDown() y el keydown de cada zona).
    const pulsador = document.createElement('button');
    pulsador.type = 'button';
    pulsador.className = 'clasifica-pulsador';
    pulsador.setAttribute('aria-label', plataforma.t('comunes.escuchar'));
    pulsador.textContent = '🔊';
    pulsador.addEventListener('click', () => {
      plataforma.sounds.click();
      plataforma.tts.speak(retoActual.medio.nombre);
      estado.escuchado = true;
      pulsador.classList.add('clasifica-pulsador-escuchado');
      actualizarBloqueo();
    });
    item.appendChild(pulsador);
  } else {
    pintarPictograma(item, retoActual.medio, ajustesPista, plataforma);
  }

  activarArrastre(item, retoActual, estado.zonas);
  zonaItem.appendChild(item);
  estado.itemElementoActual = item;
  actualizarBloqueo();
}

function siguienteNivel() {
  if (!estado) return;
  estado.nivelActual += 1;
  const reto = elegirSiguienteReto(estado.plataforma.categorias, { evitarIds: estado.usados });
  if (!reto) {
    mostrarSinMaterial(estado.raiz.querySelector('.clasifica-item-zona'), estado.plataforma);
    return;
  }
  estado.usados.push(reto.medio.id);
  estado.retoActual = reto;
  pintarItem();
}

function iniciarPartida() {
  if (!estado) return;
  estado.nivelActual = 0;
  estado.usados = [];
  estado.bloqueado = false;
  Object.values(estado.bandejas).forEach((bandeja) => { bandeja.innerHTML = ''; });
  estado.zonas.forEach(({ el }) => el.classList.remove('clasifica-zona-correcta', 'clasifica-zona-fallo', 'clasifica-zona-resaltada'));
  siguienteNivel();
}

function montar(contenedor, plataforma) {
  inyectarEstilosUnaVez();
  contenedor.innerHTML = '';

  const raiz = document.createElement('div');
  raiz.className = 'clasifica-app';

  const cabecera = document.createElement('header');
  cabecera.className = 'clasifica-cabecera';
  const titulo = document.createElement('h1');
  titulo.textContent = `${plataforma.icono || ''} ${plataforma.nombre}`.trim();
  const instrucciones = document.createElement('p');
  instrucciones.textContent = plataforma.t('clasificaCategorias.instrucciones');
  cabecera.append(titulo, instrucciones);

  const marcador = document.createElement('div');
  marcador.className = 'clasifica-marcador';
  const nivelEl = document.createElement('span');
  nivelEl.className = 'clasifica-nivel';
  marcador.appendChild(nivelEl);

  const zonasContenedor = document.createElement('div');
  zonasContenedor.className = 'clasifica-zonas';

  const zonaItem = document.createElement('div');
  zonaItem.className = 'clasifica-item-zona';
  // Para que, al menos al cambiar de pictograma, lectores de pantalla
  // que ya estén posados aquí anuncien el nuevo contenido sin que el
  // niño tenga que volver a buscarlo.
  zonaItem.setAttribute('aria-live', 'polite');

  raiz.append(cabecera, marcador, zonasContenedor, zonaItem);
  contenedor.appendChild(raiz);

  const ajustesPista = plataforma.ajustesPista || { mayuscula: true, mostrar: true, soloTexto: false, pulsadorTts: false };

  estado = {
    contenedor,
    plataforma,
    raiz,
    nivelActual: 0,
    usados: [],
    retoActual: null,
    itemElementoActual: null,
    zonas: [],
    bandejas: {},
    bloqueado: false,
    escuchado: false,
    timeoutId: null,
    ajustesPista
  };

  if (!hayMaterialSuficiente(plataforma.categorias)) {
    mostrarSinMaterial(zonaItem, plataforma);
    return;
  }

  const { zonas, bandejas } = construirZonas(zonasContenedor, plataforma.categorias, ajustesPista, plataforma);
  estado.zonas = zonas;
  estado.bandejas = bandejas;

  iniciarPartida();
}

function desmontar() {
  if (estado && estado.timeoutId) clearTimeout(estado.timeoutId);
  estado = null;
}

export default {
  id: 'clasifica-categorias',
  nombre: 'Clasifica los pictogramas en dos categorías',
  icono: '🗂️',
  estante: 'CONCEPTOS',
  montar,
  desmontar
};
