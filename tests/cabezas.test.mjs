// Pruebas: core/js/cabezas.js
//
// Misma situación que personajes.test.mjs: generar y dibujar una
// cabeza es lógica pura (sortear rasgos + construir una cadena de
// texto SVG), no toca localStorage, fetch ni el DOM, así que no hace
// falta installBrowserShims(). La única excepción es descargarSVG,
// reexportado tal cual desde personajes.js y ya probado allí; aquí
// solo se comprueba que la reexportación funciona.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  OPCIONES_CABEZA,
  generarCabezaBaseSVG,
  generarCabezaPeloLargoSVG,
  generarCabezaConColetasSVG,
  generarCabezaConHijabSVG,
  generarCabezaAleatoriaSVG,
  generarVariasCabezasAleatorias,
  descargarSVG
} = await import('../core/js/cabezas.js');

const { generarPersonajeBaseSVG } = await import('../core/js/personajes.js');

// Un trazo exclusivo de cada variante, para reconocer cuál salió sin
// depender de ningún detalle interno.
const MARCA_VARIANTE = {
  base: /Q70 18 158 25/,
  peloLargo: /Q35 62 88 28/,
  coletas: /cx="78" cy="42" r="45"/,
  hijab: /Q52 40 150 22/
};

// Un trazo exclusivo de cada expresión (los ojos/boca que dibuja
// generarRasgosFaciales).
const MARCA_EXPRESION = {
  contento: /M118 205 Q150 238 182 205/,
  triste: /M118 224 Q150 190 182 224/,
  enfadado: /M96 124 L135 140/,
  asustado: /cx="150" cy="215" rx="18" ry="28"/
};

test('cada función de variante produce un <svg> 500x500 completo con su propio trazo distintivo', () => {
  assert.match(generarCabezaBaseSVG({}), MARCA_VARIANTE.base);
  assert.match(generarCabezaPeloLargoSVG({}), MARCA_VARIANTE.peloLargo);
  assert.match(generarCabezaConColetasSVG({}), MARCA_VARIANTE.coletas);
  assert.match(generarCabezaConHijabSVG({}), MARCA_VARIANTE.hijab);

  for (const svg of [
    generarCabezaBaseSVG({}),
    generarCabezaPeloLargoSVG({}),
    generarCabezaConColetasSVG({}),
    generarCabezaConHijabSVG({})
  ]) {
    assert.match(svg, /<svg width="500" height="500" viewBox="0 0 500 500"/);
    assert.match(svg, /<\/svg>\s*$/);
  }
});

test('OPCIONES_CABEZA expone las cuatro expresiones esperadas', () => {
  assert.deepEqual(OPCIONES_CABEZA.expresiones, ['contento', 'triste', 'enfadado', 'asustado']);
});

test('generarRasgosFaciales (vía cada variante): las cuatro expresiones dibujan su propio rasgo, y una desconocida cae en "contento"', () => {
  for (const [expresion, marca] of Object.entries(MARCA_EXPRESION)) {
    assert.match(generarCabezaBaseSVG({ expresion }), marca);
  }
  assert.match(generarCabezaBaseSVG({ expresion: 'no-existe' }), MARCA_EXPRESION.contento);
  assert.match(generarCabezaBaseSVG({}), MARCA_EXPRESION.contento); // por defecto
});

test('generarCabezaAleatoriaSVG: con muchas tiradas salen las cuatro variantes y las cuatro expresiones', () => {
  const variantesVistas = new Set();
  const expresionesVistas = new Set();
  for (let i = 0; i < 400; i++) {
    const svg = generarCabezaAleatoriaSVG();
    for (const [variante, marca] of Object.entries(MARCA_VARIANTE)) {
      if (marca.test(svg)) variantesVistas.add(variante);
    }
    for (const [expresion, marca] of Object.entries(MARCA_EXPRESION)) {
      if (marca.test(svg)) expresionesVistas.add(expresion);
    }
  }
  assert.deepEqual([...variantesVistas].sort(), Object.keys(MARCA_VARIANTE).sort());
  assert.deepEqual([...expresionesVistas].sort(), Object.keys(MARCA_EXPRESION).sort());
});

test('generarCabezaAleatoriaSVG: permitirHijab:false la excluye siempre', () => {
  for (let i = 0; i < 150; i++) {
    assert.doesNotMatch(generarCabezaAleatoriaSVG({ permitirHijab: false }), MARCA_VARIANTE.hijab);
  }
});

test('generarCabezaAleatoriaSVG: probabilidadHijab:1 fuerza la variante hijab', () => {
  for (let i = 0; i < 20; i++) {
    assert.match(generarCabezaAleatoriaSVG({ probabilidadHijab: 1 }), MARCA_VARIANTE.hijab);
  }
});

test('generarCabezaAleatoriaSVG: expresion fija la expresión sea cual sea la variante sorteada', () => {
  for (let i = 0; i < 40; i++) {
    assert.match(generarCabezaAleatoriaSVG({ expresion: 'asustado' }), MARCA_EXPRESION.asustado);
  }
});

test('generarVariasCabezasAleatorias: devuelve la cantidad pedida, cada uno un SVG completo', () => {
  const lista = generarVariasCabezasAleatorias(6);
  assert.equal(lista.length, 6);
  for (const svg of lista) {
    assert.match(svg, /<svg width="500" height="500"/);
  }
});

test('las clases CSS van prefijadas con "pj-", compartiendo el mismo bloque <style> que personajes.js (no se duplica)', () => {
  const cabeza = generarCabezaBaseSVG({ skin: 'skin-dark' });
  assert.match(cabeza, /class="pj-skin-dark pj-line"/);
  assert.match(cabeza, /\.pj-line\{/);
  assert.doesNotMatch(cabeza, /class="skin-dark line"/);

  const [estiloCabeza] = cabeza.match(/<style>[\s\S]*?<\/style>/);
  const [estiloPersonaje] = generarPersonajeBaseSVG({}).match(/<style>[\s\S]*?<\/style>/);
  assert.equal(estiloCabeza, estiloPersonaje);
});

test('accesibilidad: sin etiqueta es decorativo (aria-hidden); con etiqueta es la propia interacción (role=img + aria-label)', () => {
  const decorativo = generarCabezaBaseSVG({});
  assert.match(decorativo, /aria-hidden="true"/);
  assert.doesNotMatch(decorativo, /role="img"/);

  const interactivo = generarCabezaBaseSVG({ etiqueta: 'Cara de un personaje' });
  assert.match(interactivo, /role="img" aria-label="Cara de un personaje"/);
  assert.doesNotMatch(interactivo, /aria-hidden="true"/);
});

test('incluirEstilos:false omite el bloque <style>', () => {
  const conEstilos = generarCabezaBaseSVG({});
  const sinEstilos = generarCabezaBaseSVG({ incluirEstilos: false });
  assert.match(conEstilos, /<style>/);
  assert.doesNotMatch(sinEstilos, /<style>/);
});

test('fondo se traslada al rect de fondo del SVG', () => {
  const svg = generarCabezaBaseSVG({ fondo: '#abcdef' });
  assert.match(svg, /<rect width="500" height="500" fill="#abcdef"\/>/);
});

test('descargarSVG se reexporta desde personajes.js (mismo aviso claro fuera de un navegador)', () => {
  assert.throws(() => descargarSVG('<svg></svg>'), /solo funciona en un navegador/);
});
