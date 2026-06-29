// Pictosfera — núcleo: biblioteca de secuencias.
//
// Una secuencia es una lista ORDENADA de pasos: cada paso es el id de
// un medio que ya existe en el pozo (ver mediaLibrary.js). Sirve para
// que el adulto describa una rutina real (p.ej. "lavarse los dientes")
// como una sucesión de pictogramas en el orden correcto. La usan
// mecánicas como "Ordena la secuencia" (apps/ordena-secuencia).
//
// Igual que mediaLibrary.js, este módulo es la capa de negocio: las
// apps y las vistas nunca hablan con db.js directamente.

import * as db from './db.js';

function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `seq${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Con menos de 2 pasos no hay nada que ordenar: cualquier colocación
 *  sería "correcta" por definición. */
export const MIN_PASOS = 2;

/** Valida la forma de una secuencia antes de guardarla. Lógica pura,
 *  fácil de probar sin tocar IndexedDB. */
export function validarSecuencia({ nombre, pasos } = {}) {
  if (!nombre || !String(nombre).trim()) {
    return { ok: false, error: 'falta-nombre' };
  }
  if (!Array.isArray(pasos) || pasos.length < MIN_PASOS) {
    return { ok: false, error: 'pasos-insuficientes' };
  }
  if (pasos.some((p) => !p)) {
    return { ok: false, error: 'paso-invalido' };
  }
  return { ok: true };
}

export async function listAll() {
  return db.getAllSecuencias();
}

export async function getById(id) {
  return db.getSecuenciaById(id);
}

/** Crea una secuencia nueva a partir de un nombre y una lista ordenada
 *  de ids de medio (en el orden correcto). */
export async function crearSecuencia({ nombre, pasos }) {
  const validacion = validarSecuencia({ nombre, pasos });
  if (!validacion.ok) throw new Error(validacion.error);
  const secuencia = {
    id: `seq:${uid()}`,
    nombre: nombre.trim(),
    pasos: [...pasos],
    creado: new Date().toISOString()
  };
  await db.putSecuencia(secuencia);
  return secuencia;
}

export async function actualizarSecuencia(id, cambios) {
  const actual = await db.getSecuenciaById(id);
  if (!actual) throw new Error('esa-secuencia-no-existe');
  const actualizada = { ...actual, ...cambios };
  const validacion = validarSecuencia(actualizada);
  if (!validacion.ok) throw new Error(validacion.error);
  await db.putSecuencia(actualizada);
  return actualizada;
}

export async function eliminarSecuencia(id) {
  return db.deleteSecuencia(id);
}

/**
 * Resuelve los pasos (ids de medio) de una secuencia contra la
 * biblioteca de medios, para obtener los medios completos (imagen,
 * nombre...) en el orden correcto. Si CUALQUIER paso referencia un
 * medio que ya no existe (p.ej. el adulto lo borró del pozo después de
 * usarlo en la secuencia), devuelve null: un paso roto dejaría un
 * ejercicio sin sentido, así que la secuencia entera se descarta de la
 * lista jugable (ver secuenciasJugables). Lógica pura.
 */
export function resolverPasos(secuencia, medios) {
  if (!secuencia || !Array.isArray(secuencia.pasos)) return null;
  const porId = new Map((medios || []).filter(Boolean).map((m) => [m.id, m]));
  const resueltos = secuencia.pasos.map((id) => porId.get(id)).filter(Boolean);
  if (resueltos.length !== secuencia.pasos.length) return null;
  return resueltos;
}

/**
 * De toda la lista de secuencias guardadas, devuelve solo las que se
 * pueden jugar de verdad ahora mismo: con TODOS sus pasos resueltos
 * contra la biblioteca de medios actual. Cada secuencia devuelta lleva
 * ya sus pasos como medios completos (no solo ids), listos para
 * pintar. Lógica pura.
 */
export function secuenciasJugables(secuencias, medios) {
  return (secuencias || [])
    .filter(Boolean)
    .map((s) => {
      const pasos = resolverPasos(s, medios);
      return pasos ? { ...s, pasos } : null;
    })
    .filter(Boolean);
}

export async function clearAll() {
  return db.clearSecuencias();
}

export async function replaceAll(secuencias) {
  await clearAll();
  if (secuencias && secuencias.length) await db.putManySecuencias(secuencias);
}
