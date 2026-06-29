// Pictosfera — app de ejemplo: Memoria.
//
// Mecánica de juego: parejas con pictogramas. Es "código de confianza
// del autor" (ver definición del proyecto): JavaScript nativo, módulo
// ES, sin framework. No importa nada del núcleo directamente: todo lo
// que necesita (idioma, voz, sonidos, recompensa, material) le llega
// a través del objeto `plataforma` que recibe en montar().
//
// Esto es justo lo que hace que esta mecánica se pueda reutilizar para
// crear OTRA app distinta (p.ej. "Memoria de letras") con solo un
// descriptor JSON nuevo en data/apps.json, sin tocar este archivo.

const ESTILOS_ID = 'memoria-estilos';
const MIN_PAREJAS = 3;
// 5 parejas = 10 tarjetas: el máximo pensado para no saturar la
// pantalla ni la memoria de trabajo del niño o niña.
const MAX_PAREJAS = 5;

let estado = null; // { plataforma, contenedor, timeoutId, raiz }

/** Cuántas parejas jugar según el material disponible (lógica pura, fácil de probar). */
export function elegirNumeroParejas(totalMedios) {
  if (totalMedios < MIN_PAREJAS) return 0;
  return Math.max(MIN_PAREJAS, Math.min(MAX_PAREJAS, totalMedios));
}

/** Aplica el ajuste de mayúsculas/minúsculas de visualización al
 *  nombre de un medio (mismo espíritu que formatearPista()/
 *  formatearTexto() en las otras mecánicas; duplicado a propósito,
 *  cada mecánica es independiente). */
export function formatearNombre(nombre, mayuscula = true) {
  if (!nombre) return '';
  return mayuscula ? nombre.toLocaleUpperCase('es') : nombre.toLocaleLowerCase('es');
}

function mezclar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Construye el mazo de cartas (dos por cada medio elegido) ya barajado.
 *  Lógica pura: no toca el DOM, así se puede probar directamente. */
export function crearMazo(medios, numParejas = elegirNumeroParejas(medios.length)) {
  if (numParejas <= 0) return [];
  const elegidos = mezclar(medios).slice(0, numParejas);
  const cartas = [];
  elegidos.forEach((medio, i) => {
    cartas.push({ cartaId: `${i}-a`, medioId: medio.id, medio, volteada: false, emparejada: false });
    cartas.push({ cartaId: `${i}-b`, medioId: medio.id, medio, volteada: false, emparejada: false });
  });
  return mezclar(cartas);
}

export function sonPareja(cartaA, cartaB) {
  return Boolean(cartaA) && Boolean(cartaB) && cartaA.medioId === cartaB.medioId && cartaA.cartaId !== cartaB.cartaId;
}

function inyectarEstilosUnaVez() {
  if (document.getElementById(ESTILOS_ID)) return;
  const link = document.createElement('link');
  link.id = ESTILOS_ID;
  link.rel = 'stylesheet';
  link.href = new URL('memoria.css', import.meta.url).href;
  document.head.appendChild(link);
}

function pintarCarta(carta, plataforma, ajustesPista) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'memoria-carta';
  btn.dataset.cartaId = carta.cartaId;
  btn.setAttribute('aria-label', carta.volteada || carta.emparejada ? carta.medio.nombre : '?');

  if (carta.volteada || carta.emparejada) {
    btn.classList.add('memoria-carta-volteada');
    if (ajustesPista.soloTexto) {
      // "Solo texto": se omite la imagen del pictograma a propósito,
      // solo se ve el nombre (ver core/js/ajustesJuego.js).
      btn.classList.add('memoria-carta-solo-texto');
    } else {
      const img = document.createElement('img');
      img.src = plataforma.getDisplayUrl(carta.medio);
      img.alt = carta.medio.nombre;
      btn.appendChild(img);
    }
    const nombre = document.createElement('span');
    nombre.className = 'memoria-carta-nombre';
    nombre.textContent = formatearNombre(carta.medio.nombre, ajustesPista.mayuscula);
    btn.appendChild(nombre);
  } else {
    btn.textContent = '🂠';
  }
  if (carta.emparejada) btn.classList.add('memoria-carta-emparejada');
  return btn;
}

function pintarTodo() {
  const { raiz, mazo, plataforma, intentos, ajustesPista } = estado;
  const tablero = raiz.querySelector('.memoria-tablero');
  tablero.innerHTML = '';
  mazo.forEach((carta) => {
    const btn = pintarCarta(carta, plataforma, ajustesPista);
    btn.addEventListener('click', () => onCartaPulsada(carta.cartaId));
    tablero.appendChild(btn);
  });

  const parejasTotal = mazo.length / 2;
  const parejasEncontradas = mazo.filter((c) => c.emparejada).length / 2;
  raiz.querySelector('.memoria-intentos').textContent = plataforma.t('memoria.intentos', { n: intentos });
  raiz.querySelector('.memoria-parejas').textContent = plataforma.t('memoria.parejas', {
    n: parejasEncontradas,
    total: parejasTotal
  });
}

function onCartaPulsada(cartaId) {
  if (!estado || estado.bloqueado) return;
  const carta = estado.mazo.find((c) => c.cartaId === cartaId);
  if (!carta || carta.volteada || carta.emparejada) return;

  carta.volteada = true;
  estado.plataforma.sounds.click();
  estado.plataforma.tts.speak(carta.medio.nombre);
  estado.volteadas.push(carta);
  pintarTodo();

  if (estado.volteadas.length === 2) {
    estado.bloqueado = true;
    estado.intentos += 1;
    const [a, b] = estado.volteadas;
    if (sonPareja(a, b)) {
      a.emparejada = true;
      b.emparejada = true;
      estado.volteadas = [];
      estado.bloqueado = false;
      estado.plataforma.sounds.acierto();
      pintarTodo();
      const todasEmparejadas = estado.mazo.every((c) => c.emparejada);
      if (todasEmparejadas) {
        estado.plataforma.mostrarRecompensa({ onContinuar: reiniciar });
      }
    } else {
      estado.plataforma.sounds.fallo();
      estado.timeoutId = setTimeout(() => {
        a.volteada = false;
        b.volteada = false;
        estado.volteadas = [];
        estado.bloqueado = false;
        pintarTodo();
      }, 900);
    }
  }
}

function reiniciar() {
  if (!estado) return;
  const numParejas = elegirNumeroParejas(estado.plataforma.medios.length);
  estado.mazo = crearMazo(estado.plataforma.medios, numParejas);
  estado.volteadas = [];
  estado.bloqueado = false;
  estado.intentos = 0;
  pintarTodo();
}

function montar(contenedor, plataforma) {
  inyectarEstilosUnaVez();
  contenedor.innerHTML = '';

  const raiz = document.createElement('div');
  raiz.className = 'memoria-app';

  const cabecera = document.createElement('header');
  cabecera.className = 'memoria-cabecera';
  const titulo = document.createElement('h1');
  titulo.textContent = `${plataforma.icono || ''} ${plataforma.nombre}`.trim();
  const instrucciones = document.createElement('p');
  instrucciones.textContent = plataforma.t('memoria.instrucciones');
  cabecera.append(titulo, instrucciones);

  const marcador = document.createElement('div');
  marcador.className = 'memoria-marcador';
  const intentosEl = document.createElement('span');
  intentosEl.className = 'memoria-intentos';
  const parejasEl = document.createElement('span');
  parejasEl.className = 'memoria-parejas';
  marcador.append(intentosEl, parejasEl);

  const tablero = document.createElement('div');
  tablero.className = 'memoria-tablero';

  raiz.append(cabecera, marcador, tablero);
  contenedor.appendChild(raiz);

  estado = {
    contenedor,
    plataforma,
    raiz,
    mazo: [],
    volteadas: [],
    bloqueado: false,
    intentos: 0,
    timeoutId: null,
    // "Solo texto" (ver core/js/ajustesJuego.js): oculta la imagen del
    // pictograma en las cartas volteadas/emparejadas y deja solo el
    // nombre. Desactivado por defecto. "mayuscula": cómo se muestra el
    // nombre de la carta (ver formatearNombre()).
    ajustesPista: plataforma.ajustesPista || { mayuscula: true, soloTexto: false }
  };

  if (!plataforma.medios || plataforma.medios.length < MIN_PAREJAS) {
    tablero.innerHTML = '';
    const vacio = document.createElement('p');
    vacio.className = 'vacio';
    vacio.textContent = plataforma.t('juegos.sin_material');
    tablero.appendChild(vacio);
    return;
  }

  reiniciar();
}

function desmontar() {
  if (estado && estado.timeoutId) clearTimeout(estado.timeoutId);
  estado = null;
}

export default {
  id: 'memoria',
  nombre: 'Memoria',
  icono: '🧠',
  estante: 'JUEGOS',
  montar,
  desmontar,
  // Ver core/js/rutas.js (esPartidaPerfecta) y core/js/appLoader.js
  // (modo ruta): voltear dos cartas que no son pareja es parte normal
  // e inevitable de Memoria, no un error que deba bloquear el
  // progreso de una ruta (sería casi imposible no fallar nunca).
  // Dentro de una ruta, basta con completar todas las parejas —que es,
  // además, la única forma de llegar a la pantalla de recompensa— para
  // desbloquear el siguiente paso, sin exigir cero fallos.
  rutaPerfectoSinFallos: false
};
