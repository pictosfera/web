// Pictosfera — núcleo: conector ARASAAC.
//
// Único punto del portal que habla con ARASAAC. Las apps y el resto
// del núcleo nunca llaman a la API directamente: pasan por aquí.
// Todas las peticiones salen del navegador del usuario directamente
// a ARASAAC; este portal no es un intermediario ni guarda nada de eso.

import { SUPPORTED_LANGS } from './i18n.js';

const API_BASE = 'https://api.arasaac.org/api';
const STATIC_BASE = 'https://static.arasaac.org/pictograms';

// Tamaños de imagen que ofrece ARASAAC. Se usan en cascada: si el
// primero falla al cargar (onerror en el <img>), se prueba el
// siguiente antes de rendirse y mostrar un icono de remplazo.
const IMAGE_SIZES = [300, 500, 2500];

function arasaacLangCode(internalCode) {
  const found = SUPPORTED_LANGS.find((l) => l.code === internalCode);
  return found ? found.arasaacCode : 'es';
}

/** URL de la imagen de un pictograma de ARASAAC para un tamaño dado. */
export function imageUrl(arasaacId, size = 300) {
  return `${STATIC_BASE}/${arasaacId}/${arasaacId}_${size}.png`;
}

/** Lista de URLs candidatas, de menor a mayor tamaño, para usar como
 *  cascada de "onerror" en el <img> (ver core/js/pictoImg.js si se añade). */
export function imageUrlCandidates(arasaacId) {
  return IMAGE_SIZES.map((size) => imageUrl(arasaacId, size));
}

/** Mapa de categorías inglesas de ARASAAC → categorías curadas en español.
 *  ARASAAC devuelve `categories` siempre en inglés; aquí las convertimos
 *  a las categorías que usa Pictosfera internamente, sin mostrarlas al usuario
 *  tal cual. Si la categoría inglesa no está en el mapa, se ignora (no se
 *  inventa una etiqueta). El mapa es conservador a propósito: solo se incluyen
 *  correspondencias fiables y sin ambigüedad. */
const MAPA_CATEGORIAS_ARASAAC = {
  // Comida
  food: 'comida', foods: 'comida', meal: 'comida', meals: 'comida',
  drink: 'comida', drinks: 'comida', beverage: 'comida', beverages: 'comida',
  fruit: 'comida', fruits: 'comida', vegetable: 'comida', vegetables: 'comida',
  cooking: 'comida', bakery: 'comida', dairy: 'comida', grocery: 'comida',
  // Animales
  animal: 'animales', animals: 'animales',
  mammal: 'animales', mammals: 'animales',
  bird: 'animales', birds: 'animales',
  fish: 'animales', insect: 'animales', insects: 'animales',
  reptile: 'animales', reptiles: 'animales', amphibian: 'animales',
  // Ropa
  clothing: 'ropa', clothes: 'ropa', cloth: 'ropa', garment: 'ropa', fashion: 'ropa',
  // Colores
  color: 'colores', colour: 'colores', colors: 'colores', colours: 'colores',
  // Familia
  family: 'familia',
  // Cuerpo
  body: 'cuerpo', anatomy: 'cuerpo',
  // Escuela
  school: 'escuela', education: 'escuela', stationery: 'escuela',
  // Juguetes
  toy: 'juguetes', toys: 'juguetes',
  // Naturaleza
  nature: 'naturaleza', plant: 'naturaleza', plants: 'naturaleza',
  tree: 'naturaleza', trees: 'naturaleza', flower: 'naturaleza', flowers: 'naturaleza',
  weather: 'naturaleza', environment: 'naturaleza',
  // Emociones
  emotion: 'emociones', emotions: 'emociones', feeling: 'emociones', feelings: 'emociones',
  // Números
  number: 'numeros', numbers: 'numeros', numeral: 'numeros', mathematics: 'numeros', math: 'numeros',
  // Acciones
  action: 'acciones', actions: 'acciones', verb: 'acciones', verbs: 'acciones',
  activity: 'acciones', activities: 'acciones'
};

/** Convierte el array `categories` de ARASAAC (en inglés) en etiquetas
 *  curadas en español, sin duplicados. Devuelve [] si no hay match. */
function etiquetasDesdeArasaac(picto) {
  const cats = Array.isArray(picto.categories) ? picto.categories : [];
  const vistas = new Set();
  const resultado = [];
  cats.forEach((cat) => {
    const tag = MAPA_CATEGORIAS_ARASAAC[(cat || '').toLowerCase().trim()];
    if (tag && !vistas.has(tag)) {
      vistas.add(tag);
      resultado.push(tag);
    }
  });
  return resultado;
}

function bestKeyword(picto) {
  const kws = Array.isArray(picto.keywords) ? picto.keywords : [];
  const withWord = kws.find((k) => k && k.keyword);
  return withWord ? withWord.keyword : '';
}

/** Convierte la respuesta cruda de ARASAAC en la "moneda de cambio"
 *  común del portal: el medio {imagen, nombre, etiquetas, origen}.
 *
 *  `etiquetas` se deja vacío a propósito: a diferencia de `keywords`
 *  (la palabra del pictograma, que SÍ depende del idioma pedido en la
 *  URL, ver searchPictograms/getPictogramById), los campos
 *  `categories`/`tags` de ARASAAC son una red semántica abierta
 *  (decenas de etiquetas como "mammal", "viviparous", "core
 *  vocabulary"...) que la propia API devuelve SIEMPRE en inglés, sin
 *  importar el idioma pedido. Mostrar eso tal cual en "Mi biblioteca"
 *  era justo el bug reportado ("las keywords aparecen siempre en
 *  inglés"): no hay forma de traducir un vocabulario abierto sin
 *  diccionario propio, así que en vez de enseñar texto a medio
 *  traducir, no se usa esa información para etiquetar. La etiqueta que
 *  de verdad importa (p.ej. "animales") la añade quien siembra o
 *  filtra el material, no este conector (ver mediaLibrary.ensureSeedFromArasaac). */
export function toMedium(picto) {
  return {
    id: `arasaac:${picto._id}`,
    arasaacId: picto._id,
    imagen: imageUrl(picto._id),
    imagenCandidatos: imageUrlCandidates(picto._id),
    nombre: bestKeyword(picto),
    // Mapear las categorías inglesas de ARASAAC a las curadas en español.
    // Si ninguna coincide con el mapa, etiquetas queda [] y el adulto
    // verá el panel de selección manual al añadirlo desde "Pictogramas".
    etiquetas: etiquetasDesdeArasaac(picto),
    origen: 'arasaac'
  };
}

/**
 * Busca pictogramas en ARASAAC para el idioma indicado (código interno
 * de Pictosfera, p.ej. "es", "eu", "va"...).
 * Devuelve un array de medios ya normalizados ({imagen,nombre,etiquetas,origen}).
 * Si no hay conexión o ARASAAC no responde, lanza un error que quien
 * llama debe capturar para avisar al usuario (sin reintentos silenciosos
 * infinitos: una sola petición, un único error claro).
 */
export async function searchPictograms(query, lang = 'es', { signal } = {}) {
  const text = (query || '').trim();
  if (!text) return [];
  const langCode = arasaacLangCode(lang);
  const url = `${API_BASE}/pictograms/${langCode}/search/${encodeURIComponent(text)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`ARASAAC respondió ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map(toMedium);
}

/** Pictograma concreto por id, en el idioma indicado. El id es el
 *  mismo en todos los idiomas, pero la palabra (keyword) es propia de
 *  cada uno, así que ARASAAC sí necesita el idioma aquí. Esto es lo
 *  que permite "retraducir" un pictograma ya guardado en el pozo
 *  cuando el adulto cambia el idioma del portal, sin tener que volver
 *  a buscarlo desde cero. */
export async function getPictogramById(arasaacId, lang = 'es', { signal } = {}) {
  const langCode = arasaacLangCode(lang);
  const url = `${API_BASE}/pictograms/${langCode}/${arasaacId}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`ARASAAC respondió ${res.status}`);
  const picto = await res.json();
  return toMedium(picto);
}
