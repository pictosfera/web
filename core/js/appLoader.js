// Pictosfera — núcleo: cargador de apps.
//
// El portal lee data/apps.json y carga cada app con import() dinámico.
// El núcleo nunca cambia para añadir una app nueva: solo se añade un
// archivo de mecánica (si hace falta código) y una entrada en el índice.
//
// Contrato que debe cumplir el módulo de cada mecánica:
//   export default { id, nombre, icono, estante, montar(contenedor, plataforma), desmontar() }
// El descriptor en apps.json puede sobrescribir nombre/icono/estante/material
// para crear una app distinta a partir de la misma mecánica, sin tocar código.

import { t, getLanguage } from './i18n.js';
import * as mediaLibrary from './mediaLibrary.js';
import * as secuencias from './secuencias.js';
import * as categoriasDb from './categorias.js';
import * as tts from './tts.js';
import * as sounds from './sounds.js';
import * as cabezas from './cabezas.js';
import { showReward } from './reward.js';
import { getAjustesPista } from './ajustesJuego.js';
import { esPartidaPerfecta } from './rutas.js';

let descriptorsCache = null;

function resolveModuleUrl(modulo) {
  const base = new URL('.', document.baseURI);
  return new URL(modulo, base).href;
}

/** Lee data/apps.json (solo metadatos: nombre, icono, estante...).
 *  NO importa todavía el código de la mecánica: eso se hace al entrar
 *  a jugar, para no cargar JavaScript de más en la pantalla "Juegos". */
export async function loadDescriptors({ force = false } = {}) {
  if (descriptorsCache && !force) return descriptorsCache;
  const res = await fetch('./data/apps.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`No se pudo leer apps.json (${res.status})`);
  const data = await res.json();
  descriptorsCache = Array.isArray(data) ? data : [];
  return descriptorsCache;
}

export async function getDescriptorById(appId) {
  const descriptors = await loadDescriptors();
  return descriptors.find((d) => d.id === appId) || null;
}

/** Nombre a mostrar de una app: si el descriptor trae `nombreClave`
 *  (una clave de i18n), se traduce al idioma activo; si no la trae,
 *  se usa el `nombre` literal del descriptor (siempre en castellano,
 *  como red de seguridad para apps nuevas que aún no se han
 *  traducido). Así un autor puede añadir una app sin tocar locales/ y
 *  traducirla más adelante sin tocar código. */
export function nombreDescriptor(descriptor) {
  if (!descriptor) return '';
  return descriptor.nombreClave ? t(descriptor.nombreClave) : descriptor.nombre;
}

/** Agrupa los descriptores por estante, en el orden en que aparecen
 *  por primera vez en el índice (los estantes son planos: no hay
 *  jerarquía ni filtros, solo agrupan visualmente). */
export async function getAppsGroupedByEstante() {
  const descriptors = await loadDescriptors();
  const orden = [];
  const grupos = new Map();
  descriptors.forEach((d) => {
    if (!grupos.has(d.estante)) {
      grupos.set(d.estante, []);
      orden.push(d.estante);
    }
    grupos.get(d.estante).push(d);
  });
  return orden.map((estante) => ({ estante, apps: grupos.get(estante) }));
}

/** Resuelve el material de una app: usa lo que ya haya en el pozo con
 *  esa etiqueta y, si no hay suficiente, lo siembra desde ARASAAC. Si
 *  el descriptor no trae ninguna etiqueta (p.ej. mecánicas que, como
 *  "Clasifica los pictogramas en dos categorías" u "Ordena la
 *  secuencia", resuelven su propio material aparte: ver
 *  `resolverCategorias`/`resolverSecuencias`), se devuelve toda la
 *  biblioteca sin filtrar; esas mecánicas simplemente la ignoran. */
async function resolverMaterial(descriptor) {
  const material = descriptor.material || {};
  const etiqueta = material.etiqueta;
  if (!etiqueta) return mediaLibrary.listAll();

  if (Array.isArray(material.semillaArasaac) && material.semillaArasaac.length) {
    await mediaLibrary.ensureSeedFromArasaac({
      tag: etiqueta,
      terms: material.semillaArasaac,
      lang: material.semillaArasaacLang || getLanguage(),
      displayLang: getLanguage(),
      min: material.minimo || 6
    });
  }
  return mediaLibrary.listByTags([etiqueta]);
}

/** Elige al azar una pareja de categorías del banco guardado por el
 *  adulto (ver `resolverCategorias` y core/js/categorias.js). Lógica
 *  pura, sin tocar el pozo ni el DOM: solo decide CUÁL de las parejas
 *  jugables le toca a esta partida. Devuelve null si no hay ninguna. */
export function elegirParejaAleatoria(parejas) {
  if (!Array.isArray(parejas) || !parejas.length) return null;
  return parejas[Math.floor(Math.random() * parejas.length)];
}

/** Resuelve el material de la mecánica "dos categorías" (ver la app
 *  "Clasifica los pictogramas en dos categorías"): a diferencia del
 *  resto de mecánicas, que usan un único pozo con una sola etiqueta
 *  (`resolverMaterial`), aquí el material no vive en el descriptor de
 *  apps.json sino en un banco que el adulto gestiona desde "Pictogramas
 *  → Categorías" (ver core/js/categorias.js), igual que las secuencias
 *  (`resolverSecuencias`). Cada vez que se monta esta app se eligen,
 *  de entre las parejas jugables ahora mismo (con sus dos categorías
 *  resueltas contra el pozo actual), UNA al azar
 *  (`elegirParejaAleatoria`): así cada partida plantea una tarea de
 *  clasificación dicotómica distinta. Devuelve [] si todavía no hay
 *  ninguna pareja jugable (el resto de mecánicas no usa
 *  `plataforma.categorias` y lo ignora sin más). */
async function resolverCategorias() {
  const [parejas, todosMedios] = await Promise.all([categoriasDb.listAll(), mediaLibrary.listAll()]);
  const jugables = categoriasDb.parejasJugables(parejas, todosMedios);
  const pareja = elegirParejaAleatoria(jugables);
  return pareja && Array.isArray(pareja.categorias) ? pareja.categorias : [];
}

/** Resuelve los pictogramas "fijos" que algunas mecánicas necesitan
 *  siempre en el mismo sitio de la pantalla (p.ej. el plato y el cubo
 *  de basura de "Me gusta / no me gusta con comidas", o el carrito de
 *  "Lista de la compra"): a diferencia del resto del material, que se
 *  elige por etiqueta o lo diseña el adulto (categorías, secuencias),
 *  estos son siempre EL MISMO pictograma de ARASAAC, declarado por su
 *  id en `descriptor.material.fijos` (un objeto `{ clave: arasaacId }`,
 *  p.ej. `{ plato: 2532, basura: 2724 }`). Se siembran en el pozo una
 *  sola vez (ver mediaLibrary.ensureFixedArasaac) y a partir de
 *  entonces ya quedan ahí, traduciéndose solos cuando cambia el idioma
 *  igual que cualquier otro pictograma de ARASAAC. Devuelve un objeto
 *  con esas mismas claves apuntando al medio ya resuelto (o `null` si
 *  no se pudo cargar, p.ej. sin conexión). Las mecánicas que no
 *  declaran ningún fijo reciben un objeto vacío y lo ignoran. */
async function resolverFijos(descriptor) {
  const fijos = (descriptor.material && descriptor.material.fijos) || null;
  if (!fijos) return {};
  const lang = getLanguage();
  const resueltos = {};
  await Promise.all(
    Object.entries(fijos).map(async ([clave, arasaacId]) => {
      try {
        resueltos[clave] = await mediaLibrary.ensureFixedArasaac(arasaacId, lang);
      } catch (err) {
        console.warn(`[appLoader] No se pudo cargar el pictograma fijo "${clave}" (${arasaacId}):`, err);
        resueltos[clave] = null;
      }
    })
  );
  return resueltos;
}

/** Resuelve las secuencias diseñadas por el adulto (ver secuencias.js)
 *  contra la biblioteca COMPLETA de medios (no el material filtrado
 *  por etiqueta de esta app en concreto): una secuencia puede combinar
 *  pictogramas de cualquier categoría, así que necesita ver todo el
 *  pozo para resolver sus pasos. Solo se devuelven las que se pueden
 *  jugar de verdad ahora mismo (ver secuenciasJugables). */
async function resolverSecuencias() {
  const [todas, todosMedios] = await Promise.all([secuencias.listAll(), mediaLibrary.listAll()]);
  return secuencias.secuenciasJugables(todas, todosMedios);
}

/**
 * Monta una app dentro de `contenedor`. Devuelve una función de
 * limpieza (para que el router la llame al salir de la vista).
 *
 * `opciones.ajustesPistaOverride`: si se pasa, sustituye por completo
 *   a ajustesJuego.getAjustesPista(appId) como `plataforma.ajustesPista`.
 *   Lo usa el modo ruta (ver `opciones.rutaContexto`) para que cada
 *   instancia de un juego dentro de una ruta tenga su propia
 *   configuración congelada, totalmente independiente de la
 *   configuración directa de ese juego en el menú JUEGOS.
 *
 * `opciones.rutaContexto`: si se pasa, esta app se está jugando como un
 *   paso de una ruta de aprendizaje, no desde el menú JUEGOS directo.
 *   Activa el "modo ruta": se cuentan los fallos de toda la partida
 *   (envolviendo `plataforma.sounds.fallo`, que todas las mecánicas ya
 *   llaman en cualquier intento equivocado) para saber si terminó con
 *   "puntuación perfecta" (por defecto, cero fallos; ver
 *   rutas.esPartidaPerfecta() para la excepción de mecánicas como
 *   Memoria, donde fallar es parte normal del juego y no debe bloquear
 *   el progreso), y se envuelve `plataforma.mostrarRecompensa` para:
 *     - avisar de si fue perfecta vía `rutaContexto.alTerminarPaso(fuePerfecto)`
 *       (quien llama a mountApp decide qué hacer con eso: en la
 *       práctica, registrar el progreso de la ruta);
 *     - reiniciar el contador de fallos si el niño pulsa "seguir
 *       jugando" (para poder intentar una puntuación perfecta de nuevo
 *       sin salir del juego);
 *     - sustituir el botón "volver" por `rutaContexto.alSalir` (vuelve
 *       a la pantalla de la ruta, no al menú JUEGOS).
 *   Nada de esto toca el código de ninguna mecánica.
 */
export async function mountApp(appId, contenedor, opciones = {}) {
  const descriptor = await getDescriptorById(appId);
  if (!descriptor) throw new Error(`No existe la app "${appId}" en el índice.`);

  const moduleUrl = resolveModuleUrl(descriptor.modulo);
  const mod = await import(/* @vite-ignore */ moduleUrl);
  const mecanica = mod.default;
  if (!mecanica || typeof mecanica.montar !== 'function') {
    throw new Error(`La mecánica de "${appId}" no cumple el contrato esperado.`);
  }

  // El descriptor (JSON) puede sobrescribir nombre/icono/estante de la
  // mecánica base para crear una app distinta sin escribir código. El
  // nombre, además, se traduce si el descriptor trae `nombreClave`.
  const appResuelta = { ...mecanica, ...descriptor, nombre: nombreDescriptor(descriptor) };

  const medios = await resolverMaterial(descriptor);
  const categoriasResueltas = await resolverCategorias();
  const secuenciasResueltas = await resolverSecuencias();
  const fijosResueltos = await resolverFijos(descriptor);

  const rutaContexto = opciones.rutaContexto || null;
  let soundsPlataforma = sounds;
  let mostrarRecompensaPlataforma = showReward;

  if (rutaContexto) {
    let huboFallo = false;
    soundsPlataforma = {
      ...sounds,
      fallo: (...args) => {
        huboFallo = true;
        return sounds.fallo(...args);
      }
    };
    mostrarRecompensaPlataforma = async (rewardOpciones = {}) => {
      const fuePerfecto = esPartidaPerfecta(mecanica, huboFallo);
      try {
        await rutaContexto.alTerminarPaso(fuePerfecto);
      } catch (err) {
        console.warn('[appLoader] No se pudo registrar el progreso de la ruta:', err);
      }
      const onContinuarOriginal = rewardOpciones.onContinuar;
      showReward({
        ...rewardOpciones,
        salirLabelKey: 'rutas.volver_a_la_ruta',
        onContinuar:
          typeof onContinuarOriginal === 'function'
            ? () => {
                huboFallo = false;
                onContinuarOriginal();
              }
            : undefined,
        onSalir: rutaContexto.alSalir
      });
    };
  }

  const plataforma = {
    appId: descriptor.id,
    nombre: appResuelta.nombre,
    icono: appResuelta.icono,
    estante: appResuelta.estante,
    // Idioma activo (código interno, p.ej. "es", "en"...). Algunas
    // mecánicas lo necesitan para adaptar algo más que el texto (p.ej.
    // "Teclea la palabra" elige el teclado en pantalla según el
    // idioma). Se pasa el código en vez de la función `getLanguage`
    // para no romper el aislamiento: esto ya es el dato resuelto, no
    // acceso directo al núcleo.
    lang: getLanguage(),
    medios,
    // Solo la usa la mecánica "Clasifica los pictogramas en dos
    // categorías" (ver resolverCategorias): la pareja elegida al azar
    // para esta partida, ya resuelta como un array de dos categorías
    // ({ id, nombre, cabecera, medios }). El resto de mecánicas la
    // ignora sin más (igual que ignoran partes de `medios` que no
    // necesitan).
    categorias: categoriasResueltas,
    // Secuencias ya resueltas (pasos como medios completos, no solo
    // ids) y filtradas a las jugables. La mayoría de mecánicas la
    // ignoran (igual que ignoran partes de `medios` que no usan): solo
    // la necesita una mecánica como "Ordena la secuencia".
    secuencias: secuenciasResueltas,
    // Pictogramas fijos declarados en `descriptor.material.fijos` (ver
    // resolverFijos): un objeto `{ clave: medio }` con el pictograma de
    // apoyo que esa mecánica necesita siempre en el mismo sitio (p.ej.
    // `fijos.plato`/`fijos.basura` en "Me gusta / no me gusta con
    // comidas", o `fijos.carrito` en "Lista de la compra"). Vacío para
    // el resto de mecánicas, que lo ignoran sin más.
    fijos: fijosResueltos,
    t,
    tts,
    sounds: soundsPlataforma,
    // Generador de caras SVG (core/js/cabezas.js), igual de utilidad
    // de paso que tts/sounds: no hace falta resolver nada de
    // antemano (la cara se dibuja al vuelo, sin red), así que se pasa
    // el módulo entero. Hoy solo lo usa "Reconoce emociones", pero
    // queda disponible para cualquier mecánica futura que quiera
    // mostrar una cara generada (decorativa o interactiva).
    cabezas,
    getDisplayUrl: mediaLibrary.getDisplayUrl,
    mostrarRecompensa: mostrarRecompensaPlataforma,
    // Ajustes del portal sobre cómo mostrar las "pistas" de texto
    // (mayúsculas/minúsculas, mostrar/ocultar...). Es una foto fija en
    // el momento de montar la app, ya resuelta para ESTE juego en
    // concreto (clave propia de "descriptor.id" si existe, si no la
    // global heredada, si no el valor de fábrica: ver ajustesJuego.js).
    // Si el adulto los cambia mientras se juega, la app puede volver a
    // leerlos con ajustesJuego.getAjustesPista(appId) si lo necesita
    // (no se pasa la función para no romper el aislamiento: esto ya es
    // el dato resuelto, no acceso directo al núcleo). En modo ruta, se
    // sustituye por la config propia (congelada) de esa instancia.
    ajustesPista: opciones.ajustesPistaOverride || getAjustesPista(descriptor.id)
  };

  await mecanica.montar(contenedor, plataforma);

  return () => {
    try {
      if (typeof mecanica.desmontar === 'function') mecanica.desmontar();
    } catch (err) {
      console.warn(`[appLoader] Error al desmontar "${appId}":`, err);
    }
  };
}
