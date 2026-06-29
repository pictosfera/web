// Pruebas: apps/lista-compra/listaCompra.js (lógica pura de la
// mecánica "lista de la compra").
//
// Aquí solo se prueba la lógica pura (mezclar, comprobar material
// suficiente, generar la lista y el estante de una ronda, detectar
// coincidencias y ronda completa, y el formateo de texto): el arrastre
// con puntero, el toque simple como intento directo, el teclado y la
// pintura del DOM dependen del navegador y no se prueban en este
// archivo, igual que en el resto de mecánicas de arrastrar/soltar del
// proyecto.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  mezclar,
  hayMaterialSuficiente,
  generarRonda,
  esCoincidencia,
  rondaCompleta,
  formatearTexto
} = await import('../apps/lista-compra/listaCompra.js');

function mediosDePrueba(prefijo, n) {
  return Array.from({ length: n }, (_, i) => ({ id: `${prefijo}${i}`, nombre: `${prefijo} ${i}` }));
}

// --- mezclar ---

test('mezclar: conserva todos los elementos, solo cambia el orden', () => {
  const original = mediosDePrueba('m', 8);
  const copia = mezclar(original);
  assert.equal(copia.length, original.length);
  assert.deepEqual([...copia].sort((a, b) => a.id.localeCompare(b.id)), original);
});

test('mezclar: no muta la lista original', () => {
  const original = mediosDePrueba('m', 5);
  const original2 = mediosDePrueba('m', 5);
  mezclar(original);
  assert.deepEqual(original, original2);
});

test('mezclar: con lista vacía, null o undefined no rompe', () => {
  assert.deepEqual(mezclar([]), []);
  assert.deepEqual(mezclar(null), []);
  assert.deepEqual(mezclar(undefined), []);
});

// --- hayMaterialSuficiente ---

test('hayMaterialSuficiente: hacen falta al menos 10 pictogramas válidos', () => {
  assert.equal(hayMaterialSuficiente(mediosDePrueba('m', 10)), true);
  assert.equal(hayMaterialSuficiente(mediosDePrueba('m', 15)), true);
  assert.equal(hayMaterialSuficiente(mediosDePrueba('m', 9)), false);
});

test('hayMaterialSuficiente: descarta medios sin nombre antes de contar', () => {
  const medios = [...mediosDePrueba('m', 9), { id: 'sin-nombre' }];
  assert.equal(hayMaterialSuficiente(medios), false);
});

test('hayMaterialSuficiente: con lista vacía, null o undefined devuelve false', () => {
  assert.equal(hayMaterialSuficiente([]), false);
  assert.equal(hayMaterialSuficiente(null), false);
  assert.equal(hayMaterialSuficiente(undefined), false);
});

// --- generarRonda ---

test('generarRonda: sin material suficiente devuelve null', () => {
  assert.equal(generarRonda(mediosDePrueba('m', 9)), null);
  assert.equal(generarRonda([]), null);
  assert.equal(generarRonda(null), null);
});

test('generarRonda: la lista tiene 5 pictogramas y el estante 10', () => {
  const medios = mediosDePrueba('m', 12);
  const ronda = generarRonda(medios);
  assert.equal(ronda.lista.length, 5);
  assert.equal(ronda.estante.length, 10);
});

test('generarRonda: el estante contiene exactamente los 5 de la lista más 5 señuelos distintos', () => {
  const medios = mediosDePrueba('m', 12);
  const ronda = generarRonda(medios);
  const idsLista = new Set(ronda.lista.map((m) => m.id));
  const idsEstante = new Set(ronda.estante.map((m) => m.id));
  assert.equal(idsEstante.size, 10); // sin duplicados
  idsLista.forEach((id) => assert.ok(idsEstante.has(id)));
  const senuelos = ronda.estante.filter((m) => !idsLista.has(m.id));
  assert.equal(senuelos.length, 5);
});

test('generarRonda: con exactamente el mínimo de material (10), genera ronda igualmente', () => {
  const medios = mediosDePrueba('m', 10);
  const ronda = generarRonda(medios);
  assert.equal(ronda.lista.length, 5);
  assert.equal(ronda.estante.length, 10);
});

test('generarRonda: descarta medios sin nombre antes de elegir', () => {
  const medios = [...mediosDePrueba('m', 10), { id: 'sin-nombre' }, { id: 'otro-sin-nombre' }];
  const ronda = generarRonda(medios);
  assert.ok(ronda);
  ronda.estante.forEach((m) => assert.ok(m.nombre));
});

// --- esCoincidencia ---

test('esCoincidencia: true si el id del medio está en la lista', () => {
  const lista = mediosDePrueba('m', 5);
  assert.equal(esCoincidencia(lista[2], lista), true);
  assert.equal(esCoincidencia({ id: 'm2', nombre: 'otro nombre' }, lista), true); // se compara por id
});

test('esCoincidencia: false si el id del medio no está en la lista', () => {
  const lista = mediosDePrueba('m', 5);
  assert.equal(esCoincidencia({ id: 'm-otro', nombre: 'x' }, lista), false);
});

test('esCoincidencia: con medio nulo o lista inválida no rompe', () => {
  const lista = mediosDePrueba('m', 5);
  assert.equal(esCoincidencia(null, lista), false);
  assert.equal(esCoincidencia(undefined, lista), false);
  assert.equal(esCoincidencia(lista[0], null), false);
  assert.equal(esCoincidencia(lista[0], undefined), false);
  assert.equal(esCoincidencia(lista[0], 'no-es-lista'), false);
});

// --- rondaCompleta ---

test('rondaCompleta: true solo cuando todos los ids de la lista están añadidos', () => {
  const lista = mediosDePrueba('m', 5);
  const todosLosIds = lista.map((m) => m.id);
  assert.equal(rondaCompleta(todosLosIds, lista), true);
  assert.equal(rondaCompleta(todosLosIds.slice(0, 4), lista), false);
  assert.equal(rondaCompleta([], lista), false);
});

test('rondaCompleta: el orden de los añadidos no importa', () => {
  const lista = mediosDePrueba('m', 5);
  const idsDesordenados = [...lista.map((m) => m.id)].reverse();
  assert.equal(rondaCompleta(idsDesordenados, lista), true);
});

test('rondaCompleta: ids añadidos de más (ruido) no afectan si ya están todos', () => {
  const lista = mediosDePrueba('m', 3);
  const ids = [...lista.map((m) => m.id), 'extra-1', 'extra-2'];
  assert.equal(rondaCompleta(ids, lista), true);
});

test('rondaCompleta: con lista vacía o inválida devuelve false', () => {
  assert.equal(rondaCompleta(['m0'], []), false);
  assert.equal(rondaCompleta(['m0'], null), false);
  assert.equal(rondaCompleta(['m0'], undefined), false);
});

// --- formatearTexto ---

test('formatearTexto: respeta el ajuste de mayúscula/minúscula', () => {
  assert.equal(formatearTexto('Manzana', true), 'MANZANA');
  assert.equal(formatearTexto('Manzana', false), 'manzana');
});

test('formatearTexto: por defecto pone mayúscula', () => {
  assert.equal(formatearTexto('Pan'), 'PAN');
});

test('formatearTexto: con texto vacío o nulo devuelve cadena vacía', () => {
  assert.equal(formatearTexto('', true), '');
  assert.equal(formatearTexto(null, true), '');
  assert.equal(formatearTexto(undefined, true), '');
});
