// Pruebas: core/js/mediaLibrary.js (mediosArasaacParaRetraducir y
// etiquetasArasaacLimpias)
//
// El resto de mediaLibrary.js habla con IndexedDB y con ARASAAC por
// red, así que no se prueba aquí (no hay shim de IndexedDB en este
// proyecto). Lo que sí es lógica pura es decidir qué medios de la
// biblioteca son candidatos a "retraducir" cuando cambia el idioma:
// solo los que vienen de ARASAAC y tienen un id estable, nunca las
// fotos propias del adulto; y, por separado, decidir qué etiquetas de
// un medio de ARASAAC sobreviven a la limpieza de contaminación
// histórica (ver el comentario de etiquetasArasaacLimpias en el propio
// mediaLibrary.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserShims } from './helpers/shims.mjs';

installBrowserShims();

const { mediosArasaacParaRetraducir, etiquetasArasaacLimpias } = await import('../core/js/mediaLibrary.js');

test('selecciona solo los medios de ARASAAC con arasaacId', () => {
  const medios = [
    { id: 'arasaac:1', origen: 'arasaac', arasaacId: 1, nombre: 'Perro' },
    { id: 'foto:1', origen: 'foto', nombre: 'Mi gato' },
    { id: 'arasaac:2', origen: 'arasaac', arasaacId: 2, nombre: 'Casa' }
  ];
  const resultado = mediosArasaacParaRetraducir(medios);
  assert.deepEqual(resultado.map((m) => m.id), ['arasaac:1', 'arasaac:2']);
});

test('descarta medios de ARASAAC sin arasaacId (no debería pasar, pero no debe romper)', () => {
  const medios = [{ id: 'arasaac:raro', origen: 'arasaac', nombre: 'Sin id' }];
  assert.deepEqual(mediosArasaacParaRetraducir(medios), []);
});

test('lista vacía, null o undefined no rompen: devuelven lista vacía', () => {
  assert.deepEqual(mediosArasaacParaRetraducir([]), []);
  assert.deepEqual(mediosArasaacParaRetraducir(null), []);
  assert.deepEqual(mediosArasaacParaRetraducir(undefined), []);
});

test('ignora entradas nulas dentro de la lista', () => {
  const medios = [null, { id: 'arasaac:1', origen: 'arasaac', arasaacId: 1, nombre: 'Perro' }, undefined];
  assert.deepEqual(mediosArasaacParaRetraducir(medios).map((m) => m.id), ['arasaac:1']);
});

// --- etiquetasArasaacLimpias ---

const PERMITIDAS = ['comida', 'animales', 'ropa'];

test('etiquetasArasaacLimpias: quita las etiquetas en inglés que no están en la lista permitida', () => {
  const medio = { origen: 'arasaac', etiquetas: ['animales', 'mammal', 'carnivorous', 'core vocabulary'] };
  assert.deepEqual(etiquetasArasaacLimpias(medio, PERMITIDAS), ['animales']);
});

test('etiquetasArasaacLimpias: un medio ya limpio no cambia', () => {
  const medio = { origen: 'arasaac', etiquetas: ['animales', 'comida'] };
  assert.deepEqual(etiquetasArasaacLimpias(medio, PERMITIDAS), ['animales', 'comida']);
});

test('etiquetasArasaacLimpias: nunca toca las fotos propias, aunque tengan etiquetas fuera de la lista', () => {
  const medio = { origen: 'foto', etiquetas: ['una-categoria-escrita-a-mano'] };
  assert.deepEqual(etiquetasArasaacLimpias(medio, PERMITIDAS), ['una-categoria-escrita-a-mano']);
});

test('etiquetasArasaacLimpias: medio nulo o sin etiquetas no rompe', () => {
  assert.deepEqual(etiquetasArasaacLimpias(null, PERMITIDAS), []);
  assert.deepEqual(etiquetasArasaacLimpias({ origen: 'arasaac' }, PERMITIDAS), []);
});

test('etiquetasArasaacLimpias: lista de permitidas vacía o nula deja el medio sin etiquetas', () => {
  const medio = { origen: 'arasaac', etiquetas: ['animales'] };
  assert.deepEqual(etiquetasArasaacLimpias(medio, []), []);
  assert.deepEqual(etiquetasArasaacLimpias(medio, null), []);
});
