// Pictosfera — mecánica reutilizable: "me gusta / no me gusta con
// comidas".
//
// En pantalla hay dos zonas FIJAS, siempre las mismas en el mismo
// sitio: un plato (ARASAAC id 2532, "me gusta") y un cubo de basura
// (ARASAAC id 2724, "no me gusta") — ver `descriptor.material.fijos` en
// apps.json y `resolverFijos`/`plataforma.fijos` en appLoader.js. Debajo
// va apareciendo, de una en una, una comida del pozo. El niño la
// arrastra (o, por teclado, navega hasta una zona y pulsa
// Intro/Espacio) hasta el plato o el cubo, según le guste o no: A
// DIFERENCIA del resto de mecánicas de "arrastrar" de este proyecto,
// AQUÍ NO HAY acierto ni fallo — es una actividad de preferencia
// personal, no de clasificación correcta. Cualquiera de las dos zonas
// es siempre una respuesta válida: el niño elige. Tras decidir, sonido
// de confirmación + se dice su nombre en voz alta + aparece la
// siguiente comida. Termina tras pasar por 10 comidas.
//
// El plato y el cubo son "chrome" fijo de la pantalla: no llevan pista
// de texto editable por el adulto, siempre se ven igual (con su
// etiqueta "Me gusta"/"No me gusta"). Los ajustes de pista del portal
// (mayúscula/minúscula, mostrar/ocultar texto, solo texto sin imagen)
// solo afectan a la comida variable de cada ronda, igual que en el
// resto de mecánicas.
//
// Es "código de confianza del autor": JavaScript nativo, módulo ES, sin
// framework. No importa nada del núcleo directamente: todo lo que
// necesita le llega a través de `plataforma` en montar(). El arrastre
// reutiliza la misma dinámica de puntero que "Clasifica los pictogramas
// en dos categorías" (duplicada a propósito: cada mecánica de este
// proyecto es independiente y no importa código de otra).

const ESTILOS_ID = 'me-gusta-no-me-gusta-estilos';
const RONDAS_TOTAL = 10;
const UMBRAL_ARRASTRE = 4; // píxeles: por debajo de esto se considera un toque, no un arrastre

let estado = null; // { plataforma, contenedor, raiz, rondaActual, usados, medioActual, itemElementoActual, zonas, bandejas, bloqueado, timeoutId, ajustesPista }

// --- Lógica pura: qué comida toca esta ronda ---

/** ¿Hay alguna comida con la que jugar? */
export function hayMaterialSuficiente(medios) {
  return Array.isArray(medios) && medios.some((m) => m && m.nombre);
}

/** Elige al azar una comida que no se haya usado todavía en esta
 *  partida (si ya se usaron todas, se puede repetir). Lógica pura. */
export function elegirSiguienteMedio(medios, { evitarIds = [] } = {}) {
  const validos = (medios || []).filter((m) => m && m.nombre);
  if (!validos.length) return null;
  const evitar = new Set(evitarIds);
  const sinUsar = validos.filter((m) => !evitar.has(m.id));
  const candidatos = sinUsar.length ? sinUsar : validos;
  return candidatos[Math.floor(Math.random() * candidatos.length)];
}

/** ¿Es una de las dos zonas válidas? Como no hay acierto/fallo, cada
 *  decisión solo necesita comprobar que se ha soltado dentro de UNA de
 *  las dos zonas (lo que ya hace detectarZona): esta función es la
 *  comprobación de seguridad equivalente, pensada para poder probarse
 *  aparte sin DOM. */
export function esZonaValida(zonaId) {
  return zonaId === 'plato' || zonaId === 'basura';
}

/** Aplica el ajuste de mayúsculas/minúsculas a un texto. */
export function formatearPista(nombre, mayuscula = true) {
  if (!nombre) return '';
  return mayuscula ? nombre.toLocaleUpperCase() : nombre.toLocaleLowerCase();
}

function inyectarEstilosUnaVez() {
  if (document.getElementById(ESTILOS_ID)) return;
  const link = document.createElement('link');
  link.id = ESTILOS_ID;
  link.rel = 'stylesheet';
  link.href = new URL('meGustaNoMeGusta.css', import.meta.url).href;
  document.head.appendChild(link);
}

function mostrarSinMaterial(zona, plataforma) {
  zona.innerHTML = '';
  const vacio = document.createElement('p');
  vacio.className = 'vacio';
  vacio.textContent = plataforma.t('juegos.sin_material');
  zona.appendChild(vacio);
}

/** Pinta el pictograma fijo de una zona (plato o cubo de basura). Si
 *  por lo que sea no se pudo cargar (p.ej. sin conexión la primera vez
 *  que se siembra, ver resolverFijos), se cae a un emoji equivalente en
 *  vez de dejar la zona vacía: el juego sigue siendo jugable. */
function pintarFijo(contenedorImg, medioFijo, emojiReserva, plataforma) {
  contenedorImg.innerHTML = '';
  if (medioFijo) {
    const img = document.createElement('img');
    img.className = 'megusta-fijo-img';
    img.src = plataforma.getDisplayUrl(medioFijo);
    img.alt = medioFijo.nombre;
    img.draggable = false;
    contenedorImg.appendChild(img);
  } else {
    const emoji = document.createElement('span');
    emoji.className = 'megusta-fijo-emoji';
    emoji.textContent = emojiReserva;
    emoji.setAttribute('aria-hidden', 'true');
    contenedorImg.appendChild(emoji);
  }
}

/** Pinta la comida de la ronda actual, respetando los ajustes de pista
 *  del portal (mostrar/ocultar texto, mayúscula/minúscula, solo texto
 *  sin imagen) igual que el resto de mecánicas de arrastrar. A
 *  diferencia de "Clasifica los pictogramas en dos categorías", aquí no
 *  hay pulsador TTS propio (no forma parte de esta mecánica). */
function pintarComida(contenedor, medio, ajustesPista, plataforma) {
  contenedor.innerHTML = '';

  if (!ajustesPista.soloTexto) {
    const img = document.createElement('img');
    img.className = 'megusta-comida-img';
    img.src = plataforma.getDisplayUrl(medio);
    img.alt = medio.nombre;
    // Crítico para el arrastre: ver la misma nota en clasificaCategorias.js.
    img.draggable = false;
    contenedor.appendChild(img);
  }

  const pista = document.createElement('p');
  pista.className = 'megusta-comida-pista';
  pista.textContent = formatearPista(medio.nombre, ajustesPista.mayuscula);
  pista.hidden = !ajustesPista.mostrar && !ajustesPista.soloTexto;
  contenedor.appendChild(pista);
}

/** Añade, dentro de la "bandeja" de una zona, una pequeña miniatura de
 *  la comida recién decidida. */
function agregarColocado(zonaId, medio) {
  const bandeja = estado.bandejas[zonaId];
  if (!bandeja) return;
  const chip = document.createElement('div');
  chip.className = 'megusta-colocado';
  if (estado.ajustesPista.soloTexto) {
    chip.classList.add('megusta-colocado-texto');
    chip.textContent = formatearPista(medio.nombre, estado.ajustesPista.mayuscula);
  } else {
    const img = document.createElement('img');
    img.className = 'megusta-colocado-img';
    img.src = estado.plataforma.getDisplayUrl(medio);
    img.alt = medio.nombre;
    img.draggable = false;
    chip.appendChild(img);
  }
  bandeja.appendChild(chip);
}

/** Registra la decisión del niño. No hay acierto/fallo: cualquiera de
 *  las dos zonas es siempre válida, así que esto solo confirma la
 *  elección (sonido + voz) y avanza a la siguiente comida. */
function manejarEleccion(medio, elementoItem, zona) {
  if (!estado || estado.bloqueado) return;
  if (!esZonaValida(zona.id)) return;

  estado.bloqueado = true;
  estado.plataforma.sounds.acierto();
  estado.plataforma.tts.speak(medio.nombre);
  zona.el.classList.add('megusta-zona-elegida');
  agregarColocado(zona.id, medio);
  if (elementoItem) elementoItem.classList.add('megusta-item-colocado');

  if (estado.rondaActual >= RONDAS_TOTAL) {
    estado.timeoutId = setTimeout(() => {
      if (!estado) return;
      estado.plataforma.mostrarRecompensa({ onContinuar: iniciarPartida });
    }, 500);
  } else {
    estado.timeoutId = setTimeout(() => {
      if (!estado) return;
      zona.el.classList.remove('megusta-zona-elegida');
      estado.bloqueado = false;
      siguienteRonda();
    }, 700);
  }
}

function detectarZona(zonas, x, y) {
  return (
    zonas.find(({ el }) => {
      const r = el.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }) || null
  );
}

/** Engancha el arrastre (puntero/táctil) de la comida de la ronda
 *  contra las dos zonas fijas. Un simple toque sin arrastre no cuenta
 *  como decisión: hay que soltarla dentro de una zona, igual que en el
 *  resto de mecánicas de "arrastrar" del proyecto. */
function activarArrastre(elementoItem, medio, zonas) {
  let activo = false;
  let arrastrado = false;
  let inicioX = 0;
  let inicioY = 0;

  function resaltar(x, y) {
    const zonaActiva = detectarZona(zonas, x, y);
    zonas.forEach(({ el }) => el.classList.toggle('megusta-zona-resaltada', Boolean(zonaActiva) && zonaActiva.el === el));
  }

  function quitarResaltado() {
    zonas.forEach(({ el }) => el.classList.remove('megusta-zona-resaltada'));
  }

  function onPointerDown(ev) {
    if (!estado || estado.bloqueado) return;
    activo = true;
    arrastrado = false;
    inicioX = ev.clientX;
    inicioY = ev.clientY;
    elementoItem.style.transition = 'none';
    try { elementoItem.setPointerCapture(ev.pointerId); } catch { /* no soportado en algún entorno: no pasa nada */ }
    elementoItem.classList.add('megusta-item-activo');
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
    elementoItem.classList.remove('megusta-item-activo');
    quitarResaltado();
    elementoItem.style.transition = 'transform var(--transition-base)';
    elementoItem.style.transform = 'translate(0, 0)';

    const zonaSoltada = arrastrado ? detectarZona(zonas, ev.clientX, ev.clientY) : null;
    if (zonaSoltada) manejarEleccion(medio, elementoItem, zonaSoltada);
  }

  function onPointerCancel() {
    activo = false;
    elementoItem.classList.remove('megusta-item-activo');
    quitarResaltado();
    elementoItem.style.transition = 'transform var(--transition-base)';
    elementoItem.style.transform = 'translate(0, 0)';
  }

  elementoItem.addEventListener('pointerdown', onPointerDown);
  elementoItem.addEventListener('pointermove', onPointerMove);
  elementoItem.addEventListener('pointerup', soltar);
  elementoItem.addEventListener('pointercancel', onPointerCancel);
}

/** Construye, UNA SOLA VEZ por partida, las dos zonas fijas (plato y
 *  cubo de basura) y las engancha por teclado: cada zona es un
 *  elemento activable (Intro/Espacio) que decide AHÍ la comida que esté
 *  en juego en ese momento (`estado.medioActual`). */
function construirZonas(contenedorZonas, fijos, plataforma) {
  contenedorZonas.innerHTML = '';
  const definiciones = [
    { id: 'plato', medioFijo: fijos.plato, emoji: '🍽️', etiquetaClave: 'meGusta.zona_me_gusta' },
    { id: 'basura', medioFijo: fijos.basura, emoji: '🗑️', etiquetaClave: 'meGusta.zona_no_me_gusta' }
  ];
  const zonas = [];
  const bandejas = {};

  definiciones.forEach((def) => {
    const zonaEl = document.createElement('div');
    zonaEl.className = `megusta-zona megusta-zona-${def.id}`;
    zonaEl.setAttribute('role', 'button');
    zonaEl.tabIndex = 0;
    zonaEl.setAttribute('aria-label', plataforma.t(def.etiquetaClave));

    const fijoEl = document.createElement('div');
    fijoEl.className = 'megusta-fijo';
    pintarFijo(fijoEl, def.medioFijo, def.emoji, plataforma);

    const etiquetaEl = document.createElement('p');
    etiquetaEl.className = 'megusta-zona-etiqueta';
    etiquetaEl.textContent = plataforma.t(def.etiquetaClave);

    const bandejaEl = document.createElement('div');
    bandejaEl.className = 'megusta-zona-colocados';

    zonaEl.append(fijoEl, etiquetaEl, bandejaEl);
    zonaEl.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
      if (!estado || !estado.medioActual || !estado.itemElementoActual) return;
      manejarEleccion(estado.medioActual, estado.itemElementoActual, { id: def.id, el: zonaEl });
    });

    contenedorZonas.appendChild(zonaEl);
    zonas.push({ id: def.id, el: zonaEl });
    bandejas[def.id] = bandejaEl;
  });

  return { zonas, bandejas };
}

function pintarRonda() {
  const { raiz, plataforma, ajustesPista } = estado;

  raiz.querySelector('.megusta-ronda').textContent = plataforma.t('meGusta.ronda', {
    n: estado.rondaActual,
    total: RONDAS_TOTAL
  });

  const zonaItem = raiz.querySelector('.megusta-item-zona');
  zonaItem.innerHTML = '';

  const item = document.createElement('div');
  item.className = 'megusta-item';
  pintarComida(item, estado.medioActual, ajustesPista, plataforma);
  activarArrastre(item, estado.medioActual, estado.zonas);

  zonaItem.appendChild(item);
  estado.itemElementoActual = item;
}

function siguienteRonda() {
  if (!estado) return;
  estado.rondaActual += 1;
  const medio = elegirSiguienteMedio(estado.plataforma.medios, { evitarIds: estado.usados });
  if (!medio) {
    mostrarSinMaterial(estado.raiz.querySelector('.megusta-item-zona'), estado.plataforma);
    return;
  }
  estado.usados.push(medio.id);
  estado.medioActual = medio;
  pintarRonda();
}

function iniciarPartida() {
  if (!estado) return;
  estado.rondaActual = 0;
  estado.usados = [];
  estado.bloqueado = false;
  Object.values(estado.bandejas).forEach((bandeja) => { bandeja.innerHTML = ''; });
  estado.zonas.forEach(({ el }) => el.classList.remove('megusta-zona-elegida', 'megusta-zona-resaltada'));
  siguienteRonda();
}

function montar(contenedor, plataforma) {
  inyectarEstilosUnaVez();
  contenedor.innerHTML = '';

  const raiz = document.createElement('div');
  raiz.className = 'megusta-app';

  const cabecera = document.createElement('header');
  cabecera.className = 'megusta-cabecera';
  const titulo = document.createElement('h1');
  titulo.textContent = `${plataforma.icono || ''} ${plataforma.nombre}`.trim();
  const instrucciones = document.createElement('p');
  instrucciones.textContent = plataforma.t('meGusta.instrucciones');
  cabecera.append(titulo, instrucciones);

  const marcador = document.createElement('div');
  marcador.className = 'megusta-marcador';
  const rondaEl = document.createElement('span');
  rondaEl.className = 'megusta-ronda';
  marcador.appendChild(rondaEl);

  const zonasContenedor = document.createElement('div');
  zonasContenedor.className = 'megusta-zonas';

  const zonaItem = document.createElement('div');
  zonaItem.className = 'megusta-item-zona';
  zonaItem.setAttribute('aria-live', 'polite');

  raiz.append(cabecera, marcador, zonasContenedor, zonaItem);
  contenedor.appendChild(raiz);

  const ajustesPista = plataforma.ajustesPista || { mayuscula: true, mostrar: true, soloTexto: false };
  const fijos = plataforma.fijos || {};

  estado = {
    contenedor,
    plataforma,
    raiz,
    rondaActual: 0,
    usados: [],
    medioActual: null,
    itemElementoActual: null,
    zonas: [],
    bandejas: {},
    bloqueado: false,
    timeoutId: null,
    ajustesPista
  };

  if (!hayMaterialSuficiente(plataforma.medios)) {
    mostrarSinMaterial(zonaItem, plataforma);
    return;
  }

  const { zonas, bandejas } = construirZonas(zonasContenedor, fijos, plataforma);
  estado.zonas = zonas;
  estado.bandejas = bandejas;

  iniciarPartida();
}

function desmontar() {
  if (estado && estado.timeoutId) clearTimeout(estado.timeoutId);
  estado = null;
}

export default {
  id: 'me-gusta-no-me-gusta',
  nombre: 'Me gusta / no me gusta',
  icono: '🍽️',
  estante: 'CONCEPTOS',
  montar,
  desmontar
};
