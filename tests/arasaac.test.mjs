// Pruebas: core/js/arasaac.js
//
// No llaman a internet (eso no es fiable en una prueba automática):
// comprueban que las URLs de imagen se construyen bien y que la
// respuesta cruda de ARASAAC se convierte correctamente al formato
// común del portal ({imagen, nombre, etiquetas, origen}).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserShims } from './helpers/shims.mjs';

installBrowserShims();

const { imageUrl, imageUrlCandidates, toMedium } = await import('../core/js/arasaac.js');

test('imageUrl construye la URL estática esperada', () => {
  assert.equal(
    imageUrl(6964, 300),
    'https://static.arasaac.org/pictograms/6964/6964_300.png'
  );
});

test('imageUrl usa 300 por defecto', () => {
  assert.equal(imageUrl(6964), 'https://static.arasaac.org/pictograms/6964/6964_300.png');
});

test('imageUrlCandidates da una cascada de tamaños, de menor a mayor', () => {
  assert.deepEqual(imageUrlCandidates(6964), [
    'https://static.arasaac.org/pictograms/6964/6964_300.png',
    'https://static.arasaac.org/pictograms/6964/6964_500.png',
    'https://static.arasaac.org/pictograms/6964/6964_2500.png'
  ]);
});

test('toMedium normaliza la respuesta cruda de ARASAAC', () => {
  const picto = {
    _id: 6964,
    keywords: [{ keyword: 'casa' }, { keyword: 'hogar' }],
    categories: ['housing'],
    tags: ['place']
  };
  const medio = toMedium(picto);
  assert.equal(medio.id, 'arasaac:6964');
  assert.equal(medio.arasaacId, 6964);
  assert.equal(medio.nombre, 'casa');
  assert.equal(medio.origen, 'arasaac');
  assert.equal(medio.imagen, imageUrl(6964));
  // Bug: categories/tags de ARASAAC vienen siempre en inglés, sin
  // importar el idioma pedido (red semántica abierta, no traducible
  // por el portal). Por eso NO se usan como etiqueta: así "Mi
  // biblioteca" no muestra texto sin traducir. Ver comentario en
  // core/js/arasaac.js (toMedium).
  assert.deepEqual(medio.etiquetas, []);
});

test('toMedium no se rompe si faltan keywords/categories/tags', () => {
  const medio = toMedium({ _id: 1 });
  assert.equal(medio.nombre, '');
  assert.deepEqual(medio.etiquetas, []);
});
