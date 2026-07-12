// Pictosfera — núcleo: cargador de contenido de la comunidad.
//
// El administrador publica un archivo "community-content.json" en el
// mismo repositorio de GitHub Pages que aloja el portal. Ese archivo
// contiene pictogramas ARASAAC, secuencias, categorías dicotómicas y
// rutas de aprendizaje curadas, listos para que cualquier usuario
// pueda importarlos de un solo toque.
//
// La operación es siempre MERGE (fusión): nunca se borra el contenido
// propio del usuario. Solo se añaden los ítems que el usuario no
// tiene todavía (comparando por ID). Las fotos propias nunca se
// publican ni se importan.
//
// Uso:
//   import { cargarContenidoComunidad } from './contentLoader.js';
//   const resultado = await cargarContenidoComunidad();
//   // resultado: { mediosNuevos, secuenciasNuevas, categoriasNuevas, rutasNuevas, error }

import * as db from './db.js';

// El archivo vive en la raíz del repositorio (misma base que el
// portal) para que la URL relativa funcione tanto en GitHub Pages
// como abriendo el portal desde el sistema de archivos local.
const CONTENT_URL = './community-content.json';

// ----------------------------------------------------------------
// Validación mínima del archivo recibido
// ----------------------------------------------------------------

function esContentValido(obj) {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.version === 'number' &&
    Array.isArray(obj.medios) &&
    Array.isArray(obj.secuencias) &&
    Array.isArray(obj.categorias) &&
    Array.isArray(obj.rutas)
  );
}

// ----------------------------------------------------------------
// Merge de cada colección
// ----------------------------------------------------------------

async function mergeMedios(medios) {
  const existentes = await db.getAllMedios();
  const idsExistentes = new Set(existentes.map((m) => m.id));
  let añadidos = 0;
  for (const medio of medios) {
    // Solo se importan pictogramas ARASAAC; las fotos propias se ignoran.
    if (!medio.id || medio.origen === 'foto') continue;
    if (!idsExistentes.has(medio.id)) {
      await db.putMedio(medio);
      añadidos++;
    }
  }
  return añadidos;
}

async function mergeSecuencias(secuencias) {
  const existentes = await db.getAllSecuencias();
  const idsExistentes = new Set(existentes.map((s) => s.id));
  let añadidas = 0;
  for (const sec of secuencias) {
    if (!sec.id) continue;
    if (!idsExistentes.has(sec.id)) {
      await db.putSecuencia(sec);
      añadidas++;
    }
  }
  return añadidas;
}

async function mergeCategorias(categorias) {
  const existentes = await db.getAllCategorias();
  const idsExistentes = new Set(existentes.map((c) => c.id));
  let añadidas = 0;
  for (const cat of categorias) {
    if (!cat.id) continue;
    if (!idsExistentes.has(cat.id)) {
      await db.putCategoria(cat);
      añadidas++;
    }
  }
  return añadidas;
}

async function mergeRutas(rutas) {
  const existentes = await db.getAllRutas();
  const idsExistentes = new Set(existentes.map((r) => r.id));
  let añadidas = 0;
  for (const ruta of rutas) {
    if (!ruta.id) continue;
    if (!idsExistentes.has(ruta.id)) {
      // Restablecer el progreso al importar: el usuario empieza desde cero.
      const rutaLimpia = { ...ruta, progreso: { desbloqueadoHasta: 0 } };
      await db.putRuta(rutaLimpia);
      añadidas++;
    }
  }
  return añadidas;
}

// ----------------------------------------------------------------
// Punto de entrada público
// ----------------------------------------------------------------

/**
 * Descarga community-content.json del mismo servidor (GitHub Pages o
 * local) y fusiona su contenido con la base de datos local del usuario.
 *
 * Devuelve un objeto con las estadísticas de la importación:
 *   { mediosNuevos, secuenciasNuevas, categoriasNuevas, rutasNuevas, error }
 * Cuando error no es null, el resto de campos vale 0.
 */
export async function cargarContenidoComunidad() {
  let content;
  try {
    const res = await fetch(CONTENT_URL, { cache: 'no-cache' });
    if (!res.ok) {
      return {
        mediosNuevos: 0, secuenciasNuevas: 0, categoriasNuevas: 0, rutasNuevas: 0,
        error: `El archivo no está disponible (HTTP ${res.status}). Asegúrate de que el administrador ha publicado el contenido.`
      };
    }
    content = await res.json();
  } catch (e) {
    return {
      mediosNuevos: 0, secuenciasNuevas: 0, categoriasNuevas: 0, rutasNuevas: 0,
      error: 'No se pudo descargar el contenido. Comprueba que estás visitando el portal desde su URL de GitHub Pages.'
    };
  }

  if (!esContentValido(content)) {
    return {
      mediosNuevos: 0, secuenciasNuevas: 0, categoriasNuevas: 0, rutasNuevas: 0,
      error: 'El archivo community-content.json no tiene el formato esperado.'
    };
  }

  try {
    const [mediosNuevos, secuenciasNuevas, categoriasNuevas, rutasNuevas] = await Promise.all([
      mergeMedios(content.medios),
      mergeSecuencias(content.secuencias),
      mergeCategorias(content.categorias),
      mergeRutas(content.rutas)
    ]);
    return { mediosNuevos, secuenciasNuevas, categoriasNuevas, rutasNuevas, error: null };
  } catch (e) {
    return {
      mediosNuevos: 0, secuenciasNuevas: 0, categoriasNuevas: 0, rutasNuevas: 0,
      error: `Error al guardar el contenido: ${e.message}`
    };
  }
}
