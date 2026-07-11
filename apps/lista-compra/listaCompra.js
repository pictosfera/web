// Pictosfera — mecánica reutilizable: "lista de la compra".
//
// En pantalla hay una lista vertical, "LISTA DE LA COMPRA", con 5
// pictogramas, y un estante con 10 (los mismos 5 de la lista,
// mezclados con otros 5 que no pintan nada en esta ronda). Abajo, un
// carrito de la compra FIJO, siempre el mismo (ARASAAC id 5948 — ver
// `descriptor.material.fijos` en apps.json y
// `resolverFijos`/`plataforma.fijos` en appLoader.js). El niño toca o
// arrastra del estante al carrito SOLO los pictogramas que están en la
// lista. Acierto: sonido + voz + el pictograma de la lista se marca
// como conseguido y el del estante desaparece (ya está en el
// carrito). Fallo (un pictograma que no está en la lista): sonido de
// error, el carrito se sombrea en rojo un instante y el pictograma
// vuelve a su sitio en el estante para poder seguir intentándolo, sin
// límite de fallos. La ronda termina al meter en el carrito los 5
// pictogramas de la lista; la partida, tras 5 rondas.
//
// Como solo hay UN destino posible (el carrito), tocar/pulsar
// directamente un pictograma del estante (sin arrastrarlo) también
// cuenta como intento de meterlo en el carrito: no hace falta un
// segundo paso para "elegir destino", a diferencia de mecánicas con
// varias zonas (p.ej. "Clasifica los pictogramas en dos categorías").
// Esto hace que la alternativa accesible por teclado sea, simplemente,
// activar (Intro/Espacio) el pictograma del estante que se quiera
// intentar meter en el carrito.
//
// El material es el mismo pozo compartido con "Me gusta / no me gusta
// con comidas" (etiqueta "comida", ver apps.json): aquí se necesitan al
// menos 10 distintos por ronda (5 para la lista + 5 señuelos).
//
// Es "código de confianza del autor": JavaScript nativo, módulo ES, sin
// framework. No importa nada del núcleo directamente: todo lo que
// necesita le llega a través de `plataforma` en montar(). El arrastre
// reutiliza la misma dinámica de puntero que el resto de mecánicas de
// "arrastrar" del proyecto (duplicada a propósito: cada mecánica es
// independiente y no importa código de otra).

const ESTILOS_ID = 'lista-compra-estilos';
const RONDAS_TOTAL = 5;
const ITEMS_LISTA = 5;
const ITEMS_SENUELOS = 5;
const MIN_MEDIOS = ITEMS_LISTA + ITEMS_SENUELOS;
const UMBRAL_ARRASTRE = 4; // píxeles: por debajo de esto se considera un toque, no un arrastre

let estado = null; // { plataforma, contenedor, raiz, rondaActual, lista, estante, añadidos, bloqueado, timeoutId, ajustesPista }

// --- Lógica pura: qué lista y qué estante toca esta ronda ---

export function mezclar(lista) {
  const copia = [...(lista || [])];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** ¿Hay suficiente material? Hacen falta al menos 10 pictogramas
 *  distintos: 5 para la lista y 5 señuelos para el estante. */
export function hayMaterialSuficiente(medios) {
  const validos = (medios || []).filter((m) => m && m.nombre);
  return validos.length >= MIN_MEDIOS;
}

/** Genera una ronda: elige al azar 5 pictogramas para la lista y otros
 *  5 distintos como señuelos, y mezcla los 10 para el estante. Lógica
 *  pura. Devuelve null si no hay suficiente material. */
export function generarRonda(medios) {
  const validos = (medios || []).filter((m) => m && m.nombre);
  if (validos.length < MIN_MEDIOS) return null;
  const barajados = mezclar(validos);
  const lista = barajados.slice(0, ITEMS_LISTA);
  const senuelos = barajados.slice(ITEMS_LISTA, ITEMS_LISTA + ITEMS_SENUELOS);
  return { lista, estante: mezclar([...lista, ...senuelos]) };
}

/** ¿Este pictograma del estante es uno de los que pide la lista? */
export function esCoincidencia(medio, lista) {
  if (!medio) return false;
  return Array.isArray(lista) && lista.some((m) => m && m.id === medio.id);
}

/** ¿Ya se metieron en el carrito los 5 pictogramas de la lista? */
export function rondaCompleta(idsAnadidos, lista) {
  if (!Array.isArray(lista) || !lista.length) return false;
  const anadidos = new Set(idsAnadidos || []);
  return lista.every((m) => m && anadidos.has(m.id));
}

/** Aplica el ajuste de mayúsculas/minúsculas a un texto. */
export function formatearTexto(texto, mayuscula = true) {
  if (!texto) return '';
  return mayuscula ? texto.toLocaleUpperCase() : texto.toLocaleLowerCase();
}

function inyectarEstilosUnaVez() {
  if (document.getElementById(ESTILOS_ID)) return;
  const link = document.createElement('link');
  link.id = ESTILOS_ID;
  link.rel = 'stylesheet';
  link.href = new URL('listaCompra.css', import.meta.url).href;
  document.head.appendChild(link);
}

function mostrarSinMaterial(zona, plataforma) {
  zona.innerHTML = '';
  const vacio = document.createElement('p');
  vacio.className = 'vacio';
  vacio.textContent = plataforma.t('juegos.sin_material');
  zona.appendChild(vacio);
}

/** Pinta el pictograma fijo del carrito. Si por lo que sea no se pudo
 *  cargar (p.ej. sin conexión la primera vez que se siembra, ver
 *  resolverFijos), se cae a un emoji equivalente en vez de dejar la
 *  zona vacía: el juego sigue siendo jugable. */
function pintarFijo(contenedorImg, medioFijo, emojiReserva, plataforma) {
  contenedorImg.innerHTML = '';
  if (medioFijo) {
    const img = document.createElement('img');
    img.className = 'lista-carrito-img';
    img.src = plataforma.getDisplayUrl(medioFijo);
    img.alt = medioFijo.nombre;
    img.draggable = false;
    contenedorImg.appendChild(img);
  } else {
    const emoji = document.createElement('span');
    emoji.className = 'lista-carrito-emoji';
    emoji.textContent = emojiReserva;
    emoji.setAttribute('aria-hidden', 'true');
    contenedorImg.appendChild(emoji);
  }
}

/** Pinta los 5 pictogramas de la lista, con un visto bueno en los que
 *  ya se metieron en el carrito. Respeta el ajuste propio
 *  "listaSoloTexto" (oculta la imagen, deja solo el nombre). Se vuelve
 *  a llamar cada vez que cambia `añadidos`, no solo al empezar la
 *  ronda: la lista en sí no es arrastrable, así que repintarla entera
 *  no pierde ningún manejador de eventos. */
function pintarLista(listaEl, lista, anadidos, ajustesPista, plataforma) {
  listaEl.innerHTML = '';
  lista.forEach((medio) => {
    const li = document.createElement('li');
    li.className = 'lista-lista-item';
    if (anadidos.has(medio.id)) li.classList.add('lista-lista-item-conseguido');

    if (!ajustesPista.listaSoloTexto) {
      const img = document.createElement('img');
      img.className = 'lista-lista-img';
      img.src = plataforma.getDisplayUrl(medio);
      img.alt = medio.nombre;
      img.draggable = false;
      li.appendChild(img);
    }

    const texto = document.createElement('span');
    texto.className = 'lista-lista-texto';
    texto.textContent = formatearTexto(medio.nombre, ajustesPista.mayuscula);
    li.appendChild(texto);

    const marca = document.createElement('span');
    marca.className = 'lista-lista-marca';
    marca.textContent = '✓';
    marca.setAttribute('aria-hidden', 'true');
    li.appendChild(marca);

    listaEl.appendChild(li);
  });
}

/** ¿El punto (x, y) cae dentro de la zona del carrito? Como solo hay un
 *  destino posible, no hace falta una lista de zonas como en otras
 *  mecánicas: basta comprobar contra esta única zona. */
function sueltaEnCarrito(x, y) {
  const carritoEl = estado.raiz.querySelector('.lista-carrito');
  if (!carritoEl) return false;
  const r = carritoEl.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

/** Juzga un intento de meter `medio` en el carrito (venga de
 *  arrastrarlo hasta allí, de un toque simple, o de teclado: las tres
 *  vías llegan aquí, ver activarArrastreEstante). No hay límite de
 *  fallos: un pictograma que no toca puede reintentarse luego sin más,
 *  sigue disponible en el estante. */
function manejarIntento(medio, elementoItem) {
  if (!estado || estado.bloqueado) return;
  if (estado.anadidos.has(medio.id)) return; // defensivo: ya estaba en el carrito

  if (esCoincidencia(medio, estado.lista)) {
    estado.plataforma.sounds.acierto();
    estado.plataforma.tts.speak(medio.nombre);
    estado.anadidos.add(medio.id);
    pintarLista(estado.raiz.querySelector('.lista-lista-items'), estado.lista, estado.anadidos, estado.ajustesPista, estado.plataforma);
    if (elementoItem) elementoItem.remove();

    if (rondaCompleta(Array.from(estado.anadidos), estado.lista)) {
      estado.bloqueado = true;
      estado.timeoutId = setTimeout(() => {
        if (!estado) return;
        if (estado.rondaActual >= RONDAS_TOTAL) {
          estado.plataforma.mostrarRecompensa({ onContinuar: iniciarPartida });
        } else {
          estado.bloqueado = false;
          siguienteRonda();
        }
      }, 600);
    }
  } else {
    estado.plataforma.sounds.fallo();
    const carritoEl = estado.raiz.querySelector('.lista-carrito');
    carritoEl.classList.add('lista-carrito-fallo');
    if (elementoItem) elementoItem.classList.add('lista-estante-item-fallo');
    setTimeout(() => {
      carritoEl.classList.remove('lista-carrito-fallo');
      if (elementoItem) elementoItem.classList.remove('lista-estante-item-fallo');
    }, 400);
  }
}

/** Engancha el arrastre (puntero/táctil) de un pictograma del estante
 *  contra el carrito. Como solo hay un destino posible, un simple toque
 *  SIN arrastrar también cuenta como intento directo (no hace falta
 *  elegir destino): por eso, a diferencia del resto de mecánicas de
 *  "arrastrar" del proyecto, aquí el toque simple SÍ dispara
 *  manejarIntento, igual que soltar arrastrando encima del carrito. */
function activarArrastreEstante(elementoItem, medio) {
  let activo = false;
  let arrastrado = false;
  let inicioX = 0;
  let inicioY = 0;

  function onPointerDown(ev) {
    if (!estado || estado.bloqueado) return;
    activo = true;
    arrastrado = false;
    inicioX = ev.clientX;
    inicioY = ev.clientY;
    elementoItem.style.transition = 'none';
    try { elementoItem.setPointerCapture(ev.pointerId); } catch { /* no soportado en algún entorno: no pasa nada */ }
    elementoItem.classList.add('lista-estante-item-activo');
  }

  function onPointerMove(ev) {
    if (!activo) return;
    const dx = ev.clientX - inicioX;
    const dy = ev.clientY - inicioY;
    if (Math.abs(dx) > UMBRAL_ARRASTRE || Math.abs(dy) > UMBRAL_ARRASTRE) arrastrado = true;
    elementoItem.style.transform = `translate(${dx}px, ${dy}px)`;
    const carritoEl = estado.raiz.querySelector('.lista-carrito');
    if (carritoEl) carritoEl.classList.toggle('lista-carrito-resaltado', arrastrado && sueltaEnCarrito(ev.clientX, ev.clientY));
  }

  function soltar(ev) {
    if (!activo) return;
    activo = false;
    elementoItem.classList.remove('lista-estante-item-activo');
    const carritoEl = estado.raiz.querySelector('.lista-carrito');
    if (carritoEl) carritoEl.classList.remove('lista-carrito-resaltado');
    elementoItem.style.transition = 'transform var(--transition-base)';
    elementoItem.style.transform = 'translate(0, 0)';

    if (!arrastrado || sueltaEnCarrito(ev.clientX, ev.clientY)) {
      manejarIntento(medio, elementoItem);
    }
  }

  function onPointerCancel() {
    activo = false;
    elementoItem.classList.remove('lista-estante-item-activo');
    const carritoEl = estado.raiz.querySelector('.lista-carrito');
    if (carritoEl) carritoEl.classList.remove('lista-carrito-resaltado');
    elementoItem.style.transition = 'transform var(--transition-base)';
    elementoItem.style.transform = 'translate(0, 0)';
  }

  function onKeyDown(ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault();
    manejarIntento(medio, elementoItem);
  }

  elementoItem.addEventListener('pointerdown', onPointerDown);
  elementoItem.addEventListener('pointermove', onPointerMove);
  elementoItem.addEventListener('pointerup', soltar);
  elementoItem.addEventListener('pointercancel', onPointerCancel);
  elementoItem.addEventListener('keydown', onKeyDown);
}

function crearItemEstante(medio, ajustesPista, plataforma) {
  const el = document.createElement('div');
  el.className = 'lista-estante-item';
  el.setAttribute('role', 'button');
  el.tabIndex = 0;
  el.setAttribute('aria-label', medio.nombre);

  const img = document.createElement('img');
  img.className = 'lista-estante-img';
  img.src = plataforma.getDisplayUrl(medio);
  img.alt = medio.nombre;
  // Crítico para el arrastre: ver la misma nota en clasificaCategorias.js.
  img.draggable = false;
  el.appendChild(img);

  if (!ajustesPista.estanteSoloImagen) {
    const caption = document.createElement('p');
    caption.className = 'lista-estante-caption';
    caption.textContent = formatearTexto(medio.nombre, ajustesPista.mayuscula);
    el.appendChild(caption);
  }

  activarArrastreEstante(el, medio);
  return el;
}

function pintarRonda() {
  const { raiz, plataforma, ajustesPista } = estado;
  plataforma.tts.speak(plataforma.t('listaCompra.tts_instruccion'));

  raiz.querySelector('.lista-ronda').textContent = plataforma.t('listaCompra.ronda', {
    n: estado.rondaActual,
    total: RONDAS_TOTAL
  });

  pintarLista(raiz.querySelector('.lista-lista-items'), estado.lista, estado.anadidos, ajustesPista, plataforma);

  const estanteEl = raiz.querySelector('.lista-estante-items');
  estanteEl.innerHTML = '';
  estado.estante.forEach((medio) => {
    estanteEl.appendChild(crearItemEstante(medio, ajustesPista, plataforma));
  });
}

function siguienteRonda() {
  if (!estado) return;
  estado.rondaActual += 1;
  const ronda = generarRonda(estado.plataforma.medios);
  if (!ronda) {
    mostrarSinMaterial(estado.raiz.querySelector('.lista-juego'), estado.plataforma);
    return;
  }
  estado.lista = ronda.lista;
  estado.estante = ronda.estante;
  estado.anadidos = new Set();
  pintarRonda();
}

function iniciarPartida() {
  if (!estado) return;
  estado.rondaActual = 0;
  estado.bloqueado = false;
  siguienteRonda();
}

function montar(contenedor, plataforma) {
  inyectarEstilosUnaVez();
  contenedor.innerHTML = '';

  const raiz = document.createElement('div');
  raiz.className = 'lista-app';

  const cabecera = document.createElement('header');
  cabecera.className = 'lista-cabecera';
  const titulo = document.createElement('h1');
  titulo.textContent = `${plataforma.icono || ''} ${plataforma.nombre}`.trim();
  const instrucciones = document.createElement('p');
  instrucciones.textContent = plataforma.t('listaCompra.instrucciones');
  cabecera.append(titulo, instrucciones);

  const marcador = document.createElement('div');
  marcador.className = 'lista-marcador';
  const rondaEl = document.createElement('span');
  rondaEl.className = 'lista-ronda';
  marcador.appendChild(rondaEl);

  const juego = document.createElement('div');
  juego.className = 'lista-juego';

  const columnaLista = document.createElement('div');
  columnaLista.className = 'lista-columna-lista';
  const tituloLista = document.createElement('h2');
  tituloLista.className = 'lista-titulo-lista';
  tituloLista.textContent = plataforma.t('listaCompra.titulo_lista');
  const listaItemsEl = document.createElement('ul');
  listaItemsEl.className = 'lista-lista-items';
  listaItemsEl.setAttribute('aria-live', 'polite');
  columnaLista.append(tituloLista, listaItemsEl);

  const columnaEstante = document.createElement('div');
  columnaEstante.className = 'lista-columna-estante';
  const tituloEstante = document.createElement('h2');
  tituloEstante.className = 'lista-titulo-estante';
  tituloEstante.textContent = plataforma.t('listaCompra.titulo_estante');
  const estanteItemsEl = document.createElement('div');
  estanteItemsEl.className = 'lista-estante-items';
  columnaEstante.append(tituloEstante, estanteItemsEl);

  juego.append(columnaLista, columnaEstante);

  const zonaCarrito = document.createElement('div');
  zonaCarrito.className = 'lista-carrito';
  const carritoImgEl = document.createElement('div');
  carritoImgEl.className = 'lista-carrito-fijo';
  const carritoEtiqueta = document.createElement('p');
  carritoEtiqueta.className = 'lista-carrito-etiqueta';
  carritoEtiqueta.textContent = plataforma.t('listaCompra.zona_carrito');
  zonaCarrito.append(carritoImgEl, carritoEtiqueta);

  raiz.append(cabecera, marcador, juego, zonaCarrito);
  contenedor.appendChild(raiz);

  const ajustesPista = plataforma.ajustesPista || { mayuscula: true, listaSoloTexto: false, estanteSoloImagen: false };
  const fijos = plataforma.fijos || {};
  pintarFijo(carritoImgEl, fijos.carrito, '🛒', plataforma);

  estado = {
    contenedor,
    plataforma,
    raiz,
    rondaActual: 0,
    lista: [],
    estante: [],
    anadidos: new Set(),
    bloqueado: false,
    timeoutId: null,
    ajustesPista
  };

  if (!hayMaterialSuficiente(plataforma.medios)) {
    mostrarSinMaterial(juego, plataforma);
    return;
  }

  iniciarPartida();
}

function desmontar() {
  if (estado && estado.timeoutId) clearTimeout(estado.timeoutId);
  estado = null;
}

export default {
  id: 'lista-compra',
  nombre: 'Lista de la compra',
  icono: '🛒',
  estante: 'RUTINAS',
  montar,
  desmontar
};
