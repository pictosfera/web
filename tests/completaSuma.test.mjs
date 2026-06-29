// Pruebas: apps/completa-suma/completaSuma.js (lógica pura de la
// mecánica "escribe los números de una suma representada con
// pictogramas").
//
// El motor de reconocimiento de trazo es una copia deliberada del de
// "Escribe la letra" / "Cuenta y escribe el número" (ver
// tests/escribeLetra.test.mjs y tests/escribeNumero.test.mjs): aquí se
// repiten las comprobaciones estructurales clave para confirmar que la
// copia funciona igual, además de la lógica propia de esta mecánica
// (qué medio y qué sumandos tocan cada nivel). Lo que pinta en un
// <canvas> real y la validación independiente de las 3 casillas (que
// depende del DOM) no se prueban aquí.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  elegirSiguienteMedio,
  sumandoAleatorio,
  generarNivel,
  dilatarMascara,
  contarPixeles,
  proporcionDentro,
  indicesPorZona,
  cubreTodasLasZonas,
  NIVELES_TRAZO,
  configTolerancia,
  evaluarTrazo
} = await import('../apps/completa-suma/completaSuma.js');

function mediosDePrueba(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `m${i}`, nombre: `Medio ${i}` }));
}

// --- elegirSiguienteMedio / sumandoAleatorio / generarNivel ---

test('elegirSiguienteMedio: evita repetir mientras queden medios sin usar', () => {
  const medios = mediosDePrueba(3);
  const elegido = elegirSiguienteMedio(medios, { evitarIds: ['m0', 'm1'] });
  assert.equal(elegido.id, 'm2');
});

test('elegirSiguienteMedio: sin medios, devuelve null', () => {
  assert.equal(elegirSiguienteMedio([], {}), null);
});

test('sumandoAleatorio: por defecto cae entre 1 y 5', () => {
  for (let i = 0; i < 200; i++) {
    const n = sumandoAleatorio();
    assert.ok(n >= 1 && n <= 5);
  }
});

test('generarNivel: el resultado es la suma de los dos sumandos generados', () => {
  const medios = mediosDePrueba(2);
  for (let i = 0; i < 30; i++) {
    const nivel = generarNivel(medios, { evitarIds: [] });
    assert.equal(nivel.resultado, nivel.sumando1 + nivel.sumando2);
    assert.ok(nivel.sumando1 >= 1 && nivel.sumando1 <= 5);
    assert.ok(nivel.sumando2 >= 1 && nivel.sumando2 <= 5);
  }
});

test('generarNivel: el resultado puede llegar a necesitar dos cifras (hasta 10)', () => {
  // Con sumandos entre 1 y 5, el resultado máximo posible es 10: basta
  // con comprobar que el rango declarado de la mecánica (caben "10" en
  // la casilla) es coherente con el máximo real que puede generarse.
  let maximoVisto = 0;
  const medios = mediosDePrueba(2);
  for (let i = 0; i < 300; i++) {
    const nivel = generarNivel(medios, { evitarIds: [] });
    maximoVisto = Math.max(maximoVisto, nivel.resultado);
  }
  assert.ok(maximoVisto <= 10, 'el resultado nunca debería superar 10');
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

test('indicesPorZona: reparte una rejilla en divisiones×divisiones zonas que cubren toda la rejilla sin solapes', () => {
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
