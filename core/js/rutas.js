// Pictosfera — núcleo: rutas de aprendizaje (itinerarios guiados).
//
// Una ruta es una lista ORDENADA de "pasos": cada paso es una
// instancia de un juego (su appId) con su PROPIA configuración,
// completamente independiente de la configuración directa de ese
// mismo juego en el menú JUEGOS, e independiente también de la
// configuración de cualquier otro paso (incluso si es el mismo juego
// repetido varias veces en la misma ruta). Por eso un paso no guarda
// una referencia a ajustesJuego.js/localStorage: guarda su config como
// un objeto plano, propio, capturado en el momento de añadirlo o
// editarlo (ver core/js/ajustesCatalogo.js para el catálogo de campos
// posibles, y core/js/views/rutasCrear.js para la pantalla que los
// edita).
//
// El progreso de una ruta es secuencial y bloqueado: el niño solo
// puede jugar el primer paso no superado todavía; los siguientes se ven
// en gris hasta que el paso anterior se termina con "puntuación
// perfecta" (por defecto, sin ningún fallo; ver esPartidaPerfecta() más
// abajo para la excepción de las mecánicas donde fallar es parte
// normal del juego, como Memoria). Ver appLoader.js (modo ruta) para
// cómo se detecta esa puntuación perfecta sin tocar ninguna mecánica.
//
// Igual que mediaLibrary.js/secuencias.js, este módulo es la capa de
// negocio: las vistas nunca hablan con db.js directamente.

import * as db from './db.js';

function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `ruta${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Una ruta vacía no tiene sentido: hace falta al menos un paso. */
export const MIN_PASOS = 1;

function progresoInicial() {
  return { desbloqueadoHasta: 0 };
}

/** Construye un paso nuevo (instancia de un juego dentro de una ruta)
 *  con un id de instancia propio. Lógica pura. */
export function crearPaso(appId, config = {}) {
  return { instanciaId: uid(), appId, config: { ...(config || {}) } };
}

function normalizarPasos(pasos) {
  return (pasos || []).map((p) => ({
    instanciaId: p && p.instanciaId ? p.instanciaId : uid(),
    appId: p && p.appId,
    config: { ...(p && p.config ? p.config : {}) }
  }));
}

/** Valida la forma de una ruta antes de guardarla. Lógica pura, fácil
 *  de probar sin tocar IndexedDB. */
export function validarRuta({ nombre, pasos } = {}) {
  if (!nombre || !String(nombre).trim()) {
    return { ok: false, error: 'falta-nombre' };
  }
  if (!Array.isArray(pasos) || pasos.length < MIN_PASOS) {
    return { ok: false, error: 'pasos-insuficientes' };
  }
  if (pasos.some((p) => !p || !p.appId)) {
    return { ok: false, error: 'paso-invalido' };
  }
  return { ok: true };
}

export async function listAll() {
  return db.getAllRutas();
}

export async function getById(id) {
  return db.getRutaById(id);
}

/** Crea una ruta nueva a partir de un nombre y una lista ordenada de
 *  pasos ({appId, config} cada uno; instanciaId se genera si falta). */
export async function crearRuta({ nombre, pasos }) {
  const pasosNormalizados = normalizarPasos(pasos);
  const validacion = validarRuta({ nombre, pasos: pasosNormalizados });
  if (!validacion.ok) throw new Error(validacion.error);
  const ruta = {
    id: `ruta:${uid()}`,
    nombre: nombre.trim(),
    pasos: pasosNormalizados,
    progreso: progresoInicial(),
    creado: new Date().toISOString()
  };
  await db.putRuta(ruta);
  return ruta;
}

/** Actualiza una ruta existente (nombre y/o pasos). Editar una ruta
 *  reinicia su progreso: tras cambiar de orden, quitar o añadir pasos,
 *  un índice de progreso antiguo ya no tiene por qué señalar al mismo
 *  juego, así que se empieza de nuevo desde el primer paso. */
export async function actualizarRuta(id, cambios = {}) {
  const actual = await db.getRutaById(id);
  if (!actual) throw new Error('esa-ruta-no-existe');
  const pasos = normalizarPasos(cambios.pasos || actual.pasos);
  const nombre = cambios.nombre !== undefined ? cambios.nombre : actual.nombre;
  const validacion = validarRuta({ nombre, pasos });
  if (!validacion.ok) throw new Error(validacion.error);
  const actualizada = {
    ...actual,
    nombre: nombre.trim(),
    pasos,
    progreso: progresoInicial()
  };
  await db.putRuta(actualizada);
  return actualizada;
}

export async function eliminarRuta(id) {
  return db.deleteRuta(id);
}

export async function clearAll() {
  return db.clearRutas();
}

export async function replaceAll(rutas) {
  await clearAll();
  if (rutas && rutas.length) await db.putManyRutas(rutas);
}

// --- progreso / desbloqueo secuencial ---

/** ¿Está desbloqueado (jugable) el paso en `indice` (0-based) de esta
 *  ruta? El primer paso siempre está desbloqueado. Lógica pura. */
export function pasoDesbloqueado(ruta, indice) {
  const desbloqueadoHasta = (ruta && ruta.progreso && ruta.progreso.desbloqueadoHasta) || 0;
  return indice <= desbloqueadoHasta;
}

/**
 * Progreso resultante tras terminar el paso `indice` de una ruta, dado
 * si se completó con puntuación perfecta (sin ningún fallo). Solo
 * avanza el desbloqueo si el paso terminado era justo la frontera
 * desbloqueada: terminar (con o sin fallos) un paso ya superado antes,
 * o cualquier paso que no sea el siguiente pendiente, no cambia nada.
 * Lógica pura, fácil de probar sin IndexedDB.
 */
export function siguienteProgreso(ruta, indice, fuePerfecto) {
  const actual = (ruta && ruta.progreso && ruta.progreso.desbloqueadoHasta) || 0;
  if (!fuePerfecto || indice !== actual) return { desbloqueadoHasta: actual };
  const totalPasos = ruta && Array.isArray(ruta.pasos) ? ruta.pasos.length : 1;
  const maximo = Math.max(0, totalPasos - 1);
  return { desbloqueadoHasta: Math.min(actual + 1, maximo) };
}

/**
 * ¿Cuenta como "perfecta" (a efectos de desbloquear el siguiente paso
 * de una ruta) la partida que se acaba de terminar, dado si hubo algún
 * fallo? Por defecto, perfecta significa cero fallos durante toda la
 * partida (lo habitual: cada intento equivocado cuenta).
 *
 * Algunas mecánicas no encajan con esa idea: en Memoria, voltear dos
 * cartas que no son pareja es parte normal e inevitable del juego, no
 * un error que deba bloquear el progreso (sería prácticamente
 * imposible no fallar nunca). Esas mecánicas declaran en su propio
 * módulo `rutaPerfectoSinFallos: false`, y entonces basta con terminar
 * la partida (que ya implica completarla del todo) para que cuente
 * como perfecta, sin mirar los fallos.
 *
 * Lógica pura: la usa appLoader.js (modo ruta) al envolver
 * `mostrarRecompensa`, y aquí se puede probar sin tocar el DOM.
 */
export function esPartidaPerfecta(mecanica, huboFallo) {
  const exigeSinFallos = !mecanica || mecanica.rutaPerfectoSinFallos !== false;
  return exigeSinFallos ? !huboFallo : true;
}

/** Persiste el progreso de la ruta `id` tras terminar su paso `indice`. */
export async function registrarProgreso(id, indice, fuePerfecto) {
  const ruta = await db.getRutaById(id);
  if (!ruta) throw new Error('esa-ruta-no-existe');
  const progreso = siguienteProgreso(ruta, indice, fuePerfecto);
  const actualizada = { ...ruta, progreso };
  await db.putRuta(actualizada);
  return actualizada;
}

// --- interruptor de acceso libre al menú JUEGOS ---
//
// Activado por defecto: el menú JUEGOS funciona como siempre, sin que
// exista ninguna ruta cambie nada. El adulto lo desactiva (protegido
// por PIN; el reto de PIN vive en la vista, no aquí) cuando quiere que
// el niño solo juegue a través de las rutas guiadas: con el interruptor
// desactivado, el niño puede seguir ENTRANDO al menú JUEGOS, pero todos
// los juegos se ven en gris y pulsar cualquiera le lleva a Inicio en
// vez de abrir el juego.

const CLAVE_ACCESO_LIBRE_JUEGOS = 'pictosfera.juegos.accesoLibre';

export function getAccesoLibreJuegos() {
  try {
    const valor = localStorage.getItem(CLAVE_ACCESO_LIBRE_JUEGOS);
    if (valor === null) return true;
    return valor === '1';
  } catch {
    return true;
  }
}

export function setAccesoLibreJuegos(valor) {
  try {
    localStorage.setItem(CLAVE_ACCESO_LIBRE_JUEGOS, valor ? '1' : '0');
  } catch {
    /* sin localStorage disponible: simplemente no persiste */
  }
}
