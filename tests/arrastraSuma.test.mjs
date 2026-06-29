// Pruebas: apps/arrastra-suma/arrastraSuma.js (lógica pura de la
// mecánica "arrastra los números de la suma representada con
// pictogramas").
//
// Es la variante de "Escribe los números de la suma" (completa-suma)
// que sustituye la escritura a mano por arrastrar números desde un
// banco fijo. Aquí solo se prueba la lógica pura (qué medio toca, qué
// sumandos, el banco de números y la comprobación de respuesta): el
// arrastre con puntero y la pintura de las casillas dependen del DOM y
// no se prueban en este archivo, igual que en el resto de mecánicas de
// arrastrar/soltar del proyecto.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  elegirSiguienteMedio,
  sumandoAleatorio,
  numerosArrastrables,
  generarNivel,
  esRespuestaCorrecta
} = await import('../apps/arrastra-suma/arrastraSuma.js');

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

// --- sumandoAleatorio ---

test('sumandoAleatorio: por defecto cae entre 1 y 5', () => {
  for (let i = 0; i < 200; i++) {
    const n = sumandoAleatorio();
    assert.ok(n >= 1 && n <= 5);
    assert.ok(Number.isInteger(n));
  }
});

test('sumandoAleatorio: respeta un rango distinto si se indica', () => {
  for (let i = 0; i < 50; i++) {
    const n = sumandoAleatorio(2, 4);
    assert.ok(n >= 2 && n <= 4);
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

test('generarNivel: el resultado es la suma de los dos sumandos generados', () => {
  const medios = mediosDePrueba(2);
  for (let i = 0; i < 30; i++) {
    const nivel = generarNivel(medios, { evitarIds: [] });
    assert.equal(nivel.resultado, nivel.sumando1 + nivel.sumando2);
    assert.ok(nivel.sumando1 >= 1 && nivel.sumando1 <= 5);
    assert.ok(nivel.sumando2 >= 1 && nivel.sumando2 <= 5);
  }
});

test('generarNivel: el resultado nunca supera 10 (cabe en el banco de números)', () => {
  let maximoVisto = 0;
  const medios = mediosDePrueba(2);
  for (let i = 0; i < 300; i++) {
    const nivel = generarNivel(medios, { evitarIds: [] });
    maximoVisto = Math.max(maximoVisto, nivel.resultado);
  }
  assert.ok(maximoVisto <= 10, 'el resultado nunca debería superar 10');
});

test('generarNivel: incluye el medio elegido para repetir en las tres partes', () => {
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

// --- Coherencia entre las piezas de lógica: un nivel siempre se puede
// resolver con el banco fijo de números 1..10 (incluso cuando los dos
// sumandos coinciden, ya que el banco se puede usar más de una vez) ---

test('un nivel generado siempre se puede resolver con el banco fijo de números', () => {
  const medios = mediosDePrueba(2);
  const banco = numerosArrastrables();
  for (let i = 0; i < 200; i++) {
    const nivel = generarNivel(medios, { evitarIds: [] });
    const necesarios = [nivel.sumando1, nivel.sumando2, nivel.resultado];
    necesarios.forEach((valor) => {
      assert.ok(
        banco.some((numero) => esRespuestaCorrecta(numero, valor)),
        `el banco debería incluir un número que sirva para el valor ${valor}`
      );
    });
  }
});
