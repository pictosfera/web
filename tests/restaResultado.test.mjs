// Pruebas: apps/resta-resultado/restaResultado.js (lógica pura de la
// mecánica "resta pictogramas y elige el resultado").
//
// Lo que pinta en el DOM y escucha clics no se prueba aquí. Sí se
// prueba todo lo demás: los operandos al azar, la generación de
// opciones (resultado + distractores, sin repetidos), y la composición
// completa de un nivel.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  elegirSiguienteMedio,
  operandosAleatorios,
  generarOpciones,
  generarNivel,
  esRespuestaCorrecta
} = await import('../apps/resta-resultado/restaResultado.js');

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
  assert.equal(elegirSiguienteMedio(null, {}), null);
});

test('elegirSiguienteMedio: si todos están usados, puede repetir cualquiera', () => {
  const medios = mediosDePrueba(2);
  const elegido = elegirSiguienteMedio(medios, { evitarIds: ['m0', 'm1'] });
  assert.ok(['m0', 'm1'].includes(elegido.id));
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
    assert.ok(sustraendo >= 1, `sustraendo ${sustraendo} debe ser ≥ 1`);
    assert.ok(sustraendo < minuendo, `sustraendo ${sustraendo} debe ser < minuendo ${minuendo}`);
  }
});

test('operandosAleatorios: resultado siempre ≥ 1', () => {
  for (let i = 0; i < 300; i++) {
    const { resultado } = operandosAleatorios();
    assert.ok(resultado >= 1, `resultado ${resultado} debe ser ≥ 1`);
  }
});

test('operandosAleatorios: resultado = minuendo - sustraendo', () => {
  for (let i = 0; i < 100; i++) {
    const { minuendo, sustraendo, resultado } = operandosAleatorios();
    assert.equal(resultado, minuendo - sustraendo);
  }
});

test('operandosAleatorios: respeta un rango de minuendo distinto', () => {
  for (let i = 0; i < 100; i++) {
    const { minuendo } = operandosAleatorios(5, 7);
    assert.ok(minuendo >= 5 && minuendo <= 7);
  }
});

// --- generarOpciones ---

test('generarOpciones: incluye el resultado correcto entre las opciones', () => {
  for (let i = 0; i < 50; i++) {
    const opciones = generarOpciones(3);
    assert.ok(opciones.includes(3));
  }
});

test('generarOpciones: devuelve 3 opciones distintas por defecto, ninguna repetida', () => {
  const opciones = generarOpciones(5);
  assert.equal(opciones.length, 3);
  assert.equal(new Set(opciones).size, 3);
});

test('generarOpciones: los distractores nunca son el propio resultado', () => {
  for (let i = 0; i < 50; i++) {
    const opciones = generarOpciones(4);
    const distractores = opciones.filter((o) => o !== 4);
    assert.ok(distractores.every((d) => d !== 4));
  }
});

test('generarOpciones: respeta el rango y la cantidad pedidos', () => {
  const opciones = generarOpciones(2, { cantidad: 2, min: 0, max: 9 });
  assert.equal(opciones.length, 2);
  opciones.forEach((o) => assert.ok(o >= 0 && o <= 9));
});

// --- generarNivel ---

test('generarNivel: resultado = minuendo - sustraendo, y está entre las opciones', () => {
  const medios = mediosDePrueba(2);
  for (let i = 0; i < 30; i++) {
    const nivel = generarNivel(medios, { evitarIds: [] });
    assert.equal(nivel.resultado, nivel.minuendo - nivel.sustraendo);
    assert.ok(nivel.opciones.includes(nivel.resultado));
    assert.equal(nivel.opciones.length, 3);
  }
});

test('generarNivel: resultado siempre ≥ 1', () => {
  const medios = mediosDePrueba(2);
  for (let i = 0; i < 200; i++) {
    const nivel = generarNivel(medios, { evitarIds: [] });
    assert.ok(nivel.resultado >= 1, `resultado ${nivel.resultado} debe ser ≥ 1`);
  }
});

test('generarNivel: sin material, devuelve null', () => {
  assert.equal(generarNivel([], {}), null);
});

// --- esRespuestaCorrecta ---

test('esRespuestaCorrecta: compara numéricamente, sin importar si llega como texto', () => {
  assert.equal(esRespuestaCorrecta(3, 3), true);
  assert.equal(esRespuestaCorrecta('3', 3), true);
  assert.equal(esRespuestaCorrecta(4, 3), false);
  assert.equal(esRespuestaCorrecta('4', 3), false);
});

test('esRespuestaCorrecta: el 0 solo es correcto si el resultado es 0', () => {
  assert.equal(esRespuestaCorrecta(0, 0), true);
  assert.equal(esRespuestaCorrecta(0, 1), false);
});
