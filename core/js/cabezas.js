// Pictosfera — núcleo: generador de cabezas ilustradas en SVG, con
// expresión facial.
//
// Hermano pequeño de personajes.js: en vez de un personaje de cuerpo
// entero, dibuja solo cabeza + pelo + accesorios (diadema, lazo,
// coletas o hijab), pero con la particularidad de que la cara puede
// llevar una de cuatro expresiones —contento, triste, enfadado o
// asustado—. Nace, igual que personajes.js, de un generador aportado
// por el autor del proyecto, y se integra aquí como utilidad de
// NÚCLEO para que cualquier minijuego, actual o futuro, pueda
// mostrar estas caras (p.ej. para enseñar a reconocer emociones).
//
// Reutiliza de personajes.js el mismo trazo "papercraft" y la misma
// paleta de clases CSS (pieles, pelos, colores básicos) en vez de
// duplicar el bloque <style>: ambos módulos dibujan con la misma
// familia de personajes, así que tiene sentido que comparta una sola
// definición (PREFIJO + crearSVG500, que ya incluye ese <style> y el
// envoltorio <svg> 500x500 con su accesibilidad). Por la misma razón
// que en personajes.js, todas las clases de los dibujos de aquí
// llevan el prefijo "pj-": un <style> dentro de un <svg> insertado
// por innerHTML no queda aislado al propio SVG.
//
// generarCabezaAleatoriaSVG() elige al azar una de cuatro variantes
// —pelo corto (base), pelo largo (con diadema o lazo), coletas o
// hijab— junto con piel y pelo/color del accesorio; permitirHijab y
// probabilidadHijab controlan cómo de frecuente es esa variante,
// igual que permitirVelo/probabilidadVelo en personajes.js. La
// expresión se sortea entre las cuatro disponibles salvo que se fije
// con la opción `expresion` (útil para un minijuego que necesita
// saber de antemano qué expresión está mostrando).
//
// Nota de accesibilidad importante para quien use este generador en
// un juego de reconocer emociones: por defecto (sin `etiqueta`) el
// SVG lleva aria-hidden="true", igual que en personajes.js. Si la
// mecánica que lo usa pasa `etiqueta`, ese texto se anuncia como
// role="img" + aria-label — NO debe ser el nombre de la expresión
// (p.ej. "Triste"), porque eso le daría la respuesta a quien use un
// lector de pantalla antes de mirar la cara. Si se necesita una
// etiqueta, que sea una genérica que no desvele la emoción (p.ej.
// "Cara de un personaje").
//
// descargarSVG no se duplica: se reexporta tal cual desde
// personajes.js (es exactamente el mismo helper, sin ninguna parte
// específica de personajes de cuerpo entero).

import { PREFIJO, crearSVG500 } from './personajes.js';

export { descargarSVG } from './personajes.js';

/** Catálogo de rasgos que se sortean al generar una cabeza al azar. */
export const OPCIONES_CABEZA = {
  pieles: ['skin-light', 'skin-medium', 'skin-latino', 'skin-dark'],
  pelos: ['hair-brown', 'hair-black', 'hair-blonde', 'hair-red', 'hair-dark'],
  accesorios: ['ninguno', 'diadema', 'lazo', 'coletas'],
  accesoriosColor: ['pink', 'red', 'yellow', 'purple', 'blue', 'green'],
  hijabs: ['purple', 'blue', 'green', 'pink', 'gray'],
  expresiones: ['contento', 'triste', 'enfadado', 'asustado']
};

function elegir(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

function probabilidad(valor = 0.5) {
  return Math.random() < valor;
}

/** Ojos y boca según la expresión. Cualquier valor que no sea una de
 *  las cuatro expresiones conocidas se dibuja como "contento" (mismo
 *  criterio que el resto del proyecto: valor por defecto razonable
 *  en vez de lanzar un error). */
function generarRasgosFaciales(expresion = 'contento') {
  switch (expresion) {
    case 'contento':
      return `
    <circle cx="118" cy="148" r="9" class="${PREFIJO}eye"/>
    <circle cx="182" cy="148" r="9" class="${PREFIJO}eye"/>
    <path d="M118 205 Q150 238 182 205" fill="none" class="${PREFIJO}thin"/>`;

    case 'triste':
      return `
    <circle cx="118" cy="148" r="9" class="${PREFIJO}eye"/>
    <circle cx="182" cy="148" r="9" class="${PREFIJO}eye"/>
    <path d="M118 224 Q150 190 182 224" fill="none" class="${PREFIJO}thin"/>`;

    case 'enfadado':
      return `
    <circle cx="118" cy="155" r="8" class="${PREFIJO}eye"/>
    <circle cx="182" cy="155" r="8" class="${PREFIJO}eye"/>
    <path d="M96 124 L135 140" fill="none" class="${PREFIJO}thin"/>
    <path d="M204 124 L165 140" fill="none" class="${PREFIJO}thin"/>
    <path d="M120 220 Q150 202 180 220" fill="none" class="${PREFIJO}thin"/>`;

    case 'asustado':
      return `
    <circle cx="118" cy="145" r="12" class="${PREFIJO}white ${PREFIJO}line"/>
    <circle cx="182" cy="145" r="12" class="${PREFIJO}white ${PREFIJO}line"/>
    <circle cx="118" cy="145" r="5" class="${PREFIJO}eye"/>
    <circle cx="182" cy="145" r="5" class="${PREFIJO}eye"/>
    <ellipse cx="150" cy="215" rx="18" ry="28" class="${PREFIJO}white ${PREFIJO}line"/>`;

    default:
      return `
    <circle cx="118" cy="148" r="9" class="${PREFIJO}eye"/>
    <circle cx="182" cy="148" r="9" class="${PREFIJO}eye"/>
    <path d="M118 205 Q150 238 182 205" fill="none" class="${PREFIJO}thin"/>`;
  }
}

/** Cabeza con pelo corto (la variante "base"), sin accesorios. */
export function generarCabezaBaseSVG({
  skin = 'skin-light',
  hair = 'hair-brown',
  expresion = 'contento',
  ...opciones
} = {}) {
  return crearSVG500(`
  <g transform="translate(25,20) scale(1.5)">
    <ellipse cx="150" cy="170" rx="105" ry="125" class="${PREFIJO}${skin} ${PREFIJO}line"/>
    <path d="M48 120 Q70 18 158 25 Q240 35 252 125 Q205 88 150 88 Q95 88 48 120Z" class="${PREFIJO}${hair} ${PREFIJO}line"/>
    ${generarRasgosFaciales(expresion)}
  </g>`, opciones);
}

/** Cabeza con pelo largo y diadema o lazo. */
export function generarCabezaPeloLargoSVG({
  skin = 'skin-light',
  hair = 'hair-blonde',
  accesorio = 'diadema',
  accesorioColor = 'pink',
  expresion = 'contento',
  ...opciones
} = {}) {
  return crearSVG500(`
  <g transform="translate(25,20) scale(1.5)">
    <path d="M45 160
             Q35 62 88 28
             Q145 -8 210 28
             Q265 62 255 160
             Q260 245 220 295
             Q185 335 150 315
             Q115 335 80 295
             Q40 245 45 160Z" class="${PREFIJO}${hair} ${PREFIJO}line"/>

    <ellipse cx="150" cy="170" rx="98" ry="118" class="${PREFIJO}${skin} ${PREFIJO}line"/>

    <path d="M50 120 Q80 55 150 62 Q220 55 250 120 Q205 92 150 92 Q95 92 50 120Z" class="${PREFIJO}${hair} ${PREFIJO}line"/>

    ${
      accesorio === 'diadema'
        ? `<path d="M78 82 Q150 28 222 82" fill="none" class="${PREFIJO}${accesorioColor} ${PREFIJO}line"/>`
        : `
    <path d="M220 48 L262 25 L262 75 Z" class="${PREFIJO}${accesorioColor} ${PREFIJO}line"/>
    <path d="M220 48 L178 25 L178 75 Z" class="${PREFIJO}${accesorioColor} ${PREFIJO}line"/>
    <circle cx="220" cy="48" r="12" class="${PREFIJO}${accesorioColor} ${PREFIJO}line"/>`
    }

    ${generarRasgosFaciales(expresion)}
  </g>`, opciones);
}

/** Cabeza con coletas (con sus gomas de color). */
export function generarCabezaConColetasSVG({
  skin = 'skin-light',
  hair = 'hair-brown',
  accesorioColor = 'red',
  expresion = 'contento',
  ...opciones
} = {}) {
  return crearSVG500(`
  <g transform="translate(25,20) scale(1.5)">
    <circle cx="78" cy="42" r="45" class="${PREFIJO}${hair} ${PREFIJO}line"/>
    <circle cx="222" cy="42" r="45" class="${PREFIJO}${hair} ${PREFIJO}line"/>
    <circle cx="78" cy="42" r="12" class="${PREFIJO}${accesorioColor} ${PREFIJO}line"/>
    <circle cx="222" cy="42" r="12" class="${PREFIJO}${accesorioColor} ${PREFIJO}line"/>

    <ellipse cx="150" cy="170" rx="105" ry="125" class="${PREFIJO}${skin} ${PREFIJO}line"/>
    <path d="M48 120 Q70 18 150 25 Q230 18 252 120 Q205 88 150 88 Q95 88 48 120Z" class="${PREFIJO}${hair} ${PREFIJO}line"/>

    ${generarRasgosFaciales(expresion)}
  </g>`, opciones);
}

/** Cabeza con hijab. */
export function generarCabezaConHijabSVG({
  skin = 'skin-medium',
  hijab = 'purple',
  expresion = 'contento',
  ...opciones
} = {}) {
  return crearSVG500(`
  <g transform="translate(25,20) scale(1.5)">
    <path d="M48 168
             Q52 40 150 22
             Q248 40 252 168
             L238 305
             Q150 365 62 305
             Z" class="${PREFIJO}${hijab} ${PREFIJO}line"/>

    <ellipse cx="150" cy="175" rx="82" ry="105" class="${PREFIJO}${skin} ${PREFIJO}line"/>

    ${generarRasgosFaciales(expresion)}
  </g>`, opciones);
}

const DIBUJANTES_POR_VARIANTE_CABEZA = {
  base: generarCabezaBaseSVG,
  peloLargo: generarCabezaPeloLargoSVG,
  coletas: generarCabezaConColetasSVG,
  hijab: generarCabezaConHijabSVG
};

/** Sortea qué variante le toca a una cabeza nueva y, junto con ella,
 *  el resto de rasgos al azar (piel, pelo, accesorio...). Pelo corto
 *  ("base"), coletas y diadema/lazo ("peloLargo") salen del accesorio
 *  sorteado; hijab es una variante aparte, con su propia
 *  probabilidad (igual que el velo en personajes.js). */
function elegirVarianteCabezaYRasgosAlAzar({
  permitirHijab = true,
  probabilidadHijab = 0.1,
  expresion = null
} = {}) {
  const usaHijab = permitirHijab && probabilidad(probabilidadHijab);

  const config = {
    skin: elegir(OPCIONES_CABEZA.pieles),
    hair: elegir(OPCIONES_CABEZA.pelos),
    accesorio: elegir(OPCIONES_CABEZA.accesorios),
    accesorioColor: elegir(OPCIONES_CABEZA.accesoriosColor),
    hijab: elegir(OPCIONES_CABEZA.hijabs),
    expresion: expresion || elegir(OPCIONES_CABEZA.expresiones)
  };

  let variante = 'base';
  if (usaHijab) variante = 'hijab';
  else if (config.accesorio === 'coletas') variante = 'coletas';
  else if (config.accesorio === 'diadema' || config.accesorio === 'lazo') variante = 'peloLargo';

  return { variante, config };
}

/**
 * Cabeza al azar, lista como SVG: pelo corto, pelo largo, coletas o
 * hijab, con piel/pelo/color de accesorio también al azar.
 *
 * opciones admite permitirHijab (true por defecto; en false esa
 * variante nunca sale) y probabilidadHijab (0.1 por defecto, es decir
 * ~10% de las veces) para ajustar cómo de frecuente es. expresion fija
 * una de las cuatro expresiones ('contento'/'triste'/'enfadado'/'asustado'); si no se
 * da, se sortea entre las cuatro. También admite fondo, etiqueta e
 * incluirEstilos, con el mismo significado que en personajes.js (ver
 * la nota de accesibilidad al principio del archivo sobre por qué
 * `etiqueta` no debe revelar la expresión en un juego de reconocer
 * emociones).
 */
export function generarCabezaAleatoriaSVG(opciones = {}) {
  const { variante, config } = elegirVarianteCabezaYRasgosAlAzar(opciones);
  const dibujar = DIBUJANTES_POR_VARIANTE_CABEZA[variante];
  return dibujar({ ...config, ...opciones });
}

/** Varias cabezas al azar (independientes entre sí). */
export function generarVariasCabezasAleatorias(cantidad = 10, opciones = {}) {
  return Array.from({ length: cantidad }, () => generarCabezaAleatoriaSVG(opciones));
}
