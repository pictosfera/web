// Pictosfera — núcleo: generador de personajes ilustrados en SVG.
//
// Este módulo nace de un generador de personajes aportado por el
// autor del proyecto; se integra aquí como utilidad de NÚCLEO (no
// atada a ninguna mecánica concreta) para que cualquier minijuego,
// actual o futuro, pueda usar estos personajes como elemento
// decorativo (p.ej. una mascota en la pantalla de recompensa) o
// interactuable (p.ej. arrastrar un personaje, o que represente a
// quien juega). Cada personaje es un SVG 500x500 autocontenido: trazo
// negro, look "papercraft" sencillo.
//
// generarPersonajeAleatorioSVG() elige al azar, cada vez, una de
// cinco variantes —pelo corto (base), pelo largo, coletas, hijab o
// silla de ruedas— junto con el resto de rasgos (piel, ropa,
// zapatos...). Las variantes son dibujos propios, no se combinan
// entre sí (no hay, por ejemplo, "silla de ruedas con hijab"):
// combinarlas exigiría dibujar cada combinación a mano, no es solo
// cambiar una clase CSS. permitirVelo/permitirSillaRuedas y
// probabilidadVelo/probabilidadSillaRuedas controlan cómo de
// frecuentes son esas dos variantes (ver generarPersonajeAleatorioSVG).
//
// Dos arreglos sobre el código original aportado:
//  - Todas las clases CSS del <style> embebido llevan el prefijo
//    "pj-" (pj-line, pj-skin-light, pj-blue...). Un <style> dentro de
//    un <svg> insertado por innerHTML NO queda aislado al propio SVG:
//    sus reglas se aplican a todo el documento. Con nombres tan
//    genéricos como ".red" o ".line" eso es una bomba de relojería en
//    un proyecto que ya tiene más de 20 mecánicas con su propio CSS;
//    el prefijo evita choques aunque en este momento no haya ninguno.
//  - descargarSVG sigue igual, pero ahora avisa con un error claro si
//    se llama fuera de un navegador en lugar de romper con un
//    ReferenceError "document is not defined" (este módulo se importa
//    también desde las pruebas automáticas, donde no hay DOM).
//
// Cada SVG lleva aria-hidden="true" por defecto (para lectores de
// pantalla: dice "esto es decorativo, ignóralo", igual que el emoji
// de reward.js) o role="img" + aria-label si se pasa `etiqueta` (para
// cuando el personaje sea él mismo el contenido de una interacción,
// no solo un fondo).
//
// El resto —los propios dibujos SVG (las rutas, las formas, las
// proporciones)— es el del código original, sin tocar.

// PREFIJO, ESTILO_PERSONAJE y crearSVG500 se exportan además para que
// core/js/cabezas.js (generador de solo cabeza/expresiones, mismo
// estilo "papercraft") los reutilice en vez de duplicar el bloque
// <style> y el envoltorio <svg> 500x500: ambos módulos dibujan con la
// misma paleta de clases (pieles, pelos, colores básicos), así que
// definirla una sola vez evita que un día se actualice en uno y no en
// el otro.
export const PREFIJO = 'pj-';

export const ESTILO_PERSONAJE = `
<style>
  .${PREFIJO}line{stroke:#111;stroke-width:7;stroke-linecap:round;stroke-linejoin:round}
  .${PREFIJO}thin{stroke:#111;stroke-width:5;stroke-linecap:round;stroke-linejoin:round}
  .${PREFIJO}eye{fill:#111}

  .${PREFIJO}skin-light{fill:#ffd6a3}
  .${PREFIJO}skin-medium{fill:#f0b47b}
  .${PREFIJO}skin-latino{fill:#b86f45}
  .${PREFIJO}skin-dark{fill:#4b2b1d}

  .${PREFIJO}hair-brown{fill:#6b3a16}
  .${PREFIJO}hair-black{fill:#111}
  .${PREFIJO}hair-blonde{fill:#f5c542}
  .${PREFIJO}hair-red{fill:#d65a1f}
  .${PREFIJO}hair-dark{fill:#2b160d}

  .${PREFIJO}blue{fill:#2299dd}
  .${PREFIJO}green{fill:#5cc26f}
  .${PREFIJO}yellow{fill:#f4d35e}
  .${PREFIJO}red{fill:#e85d5d}
  .${PREFIJO}purple{fill:#8e6ad8}
  .${PREFIJO}orange{fill:#f28c28}
  .${PREFIJO}pink{fill:#f59ac2}
  .${PREFIJO}navy{fill:#224b7a}
  .${PREFIJO}gray{fill:#d9d9d9}
  .${PREFIJO}white{fill:#fff}
  .${PREFIJO}black{fill:#111}
  .${PREFIJO}metal{fill:#c7ced8}
</style>
`;

const TRANSFORM_PERSONAJE_NORMAL = `translate(160,35) scale(1.25)`;
const TRANSFORM_PERSONAJE_VELO = `translate(160,35) scale(1.25)`;
const TRANSFORM_SILLA_RUEDAS = `translate(90,20) scale(1.05)`;

/** Catálogo de rasgos que se sortean al generar un personaje al azar. */
export const OPCIONES_PERSONAJE = {
  pieles: ['skin-light', 'skin-medium', 'skin-latino', 'skin-dark'],
  pelos: ['hair-brown', 'hair-black', 'hair-blonde', 'hair-red', 'hair-dark'],
  camisetas: ['blue', 'green', 'yellow', 'red', 'purple', 'orange', 'pink'],
  pantalones: ['navy', 'gray', 'green', 'purple', 'red', 'yellow'],
  zapatos: ['black', 'white', 'navy', 'yellow'],
  accesorios: ['ninguno', 'diadema', 'lazo', 'coletas'],
  accesoriosColor: ['pink', 'red', 'yellow', 'purple', 'blue'],
  velos: ['purple', 'blue', 'green', 'pink', 'gray']
};

function elegir(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

function probabilidad(valor = 0.5) {
  return Math.random() < valor;
}

function escaparAtributo(texto) {
  return String(texto).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

export function crearSVG500(contenido, { fondo = '#ffffff', etiqueta = null, incluirEstilos = true } = {}) {
  const accesibilidad = etiqueta
    ? `role="img" aria-label="${escaparAtributo(etiqueta)}"`
    : 'aria-hidden="true"';
  return `
<svg width="500" height="500" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg" ${accesibilidad}>
  <rect width="500" height="500" fill="${escaparAtributo(fondo)}"/>
  ${incluirEstilos ? ESTILO_PERSONAJE : ''}
  ${contenido}
</svg>`;
}

export function generarPersonajeBaseSVG({
  skin = 'skin-light',
  hair = 'hair-brown',
  shirt = 'blue',
  pants = 'navy',
  shoes = 'black',
  ...opciones
} = {}) {
  return crearSVG500(`
  <g transform="${TRANSFORM_PERSONAJE_NORMAL}">
    <ellipse cx="70" cy="80" rx="42" ry="48" class="${PREFIJO}${skin} ${PREFIJO}line"/>
    <path d="M30 60 Q42 18 78 20 Q108 26 113 62 Q90 48 70 48 Q48 48 30 60Z" class="${PREFIJO}${hair} ${PREFIJO}line"/>

    <circle cx="55" cy="83" r="4.5" class="${PREFIJO}eye"/>
    <circle cx="84" cy="83" r="4.5" class="${PREFIJO}eye"/>
    <path d="M59 103 Q70 114 81 103" fill="none" class="${PREFIJO}thin"/>

    <rect x="43" y="135" width="54" height="82" rx="16" class="${PREFIJO}${shirt} ${PREFIJO}line"/>

    <line x1="43" y1="153" x2="24" y2="215" class="${PREFIJO}line"/>
    <line x1="97" y1="153" x2="116" y2="215" class="${PREFIJO}line"/>

    <rect x="45" y="214" width="23" height="62" rx="5" class="${PREFIJO}${pants} ${PREFIJO}line"/>
    <rect x="72" y="214" width="23" height="62" rx="5" class="${PREFIJO}${pants} ${PREFIJO}line"/>

    <line x1="56" y1="276" x2="56" y2="335" class="${PREFIJO}line"/>
    <line x1="84" y1="276" x2="84" y2="335" class="${PREFIJO}line"/>

    <rect x="37" y="332" width="42" height="22" rx="10" class="${PREFIJO}${shoes} ${PREFIJO}line"/>
    <rect x="70" y="332" width="42" height="22" rx="10" class="${PREFIJO}${shoes} ${PREFIJO}line"/>
  </g>`, opciones);
}

export function generarPersonajePeloLargoSVG({
  skin = 'skin-light',
  hair = 'hair-blonde',
  shirt = 'green',
  pants = 'yellow',
  shoes = 'black',
  accesorio = 'diadema',
  accesorioColor = 'pink',
  ...opciones
} = {}) {
  return crearSVG500(`
  <g transform="${TRANSFORM_PERSONAJE_NORMAL}">
    <path d="M32 82 Q26 44 44 25 Q62 6 88 19 Q113 31 112 83 Q112 116 98 138 Q84 158 70 150 Q54 158 41 138 Q27 116 32 82Z" class="${PREFIJO}${hair} ${PREFIJO}line"/>
    <ellipse cx="70" cy="82" rx="40" ry="46" class="${PREFIJO}${skin} ${PREFIJO}line"/>
    <path d="M33 60 Q50 35 70 35 Q92 35 108 62 Q88 50 70 50 Q51 50 33 60Z" class="${PREFIJO}${hair} ${PREFIJO}line"/>

    ${
      accesorio === 'diadema'
        ? `<path d="M44 47 Q70 25 96 47" fill="none" class="${PREFIJO}${accesorioColor} ${PREFIJO}line"/>`
        : `
    <path d="M95 33 L112 23 L112 45 Z" class="${PREFIJO}${accesorioColor} ${PREFIJO}line"/>
    <path d="M95 33 L78 23 L78 45 Z" class="${PREFIJO}${accesorioColor} ${PREFIJO}line"/>
    <circle cx="95" cy="33" r="5" class="${PREFIJO}${accesorioColor} ${PREFIJO}line"/>`
    }

    <circle cx="56" cy="85" r="4.5" class="${PREFIJO}eye"/>
    <circle cx="84" cy="85" r="4.5" class="${PREFIJO}eye"/>
    <path d="M60 105 Q70 115 80 105" fill="none" class="${PREFIJO}thin"/>

    <rect x="43" y="135" width="54" height="82" rx="16" class="${PREFIJO}${shirt} ${PREFIJO}line"/>

    <line x1="43" y1="153" x2="24" y2="215" class="${PREFIJO}line"/>
    <line x1="97" y1="153" x2="116" y2="215" class="${PREFIJO}line"/>

    <rect x="45" y="214" width="23" height="62" rx="5" class="${PREFIJO}${pants} ${PREFIJO}line"/>
    <rect x="72" y="214" width="23" height="62" rx="5" class="${PREFIJO}${pants} ${PREFIJO}line"/>

    <line x1="56" y1="276" x2="56" y2="335" class="${PREFIJO}line"/>
    <line x1="84" y1="276" x2="84" y2="335" class="${PREFIJO}line"/>

    <rect x="37" y="332" width="42" height="22" rx="10" class="${PREFIJO}${shoes} ${PREFIJO}line"/>
    <rect x="70" y="332" width="42" height="22" rx="10" class="${PREFIJO}${shoes} ${PREFIJO}line"/>
  </g>`, opciones);
}

export function generarPersonajeColetasSVG({
  skin = 'skin-light',
  hair = 'hair-brown',
  shirt = 'red',
  pants = 'yellow',
  shoes = 'black',
  accesorioColor = 'red',
  ...opciones
} = {}) {
  return crearSVG500(`
  <g transform="${TRANSFORM_PERSONAJE_NORMAL}">
    <circle cx="40" cy="23" r="21" class="${PREFIJO}${hair} ${PREFIJO}line"/>
    <circle cx="100" cy="23" r="21" class="${PREFIJO}${hair} ${PREFIJO}line"/>
    <circle cx="40" cy="23" r="6" class="${PREFIJO}${accesorioColor} ${PREFIJO}line"/>
    <circle cx="100" cy="23" r="6" class="${PREFIJO}${accesorioColor} ${PREFIJO}line"/>

    <ellipse cx="70" cy="80" rx="42" ry="48" class="${PREFIJO}${skin} ${PREFIJO}line"/>
    <path d="M30 60 Q42 18 70 20 Q98 18 111 60 Q90 48 70 48 Q49 48 30 60Z" class="${PREFIJO}${hair} ${PREFIJO}line"/>

    <circle cx="55" cy="83" r="4.5" class="${PREFIJO}eye"/>
    <circle cx="84" cy="83" r="4.5" class="${PREFIJO}eye"/>
    <path d="M59 103 Q70 114 81 103" fill="none" class="${PREFIJO}thin"/>

    <rect x="43" y="135" width="54" height="82" rx="16" class="${PREFIJO}${shirt} ${PREFIJO}line"/>
    <path d="M46 172 H94 V280 H46 Z" class="${PREFIJO}${pants} ${PREFIJO}line"/>
    <line x1="55" y1="172" x2="55" y2="138" class="${PREFIJO}thin"/>
    <line x1="85" y1="172" x2="85" y2="138" class="${PREFIJO}thin"/>

    <line x1="43" y1="153" x2="24" y2="215" class="${PREFIJO}line"/>
    <line x1="97" y1="153" x2="116" y2="215" class="${PREFIJO}line"/>

    <line x1="56" y1="280" x2="56" y2="335" class="${PREFIJO}line"/>
    <line x1="84" y1="280" x2="84" y2="335" class="${PREFIJO}line"/>

    <rect x="37" y="332" width="42" height="22" rx="10" class="${PREFIJO}${shoes} ${PREFIJO}line"/>
    <rect x="70" y="332" width="42" height="22" rx="10" class="${PREFIJO}${shoes} ${PREFIJO}line"/>
  </g>`, opciones);
}

export function generarPersonajeConVeloSVG({
  skin = 'skin-medium',
  hijab = 'purple',
  shirt = 'blue',
  pants = 'navy',
  shoes = 'white',
  ...opciones
} = {}) {
  return crearSVG500(`
  <g transform="${TRANSFORM_PERSONAJE_VELO}">
    <path d="M30 80 Q32 24 70 19 Q108 24 110 80 L104 150 Q70 170 36 150 Z" class="${PREFIJO}${hijab} ${PREFIJO}line"/>
    <ellipse cx="70" cy="86" rx="34" ry="40" class="${PREFIJO}${skin} ${PREFIJO}line"/>

    <circle cx="58" cy="88" r="4.5" class="${PREFIJO}eye"/>
    <circle cx="82" cy="88" r="4.5" class="${PREFIJO}eye"/>
    <path d="M61 107 Q70 116 79 107" fill="none" class="${PREFIJO}thin"/>

    <path d="M42 145 H98 L108 255 H32 Z" class="${PREFIJO}${shirt} ${PREFIJO}line"/>

    <line x1="42" y1="165" x2="22" y2="245" class="${PREFIJO}line"/>
    <line x1="98" y1="165" x2="118" y2="245" class="${PREFIJO}line"/>

    <rect x="50" y="255" width="22" height="75" rx="6" class="${PREFIJO}${pants} ${PREFIJO}line"/>
    <rect x="76" y="255" width="22" height="75" rx="6" class="${PREFIJO}${pants} ${PREFIJO}line"/>

    <rect x="37" y="328" width="42" height="22" rx="10" class="${PREFIJO}${shoes} ${PREFIJO}line"/>
    <rect x="70" y="328" width="42" height="22" rx="10" class="${PREFIJO}${shoes} ${PREFIJO}line"/>
  </g>`, opciones);
}

export function generarPersonajeSillaRuedasSVG({
  skin = 'skin-light',
  hair = 'hair-dark',
  shirt = 'purple',
  shoes = 'black',
  ...opciones
} = {}) {
  return crearSVG500(`
  <g transform="${TRANSFORM_SILLA_RUEDAS}">
    <circle cx="130" cy="330" r="75" class="${PREFIJO}white ${PREFIJO}line"/>
    <circle cx="130" cy="330" r="13" class="${PREFIJO}metal ${PREFIJO}line"/>
    <line x1="130" y1="255" x2="130" y2="405" class="${PREFIJO}thin"/>
    <line x1="55" y1="330" x2="205" y2="330" class="${PREFIJO}thin"/>
    <line x1="77" y1="277" x2="183" y2="383" class="${PREFIJO}thin"/>
    <line x1="183" y1="277" x2="77" y2="383" class="${PREFIJO}thin"/>

    <circle cx="250" cy="365" r="32" class="${PREFIJO}white ${PREFIJO}line"/>
    <circle cx="250" cy="365" r="7" class="${PREFIJO}metal ${PREFIJO}line"/>

    <path d="M130 250 L220 250 L250 365" fill="none" class="${PREFIJO}line"/>
    <path d="M150 175 L220 250" fill="none" class="${PREFIJO}line"/>
    <path d="M105 250 L220 250" fill="none" class="${PREFIJO}line"/>
    <path d="M220 250 L250 205" fill="none" class="${PREFIJO}line"/>
    <path d="M90 218 H200 L182 270 H100 Z" class="${PREFIJO}gray ${PREFIJO}line"/>

    <ellipse cx="145" cy="70" rx="52" ry="58" class="${PREFIJO}${skin} ${PREFIJO}line"/>
    <path d="M94 48 Q110 0 150 4 Q190 12 198 52 Q170 38 145 38 Q118 38 94 48Z" class="${PREFIJO}${hair} ${PREFIJO}line"/>

    <circle cx="126" cy="74" r="6" class="${PREFIJO}eye"/>
    <circle cx="165" cy="74" r="6" class="${PREFIJO}eye"/>
    <path d="M132 100 Q145 113 160 100" fill="none" class="${PREFIJO}thin"/>

    <rect x="108" y="135" width="76" height="100" rx="20" class="${PREFIJO}${shirt} ${PREFIJO}line"/>
    <path d="M108 185 H184" class="${PREFIJO}thin"/>

    <line x1="108" y1="160" x2="75" y2="245" class="${PREFIJO}line"/>
    <line x1="184" y1="160" x2="225" y2="245" class="${PREFIJO}line"/>

    <path d="M125 235 L170 278" class="${PREFIJO}line"/>
    <path d="M170 235 L220 278" class="${PREFIJO}line"/>

    <rect x="160" y="270" width="58" height="26" rx="12" class="${PREFIJO}${shoes} ${PREFIJO}line"/>
    <rect x="210" y="270" width="58" height="26" rx="12" class="${PREFIJO}${shoes} ${PREFIJO}line"/>
  </g>`, opciones);
}

const DIBUJANTES_POR_VARIANTE = {
  base: generarPersonajeBaseSVG,
  peloLargo: generarPersonajePeloLargoSVG,
  coletas: generarPersonajeColetasSVG,
  velo: generarPersonajeConVeloSVG,
  sillaRuedas: generarPersonajeSillaRuedasSVG
};

/** Sortea qué variante le toca a un personaje nuevo y, junto con ella,
 *  el resto de rasgos al azar (piel, ropa, zapatos...). Pelo corto
 *  ("base"), coletas y diadema/lazo ("peloLargo") salen del accesorio
 *  sorteado; hijab y silla de ruedas son variantes aparte, cada una
 *  con su propia probabilidad. */
function elegirVarianteYRasgosAlAzar({
  permitirVelo = true,
  permitirSillaRuedas = true,
  probabilidadVelo = 0.1,
  probabilidadSillaRuedas = 0.12
} = {}) {
  const usaSilla = permitirSillaRuedas && probabilidad(probabilidadSillaRuedas);
  const usaVelo = !usaSilla && permitirVelo && probabilidad(probabilidadVelo);

  const config = {
    skin: elegir(OPCIONES_PERSONAJE.pieles),
    hair: elegir(OPCIONES_PERSONAJE.pelos),
    shirt: elegir(OPCIONES_PERSONAJE.camisetas),
    pants: elegir(OPCIONES_PERSONAJE.pantalones),
    shoes: elegir(OPCIONES_PERSONAJE.zapatos),
    accesorio: elegir(OPCIONES_PERSONAJE.accesorios),
    accesorioColor: elegir(OPCIONES_PERSONAJE.accesoriosColor),
    hijab: elegir(OPCIONES_PERSONAJE.velos)
  };

  let variante = 'base';
  if (usaSilla) variante = 'sillaRuedas';
  else if (usaVelo) variante = 'velo';
  else if (config.accesorio === 'coletas') variante = 'coletas';
  else if (config.accesorio === 'diadema' || config.accesorio === 'lazo') variante = 'peloLargo';

  return { variante, config };
}

/**
 * Personaje al azar, listo como SVG: pelo corto, pelo largo, coletas,
 * hijab o silla de ruedas, con piel/ropa/zapatos también al azar.
 *
 * opciones admite permitirVelo/permitirSillaRuedas (true por defecto;
 * en false esa variante nunca sale) y probabilidadVelo (0.1 por
 * defecto, ~10% de las veces) / probabilidadSillaRuedas (0.12 por
 * defecto, ~12% de las veces) para ajustar cómo de frecuentes son.
 * También admite fondo (color de fondo, blanco por defecto), etiqueta
 * (si se da, el SVG lleva role="img" + aria-label con ese texto, para
 * cuando el personaje es él mismo la interacción; si no se da, lleva
 * aria-hidden="true" porque se asume decorativo) e incluirEstilos
 * (por defecto true; ponerlo a false evita repetir el bloque <style>
 * si se van a insertar varios personajes en la misma página — basta
 * con que uno de ellos lo incluya).
 */
export function generarPersonajeAleatorioSVG(opciones = {}) {
  const { variante, config } = elegirVarianteYRasgosAlAzar(opciones);
  const dibujar = DIBUJANTES_POR_VARIANTE[variante];
  return dibujar({ ...config, ...opciones });
}

/** Varios personajes al azar (independientes entre sí). */
export function generarVariosPersonajesAleatorios(cantidad = 10, opciones = {}) {
  return Array.from({ length: cantidad }, () => generarPersonajeAleatorioSVG(opciones));
}

/** Descarga un SVG ya generado como archivo. Solo funciona en un
 *  navegador real (usa document/Blob/URL); si se llama desde Node
 *  (p.ej. por error desde las pruebas automáticas) avisa con un error
 *  claro en vez de romper con un ReferenceError críptico. */
export function descargarSVG(svg, nombre = 'personaje.svg') {
  if (typeof document === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') {
    throw new Error('descargarSVG solo funciona en un navegador (necesita document, Blob y URL).');
  }
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();

  URL.revokeObjectURL(url);
}
