// Pruebas: apps/arrastra-resta/arrastraResta.js (lógica pura de la
// mecánica "arrastra los números de la resta representada con
// pictogramas").
//
// Solo se prueba la lógica pura (operandos, banco de números,
// comprobación de respuesta): el arrastre con puntero y la pintura
// de las casillas dependen del DOM y no se prueban aquí.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  elegirSiguienteMedio,
  operandosAleatorios,
  numerosArrastrables,
  generarNivel,
  esRespuestaCorrecta
} = await import('../apps/arrastra-resta/arrastraResta.js');

function mediosDePrueba(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `m${i}`, nombre: `Medio ${i}` }));
}

// --- elegirSiguienteMedio ---

test('elegirSiguienteMedio: evita repetir mientras queden medios sin usar', () => {
  const medios = mediosDePrueba(3);
  const elegido = elegirSiguienteMedio(medios, { evitarIds: ['m0', 'm1'] });
  assert.equal(elegido.id, 'm2');
});

test('elegirSiguienteMedio: si todos están usados, puede repetir cualquiera', () => {
  const medios = mediosDePrueba(2);
  const elegido = elegirSiguienteMedio(medios, { evitarIds: ['m0', 'm1'] });
  assert.ok(['m0', 'm1'].includes(elegido.id));
});

test('elegirSiguienteMedio: sin medios, devuelve null', () => {
  assert.equal(elegirSiguienteMedio([], {}), null);
  assert.equal(elegirSiguienteMedio(null, {}), null);
});

// --- operandosAleatorios ---

test('operandosAleatorios: minuendo entre 2 y 10', () => {
  for (let i = 0; i < 300; i++) {
    const { minuendo } = operandosAleatorios();
    assert.ok(minuendo >= 2 && minuendo <= 10);
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

test('operandosAleatorios: respeta un rango de minuendo distinto', () => {
  for (let i = 0; i < 100; i++) {
    const { minuendo } = operandosAleatorios(3, 5);
    assert.ok(minuendo >= 3 && minuendo <= 5);
  }
});

// --- numerosArrastrables ---

test('numerosArrastrables: por defecto devuelve 1..10 en orden', () => {
  assert.deepEqual(numerosArrastrables(), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('numerosArrastrables: respeta un rango distinto si se indica', () => {
  assert.deepEqual(numerosArrastrables(3, 6), [3, 4, 5, 6]);
});

// --- generarNivel ---

test('generarNivel: resultado = minuendo - sustraendo', () => {
  const medios = mediosDePrueba(2);
  for (let i = 0; i < 30; i++) {
    const nivel = generarNivel(medios, { evitarIds: [] });
    assert.equal(nivel.resultado, nivel.minuendo - nivel.sustraendo);
    assert.ok(nivel.minuendo >= 2 && nivel.minuendo <= 10);
  }
});

test('generarNivel: resultado siempre ≥ 1 (nunca 0 ni negativo)', () => {
  let minimoVisto = Infinity;
  const medios = mediosDePrueba(2);
  for (let i = 0; i < 300; i++) {
    const nivel = generarNivel(medios, { evitarIds: [] });
    minimoVisto = Math.min(minimoVisto, nivel.resultado);
  }
  assert.ok(minimoVisto >= 1, `el resultado mínimo visto fue ${minimoVisto}`);
});

test('generarNivel: resultado ≤ 9 (cabe en el banco 1-10)', () => {
  let maximoVisto = 0;
  const medios = mediosDePrueba(2);
  for (let i = 0; i < 300; i++) {
    const nivel = generarNivel(medios, { evitarIds: [] });
    maximoVisto = Math.max(maximoVisto, nivel.resultado);
  }
  assert.ok(maximoVisto <= 9, `el resultado máximo visto fue ${maximoVisto}`);
});

test('generarNivel: incluye el medio elegido', () => {
  const medios = mediosDePrueba(1);
  const nivel = generarNivel(medios, { evitarIds: [] });
  assert.equal(nivel.medio.id, 'm0');
});

test('generarNivel: sin material, devuelve null', () => {
  assert.equal(generarNivel([], {}), null);
});

// --- esRespuestaCorrecta ---

test('esRespuestaCorrecta: acepta números y cadenas numéricas equivalentes', () => {
  assert.equal(esRespuestaCorrecta(3, 3), true);
  assert.equal(esRespuestaCorrecta('3', 3), true);
  assert.equal(esRespuestaCorrecta(3, '3'), true);
});

test('esRespuestaCorrecta: rechaza valores distintos', () => {
  assert.equal(esRespuestaCorrecta(4, 3), false);
  assert.equal(esRespuestaCorrecta('4', 3), false);
});

// --- Coherencia: un nivel siempre se puede resolver con el banco 1-10 ---

test('un nivel generado siempre se puede resolver con el banco fijo de números', () => {
  const medios = mediosDePrueba(2);
  const banco = numerosArrastrables();
  for (let i = 0; i < 200; i++) {
    const nivel = generarNivel(medios, { evitarIds: [] });
    const necesarios = [nivel.minuendo, nivel.sustraendo, nivel.resultado];
    necesarios.forEach((valor) => {
      assert.ok(
        banco.some((numero) => esRespuestaCorrecta(numero, valor)),
        `el banco debería incluir un número que sirva para el valor ${valor}`
      );
    });
  }
});
