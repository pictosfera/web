// Pruebas: apps/relaciona-pictograma-palabra/relacionaPictogramaPalabra.js
// (lógica pura de la mecánica "relaciona el pictograma con su
// palabra").
//
// Aquí solo se prueba la lógica pura (mezclar, material suficiente,
// elegir el grupo de 3 de la ronda, construir las casillas de texto,
// comprobar aciertos, detectar el grupo completo, el formateo de texto
// y la validación del ajuste "pulsador TTS" por pictograma): el
// arrastre con puntero, la selección por toque/teclado y la pintura
// del DOM dependen del navegador y no se prueban en este archivo,
// igual que en el resto de mecánicas de arrastrar/soltar del proyecto.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  mezclar,
  hayMaterialSuficiente,
  elegirGrupoRonda,
  construirCasillas,
  esRespuestaCorrecta,
  grupoCompleto,
  formatearTexto,
  puedeResponderItem
} = await import('../apps/relaciona-pictograma-palabra/relacionaPictogramaPalabra.js');

function mediosDePrueba(prefijo, n) {
  return Array.from({ length: n }, (_, i) => ({ id: `${prefijo}${i}`, nombre: `${prefijo} ${i}` }));
}

// --- mezclar ---

test('mezclar: conserva todos los elementos, solo cambia el orden', () => {
  const original = mediosDePrueba('m', 6);
  const copia = mezclar(original);
  assert.equal(copia.length, original.length);
  assert.deepEqual([...copia].sort((a, b) => a.id.localeCompare(b.id)), original);
});

test('mezclar: con lista vacía, null o undefined no rompe', () => {
  assert.deepEqual(mezclar([]), []);
  assert.deepEqual(mezclar(null), []);
  assert.deepEqual(mezclar(undefined), []);
});

// --- hayMaterialSuficiente ---

test('hayMaterialSuficiente: hacen falta al menos 3 nombres distintos', () => {
  assert.equal(hayMaterialSuficiente(mediosDePrueba('m', 3)), true);
  assert.equal(hayMaterialSuficiente(mediosDePrueba('m', 5)), true);
  assert.equal(hayMaterialSuficiente(mediosDePrueba('m', 2)), false);
});

test('hayMaterialSuficiente: descarta medios sin nombre y nombres repetidos antes de contar', () => {
  const medios = [...mediosDePrueba('m', 2), { id: 'sin-nombre' }, { id: 'm0-bis', nombre: 'm 0' }];
  assert.equal(hayMaterialSuficiente(medios), false); // solo "m 0" y "m 1" distintos
});

test('hayMaterialSuficiente: con lista vacía, null o algo que no es lista, devuelve false', () => {
  assert.equal(hayMaterialSuficiente([]), false);
  assert.equal(hayMaterialSuficiente(null), false);
  assert.equal(hayMaterialSuficiente(undefined), false);
  assert.equal(hayMaterialSuficiente('no-es-lista'), false);
});

// --- elegirGrupoRonda ---

test('elegirGrupoRonda: devuelve 3 pictogramas distintos del pozo', () => {
  const medios = mediosDePrueba('m', 6);
  for (let i = 0; i < 30; i++) {
    const grupo = elegirGrupoRonda(medios, { evitarIds: [] });
    assert.equal(grupo.length, 3);
    const idsUnicos = new Set(grupo.map((m) => m.id));
    assert.equal(idsUnicos.size, 3);
    grupo.forEach((m) => assert.ok(medios.some((original) => original.id === m.id)));
  }
});

test('elegirGrupoRonda: con menos de 3 nombres distintos, devuelve null', () => {
  assert.equal(elegirGrupoRonda(mediosDePrueba('m', 2), {}), null);
  assert.equal(elegirGrupoRonda([], {}), null);
  assert.equal(elegirGrupoRonda(null, {}), null);
});

test('elegirGrupoRonda: ignora nombres duplicados al construir los candidatos', () => {
  const medios = [...mediosDePrueba('m', 3), { id: 'm0-bis', nombre: 'm 0' }];
  const grupo = elegirGrupoRonda(medios, {});
  const nombres = new Set(grupo.map((m) => m.nombre));
  assert.equal(nombres.size, 3); // nunca dos casillas con el mismo texto
});

test('elegirGrupoRonda: evita repetir los ya usados mientras queden 3 sin usar', () => {
  const medios = mediosDePrueba('m', 5);
  const grupo = elegirGrupoRonda(medios, { evitarIds: ['m0', 'm1'] });
  grupo.forEach((m) => assert.ok(!['m0', 'm1'].includes(m.id)));
});

test('elegirGrupoRonda: si no quedan 3 sin usar, puede repetir', () => {
  const medios = mediosDePrueba('m', 4);
  const grupo = elegirGrupoRonda(medios, { evitarIds: ['m0', 'm1', 'm2'] }); // solo queda 1 sin usar
  assert.equal(grupo.length, 3);
});

// --- construirCasillas ---

test('construirCasillas: devuelve una casilla por cada medio del grupo, mismos ids', () => {
  const grupo = mediosDePrueba('m', 3);
  const casillas = construirCasillas(grupo);
  assert.equal(casillas.length, 3);
  assert.deepEqual(new Set(casillas.map((c) => c.id)), new Set(grupo.map((m) => m.id)));
  casillas.forEach((c) => {
    const original = grupo.find((m) => m.id === c.id);
    assert.equal(c.nombre, original.nombre);
  });
});

test('construirCasillas: con grupo vacío o nulo no rompe', () => {
  assert.deepEqual(construirCasillas([]), []);
  assert.deepEqual(construirCasillas(null), []);
});

test('construirCasillas: el orden no siempre coincide con el del grupo original', () => {
  const grupo = mediosDePrueba('m', 3);
  const ordenes = new Set();
  for (let i = 0; i < 30; i++) {
    ordenes.add(construirCasillas(grupo).map((c) => c.id).join(','));
  }
  assert.ok(ordenes.size > 1);
});

// --- esRespuestaCorrecta ---

test('esRespuestaCorrecta: acepta el mismo id, aunque sea como tipos distintos', () => {
  assert.equal(esRespuestaCorrecta('m0', 'm0'), true);
  assert.equal(esRespuestaCorrecta(1, '1'), true);
});

test('esRespuestaCorrecta: rechaza ids distintos', () => {
  assert.equal(esRespuestaCorrecta('m0', 'm1'), false);
});

test('esRespuestaCorrecta: rechaza valores vacíos', () => {
  assert.equal(esRespuestaCorrecta('', 'm0'), false);
  assert.equal(esRespuestaCorrecta('m0', ''), false);
  assert.equal(esRespuestaCorrecta(null, null), false);
  assert.equal(esRespuestaCorrecta(undefined, 'm0'), false);
});

// --- grupoCompleto ---

test('grupoCompleto: true solo cuando los 3 ids del grupo están colocados', () => {
  const grupo = mediosDePrueba('m', 3);
  assert.equal(grupoCompleto(grupo, ['m0', 'm1', 'm2']), true);
  assert.equal(grupoCompleto(grupo, ['m0', 'm1']), false);
  assert.equal(grupoCompleto(grupo, []), false);
});

test('grupoCompleto: con un grupo que no tiene exactamente 3, devuelve false', () => {
  assert.equal(grupoCompleto(mediosDePrueba('m', 2), ['m0', 'm1']), false);
  assert.equal(grupoCompleto([], []), false);
  assert.equal(grupoCompleto(null, []), false);
});

test('grupoCompleto: con colocadosIds que no es lista, devuelve false', () => {
  assert.equal(grupoCompleto(mediosDePrueba('m', 3), null), false);
  assert.equal(grupoCompleto(mediosDePrueba('m', 3), undefined), false);
});

// --- formatearTexto ---

test('formatearTexto: respeta el ajuste de mayúscula/minúscula', () => {
  assert.equal(formatearTexto('Perro', true), 'PERRO');
  assert.equal(formatearTexto('Perro', false), 'perro');
});

test('formatearTexto: por defecto pone mayúscula', () => {
  assert.equal(formatearTexto('Gato'), 'GATO');
});

test('formatearTexto: con texto vacío o nulo devuelve cadena vacía', () => {
  assert.equal(formatearTexto('', true), '');
  assert.equal(formatearTexto(null, true), '');
  assert.equal(formatearTexto(undefined, true), '');
});

// --- puedeResponderItem ---

test('puedeResponderItem: con el pulsador TTS desactivado, siempre se puede responder', () => {
  assert.equal(puedeResponderItem({ pulsadorTts: false }, [], 'm0'), true);
  assert.equal(puedeResponderItem({ pulsadorTts: false }, ['m1'], 'm0'), true);
});

test('puedeResponderItem: con el pulsador TTS activado, hace falta haber escuchado ESE pictograma', () => {
  assert.equal(puedeResponderItem({ pulsadorTts: true }, [], 'm0'), false);
  assert.equal(puedeResponderItem({ pulsadorTts: true }, ['m1'], 'm0'), false);
  assert.equal(puedeResponderItem({ pulsadorTts: true }, ['m0'], 'm0'), true);
});
