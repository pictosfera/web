// Pictosfera — núcleo: almacenamiento local (IndexedDB).
//
// Todo vive solo en el navegador del dispositivo. No hay servidor.
// Este módulo es deliberadamente "tonto": solo sabe guardar y leer
// medios (pictogramas de ARASAAC + fotos locales), secuencias (listas
// ordenadas de medios que diseña el adulto), rutas y categorías
// (parejas dicotómicas, también diseñadas por el adulto) en sus
// propias tablas. La lógica de negocio (qué es una etiqueta
// obligatoria, cuántos pasos hace falta para que una secuencia tenga
// sentido, etc.) vive en mediaLibrary.js / secuencias.js / categorias.js,
// no aquí.

const DB_NAME = 'pictosfera';
const DB_VERSION = 4;
const STORE_MEDIOS = 'medios';
const STORE_SECUENCIAS = 'secuencias';
const STORE_RUTAS = 'rutas';
const STORE_CATEGORIAS = 'categorias';

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Este navegador no soporta IndexedDB.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      // Cada almacén se crea solo si todavía no existe: así una base
      // ya creada en la versión 1 (solo "medios") gana el almacén
      // "secuencias" nuevo sin perder nada de lo que ya tenía.
      if (!db.objectStoreNames.contains(STORE_MEDIOS)) {
        const store = db.createObjectStore(STORE_MEDIOS, { keyPath: 'id' });
        store.createIndex('etiquetas', 'etiquetas', { multiEntry: true });
        store.createIndex('origen', 'origen');
      }
      if (!db.objectStoreNames.contains(STORE_SECUENCIAS)) {
        db.createObjectStore(STORE_SECUENCIAS, { keyPath: 'id' });
      }
      // Almacén "rutas" nuevo en la versión 3: itinerarios guiados
      // (secuencias de juegos con configuración propia y progreso).
      if (!db.objectStoreNames.contains(STORE_RUTAS)) {
        db.createObjectStore(STORE_RUTAS, { keyPath: 'id' });
      }
      // Almacén "categorias" nuevo en la versión 4: parejas de
      // categorías dicotómicas (p. ej. grande/pequeño) que el adulto
      // diseña para el minijuego "clasifica los pictogramas en dos
      // categorías".
      if (!db.objectStoreNames.contains(STORE_CATEGORIAS)) {
        db.createObjectStore(STORE_CATEGORIAS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function withStore(storeName, mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const result = fn(store);
        tx.oncomplete = () => resolve(result && result.__req ? result.__req.result : result);
        tx.onerror = () => reject(tx.error);
      })
  );
}

function getAll(storeName) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      })
  );
}

function getById(storeName, id) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      })
  );
}

// --- medios ---

/** Guarda (o sustituye) un medio completo. */
export function putMedio(medio) {
  return withStore(STORE_MEDIOS, 'readwrite', (store) => {
    store.put(medio);
  });
}

/** Guarda varios medios de golpe (más rápido para importar/sembrar el pozo). */
export function putManyMedios(medios) {
  return withStore(STORE_MEDIOS, 'readwrite', (store) => {
    medios.forEach((m) => store.put(m));
  });
}

export function getAllMedios() {
  return getAll(STORE_MEDIOS);
}

export function getMedioById(id) {
  return getById(STORE_MEDIOS, id);
}

export function deleteMedio(id) {
  return withStore(STORE_MEDIOS, 'readwrite', (store) => {
    store.delete(id);
  });
}

/** Borra toda la biblioteca (se usa al importar una copia de seguridad
 *  completa, que sustituye en vez de mezclar). */
export function clearMedios() {
  return withStore(STORE_MEDIOS, 'readwrite', (store) => {
    store.clear();
  });
}

// --- secuencias ---

/** Guarda (o sustituye) una secuencia completa. */
export function putSecuencia(secuencia) {
  return withStore(STORE_SECUENCIAS, 'readwrite', (store) => {
    store.put(secuencia);
  });
}

/** Guarda varias secuencias de golpe (se usa al importar una copia). */
export function putManySecuencias(secuencias) {
  return withStore(STORE_SECUENCIAS, 'readwrite', (store) => {
    secuencias.forEach((s) => store.put(s));
  });
}

export function getAllSecuencias() {
  return getAll(STORE_SECUENCIAS);
}

export function getSecuenciaById(id) {
  return getById(STORE_SECUENCIAS, id);
}

export function deleteSecuencia(id) {
  return withStore(STORE_SECUENCIAS, 'readwrite', (store) => {
    store.delete(id);
  });
}

/** Borra todas las secuencias (se usa al importar una copia de
 *  seguridad completa que sí trae secuencias, que sustituye en vez de
 *  mezclar). */
export function clearSecuencias() {
  return withStore(STORE_SECUENCIAS, 'readwrite', (store) => {
    store.clear();
  });
}

// --- rutas ---

/** Guarda (o sustituye) una ruta completa. */
export function putRuta(ruta) {
  return withStore(STORE_RUTAS, 'readwrite', (store) => {
    store.put(ruta);
  });
}

/** Guarda varias rutas de golpe (se usa al importar una copia). */
export function putManyRutas(rutas) {
  return withStore(STORE_RUTAS, 'readwrite', (store) => {
    rutas.forEach((r) => store.put(r));
  });
}

export function getAllRutas() {
  return getAll(STORE_RUTAS);
}

export function getRutaById(id) {
  return getById(STORE_RUTAS, id);
}

export function deleteRuta(id) {
  return withStore(STORE_RUTAS, 'readwrite', (store) => {
    store.delete(id);
  });
}

/** Borra todas las rutas (se usa al importar una copia de seguridad
 *  completa que sí trae rutas, que sustituye en vez de mezclar). */
export function clearRutas() {
  return withStore(STORE_RUTAS, 'readwrite', (store) => {
    store.clear();
  });
}

// --- categorías (parejas dicotómicas) ---

/** Guarda (o sustituye) una pareja de categorías completa. */
export function putCategoria(pareja) {
  return withStore(STORE_CATEGORIAS, 'readwrite', (store) => {
    store.put(pareja);
  });
}

/** Guarda varias parejas de golpe (se usa al importar una copia). */
export function putManyCategorias(parejas) {
  return withStore(STORE_CATEGORIAS, 'readwrite', (store) => {
    parejas.forEach((p) => store.put(p));
  });
}

export function getAllCategorias() {
  return getAll(STORE_CATEGORIAS);
}

export function getCategoriaById(id) {
  return getById(STORE_CATEGORIAS, id);
}

export function deleteCategoria(id) {
  return withStore(STORE_CATEGORIAS, 'readwrite', (store) => {
    store.delete(id);
  });
}

/** Borra todas las parejas de categorías (se usa al importar una copia
 *  de seguridad completa que sí trae categorías, que sustituye en vez
 *  de mezclar). */
export function clearCategorias() {
  return withStore(STORE_CATEGORIAS, 'readwrite', (store) => {
    store.clear();
  });
}
