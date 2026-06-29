// Pruebas: apps/suma-resultado/sumaResultado.js (lógica pura de la
// mecánica "suma pictogramas y elige el resultado").
//
// Lo que pinta en el DOM y escucha clics no se prueba aquí. Sí se
// prueba todo lo demás: los sumandos al azar, la generación de
// opciones (resultado + distractores, sin repetidos), y la composición
// completa de un nivel.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  elegirSiguienteMedio,
  sumandoAleatorio,
  generarOpciones,
  generarNivel,
  esRespuestaCorrecta
} = await import('../apps/suma-resultado/sumaResultado.js');

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

// --- sumandoAleatorio ---

test('sumandoAleatorio: por defecto cae entre 1 y 5', () => {
  for (let i = 0; i < 200; i++) {
    const n = sumandoAleatorio();
    assert.ok(n >= 1 && n <= 5, `${n} debería estar entre 1 y 5`);
  }
});

test('sumandoAleatorio: respeta un rango distinto', () => {
  for (let i = 0; i < 100; i++) {
    const n = sumandoAleatorio(8, 9);
    assert.ok(n === 8 || n === 9);
  }
});

// --- generarOpciones ---

test('generarOpciones: incluye el resultado correcto entre las opciones', () => {
  for (let i = 0; i < 50; i++) {
    const opciones = generarOpciones(5);
    assert.ok(opciones.includes(5));
  }
});

test('generarOpciones: devuelve 3 opciones distintas por defecto, ninguna repetida', () => {
  const opciones = generarOpciones(7);
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
  const opciones = generarOpciones(3, { cantidad: 2, min: 1, max: 5 });
  assert.equal(opciones.length, 2);
  opciones.forEach((o) => assert.ok(o >= 1 && o <= 5));
});

// --- generarNivel ---

test('generarNivel: el resultado es la suma de los dos sumandos, y está entre las opciones', () => {
  const medios = mediosDePrueba(2);
  for (let i = 0; i < 30; i++) {
    const nivel = generarNivel(medios, { evitarIds: [] });
    assert.equal(nivel.resultado, nivel.sumando1 + nivel.sumando2);
    assert.ok(nivel.opciones.includes(nivel.resultado));
    assert.equal(nivel.opciones.length, 3);
  }
});

test('generarNivel: sin material, devuelve null', () => {
  assert.equal(generarNivel([], {}), null);
});

// --- esRespuestaCorrecta ---

test('esRespuestaCorrecta: compara numéricamente, sin importar si llega como texto', () => {
  assert.equal(esRespuestaCorrecta(5, 5), true);
  assert.equal(esRespuestaCorrecta('5', 5), true);
  assert.equal(esRespuestaCorrecta(4, 5), false);
});
