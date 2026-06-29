// Pruebas: core/js/secuencias.js (solo lógica pura)
//
// Las funciones que tocan IndexedDB (listAll, crearSecuencia...) no se
// prueban aquí, igual que en mediaLibrary.test.mjs: no hay shim de
// IndexedDB en este proyecto. Lo que sí es lógica pura, y es la parte
// con más riesgo de error, es: validar la forma de una secuencia antes
// de guardarla, resolver sus pasos (ids) contra la biblioteca de
// medios actual, y filtrar a las secuencias realmente jugables.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserShims } from './helpers/shims.mjs';

installBrowserShims();

const { MIN_PASOS, validarSecuencia, resolverPasos, secuenciasJugables } =
  await import('../core/js/secuencias.js');

test('validarSecuencia: rechaza si falta el nombre', () => {
  assert.deepEqual(validarSecuencia({ nombre: '', pasos: ['a', 'b'] }), { ok: false, error: 'falta-nombre' });
  assert.deepEqual(validarSecuencia({ nombre: '   ', pasos: ['a', 'b'] }), { ok: false, error: 'falta-nombre' });
  assert.deepEqual(validarSecuencia({ pasos: ['a', 'b'] }), { ok: false, error: 'falta-nombre' });
});

test('validarSecuencia: rechaza menos de MIN_PASOS pasos', () => {
  assert.equal(MIN_PASOS, 2);
  assert.deepEqual(validarSecuencia({ nombre: 'Rutina', pasos: ['a'] }), { ok: false, error: 'pasos-insuficientes' });
  assert.deepEqual(validarSecuencia({ nombre: 'Rutina', pasos: [] }), { ok: false, error: 'pasos-insuficientes' });
  assert.deepEqual(validarSecuencia({ nombre: 'Rutina' }), { ok: false, error: 'pasos-insuficientes' });
  assert.deepEqual(validarSecuencia({ nombre: 'Rutina', pasos: 'no-es-lista' }), { ok: false, error: 'pasos-insuficientes' });
});

test('validarSecuencia: rechaza si algún paso es falsy (vacío/null)', () => {
  assert.deepEqual(validarSecuencia({ nombre: 'Rutina', pasos: ['a', null] }), { ok: false, error: 'paso-invalido' });
  assert.deepEqual(validarSecuencia({ nombre: 'Rutina', pasos: ['a', ''] }), { ok: false, error: 'paso-invalido' });
});

test('validarSecuencia: acepta nombre y al menos MIN_PASOS pasos válidos', () => {
  assert.deepEqual(validarSecuencia({ nombre: 'Lavarse los dientes', pasos: ['a', 'b', 'c'] }), { ok: true });
});

test('resolverPasos: devuelve los medios completos en el orden de los pasos', () => {
  const secuencia = { pasos: ['m2', 'm1'] };
  const medios = [
    { id: 'm1', nombre: 'Abrir grifo' },
    { id: 'm2', nombre: 'Coger cepillo' }
  ];
  const resueltos = resolverPasos(secuencia, medios);
  assert.deepEqual(resueltos.map((m) => m.id), ['m2', 'm1']);
});

test('resolverPasos: devuelve null si algún paso ya no existe en la biblioteca', () => {
  const secuencia = { pasos: ['m1', 'm-borrado'] };
  const medios = [{ id: 'm1', nombre: 'Abrir grifo' }];
  assert.equal(resolverPasos(secuencia, medios), null);
});

test('resolverPasos: con secuencia inválida o sin pasos, devuelve null', () => {
  assert.equal(resolverPasos(null, []), null);
  assert.equal(resolverPasos({}, []), null);
  assert.equal(resolverPasos({ pasos: 'no-es-lista' }, []), null);
});

test('resolverPasos: una secuencia repitiendo el mismo medio en dos pasos se resuelve dos veces', () => {
  const secuencia = { pasos: ['m1', 'm2', 'm1'] };
  const medios = [{ id: 'm1', nombre: 'Abrir grifo' }, { id: 'm2', nombre: 'Cerrar grifo' }];
  const resueltos = resolverPasos(secuencia, medios);
  assert.deepEqual(resueltos.map((m) => m.id), ['m1', 'm2', 'm1']);
});

test('secuenciasJugables: descarta las que tengan algún paso roto y conserva las demás resueltas', () => {
  const medios = [{ id: 'm1', nombre: 'Abrir grifo' }, { id: 'm2', nombre: 'Cerrar grifo' }];
  const secuencias = [
    { id: 'seq:1', nombre: 'Buena', pasos: ['m1', 'm2'] },
    { id: 'seq:2', nombre: 'Rota', pasos: ['m1', 'm-borrado'] }
  ];
  const jugables = secuenciasJugables(secuencias, medios);
  assert.equal(jugables.length, 1);
  assert.equal(jugables[0].id, 'seq:1');
  assert.deepEqual(jugables[0].pasos.map((m) => m.id), ['m1', 'm2']);
});

test('secuenciasJugables: lista vacía, null o undefined no rompen', () => {
  assert.deepEqual(secuenciasJugables([], []), []);
  assert.deepEqual(secuenciasJugables(null, []), []);
  assert.deepEqual(secuenciasJugables(undefined, []), []);
});

test('secuenciasJugables: ignora entradas nulas dentro de la lista', () => {
  const medios = [{ id: 'm1', nombre: 'Abrir grifo' }, { id: 'm2', nombre: 'Cerrar grifo' }];
  const secuencias = [null, { id: 'seq:1', nombre: 'Buena', pasos: ['m1', 'm2'] }, undefined];
  const jugables = secuenciasJugables(secuencias, medios);
  assert.equal(jugables.length, 1);
  assert.equal(jugables[0].id, 'seq:1');
});
