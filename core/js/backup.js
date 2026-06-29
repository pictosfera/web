// Pictosfera — núcleo: copia de seguridad.
//
// Todo vive solo en este dispositivo (IndexedDB + localStorage). La
// única forma de no perderlo si se borra el navegador o se cambia de
// dispositivo es exportar un archivo. Por defecto el archivo NO lleva
// las fotos propias (pueden ser pesadas y son lo más sensible); el
// adulto puede marcar una casilla para incluirlas igualmente.
//
// Este módulo separa a propósito la lógica "pura" (fácil de probar
// con node:test, sin DOM ni IndexedDB real) de los detalles de
// navegador (leer Blobs, descargar el archivo). Las funciones puras
// aceptan sus dependencias como parámetro con un valor por defecto,
// así los tests pueden sustituirlas por versiones falsas.

import * as mediaLibrary from './mediaLibrary.js';
import * as secuencias from './secuencias.js';
import * as rutas from './rutas.js';
import * as categorias from './categorias.js';
import * as pin from './pin.js';
import { getLanguage, setLanguage, SUPPORTED_LANGS } from './i18n.js';

export const TIPO_COPIA = 'pictosfera-copia';
export const VERSION_COPIA = 1;

const CLAVE_META = 'pictosfera.copia.meta';

// ---------------------------------------------------------------------
// Conversión de imágenes (foto local <-> texto), solo para fotos propias
// ---------------------------------------------------------------------

/** Blob -> data URL (texto), para poder meterlo dentro de un JSON. */
export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result);
    lector.onerror = () => reject(lector.error || new Error('error-leer-foto'));
    lector.readAsDataURL(blob);
  });
}

/** data URL (texto) -> Blob, al importar una copia que incluía fotos. */
export async function dataUrlToBlob(dataUrl) {
  const respuesta = await fetch(dataUrl);
  return respuesta.blob();
}

// ---------------------------------------------------------------------
// Construcción de la copia (lógica pura: medios + ajustes -> objeto JSON)
// ---------------------------------------------------------------------

/**
 * Convierte un medio del pozo en la forma que se guarda en el archivo.
 * - Pictogramas ARASAAC: se guardan completos (son datos ligeros y se
 *   podrían recalcular igualmente a partir del arasaacId).
 * - Fotos propias: nombre y categorías SIEMPRE se guardan; la imagen
 *   en sí solo se incluye si `incluirFotos` es verdadero.
 */
async function medioParaCopia(medio, incluirFotos, blobADataUrl) {
  if (medio.origen !== 'foto') {
    // arasaac u otros orígenes futuros: se guardan tal cual.
    return { ...medio };
  }
  const base = {
    id: medio.id,
    origen: medio.origen,
    nombre: medio.nombre,
    etiquetas: medio.etiquetas || [],
    creado: medio.creado
  };
  if (incluirFotos && medio.archivo) {
    base.archivoDataUrl = await blobADataUrl(medio.archivo);
  }
  return base;
}

/**
 * Construye el objeto de copia a partir de una lista de medios ya
 * cargada y de los ajustes actuales. Función pura/asíncrona, sin
 * tocar IndexedDB ni localStorage directamente: todo le llega por
 * parámetro, así es sencilla de probar.
 *
 * `opciones.secuencias`, `opciones.rutas` y `opciones.categorias` son
 * opcionales (por defecto `[]`): así una copia hecha antes de que
 * existieran estas mecánicas sigue siendo un objeto válido para
 * `construirCopia`/tests antiguos, y las copias nuevas siempre incluyen
 * el campo (aunque esté vacío) para que `validarCopia` pueda distinguir
 * "sin rutas" de "campo no soportado todavía". `ajustes.accesoLibreJuegos`
 * guarda el interruptor de acceso libre a Juegos (ver core/js/rutas.js).
 */
export async function construirCopia(medios, ajustes, opciones = {}) {
  const {
    incluirFotos = false,
    blobADataUrl = blobToDataUrl,
    secuencias: secuenciasCopia = [],
    rutas: rutasCopia = [],
    categorias: categoriasCopia = []
  } = opciones;
  const mediosCopia = [];
  for (const medio of medios) {
    // eslint-disable-next-line no-await-in-loop
    mediosCopia.push(await medioParaCopia(medio, incluirFotos, blobADataUrl));
  }
  return {
    tipo: TIPO_COPIA,
    version: VERSION_COPIA,
    creado: new Date().toISOString(),
    incluyeFotos: Boolean(incluirFotos),
    ajustes: {
      idioma: ajustes.idioma || 'es',
      pin: ajustes.pin || null,
      accesoLibreJuegos: ajustes.accesoLibreJuegos !== false
    },
    medios: mediosCopia,
    secuencias: secuenciasCopia || [],
    rutas: rutasCopia || [],
    categorias: categoriasCopia || []
  };
}

/** Comprueba que un objeto leído de un archivo tiene forma de copia válida.
 *  `secuencias`, `rutas` y `categorias` son campos opcionales y
 *  retrocompatibles: una copia antigua (de antes de que existiera cada
 *  mecánica) no los trae y sigue siendo válida; solo se rechaza si el
 *  campo está presente pero no es una lista, lo que indicaría un
 *  archivo corrupto. */
export function validarCopia(json) {
  if (!json || typeof json !== 'object') return { ok: false, error: 'json-invalido' };
  if (json.tipo !== TIPO_COPIA) return { ok: false, error: 'tipo-desconocido' };
  if (!Array.isArray(json.medios)) return { ok: false, error: 'medios-invalidos' };
  if (json.secuencias !== undefined && !Array.isArray(json.secuencias)) {
    return { ok: false, error: 'secuencias-invalidas' };
  }
  if (json.rutas !== undefined && !Array.isArray(json.rutas)) {
    return { ok: false, error: 'rutas-invalidas' };
  }
  if (json.categorias !== undefined && !Array.isArray(json.categorias)) {
    return { ok: false, error: 'categorias-invalidas' };
  }
  return { ok: true };
}

/**
 * Reconstruye los medios y ajustes a partir de un objeto de copia ya
 * validado, y aplica los cambios (biblioteca, idioma, PIN). Devuelve
 * un pequeño resumen para mostrar al adulto.
 *
 * Las secuencias, las rutas y las categorías solo se reemplazan si el
 * campo correspondiente (`json.secuencias` / `json.rutas` /
 * `json.categorias`) es una lista (puede no estarlo en una copia hecha
 * antes de que existiera esa mecánica): así importar una copia antigua
 * nunca borra datos que el adulto haya creado después con una versión
 * más nueva de la app.
 */
export async function aplicarCopia(json, opciones = {}) {
  const {
    dataUrlABlob = dataUrlToBlob,
    reemplazarMedios,
    restaurarAjustes,
    reemplazarSecuencias,
    reemplazarRutas,
    reemplazarCategorias
  } = opciones;
  const reemplazar = reemplazarMedios || mediaLibrary.replaceAll;
  const reemplazarSecs = reemplazarSecuencias || secuencias.replaceAll;
  const reemplazarRts = reemplazarRutas || rutas.replaceAll;
  const reemplazarCats = reemplazarCategorias || categorias.replaceAll;

  const mediosFinales = [];
  for (const medio of json.medios) {
    if (medio.archivoDataUrl) {
      // eslint-disable-next-line no-await-in-loop
      const archivo = await dataUrlABlob(medio.archivoDataUrl);
      const { archivoDataUrl, ...resto } = medio;
      mediosFinales.push({ ...resto, archivo });
    } else {
      mediosFinales.push({ ...medio });
    }
  }

  await reemplazar(mediosFinales);

  let totalSecuencias = 0;
  if (Array.isArray(json.secuencias)) {
    await reemplazarSecs(json.secuencias);
    totalSecuencias = json.secuencias.length;
  }

  let totalRutas = 0;
  if (Array.isArray(json.rutas)) {
    await reemplazarRts(json.rutas);
    totalRutas = json.rutas.length;
  }

  let totalCategorias = 0;
  if (Array.isArray(json.categorias)) {
    await reemplazarCats(json.categorias);
    totalCategorias = json.categorias.length;
  }

  const ajustes = json.ajustes || {};
  if (restaurarAjustes) {
    await restaurarAjustes(ajustes);
  } else {
    const idiomaValido = SUPPORTED_LANGS.some((l) => l.code === ajustes.idioma);
    if (idiomaValido) await setLanguage(ajustes.idioma);
    if (ajustes.pin && /^\d{4}$/.test(ajustes.pin)) {
      pin.setPin(ajustes.pin);
    } else {
      pin.removePin();
    }
    rutas.setAccesoLibreJuegos(ajustes.accesoLibreJuegos !== false);
  }

  return {
    totalMedios: mediosFinales.length,
    totalSecuencias,
    totalRutas,
    totalCategorias,
    idioma: ajustes.idioma || null,
    pinRestaurado: Boolean(ajustes.pin)
  };
}

// ---------------------------------------------------------------------
// Recordatorio de copia de seguridad (lógica pura)
// ---------------------------------------------------------------------

/**
 * ¿Hay que avisar al adulto de que haga una copia? Se avisa cuando:
 * - se ha añadido material nuevo desde la última copia, Y
 * - o nunca se ha hecho copia, o han pasado 15 días o más desde la última.
 */
export function necesitaRecordatorio({ ultimaCopiaISO, conteoMediosUltimaCopia, conteoMediosActual, ahora = new Date() }) {
  if (conteoMediosActual <= conteoMediosUltimaCopia) return false;
  if (!ultimaCopiaISO) return conteoMediosActual > 0;
  const ms = ahora.getTime() - new Date(ultimaCopiaISO).getTime();
  const dias = ms / (1000 * 60 * 60 * 24);
  return dias >= 15;
}

// ---------------------------------------------------------------------
// Persistencia ligera del estado del recordatorio (localStorage)
// ---------------------------------------------------------------------

export function getUltimaCopiaInfo() {
  try {
    const crudo = localStorage.getItem(CLAVE_META);
    if (!crudo) return { fechaISO: null, conteoMedios: 0 };
    const datos = JSON.parse(crudo);
    return { fechaISO: datos.fechaISO || null, conteoMedios: Number(datos.conteoMedios) || 0 };
  } catch {
    return { fechaISO: null, conteoMedios: 0 };
  }
}

function marcarCopiaHecha(conteoMedios) {
  try {
    localStorage.setItem(CLAVE_META, JSON.stringify({ fechaISO: new Date().toISOString(), conteoMedios }));
  } catch {
    /* ignore */
  }
}

/** Para que la vista de Ajustes pueda decidir si muestra el aviso. */
export async function comprobarRecordatorio() {
  const medios = await mediaLibrary.listAll();
  const { fechaISO, conteoMedios } = getUltimaCopiaInfo();
  return necesitaRecordatorio({
    ultimaCopiaISO: fechaISO,
    conteoMediosUltimaCopia: conteoMedios,
    conteoMediosActual: medios.length
  });
}

// ---------------------------------------------------------------------
// Glue de navegador: exportar (descargar archivo) e importar (leer archivo)
// ---------------------------------------------------------------------

function nombreArchivoCopia() {
  const ahora = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const fecha = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`;
  return `pictosfera-copia-${fecha}.json`;
}

function descargarJSON(objeto, nombreArchivo) {
  const texto = JSON.stringify(objeto, null, 2);
  const blob = new Blob([texto], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Genera y descarga el archivo de copia. Marca la fecha del recordatorio. */
export async function exportarCopia({ incluirFotos = false } = {}) {
  const [medios, listaSecuencias, listaRutas, listaCategorias] = await Promise.all([
    mediaLibrary.listAll(),
    secuencias.listAll(),
    rutas.listAll(),
    categorias.listAll()
  ]);
  const ajustes = { idioma: getLanguage(), pin: pin.getRaw(), accesoLibreJuegos: rutas.getAccesoLibreJuegos() };
  const copia = await construirCopia(medios, ajustes, {
    incluirFotos,
    secuencias: listaSecuencias,
    rutas: listaRutas,
    categorias: listaCategorias
  });
  descargarJSON(copia, nombreArchivoCopia());
  marcarCopiaHecha(medios.length);
  return copia;
}

/** Lee un archivo elegido por el adulto (input type=file) y lo aplica. */
export async function importarDesdeArchivo(file) {
  let texto;
  if (typeof file.text === 'function') {
    texto = await file.text();
  } else {
    texto = await new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(lector.result);
      lector.onerror = () => reject(lector.error || new Error('error-leer-archivo'));
      lector.readAsText(file);
    });
  }

  let json;
  try {
    json = JSON.parse(texto);
  } catch {
    throw new Error('json-invalido');
  }

  const validacion = validarCopia(json);
  if (!validacion.ok) throw new Error(validacion.error);

  const resumen = await aplicarCopia(json);
  marcarCopiaHecha(resumen.totalMedios);
  return resumen;
}
