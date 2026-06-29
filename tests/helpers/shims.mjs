// Pictosfera — ayudante para las pruebas automáticas.
//
// Los módulos del núcleo están escritos para el navegador (usan
// localStorage, document, window, fetch...). Node no tiene esas
// piezas por defecto, así que aquí se crean versiones mínimas y
// honestas: lo justo para que la lógica real se ejecute de verdad,
// sin simular el resultado de las pruebas.
//
// No sustituye probar en un navegador real (ver tests/MANUAL.md /
// el README), pero sí comprueba que la lógica de cada módulo hace lo
// que dice que hace.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(here, '..', '..');

/** Pequeño localStorage en memoria (se reinicia cada vez que se instala). */
function crearLocalStorage() {
  const datos = new Map();
  return {
    getItem: (clave) => (datos.has(clave) ? datos.get(clave) : null),
    setItem: (clave, valor) => datos.set(clave, String(valor)),
    removeItem: (clave) => datos.delete(clave),
    clear: () => datos.clear(),
    _datos: datos
  };
}

/**
 * Instala en `globalThis` lo mínimo que necesitan i18n.js, pin.js y
 * shell.js para funcionar fuera de un navegador:
 *  - localStorage en memoria.
 *  - document.documentElement (solo se usa para fijar el idioma).
 *  - window como EventTarget real (CustomEvent / addEventListener
 *    funcionan de verdad, no se simulan).
 *  - fetch que lee los archivos del propio proyecto desde disco, así
 *    que i18n.js carga los locales/*.json REALES, no copias de prueba.
 */
export function installBrowserShims() {
  globalThis.localStorage = crearLocalStorage();
  globalThis.document = { documentElement: {} };
  globalThis.window = new EventTarget();

  globalThis.fetch = async (url) => {
    const urlStr = String(url);
    const relativo = urlStr.replace(/^file:\/\//, '').replace(/^\.?\//, '');
    const ruta = path.join(PROJECT_ROOT, relativo);
    try {
      const contenido = await fs.readFile(ruta, 'utf8');
      return {
        ok: true,
        status: 200,
        json: async () => JSON.parse(contenido)
      };
    } catch {
      return {
        ok: false,
        status: 404,
        json: async () => { throw new Error(`No encontrado: ${ruta}`); }
      };
    }
  };

  return globalThis.localStorage;
}
