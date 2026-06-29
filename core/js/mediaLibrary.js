// Pictosfera — núcleo: biblioteca de medios ("el pozo").
//
// Una única biblioteca común a todas las apps. Cada medio tiene la
// forma {imagen, nombre, etiquetas, origen}. El origen es "arasaac"
// (pictograma de la API) o "foto" (foto local del adulto, con
// categoría obligatoria). Las apps nunca tocan IndexedDB directamente:
// pasan siempre por aquí.

import * as db from './db.js';
import { searchPictograms, toMedium, getPictogramById } from './arasaac.js';

const photoUrlCache = new Map();

function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `m${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function listAll() {
  return db.getAllMedios();
}

/** Medios que tengan AL MENOS una de las etiquetas pedidas. */
export async function listByTags(tags) {
  if (!tags || tags.length === 0) return listAll();
  const wanted = new Set(tags.map((t) => t.toLowerCase()));
  const all = await db.getAllMedios();
  return all.filter((m) => (m.etiquetas || []).some((e) => wanted.has(String(e).toLowerCase())));
}

export async function getById(id) {
  return db.getMedioById(id);
}

export async function removeMedio(id) {
  const medio = await db.getMedioById(id);
  if (medio && photoUrlCache.has(id)) {
    URL.revokeObjectURL(photoUrlCache.get(id));
    photoUrlCache.delete(id);
  }
  return db.deleteMedio(id);
}

/** Añade un pictograma de ARASAAC al pozo (idempotente: si ya existe, lo actualiza). */
export async function addArasaacMedio(pictoOrMedio) {
  const medio = pictoOrMedio.origen === 'arasaac' ? pictoOrMedio : toMedium(pictoOrMedio);
  const completo = { ...medio, creado: medio.creado || new Date().toISOString() };
  await db.putMedio(completo);
  return completo;
}

/**
 * Añade una foto local. La categoría/etiqueta es obligatoria (se exige
 * en la pantalla "Pictogramas", no aquí, pero esta función también la
 * valida para que nunca quede un medio sin etiquetar).
 */
export async function addFotoLocal({ archivo, nombre, etiquetas }) {
  if (!archivo) throw new Error('Falta el archivo de la foto.');
  if (!nombre || !nombre.trim()) throw new Error('Falta el nombre de la foto.');
  if (!etiquetas || etiquetas.length === 0) {
    throw new Error('Una foto local necesita al menos una categoría.');
  }
  const medio = {
    id: `foto:${uid()}`,
    origen: 'foto',
    nombre: nombre.trim(),
    etiquetas: etiquetas.map((e) => String(e).toLowerCase()),
    archivo,
    creado: new Date().toISOString()
  };
  await db.putMedio(medio);
  return medio;
}

export async function actualizarMedio(id, cambios) {
  const actual = await db.getMedioById(id);
  if (!actual) throw new Error('Ese medio no existe.');
  const actualizado = { ...actual, ...cambios };
  await db.putMedio(actualizado);
  return actualizado;
}

/** URL para pintar un <img>: directa si es ARASAAC, o Blob URL cacheada si es foto local. */
export function getDisplayUrl(medio) {
  if (!medio) return '';
  if (medio.origen === 'arasaac') return medio.imagen;
  if (medio.origen === 'foto' && medio.archivo) {
    if (!photoUrlCache.has(medio.id)) {
      photoUrlCache.set(medio.id, URL.createObjectURL(medio.archivo));
    }
    return photoUrlCache.get(medio.id);
  }
  return '';
}

/**
 * Siembra el pozo con material de ARASAAC para un conjunto de palabras,
 * solo si todavía no hay suficientes medios con esa etiqueta. La usan
 * las apps para tener material de partida sin que el adulto tenga que
 * ir a buscar pictogramas a mano antes de poder jugar.
 *
 * `lang` es el idioma en el que están escritas las palabras de
 * búsqueda (`terms`): normalmente castellano, porque así están
 * escritas en data/apps.json. `displayLang` es el idioma que el
 * adulto tiene activo de verdad en el portal en este momento: si es
 * distinto de `lang`, en cuanto se encuentra el pictograma se le
 * vuelve a pedir a ARASAAC su palabra en `displayLang`, para que el
 * material de partida no quede "atrapado" en castellano cuando el
 * portal arranca por primera vez en otro idioma.
 */
export async function ensureSeedFromArasaac({ tag, terms, lang = 'es', displayLang = lang, min = 6 }) {
  const existentes = await listByTags([tag]);
  if (existentes.length >= min) return existentes;

  const encontrados = [];
  const vistos = new Set(existentes.map((m) => m.id));
  for (const termino of terms) {
    if (encontrados.length + existentes.length >= min) break;
    try {
      // eslint-disable-next-line no-await-in-loop
      const resultados = await searchPictograms(termino, lang);
      const primero = resultados[0];
      if (primero && !vistos.has(primero.id)) {
        vistos.add(primero.id);
        encontrados.push(primero);
      }
    } catch (err) {
      console.warn(`[mediaLibrary] No se pudo sembrar "${termino}" desde ARASAAC:`, err);
    }
  }
  if (encontrados.length) {
    let conTraduccion = encontrados;
    if (displayLang !== lang) {
      conTraduccion = [];
      for (const medio of encontrados) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const traducido = await getPictogramById(medio.arasaacId, displayLang);
          conTraduccion.push(traducido.nombre ? { ...medio, nombre: traducido.nombre } : medio);
        } catch (err) {
          console.warn(`[mediaLibrary] No se pudo traducir "${medio.id}" a "${displayLang}":`, err);
          conTraduccion.push(medio);
        }
      }
    }
    const conEtiqueta = conTraduccion.map((m) => ({
      ...m,
      etiquetas: Array.from(new Set([...(m.etiquetas || []), tag])),
      creado: new Date().toISOString()
    }));
    await db.putManyMedios(conEtiqueta);
    return [...existentes, ...conEtiqueta];
  }
  return existentes;
}

/** Medios ya guardados que vienen de ARASAAC y por tanto se pueden
 *  volver a "retraducir" pidiendo de nuevo su palabra por id. Las
 *  fotos propias no tienen `arasaacId` y se dejan tal cual: su nombre
 *  lo puso el adulto a mano, no depende del idioma del portal.
 *  Lógica pura (sin red ni IndexedDB) para poder probarla aparte. */
export function mediosArasaacParaRetraducir(medios) {
  return (medios || []).filter((m) => m && m.origen === 'arasaac' && m.arasaacId);
}

/**
 * Vuelve a pedir a ARASAAC, en el idioma indicado, la palabra de cada
 * pictograma de la biblioteca que venga de ARASAAC. Así, cuando el
 * adulto cambia el idioma del portal, los pictogramas que ya estaban
 * guardados (en el pozo o ya usados en algún juego) también cambian
 * de palabra, hasta donde ARASAAC tenga esa traducción: si no la
 * tiene para algún pictograma concreto, ese se queda con el nombre
 * que ya tenía en vez de quedarse vacío.
 */
export async function actualizarIdiomaArasaac(lang) {
  const medios = await listAll();
  const candidatos = mediosArasaacParaRetraducir(medios);
  for (const medio of candidatos) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const traducido = await getPictogramById(medio.arasaacId, lang);
      if (traducido.nombre && traducido.nombre !== medio.nombre) {
        // eslint-disable-next-line no-await-in-loop
        await db.putMedio({ ...medio, nombre: traducido.nombre });
      }
    } catch (err) {
      console.warn(`[mediaLibrary] No se pudo actualizar el nombre de "${medio.id}" a "${lang}":`, err);
    }
  }
}

/**
 * Asegura que un pictograma "fijo" (un id de ARASAAC concreto, no una
 * búsqueda por palabra) está en el pozo, y lo devuelve. Lo usan
 * mecánicas que necesitan SIEMPRE el mismo pictograma de apoyo en el
 * mismo sitio de la pantalla (p.ej. el plato y el cubo de basura de
 * "Me gusta / no me gusta con comidas", o el carrito de "Lista de la
 * compra"): a diferencia de `ensureSeedFromArasaac` (que siembra VARIOS
 * pictogramas a partir de palabras de búsqueda y un mínimo), aquí el
 * id ya se conoce de antemano, así que basta con comprobar si ya está
 * guardado y, si no, pedirlo una vez por id (ver getPictogramById) y
 * añadirlo. Una vez guardado, `actualizarIdiomaArasaac` ya se encarga
 * de mantenerlo traducido cuando el adulto cambia el idioma del
 * portal, igual que con cualquier otro pictograma de ARASAAC.
 */
export async function ensureFixedArasaac(arasaacId, lang = 'es') {
  const id = `arasaac:${arasaacId}`;
  const existente = await getById(id);
  if (existente) return existente;
  const medio = await getPictogramById(arasaacId, lang);
  return addArasaacMedio(medio);
}

/** Lógica pura: dada la lista de etiquetas permitidas, calcula las
 *  etiquetas "limpias" de un medio de ARASAAC, quitando cualquiera que
 *  no esté en esa lista. Existe para deshacer una contaminación
 *  histórica: antes del arreglo de arasaac.js (toMedium ya no guarda
 *  las categorías en inglés que la API devuelve siempre), algunos
 *  pictogramas ya guardados en el pozo se quedaron con esas etiquetas
 *  en inglés. Ese arreglo evita que se vuelva a guardar contaminación
 *  nueva, pero no limpia la que ya estaba guardada: de eso se encarga
 *  esta función, junto con limpiarEtiquetasArasaac() más abajo. Las
 *  fotos propias nunca pasan por aquí: su categoría la elige el adulto
 *  a mano (incluida cualquier categoría escrita en "otra") y se
 *  respeta tal cual, esté o no en la lista curada. */
export function etiquetasArasaacLimpias(medio, permitidas) {
  if (!medio || medio.origen !== 'arasaac') return medio ? (medio.etiquetas || []) : [];
  const permitidasSet = new Set(permitidas || []);
  return (medio.etiquetas || []).filter((e) => permitidasSet.has(e));
}

/** Recorre la biblioteca y, para cada medio de ARASAAC, deja solo las
 *  etiquetas permitidas (ver etiquetasArasaacLimpias). Solo escribe en
 *  IndexedDB los medios que de verdad cambian. Es seguro llamarla cada
 *  vez que se abre "Mi biblioteca": en cuanto no quede contaminación
 *  histórica, no encuentra nada que cambiar y no hace ninguna
 *  escritura nueva. */
export async function limpiarEtiquetasArasaac(permitidas) {
  const medios = await listAll();
  const afectados = [];
  for (const medio of medios) {
    if (medio.origen !== 'arasaac') continue;
    const limpias = etiquetasArasaacLimpias(medio, permitidas);
    const actuales = medio.etiquetas || [];
    if (limpias.length !== actuales.length) {
      afectados.push({ ...medio, etiquetas: limpias });
    }
  }
  if (afectados.length) await db.putManyMedios(afectados);
  return afectados.length;
}

export async function clearAll() {
  photoUrlCache.forEach((url) => URL.revokeObjectURL(url));
  photoUrlCache.clear();
  return db.clearMedios();
}

export async function replaceAll(medios) {
  await clearAll();
  if (medios.length) await db.putManyMedios(medios);
}
