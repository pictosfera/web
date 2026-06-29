// Pictosfera — núcleo: biblioteca de categorías dicotómicas.
//
// Una "pareja" es un banco de DOS categorías opuestas (p.ej. "grande"
// y "pequeño", o "rojo" y "verde"): cada categoría tiene un nombre, un
// pictograma "cabecera" que la representa (no es un ejemplo más, es el
// concepto en sí) y una lista de medios del pozo que pertenecen a esa
// categoría. Sirve para que el adulto diseñe el material del minijuego
// "Clasifica los pictogramas en dos categorías" (apps/clasifica-
// categorias), que en cada partida elige al azar una pareja del banco
// (ver elegirParejaAleatoria en appLoader.js) en vez de tener un par
// fijo grabado a fuego en el código.
//
// Igual que secuencias.js, este módulo es la capa de negocio: las
// apps y las vistas nunca hablan con db.js directamente.

import * as db from './db.js';

function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `cat${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Cada categoría necesita al menos un pictograma propio: sin
 *  ninguno, esa mitad de la pareja nunca tendría nada que clasificar. */
export const MIN_MEDIOS_POR_CATEGORIA = 1;

/** Valida la forma de una categoría individual dentro de una pareja. */
function validarCategoria(categoria) {
  if (!categoria || !categoria.nombre || !String(categoria.nombre).trim()) {
    return { ok: false, error: 'falta-nombre-categoria' };
  }
  if (!categoria.cabeceraId) {
    return { ok: false, error: 'falta-cabecera' };
  }
  if (!Array.isArray(categoria.medios) || categoria.medios.length < MIN_MEDIOS_POR_CATEGORIA) {
    return { ok: false, error: 'medios-insuficientes' };
  }
  return { ok: true };
}

/** Valida la forma de una pareja completa antes de guardarla. Lógica
 *  pura, fácil de probar sin tocar IndexedDB. */
export function validarPareja({ nombre, categorias } = {}) {
  if (!nombre || !String(nombre).trim()) {
    return { ok: false, error: 'falta-nombre' };
  }
  if (!Array.isArray(categorias) || categorias.length !== 2) {
    return { ok: false, error: 'categorias-invalidas' };
  }
  for (const categoria of categorias) {
    const validacion = validarCategoria(categoria);
    if (!validacion.ok) return validacion;
  }
  return { ok: true };
}

export async function listAll() {
  return db.getAllCategorias();
}

export async function getById(id) {
  return db.getCategoriaById(id);
}

/** Crea una pareja nueva a partir de un nombre y sus dos categorías
 *  (cada una con nombre, pictograma cabecera e ids de medio del pozo). */
export async function crearPareja({ nombre, categorias }) {
  const validacion = validarPareja({ nombre, categorias });
  if (!validacion.ok) throw new Error(validacion.error);
  const pareja = {
    id: `catpar:${uid()}`,
    nombre: nombre.trim(),
    categorias: categorias.map((c) => ({
      id: c.id || `cat:${uid()}`,
      nombre: c.nombre.trim(),
      cabeceraId: c.cabeceraId,
      medios: [...c.medios]
    })),
    creado: new Date().toISOString()
  };
  await db.putCategoria(pareja);
  return pareja;
}

export async function actualizarPareja(id, cambios) {
  const actual = await db.getCategoriaById(id);
  if (!actual) throw new Error('esa-pareja-no-existe');
  const actualizada = { ...actual, ...cambios };
  const validacion = validarPareja(actualizada);
  if (!validacion.ok) throw new Error(validacion.error);
  await db.putCategoria(actualizada);
  return actualizada;
}

export async function eliminarPareja(id) {
  return db.deleteCategoria(id);
}

/**
 * Resuelve una categoría (cabeceraId + ids de medio) contra la
 * biblioteca de medios, para obtener el pictograma cabecera y los
 * medios completos (imagen, nombre...) listos para pintar. Si la
 * cabecera ya no existe en el pozo (el adulto la borró), o si no
 * queda ningún medio resoluble, devuelve null: una categoría sin
 * cabecera o sin material no se puede jugar. Los medios concretos que
 * ya no resuelven se descartan en silencio (a diferencia de las
 * secuencias, aquí el orden no importa y un pictograma menos no rompe
 * la actividad). Lógica pura.
 */
export function resolverCategoria(categoria, medios) {
  if (!categoria) return null;
  const porId = new Map((medios || []).filter(Boolean).map((m) => [m.id, m]));
  const cabecera = porId.get(categoria.cabeceraId);
  if (!cabecera) return null;
  const resueltos = (categoria.medios || []).map((id) => porId.get(id)).filter(Boolean);
  if (!resueltos.length) return null;
  return { id: categoria.id, nombre: categoria.nombre, cabecera, medios: resueltos };
}

/**
 * De todo el banco de parejas guardadas, devuelve solo las que se
 * pueden jugar de verdad ahora mismo: con SUS DOS categorías
 * resueltas contra la biblioteca de medios actual (cabecera presente
 * y al menos un medio en cada una). Cada pareja devuelta lleva ya sus
 * categorías resueltas, listas para que el minijuego elija una al
 * azar (ver elegirParejaAleatoria en appLoader.js). Lógica pura.
 */
export function parejasJugables(parejas, medios) {
  return (parejas || [])
    .filter(Boolean)
    .map((p) => {
      if (!Array.isArray(p.categorias) || p.categorias.length !== 2) return null;
      const resueltas = p.categorias.map((c) => resolverCategoria(c, medios));
      if (resueltas.some((c) => !c)) return null;
      return { id: p.id, nombre: p.nombre, categorias: resueltas };
    })
    .filter(Boolean);
}

export async function clearAll() {
  return db.clearCategorias();
}

export async function replaceAll(parejas) {
  await clearAll();
  if (parejas && parejas.length) await db.putManyCategorias(parejas);
}
