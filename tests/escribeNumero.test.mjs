// Pruebas: apps/escribe-numero/escribeNumero.js (lógica pura de la
// mecánica "cuenta y escribe el número").
//
// El motor de reconocimiento de trazo es una copia deliberada del de
// "Escribe la letra" (ver tests/escribeLetra.test.mjs): aquí se repiten
// las mismas comprobaciones estructurales (cobertura, desvío, zonas)
// para confirmar que la copia funciona igual, además de la lógica
// propia de esta mecánica (qué medio y qué cantidad toca cada nivel).
// Lo que pinta en un <canvas> real y escucha eventos de puntero no se
// prueba aquí (no hay Canvas en Node).

import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  elegirSiguienteMedio,
  cantidadAleatoria,
  generarNivel,
  dilatarMascara,
  contarPixeles,
  proporcionDentro,
  indicesPorZona,
  cubreTodasLasZonas,
  NIVELES_TRAZO,
  configTolerancia,
  evaluarTrazo
} = await import('../apps/escribe-numero/escribeNumero.js');

function mediosDePrueba(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `m${i}`, nombre: `Medio ${i}` }));
}

// --- elegirSiguienteMedio / cantidadAleatoria / generarNivel ---

test('elegirSiguienteMedio: evita repetir mientras queden medios sin usar', () => {
  const medios = mediosDePrueba(3);
  const elegido = elegirSiguienteMedio(medios, { evitarIds: ['m0', 'm1'] });
  assert.equal(elegido.id, 'm2');
});

test('elegirSiguienteMedio: sin medios, devuelve null', () => {
  assert.equal(elegirSiguienteMedio([], {}), null);
  assert.equal(elegirSiguienteMedio(null, {}), null);
});

test('cantidadAleatoria: siempre cae dentro del rango pedido (inclusive), por defecto 1 a 10', () => {
  for (let i = 0; i < 200; i++) {
    const n = cantidadAleatoria();
    assert.ok(n >= 1 && n <= 10, `${n} debería estar entre 1 y 10`);
  }
});

test('generarNivel: devuelve un medio y una cantidad (1 a 10), o null sin material', () => {
  const medios = mediosDePrueba(2);
  const nivel = generarNivel(medios, { evitarIds: [] });
  assert.ok(nivel.medio);
  assert.ok(nivel.cantidad >= 1 && nivel.cantidad <= 10);
  assert.equal(generarNivel([], {}), null);
});

// --- dilatarMascara / contarPixeles / proporcionDentro ---

test('dilatarMascara: con radio 0 devuelve una copia igual', () => {
  const m = [0, 1, 0, 0, 1, 0];
  const resultado = dilatarMascara(m, 3, 2, 0);
  assert.deepEqual(resultado, m);
  assert.notEqual(resultado, m);
});

test('dilatarMascara: ensancha cada píxel a sus vecinos dentro del radio', () => {
  const m = [0, 0, 0, 0, 1, 0, 0, 0, 0];
  const resultado = dilatarMascara(m, 3, 3, 1);
  assert.deepEqual(resultado, [1, 1, 1, 1, 1, 1, 1, 1, 1]);
});

test('contarPixeles: cuenta los píxeles a 1', () => {
  assert.equal(contarPixeles([0, 1, 1, 0, 1]), 3);
  assert.equal(contarPixeles([0, 0, 0]), 0);
});

test('proporcionDentro: proporción de píxeles de A que también están en B', () => {
  const a = [1, 1, 0, 1];
  const b = [1, 0, 0, 1];
  assert.equal(proporcionDentro(a, b), 2 / 3);
  assert.equal(proporcionDentro([0, 0, 0], b), 0);
  assert.equal(proporcionDentro(a, a), 1);
});

// --- configTolerancia / evaluarTrazo ---

test('configTolerancia: facil es más permisivo que normal, y normal que dificil', () => {
  const facil = configTolerancia('facil');
  const normal = configTolerancia('normal');
  const dificil = configTolerancia('dificil');
  assert.ok(facil.radio >= normal.radio && normal.radio >= dificil.radio);
  assert.ok(facil.minCobertura <= normal.minCobertura && normal.minCobertura <= dificil.minCobertura);
  assert.ok(facil.maxDesvio >= normal.maxDesvio && normal.maxDesvio >= dificil.maxDesvio);
});

test('configTolerancia: un nivel desconocido cae a "facil"', () => {
  assert.deepEqual(configTolerancia('lo-que-sea'), NIVELES_TRAZO.facil);
  assert.deepEqual(configTolerancia(undefined), NIVELES_TRAZO.facil);
});

test('evaluarTrazo: un trazo que calca bien el número es correcto', () => {
  const ancho = 6;
  const alto = 6;
  const mascaraReferencia = new Array(ancho * alto).fill(0);
  for (let x = 0; x < ancho; x++) mascaraReferencia[2 * ancho + x] = 1;
  const mascaraTrazo = mascaraReferencia.slice();

  const resultado = evaluarTrazo({ mascaraReferencia, mascaraTrazo, ancho, alto }, 'normal');
  assert.equal(resultado.correcto, true);
  assert.equal(resultado.cobertura, 1);
  assert.equal(resultado.desvio, 0);
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

test('evaluarTrazo: un trazo que solo cubre una de dos cifras separadas (p.ej. "1" de "10") no es correcto', () => {
  // Simula un número de dos cifras: dos bloques de tinta separados (como
  // el "1" y el "0" de "10"). El trazo del niño solo calca el primero.
  const ancho = 18;
  const alto = 18;
  const mascaraReferencia = new Array(ancho * alto).fill(0);
  for (let y = 0; y <= 3; y++) {
    for (let x = 0; x <= 3; x++) mascaraReferencia[y * ancho + x] = 1; // primera cifra
  }
  for (let y = 14; y <= 17; y++) {
    for (let x = 14; x <= 17; x++) mascaraReferencia[y * ancho + x] = 1; // segunda cifra
  }
  const mascaraTrazo = new Array(ancho * alto).fill(0);
  for (let y = 0; y <= 5; y++) {
    for (let x = 0; x <= 5; x++) mascaraTrazo[y * ancho + x] = 1; // solo la primera cifra, garabato grueso
  }

  for (const nivel of ['facil', 'normal']) {
    const resultado = evaluarTrazo({ mascaraReferencia, mascaraTrazo, ancho, alto }, nivel);
    assert.equal(resultado.zonasCubiertas, false, `nivel ${nivel}: debería faltar la segunda cifra`);
    assert.equal(resultado.correcto, false, `nivel ${nivel} no debería aceptar solo una de las dos cifras`);
  }
});

test('evaluarTrazo: un garabato que cubre el número pero se sale mucho no es correcto', () => {
  const ancho = 10;
  const alto = 10;
  const mascaraReferencia = new Array(ancho * alto).fill(0);
  for (let x = 2; x < 8; x++) mascaraReferencia[5 * ancho + x] = 1;
  const mascaraTrazo = new Array(ancho * alto).fill(1);

  const resultado = evaluarTrazo({ mascaraReferencia, mascaraTrazo, ancho, alto }, 'normal');
  assert.equal(resultado.correcto, false);
  assert.ok(resultado.desvio > configTolerancia('normal').maxDesvio);
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
  const trazoCompleto = referencia.slice();
  const trazoVacio = new Array(16).fill(0);
  assert.equal(cubreTodasLasZonas(referencia, trazoCompleto, zonas, 2), true);
  assert.equal(cubreTodasLasZonas(referencia, trazoVacio, zonas, 2), false);
  assert.equal(cubreTodasLasZonas(referencia, trazoVacio, zonas, 5), true);
});
