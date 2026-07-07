// Pruebas: apps/completa-resta/completaResta.js (lógica pura de la
// mecánica "escribe los números de una resta representada con
// pictogramas").
//
// El motor de reconocimiento de trazo es una copia deliberada del de
// "Escribe los números de la suma" (ver tests/completaSuma.test.mjs):
// aquí se repiten las comprobaciones estructurales clave para confirmar
// que la copia funciona igual. La diferencia respecto a completaSuma es
// la aritmética: operandosAleatorios en lugar de sumandoAleatorio.
// Lo que pinta en un <canvas> real y la validación de las 3 casillas
// (que depende del DOM) no se prueban aquí.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  elegirSiguienteMedio,
  operandosAleatorios,
  generarNivel,
  dilatarMascara,
  contarPixeles,
  proporcionDentro,
  indicesPorZona,
  cubreTodasLasZonas,
  NIVELES_TRAZO,
  configTolerancia,
  evaluarTrazo
} = await import('../apps/completa-resta/completaResta.js');

function mediosDePrueba(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `m${i}`, nombre: `Medio ${i}` }));
}

// --- elegirSiguienteMedio ---

test('elegirSiguienteMedio: evita repetir mientras queden medios sin usar', () => {
  const medios = mediosDePrueba(3);
  const elegido = elegirSiguienteMedio(medios, { evitarIds: ['m0', 'm1'] });
  assert.equal(elegido.id, 'm2');
});

test('elegirSiguienteMedio: sin medios, devuelve null', () => {
  assert.equal(elegirSiguienteMedio([], {}), null);
});

// --- operandosAleatorios ---

test('operandosAleatorios: minuendo entre 2 y 10', () => {
  for (let i = 0; i < 300; i++) {
    const { minuendo } = operandosAleatorios();
    assert.ok(minuendo >= 2 && minuendo <= 10, `minuendo ${minuendo} fuera de rango`);
    assert.ok(Number.isInteger(minuendo));
  }
});

test('operandosAleatorios: sustraendo entre 1 y (minuendo-1)', () => {
  for (let i = 0; i < 300; i++) {
    const { minuendo, sustraendo } = operandosAleatorios();
    assert.ok(sustraendo >= 1);
    assert.ok(sustraendo < minuendo);
  }
});

test('operandosAleatorios: resultado siempre ≥ 1 y = minuendo - sustraendo', () => {
  for (let i = 0; i < 300; i++) {
    const { minuendo, sustraendo, resultado } = operandosAleatorios();
    assert.equal(resultado, minuendo - sustraendo);
    assert.ok(resultado >= 1);
  }
});

// --- generarNivel ---

test('generarNivel: el resultado es minuendo - sustraendo', () => {
  const medios = mediosDePrueba(2);
  for (let i = 0; i < 30; i++) {
    const nivel = generarNivel(medios, { evitarIds: [] });
    assert.equal(nivel.resultado, nivel.minuendo - nivel.sustraendo);
    assert.ok(nivel.resultado >= 1);
  }
});

test('generarNivel: los valores caben en la casilla de escritura (≤ 10)', () => {
  let maximoVisto = 0;
  const medios = mediosDePrueba(2);
  for (let i = 0; i < 300; i++) {
    const nivel = generarNivel(medios, { evitarIds: [] });
    maximoVisto = Math.max(maximoVisto, nivel.minuendo, nivel.sustraendo, nivel.resultado);
  }
  assert.ok(maximoVisto <= 10, `el valor máximo visto fue ${maximoVisto}`);
});

test('generarNivel: sin material, devuelve null', () => {
  assert.equal(generarNivel([], {}), null);
});

// --- dilatarMascara / contarPixeles / proporcionDentro ---

test('dilatarMascara: con radio 0 devuelve una copia igual', () => {
  const m = [0, 1, 0, 0, 1, 0];
  const resultado = dilatarMascara(m, 3, 2, 0);
  assert.deepEqual(resultado, m);
  assert.notEqual(resultado, m);
});

test('contarPixeles: cuenta los píxeles a 1', () => {
  assert.equal(contarPixeles([0, 1, 1, 0, 1]), 3);
});

test('proporcionDentro: proporción de píxeles de A que también están en B', () => {
  const a = [1, 1, 0, 1];
  const b = [1, 0, 0, 1];
  assert.equal(proporcionDentro(a, b), 2 / 3);
  assert.equal(proporcionDentro([0, 0, 0], b), 0);
});

// --- configTolerancia / evaluarTrazo ---

test('configTolerancia: facil es más permisivo que dificil, y un nivel desconocido cae a facil', () => {
  const facil = configTolerancia('facil');
  const dificil = configTolerancia('dificil');
  assert.ok(facil.radio >= dificil.radio);
  assert.ok(facil.minCobertura <= dificil.minCobertura);
  assert.deepEqual(configTolerancia('lo-que-sea'), NIVELES_TRAZO.facil);
});

test('evaluarTrazo: un trazo que calca bien el número es correcto', () => {
  const ancho = 6;
  const alto = 6;
  const mascaraReferencia = new Array(ancho * alto).fill(0);
  for (let x = 0; x < ancho; x++) mascaraReferencia[2 * ancho + x] = 1;
  const mascaraTrazo = mascaraReferencia.slice();

  const resultado = evaluarTrazo({ mascaraReferencia, mascaraTrazo, ancho, alto }, 'normal');
  assert.equal(resultado.correcto, true);
});

test('evaluarTrazo: un trazo casi vacío no es correcto en ningún nivel', () => {
  const ancho = 6;
  const alto = 6;
  const mascaraReferencia = new Array(ancho * alto).fill(0);
  for (let x = 0; x < ancho; x++) mascaraReferencia[2 * ancho + x] = 1;
  const mascaraTrazo = new Array(ancho * alto).fill(0);
  mascaraTrazo[0] = 1;

  for (const nivel of ['facil', 'normal', 'dificil']) {
    const resultado = evaluarTrazo({ mascaraReferencia, mascaraTrazo, ancho, alto }, nivel);
    assert.equal(resultado.correcto, false, `nivel ${nivel} no debería aceptar un punto suelto`);
  }
});

test('indicesPorZona: cubre toda la rejilla sin solapes', () => {
  const zonas = indicesPorZona(6, 6, 3);
  assert.equal(zonas.length, 9);
  const todos = zonas.flat().sort((a, b) => a - b);
  assert.deepEqual(todos, Array.from({ length: 36 }, (_, i) => i));
});

test('cubreTodasLasZonas: exige tinta de trazo solo en las zonas con tinta de referencia de sobra', () => {
  const zonas = indicesPorZona(4, 4, 2);
  const referencia = [
    1, 1, 0, 0,
    1, 1, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 0
  ];
  const trazoVacio = new Array(16).fill(0);
  assert.equal(cubreTodasLasZonas(referencia, referencia.slice(), zonas, 2), true);
  assert.equal(cubreTodasLasZonas(referencia, trazoVacio, zonas, 2), false);
});
