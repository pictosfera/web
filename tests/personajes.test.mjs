// Pruebas: core/js/personajes.js
//
// A diferencia de la mayoría de pruebas del proyecto, este módulo no
// necesita installBrowserShims(): generar y dibujar un personaje es
// lógica pura (sortear rasgos + construir una cadena de texto SVG),
// no toca localStorage, fetch ni el DOM. La única excepción es
// descargarSVG, que SÍ necesita un navegador real; aquí se comprueba
// justo lo contrario, que avisa con claridad si no lo hay (en vez de
// dejar `document` sin definir y romper con un error críptico).

import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  generarPersonajeBaseSVG,
  generarPersonajePeloLargoSVG,
  generarPersonajeColetasSVG,
  generarPersonajeConVeloSVG,
  generarPersonajeSillaRuedasSVG,
  generarPersonajeAleatorioSVG,
  generarVariosPersonajesAleatorios,
  descargarSVG
} = await import('../core/js/personajes.js');

// Un trazo de path/forma exclusivo de cada variante, para reconocer
// cuál salió sin depender de ningún detalle interno.
const MARCA = {
  base: /M30 60 Q42 18 78 20/,
  peloLargo: /M32 82 Q26 44 44 25/,
  coletas: /cx="40" cy="23" r="21"/,
  velo: /M30 80 Q32 24 70 19/,
  sillaRuedas: /cx="130" cy="330" r="75"/
};

test('cada función de variante produce un <svg> 500x500 completo con su propio trazo distintivo', () => {
  assert.match(generarPersonajeBaseSVG({}), MARCA.base);
  assert.match(generarPersonajePeloLargoSVG({}), MARCA.peloLargo);
  assert.match(generarPersonajeColetasSVG({}), MARCA.coletas);
  assert.match(generarPersonajeConVeloSVG({}), MARCA.velo);
  assert.match(generarPersonajeSillaRuedasSVG({}), MARCA.sillaRuedas);

  for (const svg of [
    generarPersonajeBaseSVG({}),
    generarPersonajePeloLargoSVG({}),
    generarPersonajeColetasSVG({}),
    generarPersonajeConVeloSVG({}),
    generarPersonajeSillaRuedasSVG({})
  ]) {
    assert.match(svg, /<svg width="500" height="500" viewBox="0 0 500 500"/);
    assert.match(svg, /<\/svg>\s*$/);
  }
});

test('generarPersonajeAleatorioSVG: con muchas tiradas salen las cinco variantes (pelo corto, pelo largo, coletas, hijab, silla)', () => {
  const vistas = new Set();
  for (let i = 0; i < 400; i++) {
    const svg = generarPersonajeAleatorioSVG();
    for (const [variante, marca] of Object.entries(MARCA)) {
      if (marca.test(svg)) vistas.add(variante);
    }
  }
  assert.deepEqual([...vistas].sort(), Object.keys(MARCA).sort());
});

test('generarPersonajeAleatorioSVG: permitirVelo/permitirSillaRuedas en false las excluye siempre', () => {
  for (let i = 0; i < 150; i++) {
    const svg = generarPersonajeAleatorioSVG({ permitirVelo: false, permitirSillaRuedas: false });
    assert.doesNotMatch(svg, MARCA.velo);
    assert.doesNotMatch(svg, MARCA.sillaRuedas);
  }
});

test('generarPersonajeAleatorioSVG: probabilidad 1 fuerza la variante (silla por delante de velo)', () => {
  for (let i = 0; i < 20; i++) {
    assert.match(generarPersonajeAleatorioSVG({ probabilidadSillaRuedas: 1, probabilidadVelo: 1 }), MARCA.sillaRuedas);
  }
  for (let i = 0; i < 20; i++) {
    assert.match(generarPersonajeAleatorioSVG({ probabilidadSillaRuedas: 0, probabilidadVelo: 1 }), MARCA.velo);
  }
});

test('las clases CSS van prefijadas con "pj-" (un <style> embebido en un SVG no queda aislado al insertarlo con innerHTML)', () => {
  const svg = generarPersonajeBaseSVG({ skin: 'skin-dark', shirt: 'red' });
  assert.match(svg, /class="pj-skin-dark pj-line"/);
  assert.match(svg, /class="pj-red pj-line"/);
  assert.match(svg, /\.pj-line\{/);
  assert.doesNotMatch(svg, /class="skin-dark line"/);
});

test('accesibilidad: sin etiqueta es decorativo (aria-hidden); con etiqueta es la propia interacción (role=img + aria-label)', () => {
  const decorativo = generarPersonajeBaseSVG({});
  assert.match(decorativo, /aria-hidden="true"/);
  assert.doesNotMatch(decorativo, /role="img"/);

  const interactivo = generarPersonajeBaseSVG({ etiqueta: 'Personaje sorpresa' });
  assert.match(interactivo, /role="img" aria-label="Personaje sorpresa"/);
  assert.doesNotMatch(interactivo, /aria-hidden="true"/);
});

test('la etiqueta se escapa al insertarse como atributo', () => {
  const svg = generarPersonajeBaseSVG({ etiqueta: 'Dice "hola"' });
  assert.match(svg, /aria-label="Dice &quot;hola&quot;"/);
});

test('incluirEstilos:false omite el bloque <style> (para no repetirlo al insertar varios personajes en la misma página)', () => {
  const conEstilos = generarPersonajeBaseSVG({});
  const sinEstilos = generarPersonajeBaseSVG({ incluirEstilos: false });
  assert.match(conEstilos, /<style>/);
  assert.doesNotMatch(sinEstilos, /<style>/);
});

test('fondo se traslada al rect de fondo del SVG', () => {
  const svg = generarPersonajeBaseSVG({ fondo: '#abcdef' });
  assert.match(svg, /<rect width="500" height="500" fill="#abcdef"\/>/);
});

test('generarVariosPersonajesAleatorios: devuelve la cantidad pedida, cada uno un SVG completo', () => {
  const lista = generarVariosPersonajesAleatorios(7);
  assert.equal(lista.length, 7);
  for (const svg of lista) {
    assert.match(svg, /<svg width="500" height="500"/);
  }
});

test('descargarSVG: fuera de un navegador avisa con un error claro en vez de romper con document is not defined', () => {
  assert.throws(() => descargarSVG('<svg></svg>'), /solo funciona en un navegador/);
});
