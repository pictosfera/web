// Pictosfera — mecánica reutilizable: "escribe los números de una resta".
//
// Variante de completaSuma: tres partes con pictogramas del mismo medio.
// El sustraendo se muestra NORMAL; el resultado muestra R normales + M
// tachados (total = minuendo). Motor de trazo idéntico al de completaSuma.
// Ajustes reutilizados: letraPunteada y toleranciaTrazo. 10 niveles.

const ESTILOS_ID = 'completa-resta-estilos';
const MIN_MATERIAL = 1;
const NIVELES_TOTAL = 10;
const MINUENDO_MIN = 2;
const MINUENDO_MAX = 10;
const RETRASO_EVALUACION_MS = 2000;
const RETRASO_ACIERTO_MS = 700;
const RETRASO_FINAL_MS = 500;

const ANCHO_CASILLA = 150;
const ALTO_CASILLA = 110;
const GRID_X = 24;
const GRID_Y = 18;

let estado = null;

export function elegirSiguienteMedio(medios, { evitarIds = [] } = {}) {
  if (!Array.isArray(medios) || !medios.length) return null;
  const evitar = new Set(evitarIds);
  const sinUsar = medios.filter((m) => m && !evitar.has(m.id));
  const candidatos = sinUsar.length ? sinUsar : medios.filter(Boolean);
  if (!candidatos.length) return null;
  return candidatos[Math.floor(Math.random() * candidatos.length)];
}

export function operandosAleatorios(minMin = MINUENDO_MIN, minMax = MINUENDO_MAX) {
  const minuendo = minMin + Math.floor(Math.random() * (minMax - minMin + 1));
  const sustraendo = 1 + Math.floor(Math.random() * (minuendo - 1));
  return { minuendo, sustraendo, resultado: minuendo - sustraendo };
}

export function generarNivel(medios, { evitarIds = [] } = {}) {
  const medio = elegirSiguienteMedio(medios, { evitarIds });
  if (!medio) return null;
  const { minuendo, sustraendo, resultado } = operandosAleatorios();
  return { medio, minuendo, sustraendo, resultado };
}

export function dilatarMascara(mascara, ancho, alto, radio) {
  if (!radio) return mascara.slice();
  const resultado = new Array(ancho * alto).fill(0);
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      if (!mascara[y * ancho + x]) continue;
      for (let dy = -radio; dy <= radio; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= alto) continue;
        for (let dx = -radio; dx <= radio; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= ancho) continue;
          resultado[ny * ancho + nx] = 1;
        }
      }
    }
  }
  return resultado;
}

export function contarPixeles(mascara) {
  return mascara.reduce((total, valor) => total + (valor ? 1 : 0), 0);
}

export function proporcionDentro(mascaraA, mascaraB) {
  let totalA = 0;
  let dentro = 0;
  for (let i = 0; i < mascaraA.length; i++) {
    if (!mascaraA[i]) continue;
    totalA++;
    if (mascaraB[i]) dentro++;
  }
  return totalA ? dentro / totalA : 0;
}

export function indicesPorZona(ancho, alto, divisiones) {
  const zonas = Array.from({ length: divisiones * divisiones }, () => []);
  for (let y = 0; y < alto; y++) {
    const zy = Math.min(divisiones - 1, Math.floor((y / alto) * divisiones));
    for (let x = 0; x < ancho; x++) {
      const zx = Math.min(divisiones - 1, Math.floor((x / ancho) * divisiones));
      zonas[zy * divisiones + zx].push(y * ancho + x);
    }
  }
  return zonas;
}

export function cubreTodasLasZonas(mascaraReferencia, mascaraTrazo, zonas, minPixelesZona) {
  return zonas.every((indices) => {
    const tintaReferencia = indices.reduce((total, i) => total + (mascaraReferencia[i] ? 1 : 0), 0);
    if (tintaReferencia < minPixelesZona) return true;
    return indices.some((i) => mascaraTrazo[i]);
  });
}

export const NIVELES_TRAZO = {
  facil:   { radio: 3, minCobertura: 0.3, maxDesvio: 0.6,  minPixelesTrazo: 3, minRatioTrazo: 0.75, divisionesZona: 2, minPixelesZona: 4 },
  normal:  { radio: 2, minCobertura: 0.5, maxDesvio: 0.4,  minPixelesTrazo: 5, minRatioTrazo: 0.9,  divisionesZona: 3, minPixelesZona: 3 },
  dificil: { radio: 1, minCobertura: 0.7, maxDesvio: 0.25, minPixelesTrazo: 6, minRatioTrazo: 1,    divisionesZona: 4, minPixelesZona: 2 }
};

export function configTolerancia(nivel) {
  return NIVELES_TRAZO[nivel] || NIVELES_TRAZO.facil;
}

export function evaluarTrazo({ mascaraReferencia, mascaraTrazo, ancho, alto }, nivel = 'facil') {
  const cfg = configTolerancia(nivel);
  const totalTrazo = contarPixeles(mascaraTrazo);
  if (totalTrazo < cfg.minPixelesTrazo) return { correcto: false, cobertura: 0, desvio: 1 };
  const totalReferencia = contarPixeles(mascaraReferencia);
  if (totalReferencia > 0 && totalTrazo < totalReferencia * cfg.minRatioTrazo) return { correcto: false, cobertura: 0, desvio: 1 };
  const trazoDilatado = dilatarMascara(mascaraTrazo, ancho, alto, cfg.radio);
  const referenciaDilatada = dilatarMascara(mascaraReferencia, ancho, alto, cfg.radio);
  const cobertura = proporcionDentro(mascaraReferencia, trazoDilatado);
  const desvio = 1 - proporcionDentro(mascaraTrazo, referenciaDilatada);
  const zonas = indicesPorZona(ancho, alto, cfg.divisionesZona);
  const zonasCubiertas = cubreTodasLasZonas(mascaraReferencia, trazoDilatado, zonas, cfg.minPixelesZona);
  return { correcto: cobertura >= cfg.minCobertura && desvio <= cfg.maxDesvio && zonasCubiertas, cobertura, desvio, zonasCubiertas };
}

function inyectarEstilosUnaVez() {
  if (document.getElementById(ESTILOS_ID)) return;
  const link = document.createElement('link');
  link.id = ESTILOS_ID;
  link.rel = 'stylesheet';
  link.href = new URL('completaResta.css', import.meta.url).href;
  document.head.appendChild(link);
}

function mostrarSinMaterial(zona, plataforma) {
  zona.innerHTML = '';
  const vacio = document.createElement('p');
  vacio.className = 'vacio';
  vacio.textContent = plataforma.t('juegos.sin_material');
  zona.appendChild(vacio);
}

function colorToken(nombre) {
  try { return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim() || '#333'; } catch { return '#333'; }
}

function crearMascaraReferencia(texto) {
  const lienzo = document.createElement('canvas');
  lienzo.width = ANCHO_CASILLA;
  lienzo.height = ALTO_CASILLA;
  const ctx = lienzo.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let tamanoFuente = Math.round(ALTO_CASILLA * 0.72);
  ctx.font = `bold ${tamanoFuente}px sans-serif`;
  const anchoMaximo = ANCHO_CASILLA * 0.82;
  while (ctx.measureText(texto).width > anchoMaximo && tamanoFuente > 10) {
    tamanoFuente -= 2;
    ctx.font = `bold ${tamanoFuente}px sans-serif`;
  }
  ctx.fillText(texto, ANCHO_CASILLA / 2, ALTO_CASILLA / 2 + ALTO_CASILLA * 0.04);
  const datos = ctx.getImageData(0, 0, ANCHO_CASILLA, ALTO_CASILLA).data;
  const mascara = new Array(GRID_X * GRID_Y).fill(0);
  const pasoX = ANCHO_CASILLA / GRID_X;
  const pasoY = ALTO_CASILLA / GRID_Y;
  for (let gy = 0; gy < GRID_Y; gy++) {
    for (let gx = 0; gx < GRID_X; gx++) {
      const px = Math.min(ANCHO_CASILLA - 1, Math.floor((gx + 0.5) * pasoX));
      const py = Math.min(ALTO_CASILLA - 1, Math.floor((gy + 0.5) * pasoY));
      mascara[gy * GRID_X + gx] = datos[(py * ANCHO_CASILLA + px) * 4 + 3] > 100 ? 1 : 0;
    }
  }
  return mascara;
}

function dibujarPistaPunteada(casilla) {
  const { ctx } = casilla;
  ctx.save();
  ctx.strokeStyle = colorToken('--color-border');
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 5]);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${casilla.tamanoFuente}px sans-serif`;
  ctx.strokeText(casilla.texto, ANCHO_CASILLA / 2, ALTO_CASILLA / 2 + ALTO_CASILLA * 0.04);
  ctx.restore();
}

function limpiarCasilla(casilla) {
  casilla.ctx.clearRect(0, 0, ANCHO_CASILLA, ALTO_CASILLA);
  casilla.mascaraTrazo = new Array(GRID_X * GRID_Y).fill(0);
  if (estado.ajustesPista.letraPunteada) dibujarPistaPunteada(casilla);
}

function puntoDesdeEvento(casilla, ev) {
  const rect = casilla.canvas.getBoundingClientRect();
  const escalaX = rect.width ? casilla.canvas.width / rect.width : 1;
  const escalaY = rect.height ? casilla.canvas.height / rect.height : 1;
  return {
    x: Math.min(ANCHO_CASILLA - 1, Math.max(0, (ev.clientX - rect.left) * escalaX)),
    y: Math.min(ALTO_CASILLA - 1, Math.max(0, (ev.clientY - rect.top) * escalaY))
  };
}

function marcarPuntoEnMascara(casilla, x, y) {
  const gx = Math.min(GRID_X - 1, Math.max(0, Math.floor((x / ANCHO_CASILLA) * GRID_X)));
  const gy = Math.min(GRID_Y - 1, Math.max(0, Math.floor((y / ALTO_CASILLA) * GRID_Y)));
  for (let dy = -1; dy <= 1; dy++) {
    const ny = gy + dy;
    if (ny < 0 || ny >= GRID_Y) continue;
    for (let dx = -1; dx <= 1; dx++) {
      const nx = gx + dx;
      if (nx < 0 || nx >= GRID_X) continue;
      casilla.mascaraTrazo[ny * GRID_X + nx] = 1;
    }
  }
}

function marcarSegmentoEnMascara(casilla, p0, p1) {
  const distancia = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  const pasoMedio = (ANCHO_CASILLA / GRID_X + ALTO_CASILLA / GRID_Y) / 4;
  const pasos = Math.max(1, Math.ceil(distancia / Math.max(1, pasoMedio)));
  for (let i = 0; i <= pasos; i++) {
    marcarPuntoEnMascara(casilla,
      p0.x + (p1.x - p0.x) * (i / pasos),
      p0.y + (p1.y - p0.y) * (i / pasos));
  }
}

function dibujarSegmentoVisual(casilla, p0, p1) {
  const { ctx } = casilla;
  ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = colorToken('--color-primary-dark');
  ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
}

function dibujarPuntoVisual(casilla, p) {
  const { ctx } = casilla;
  ctx.fillStyle = colorToken('--color-primary-dark');
  ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
}

function pintarEstadoCasilla(casilla) {
  const { plataforma } = estado;
  const { envoltorio, canvas } = casilla;
  envoltorio.classList.remove('completaresta-casilla-correcta');
  if (casilla.resuelta) {
    envoltorio.classList.add('completaresta-casilla-correcta');
    canvas.setAttribute('aria-label', plataforma.t('completaResta.casilla_correcta'));
  } else {
    canvas.setAttribute('aria-label', plataforma.t('completaResta.casilla_vacia'));
  }
}

function comprobarEjercicioCompleto() {
  if (!estado.casillas.every((c) => c.resuelta)) return;
  if (estado.nivelActual >= NIVELES_TOTAL) {
    estado.timeoutId = setTimeout(() => {
      if (!estado) return;
      estado.plataforma.mostrarRecompensa({ onContinuar: iniciarPartida });
    }, RETRASO_FINAL_MS);
  } else {
    estado.timeoutId = setTimeout(() => {
      if (!estado) return;
      siguienteNivel();
    }, RETRASO_ACIERTO_MS);
  }
}

function evaluarCasilla(casilla) {
  if (!estado) return;
  casilla.timeoutEvaluacion = null;
  const resultado = evaluarTrazo(
    { mascaraReferencia: casilla.mascaraReferencia, mascaraTrazo: casilla.mascaraTrazo, ancho: GRID_X, alto: GRID_Y },
    estado.ajustesPista.toleranciaTrazo
  );
  if (resultado.correcto) {
    estado.plataforma.sounds.acierto();
    estado.plataforma.tts.speak(casilla.texto);
    casilla.resuelta = true;
    pintarEstadoCasilla(casilla);
    comprobarEjercicioCompleto();
  } else {
    estado.plataforma.sounds.fallo();
    casilla.envoltorio.classList.add('completaresta-casilla-fallo');
    limpiarCasilla(casilla);
    setTimeout(() => {
      if (casilla && casilla.envoltorio) casilla.envoltorio.classList.remove('completaresta-casilla-fallo');
    }, 400);
  }
}

function registrarEventosCasilla(casilla) {
  const { canvas } = casilla;
  canvas.addEventListener('pointerdown', (ev) => {
    if (!estado || casilla.resuelta) return;
    ev.preventDefault();
    try { canvas.setPointerCapture(ev.pointerId); } catch {}
    if (casilla.timeoutEvaluacion) { clearTimeout(casilla.timeoutEvaluacion); casilla.timeoutEvaluacion = null; }
    casilla.trazando = true;
    casilla.ultimoPunto = puntoDesdeEvento(casilla, ev);
    marcarPuntoEnMascara(casilla, casilla.ultimoPunto.x, casilla.ultimoPunto.y);
    dibujarPuntoVisual(casilla, casilla.ultimoPunto);
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!casilla.trazando) return;
    ev.preventDefault();
    const punto = puntoDesdeEvento(casilla, ev);
    dibujarSegmentoVisual(casilla, casilla.ultimoPunto, punto);
    marcarSegmentoEnMascara(casilla, casilla.ultimoPunto, punto);
    casilla.ultimoPunto = punto;
  });
  const terminarTrazo = () => {
    if (!casilla.trazando) return;
    casilla.trazando = false;
    casilla.timeoutEvaluacion = setTimeout(() => evaluarCasilla(casilla), RETRASO_EVALUACION_MS);
  };
  canvas.addEventListener('pointerup', terminarTrazo);
  canvas.addEventListener('pointercancel', terminarTrazo);
}

function crearCasilla(texto, mostrarPunteada) {
  const envoltorio = document.createElement('div');
  envoltorio.className = 'completaresta-casilla';
  const canvas = document.createElement('canvas');
  canvas.className = 'completaresta-casilla-lienzo';
  canvas.width = ANCHO_CASILLA; canvas.height = ALTO_CASILLA;
  canvas.style.touchAction = 'none';
  envoltorio.appendChild(canvas);
  let tamanoFuente = Math.round(ALTO_CASILLA * 0.72);
  const ctxMedida = canvas.getContext('2d');
  ctxMedida.font = `bold ${tamanoFuente}px sans-serif`;
  const anchoMaximo = ANCHO_CASILLA * 0.82;
  while (ctxMedida.measureText(texto).width > anchoMaximo && tamanoFuente > 10) {
    tamanoFuente -= 2;
    ctxMedida.font = `bold ${tamanoFuente}px sans-serif`;
  }
  const casilla = {
    texto, tamanoFuente, envoltorio, canvas,
    ctx: canvas.getContext('2d'),
    mascaraReferencia: crearMascaraReferencia(texto),
    mascaraTrazo: new Array(GRID_X * GRID_Y).fill(0),
    trazando: false, ultimoPunto: null, timeoutEvaluacion: null, resuelta: false
  };
  if (mostrarPunteada) dibujarPistaPunteada(casilla);
  registrarEventosCasilla(casilla);
  return casilla;
}

function crearParte(medio, cantidad, texto, ajustesPista, plataforma) {
  const parte = document.createElement('div');
  parte.className = 'completaresta-parte';
  const grupo = document.createElement('div');
  grupo.className = 'completaresta-grupo';
  for (let i = 0; i < cantidad; i++) {
    const img = document.createElement('img');
    img.className = 'completaresta-grupo-img';
    img.src = plataforma.getDisplayUrl(medio);
    img.alt = medio.nombre;
    grupo.appendChild(img);
  }
  const casilla = crearCasilla(texto, ajustesPista.letraPunteada);
  parte.append(grupo, casilla.envoltorio);
  return { parte, casilla };
}

function crearParteResultado(medio, resultado, sustraendo, texto, ajustesPista, plataforma) {
  const parte = document.createElement('div');
  parte.className = 'completaresta-parte';
  const grupo = document.createElement('div');
  grupo.className = 'completaresta-grupo';
  for (let i = 0; i < resultado; i++) {
    const img = document.createElement('img');
    img.className = 'completaresta-grupo-img';
    img.src = plataforma.getDisplayUrl(medio);
    img.alt = medio.nombre;
    grupo.appendChild(img);
  }
  for (let i = 0; i < sustraendo; i++) {
    const envoltorio = document.createElement('div');
    envoltorio.className = 'completaresta-tachado';
    const img = document.createElement('img');
    img.className = 'completaresta-grupo-img';
    img.src = plataforma.getDisplayUrl(medio);
    img.alt = medio.nombre;
    const cruz = document.createElement('div');
    cruz.className = 'completaresta-x';
    cruz.setAttribute('aria-hidden', 'true');
    envoltorio.append(img, cruz);
    grupo.appendChild(envoltorio);
  }
  const casilla = crearCasilla(texto, ajustesPista.letraPunteada);
  parte.append(grupo, casilla.envoltorio);
  return { parte, casilla };
}

function pintarNivel() {
  const { raiz, plataforma, medioActual, minuendo, sustraendo, resultado, ajustesPista } = estado;
  raiz.querySelector('.completaresta-nivel').textContent = plataforma.t('completaResta.nivel', {
    n: estado.nivelActual, total: NIVELES_TOTAL
  });
  const zona = raiz.querySelector('.completaresta-zona');
  zona.innerHTML = '';
  const operacion = document.createElement('div');
  operacion.className = 'completaresta-operacion';
  const parte1 = crearParte(medioActual, minuendo, String(minuendo), ajustesPista, plataforma);
  const menos = document.createElement('span');
  menos.className = 'completaresta-signo';
  menos.textContent = '−';
  const parte2 = crearParte(medioActual, sustraendo, String(sustraendo), ajustesPista, plataforma);
  const igual = document.createElement('span');
  igual.className = 'completaresta-signo';
  igual.textContent = '=';
  const parte3 = crearParteResultado(medioActual, resultado, sustraendo, String(resultado), ajustesPista, plataforma);
  operacion.append(parte1.parte, menos, parte2.parte, igual, parte3.parte);
  zona.appendChild(operacion);
  estado.casillas = [parte1.casilla, parte2.casilla, parte3.casilla];
  estado.casillas.forEach((casilla) => pintarEstadoCasilla(casilla));
}

function siguienteNivel() {
  if (!estado) return;
  estado.casillas.forEach((casilla) => {
    if (casilla.timeoutEvaluacion) clearTimeout(casilla.timeoutEvaluacion);
  });
  estado.nivelActual += 1;
  const nivel = generarNivel(estado.plataforma.medios, { evitarIds: estado.usados });
  if (!nivel) {
    mostrarSinMaterial(estado.raiz.querySelector('.completaresta-zona'), estado.plataforma);
    return;
  }
  estado.usados.push(nivel.medio.id);
  estado.medioActual = nivel.medio;
  estado.minuendo = nivel.minuendo;
  estado.sustraendo = nivel.sustraendo;
  estado.resultado = nivel.resultado;
  pintarNivel();
}

function iniciarPartida() {
  if (!estado) return;
  estado.nivelActual = 0;
  estado.usados = [];
  siguienteNivel();
}

function montar(contenedor, plataforma) {
  inyectarEstilosUnaVez();
  contenedor.innerHTML = '';
  const raiz = document.createElement('div');
  raiz.className = 'completaresta-app';
  const cabecera = document.createElement('header');
  cabecera.className = 'completaresta-cabecera';
  const titulo = document.createElement('h1');
  titulo.textContent = `${plataforma.icono || ''} ${plataforma.nombre}`.trim();
  const instrucciones = document.createElement('p');
  instrucciones.textContent = plataforma.t('completaResta.instrucciones');
  cabecera.append(titulo, instrucciones);
  const marcador = document.createElement('div');
  marcador.className = 'completaresta-marcador';
  const nivelEl = document.createElement('span');
  nivelEl.className = 'completaresta-nivel';
  marcador.appendChild(nivelEl);
  const zona = document.createElement('div');
  zona.className = 'completaresta-zona';
  raiz.append(cabecera, marcador, zona);
  contenedor.appendChild(raiz);
  estado = {
    contenedor, plataforma, raiz,
    nivelActual: 0, usados: [], medioActual: null,
    minuendo: 0, sustraendo: 0, resultado: 0,
    casillas: [], timeoutId: null,
    ajustesPista: plataforma.ajustesPista || { letraPunteada: true, toleranciaTrazo: 'facil' }
  };
  if (!plataforma.medios || plataforma.medios.length < MIN_MATERIAL) {
    mostrarSinMaterial(zona, plataforma);
    return;
  }
  iniciarPartida();
}

function desmontar() {
  if (!estado) return;
  if (estado.timeoutId) clearTimeout(estado.timeoutId);
  estado.casillas.forEach((casilla) => {
    if (casilla.timeoutEvaluacion) clearTimeout(casilla.timeoutEvaluacion);
  });
  estado = null;
}

export default {
  id: 'completa-resta',
  nombre: 'Escribe los números de la resta',
  icono: '✏️',
  estante: 'NUMEROS',
  montar,
  desmontar
};
