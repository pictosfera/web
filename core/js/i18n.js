// Pictosfera — núcleo: idiomas (i18n).
//
// Un único ajuste global de idioma repinta TODO: interfaz, texto de
// pictogramas y voz del TTS. No hay perfiles por niño ni versiones
// distintas por idioma.
//
// Si una clave de texto no existe en el idioma activo, se usa el
// castellano como red de seguridad (igual que se hace con la palabra
// de un pictograma que no existe en el idioma elegido).

/**
 * Catálogo de idiomas soportados por el portal.
 *  - code: código interno de Pictosfera (el que se guarda en ajustes).
 *  - nombre: cómo se llama el idioma en sí mismo (autoglotónimo).
 *  - arasaacCode: código que espera la API de ARASAAC para ese idioma.
 *  - speechLang: BCP-47 a probar con la voz del navegador (Web Speech API).
 *  - speechFallback: si el dispositivo no tiene voz para speechLang,
 *    qué otro idioma probar antes de avisar que no hay voz.
 */
export const SUPPORTED_LANGS = [
  { code: 'es', nombre: 'Castellano', arasaacCode: 'es', speechLang: 'es-ES', speechFallback: null },
  { code: 'ca', nombre: 'Català',     arasaacCode: 'ca', speechLang: 'ca-ES', speechFallback: 'es-ES' },
  { code: 'eu', nombre: 'Euskara',    arasaacCode: 'eu', speechLang: 'eu-ES', speechFallback: 'es-ES' },
  { code: 'gl', nombre: 'Galego',     arasaacCode: 'gl', speechLang: 'gl-ES', speechFallback: 'es-ES' },
  { code: 'va', nombre: 'Valencià',   arasaacCode: 'val', speechLang: 'ca-ES', speechFallback: 'es-ES' },
  { code: 'en', nombre: 'English',    arasaacCode: 'en', speechLang: 'en-GB', speechFallback: 'en-US' }
];

const DEFAULT_LANG = 'es';
const STORAGE_KEY = 'pictosfera.lang';
const EVENT_NAME = 'pictosfera:lang-changed';

// Bundles de texto cargados en memoria. Siempre incluye 'es' (red de
// seguridad) y, si es distinto, el idioma activo.
const bundles = new Map();
let currentLang = DEFAULT_LANG;
let baseUrl = './locales/';

function langInfo(code) {
  return SUPPORTED_LANGS.find((l) => l.code === code) || SUPPORTED_LANGS[0];
}

async function loadBundle(code) {
  if (bundles.has(code)) return bundles.get(code);
  try {
    const res = await fetch(`${baseUrl}${code}.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    bundles.set(code, json);
    return json;
  } catch (err) {
    console.warn(`[i18n] No se pudo cargar el idioma "${code}":`, err);
    bundles.set(code, {});
    return {};
  }
}

function readPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), obj);
}

function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (m, key) => (key in vars ? String(vars[key]) : m));
}

/**
 * Traduce una clave (p.ej. "nav.inicio"). Si falta en el idioma activo,
 * cae a castellano; si tampoco existe, devuelve la propia clave para
 * que el fallo sea visible y fácil de detectar.
 */
export function t(key, vars) {
  const activeBundle = bundles.get(currentLang) || {};
  const esBundle = bundles.get('es') || {};
  const value = readPath(activeBundle, key);
  if (typeof value === 'string') return interpolate(value, vars);
  const fallback = readPath(esBundle, key);
  if (typeof fallback === 'string') return interpolate(fallback, vars);
  return key;
}

export function getLanguage() {
  return currentLang;
}

export function getLanguageInfo() {
  return langInfo(currentLang);
}

/**
 * Carga el idioma indicado, lo guarda como preferencia y avisa a todo
 * el portal (shell, apps abiertas, etc.) para que se repinten.
 */
export async function setLanguage(code) {
  const valid = SUPPORTED_LANGS.some((l) => l.code === code) ? code : DEFAULT_LANG;
  await loadBundle(valid);
  if (valid !== DEFAULT_LANG) await loadBundle(DEFAULT_LANG); // red de seguridad siempre cargada
  currentLang = valid;
  try { localStorage.setItem(STORAGE_KEY, valid); } catch { /* almacenamiento no disponible */ }
  document.documentElement.lang = valid;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { lang: valid } }));
}

/** Se llama una vez al arrancar el portal. */
export async function initI18n(options = {}) {
  if (options.baseUrl) baseUrl = options.baseUrl;
  let stored = DEFAULT_LANG;
  try { stored = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG; } catch { /* ignore */ }
  await setLanguage(stored);
}

/** Suscribirse a cambios de idioma. Devuelve función para desuscribirse. */
export function onLanguageChange(callback) {
  const handler = (ev) => callback(ev.detail.lang);
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
