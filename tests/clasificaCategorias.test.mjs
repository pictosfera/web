// Pruebas: apps/clasifica-categorias/clasificaCategorias.js (lógica
// pura de la mecánica "clasifica los pictogramas en dos categorías").
//
// Aquí solo se prueba la lógica pura (qué categoría y qué medio toca
// cada nivel, si la zona elegida es la correcta, el formateo de texto y
// la validación del ajuste "pulsador TTS"): el arrastre con puntero, el
// teclado en las zonas y la pintura del DOM dependen del navegador y no
// se prueban en este archivo, igual que en el resto de mecánicas de
// arrastrar/soltar del proyecto.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  hayMaterialSuficiente,
  elegirSiguienteReto,
  esRespuestaCorrecta,
  formatearPista,
  puedeResponder
} = await import('../apps/clasifica-categorias/clasificaCategorias.js');

function mediosDePrueba(prefijo, n) {
  return Array.from({ length: n }, (_, i) => ({ id: `${prefijo}${i}`, nombre: `${prefijo} ${i}` }));
}

function categoriasDePrueba({ mediosA = 3, mediosB = 3 } = {}) {
  return [
    { id: 'a', cabecera: { id: 'cab-a', nombre: 'Categoría A' }, medios: mediosDePrueba('a', mediosA) },
    { id: 'b', cabecera: { id: 'cab-b', nombre: 'Categoría B' }, medios: mediosDePrueba('b', mediosB) }
  ];
}

// --- hayMaterialSuficiente ---

test('hayMaterialSuficiente: dos categorías y al menos un medio entre las dos', () => {
  assert.equal(hayMaterialSuficiente(categoriasDePrueba()), true);
  assert.equal(hayMaterialSuficiente(categoriasDePrueba({ mediosA: 1, mediosB: 0 })), true);
});

test('hayMaterialSuficiente: falla si no hay exactamente dos categorías', () => {
  assert.equal(hayMaterialSuficiente([]), false);
  assert.equal(hayMaterialSuficiente([categoriasDePrueba()[0]]), false);
  assert.equal(hayMaterialSuficiente(null), false);
});

test('hayMaterialSuficiente: falla si ninguna de las dos tiene medios', () => {
  assert.equal(hayMaterialSuficiente(categoriasDePrueba({ mediosA: 0, mediosB: 0 })), false);
});

// --- elegirSiguienteReto ---

test('elegirSiguienteReto: el reto pertenece a una de las dos categorías', () => {
  const categorias = categoriasDePrueba();
  for (let i = 0; i < 50; i++) {
    const reto = elegirSiguienteReto(categorias, { evitarIds: [] });
    assert.ok(['a', 'b'].includes(reto.categoriaId));
    const categoria = categorias.find((c) => c.id === reto.categoriaId);
    assert.ok(categoria.medios.some((m) => m.id === reto.medio.id));
  }
});

test('elegirSiguienteReto: ignora categorías sin medios', () => {
  const categorias = categoriasDePrueba({ mediosA: 3, mediosB: 0 });
  for (let i = 0; i < 30; i++) {
    const reto = elegirSiguienteReto(categorias, { evitarIds: [] });
    assert.equal(reto.categoriaId, 'a');
  }
});

test('elegirSiguienteReto: sin material en ninguna categoría, devuelve null', () => {
  assert.equal(elegirSiguienteReto(categoriasDePrueba({ mediosA: 0, mediosB: 0 }), {}), null);
  assert.equal(elegirSiguienteReto([], {}), null);
  assert.equal(elegirSiguienteReto(null, {}), null);
});

test('elegirSiguienteReto: evita repetir medios usados mientras queden libres', () => {
  const categorias = [{ id: 'a', cabecera: null, medios: mediosDePrueba('a', 3) }];
  const evitar = ['a0', 'a1'];
  const reto = elegirSiguienteReto(categorias, { evitarIds: evitar });
  assert.equal(reto.medio.id, 'a2');
});

test('elegirSiguienteReto: si ya se usaron todos los de la categoría elegida, puede repetir', () => {
  const categorias = [{ id: 'a', cabecera: null, medios: mediosDePrueba('a', 2) }];
  const reto = elegirSiguienteReto(categorias, { evitarIds: ['a0', 'a1'] });
  assert.ok(['a0', 'a1'].includes(reto.medio.id));
});

// --- esRespuestaCorrecta ---

test('esRespuestaCorrecta: acepta la misma categoría, aunque sea como cadenas distintas tipos', () => {
  assert.equal(esRespuestaCorrecta('a', 'a'), true);
  assert.equal(esRespuestaCorrecta(1, '1'), true);
});

test('esRespuestaCorrecta: rechaza categorías distintas', () => {
  assert.equal(esRespuestaCorrecta('a', 'b'), false);
});

test('esRespuestaCorrecta: rechaza valores vacíos', () => {
  assert.equal(esRespuestaCorrecta('', 'a'), false);
  assert.equal(esRespuestaCorrecta('a', ''), false);
  assert.equal(esRespuestaCorrecta(null, null), false);
  assert.equal(esRespuestaCorrecta(undefined, 'a'), false);
});

// --- formatearPista ---

test('formatearPista: respeta el ajuste de mayúscula/minúscula', () => {
  assert.equal(formatearPista('Ratón', true), 'RATÓN');
  assert.equal(formatearPista('Ratón', false), 'ratón');
});

test('formatearPista: con texto vacío devuelve cadena vacía', () => {
  assert.equal(formatearPista('', true), '');
  assert.equal(formatearPista(null, true), '');
});

// --- puedeResponder ---

test('puedeResponder: con el pulsador TTS desactivado, siempre se puede responder', () => {
  assert.equal(puedeResponder({ pulsadorTts: false }, false), true);
  assert.equal(puedeResponder({ pulsadorTts: false }, true), true);
});

test('puedeResponder: con el pulsador TTS activado, hace falta haber escuchado', () => {
  assert.equal(puedeResponder({ pulsadorTts: true }, false), false);
  assert.equal(puedeResponder({ pulsadorTts: true }, true), true);
});
