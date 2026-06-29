// Pruebas: apps/arrastra-numero/arrastraNumero.js (lógica pura de la
// mecánica "cuenta y arrastra el número").
//
// Lo que pinta en el DOM y escucha eventos de puntero/arrastre no se
// prueba aquí. Sí se prueba todo lo demás: la lista de números
// arrastrables, qué medio y qué cantidad toca cada nivel, y la
// comprobación de si un número arrastrado es la respuesta correcta.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  numerosArrastrables,
  elegirSiguienteMedio,
  cantidadAleatoria,
  generarNivel,
  esRespuestaCorrecta
} = await import('../apps/arrastra-numero/arrastraNumero.js');

function mediosDePrueba(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `m${i}`, nombre: `Medio ${i}` }));
}

// --- numerosArrastrables ---

test('numerosArrastrables: por defecto, del 1 al 10 en orden', () => {
  assert.deepEqual(numerosArrastrables(), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('numerosArrastrables: respeta un rango distinto', () => {
  assert.deepEqual(numerosArrastrables(3, 6), [3, 4, 5, 6]);
});

// --- elegirSiguienteMedio ---

test('elegirSiguienteMedio: evita repetir mientras queden medios sin usar', () => {
  const medios = mediosDePrueba(3);
  const elegido = elegirSiguienteMedio(medios, { evitarIds: ['m0', 'm1'] });
  assert.equal(elegido.id, 'm2');
});

test('elegirSiguienteMedio: si ya se usaron todos, puede volver a elegir cualquiera', () => {
  const medios = mediosDePrueba(2);
  const elegido = elegirSiguienteMedio(medios, { evitarIds: ['m0', 'm1'] });
  assert.ok(['m0', 'm1'].includes(elegido.id));
});

test('elegirSiguienteMedio: sin medios, devuelve null', () => {
  assert.equal(elegirSiguienteMedio([], {}), null);
  assert.equal(elegirSiguienteMedio(null, {}), null);
});

// --- cantidadAleatoria ---

test('cantidadAleatoria: siempre cae dentro del rango pedido (inclusive)', () => {
  for (let i = 0; i < 200; i++) {
    const n = cantidadAleatoria(2, 5);
    assert.ok(n >= 2 && n <= 5, `${n} debería estar entre 2 y 5`);
    assert.equal(Math.round(n), n, 'debe ser un entero');
  }
});

test('cantidadAleatoria: por defecto cae entre 1 y 10', () => {
  for (let i = 0; i < 200; i++) {
    const n = cantidadAleatoria();
    assert.ok(n >= 1 && n <= 10, `${n} debería estar entre 1 y 10`);
  }
});

// --- generarNivel ---

test('generarNivel: devuelve un medio y una cantidad válida (1 a 10)', () => {
  const medios = mediosDePrueba(2);
  const nivel = generarNivel(medios, { evitarIds: [] });
  assert.ok(nivel.medio);
  assert.ok(nivel.cantidad >= 1 && nivel.cantidad <= 10);
});

test('generarNivel: sin material, devuelve null', () => {
  assert.equal(generarNivel([], {}), null);
});

// --- esRespuestaCorrecta ---

test('esRespuestaCorrecta: compara numéricamente, sin importar si llega como texto', () => {
  assert.equal(esRespuestaCorrecta(4, 4), true);
  assert.equal(esRespuestaCorrecta('4', 4), true);
  assert.equal(esRespuestaCorrecta(4, '4'), true);
  assert.equal(esRespuestaCorrecta(3, 4), false);
  assert.equal(esRespuestaCorrecta('03', 3), true);
});
