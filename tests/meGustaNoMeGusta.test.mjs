// Pruebas: apps/me-gusta-no-me-gusta/meGustaNoMeGusta.js (lógica pura
// de la mecánica "me gusta / no me gusta con comidas").
//
// Aquí solo se prueba la lógica pura (material suficiente, elegir la
// comida de la ronda, validar la zona elegida y el formateo de texto):
// el arrastre con puntero, el teclado en las zonas fijas y la pintura
// del DOM dependen del navegador y no se prueban en este archivo,
// igual que en el resto de mecánicas de arrastrar/soltar del proyecto.
// Esta mecánica, a diferencia de las demás, no tiene acierto/fallo:
// cualquiera de las dos zonas es siempre una respuesta válida, por eso
// no hay aquí una función "esRespuestaCorrecta" — solo "esZonaValida".

import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  hayMaterialSuficiente,
  elegirSiguienteMedio,
  esZonaValida,
  formatearPista
} = await import('../apps/me-gusta-no-me-gusta/meGustaNoMeGusta.js');

function mediosDePrueba(prefijo, n) {
  return Array.from({ length: n }, (_, i) => ({ id: `${prefijo}${i}`, nombre: `${prefijo} ${i}` }));
}

// --- hayMaterialSuficiente ---

test('hayMaterialSuficiente: basta con una comida válida', () => {
  assert.equal(hayMaterialSuficiente(mediosDePrueba('comida', 1)), true);
  assert.equal(hayMaterialSuficiente(mediosDePrueba('comida', 10)), true);
});

test('hayMaterialSuficiente: descarta medios sin nombre', () => {
  assert.equal(hayMaterialSuficiente([{ id: 'sin-nombre' }]), false);
});

test('hayMaterialSuficiente: con lista vacía, null o algo que no es lista, devuelve false', () => {
  assert.equal(hayMaterialSuficiente([]), false);
  assert.equal(hayMaterialSuficiente(null), false);
  assert.equal(hayMaterialSuficiente(undefined), false);
  assert.equal(hayMaterialSuficiente('no-es-lista'), false);
});

// --- elegirSiguienteMedio ---

test('elegirSiguienteMedio: elige siempre una de las comidas válidas', () => {
  const medios = mediosDePrueba('comida', 5);
  for (let i = 0; i < 30; i++) {
    const elegido = elegirSiguienteMedio(medios, { evitarIds: [] });
    assert.ok(medios.some((m) => m.id === elegido.id));
  }
});

test('elegirSiguienteMedio: evita repetir las ya usadas mientras queden libres', () => {
  const medios = mediosDePrueba('comida', 3);
  const elegido = elegirSiguienteMedio(medios, { evitarIds: ['comida0', 'comida1'] });
  assert.equal(elegido.id, 'comida2');
});

test('elegirSiguienteMedio: si ya se usaron todas, puede repetir', () => {
  const medios = mediosDePrueba('comida', 2);
  const elegido = elegirSiguienteMedio(medios, { evitarIds: ['comida0', 'comida1'] });
  assert.ok(['comida0', 'comida1'].includes(elegido.id));
});

test('elegirSiguienteMedio: sin medios válidos devuelve null', () => {
  assert.equal(elegirSiguienteMedio([], {}), null);
  assert.equal(elegirSiguienteMedio(null, {}), null);
  assert.equal(elegirSiguienteMedio([{ id: 'sin-nombre' }], {}), null);
});

test('elegirSiguienteMedio: sin segundo argumento no rompe (evitarIds por defecto)', () => {
  const medios = mediosDePrueba('comida', 3);
  const elegido = elegirSiguienteMedio(medios);
  assert.ok(medios.some((m) => m.id === elegido.id));
});

// --- esZonaValida ---

test('esZonaValida: el plato y el cubo de basura son las dos únicas zonas válidas', () => {
  assert.equal(esZonaValida('plato'), true);
  assert.equal(esZonaValida('basura'), true);
});

test('esZonaValida: cualquier otro id no es válido', () => {
  assert.equal(esZonaValida('otra-zona'), false);
  assert.equal(esZonaValida(''), false);
  assert.equal(esZonaValida(null), false);
  assert.equal(esZonaValida(undefined), false);
});

// --- formatearPista ---

test('formatearPista: respeta el ajuste de mayúscula/minúscula', () => {
  assert.equal(formatearPista('Manzana', true), 'MANZANA');
  assert.equal(formatearPista('Manzana', false), 'manzana');
});

test('formatearPista: por defecto pone mayúscula', () => {
  assert.equal(formatearPista('Queso'), 'QUESO');
});

test('formatearPista: con texto vacío o nulo devuelve cadena vacía', () => {
  assert.equal(formatearPista('', true), '');
  assert.equal(formatearPista(null, true), '');
  assert.equal(formatearPista(undefined, true), '');
});
