// Pruebas: core/js/categorias.js (solo lógica pura)
//
// Igual que en secuencias.test.mjs, las funciones que tocan IndexedDB
// (listAll, crearPareja...) no se prueban aquí: no hay shim de
// IndexedDB en este proyecto. Lo que sí es lógica pura, y la parte con
// más riesgo de error, es: validar la forma de una pareja de
// categorías antes de guardarla, resolver una categoría (cabecera +
// medios) contra la biblioteca actual, y filtrar a las parejas
// realmente jugables.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserShims } from './helpers/shims.mjs';

installBrowserShims();

const { MIN_MEDIOS_POR_CATEGORIA, validarPareja, resolverCategoria, parejasJugables } =
  await import('../core/js/categorias.js');

function categoriaValida(overrides = {}) {
  return { nombre: 'Grande', cabeceraId: 'm1', medios: ['m1', 'm2'], ...overrides };
}

test('validarPareja: rechaza si falta el nombre', () => {
  const categorias = [categoriaValida(), categoriaValida({ nombre: 'Pequeño', cabeceraId: 'm3', medios: ['m3'] })];
  assert.deepEqual(validarPareja({ nombre: '', categorias }), { ok: false, error: 'falta-nombre' });
  assert.deepEqual(validarPareja({ nombre: '   ', categorias }), { ok: false, error: 'falta-nombre' });
  assert.deepEqual(validarPareja({ categorias }), { ok: false, error: 'falta-nombre' });
});

test('validarPareja: rechaza si no hay exactamente dos categorías', () => {
  assert.deepEqual(validarPareja({ nombre: 'Pareja', categorias: [categoriaValida()] }),
    { ok: false, error: 'categorias-invalidas' });
  assert.deepEqual(validarPareja({ nombre: 'Pareja', categorias: [] }),
    { ok: false, error: 'categorias-invalidas' });
  assert.deepEqual(validarPareja({ nombre: 'Pareja' }),
    { ok: false, error: 'categorias-invalidas' });
  assert.deepEqual(validarPareja({ nombre: 'Pareja', categorias: 'no-es-lista' }),
    { ok: false, error: 'categorias-invalidas' });
});

test('validarPareja: rechaza si a una categoría le falta el nombre', () => {
  const categorias = [categoriaValida({ nombre: '' }), categoriaValida({ nombre: 'Pequeño' })];
  assert.deepEqual(validarPareja({ nombre: 'Pareja', categorias }), { ok: false, error: 'falta-nombre-categoria' });
});

test('validarPareja: rechaza si a una categoría le falta la cabecera', () => {
  const categorias = [categoriaValida({ cabeceraId: null }), categoriaValida({ nombre: 'Pequeño' })];
  assert.deepEqual(validarPareja({ nombre: 'Pareja', categorias }), { ok: false, error: 'falta-cabecera' });
});

test('validarPareja: rechaza si a una categoría le faltan medios (mínimo MIN_MEDIOS_POR_CATEGORIA)', () => {
  assert.equal(MIN_MEDIOS_POR_CATEGORIA, 1);
  const categorias = [categoriaValida({ medios: [] }), categoriaValida({ nombre: 'Pequeño' })];
  assert.deepEqual(validarPareja({ nombre: 'Pareja', categorias }), { ok: false, error: 'medios-insuficientes' });
});

test('validarPareja: acepta nombre y dos categorías válidas', () => {
  const categorias = [categoriaValida(), categoriaValida({ nombre: 'Pequeño', cabeceraId: 'm3', medios: ['m3'] })];
  assert.deepEqual(validarPareja({ nombre: 'Grande y pequeño', categorias }), { ok: true });
});

test('resolverCategoria: devuelve cabecera y medios resueltos contra la biblioteca', () => {
  const categoria = { id: 'cat:1', nombre: 'Grande', cabeceraId: 'm1', medios: ['m1', 'm2'] };
  const medios = [
    { id: 'm1', nombre: 'Elefante' },
    { id: 'm2', nombre: 'Ballena' }
  ];
  const resuelta = resolverCategoria(categoria, medios);
  assert.equal(resuelta.id, 'cat:1');
  assert.equal(resuelta.nombre, 'Grande');
  assert.equal(resuelta.cabecera.id, 'm1');
  assert.deepEqual(resuelta.medios.map((m) => m.id), ['m1', 'm2']);
});

test('resolverCategoria: devuelve null si la cabecera ya no existe en la biblioteca', () => {
  const categoria = { id: 'cat:1', nombre: 'Grande', cabeceraId: 'm-borrado', medios: ['m2'] };
  const medios = [{ id: 'm2', nombre: 'Ballena' }];
  assert.equal(resolverCategoria(categoria, medios), null);
});

test('resolverCategoria: devuelve null si ningún medio del pool resuelve, aunque la cabecera exista', () => {
  const categoria = { id: 'cat:1', nombre: 'Grande', cabeceraId: 'm1', medios: ['m-borrado'] };
  const medios = [{ id: 'm1', nombre: 'Elefante' }];
  assert.equal(resolverCategoria(categoria, medios), null);
});

test('resolverCategoria: descarta en silencio los medios del pool que ya no existen, conserva el resto', () => {
  const categoria = { id: 'cat:1', nombre: 'Grande', cabeceraId: 'm1', medios: ['m1', 'm-borrado', 'm2'] };
  const medios = [{ id: 'm1', nombre: 'Elefante' }, { id: 'm2', nombre: 'Ballena' }];
  const resuelta = resolverCategoria(categoria, medios);
  assert.deepEqual(resuelta.medios.map((m) => m.id), ['m1', 'm2']);
});

test('resolverCategoria: con categoría nula devuelve null', () => {
  assert.equal(resolverCategoria(null, []), null);
});

test('parejasJugables: descarta parejas donde alguna categoría no resuelve, conserva las demás', () => {
  const medios = [{ id: 'm1', nombre: 'Elefante' }, { id: 'm2', nombre: 'Hormiga' }];
  const parejas = [
    {
      id: 'catpar:1',
      nombre: 'Grande y pequeño',
      categorias: [
        { id: 'cat:1', nombre: 'Grande', cabeceraId: 'm1', medios: ['m1'] },
        { id: 'cat:2', nombre: 'Pequeño', cabeceraId: 'm2', medios: ['m2'] }
      ]
    },
    {
      id: 'catpar:2',
      nombre: 'Rota',
      categorias: [
        { id: 'cat:3', nombre: 'Rojo', cabeceraId: 'm-borrado', medios: ['m1'] },
        { id: 'cat:4', nombre: 'Verde', cabeceraId: 'm2', medios: ['m2'] }
      ]
    }
  ];
  const jugables = parejasJugables(parejas, medios);
  assert.equal(jugables.length, 1);
  assert.equal(jugables[0].id, 'catpar:1');
  assert.equal(jugables[0].categorias.length, 2);
  assert.equal(jugables[0].categorias[0].cabecera.id, 'm1');
});

test('parejasJugables: descarta parejas que no tengan exactamente dos categorías', () => {
  const medios = [{ id: 'm1', nombre: 'Elefante' }];
  const parejas = [
    { id: 'catpar:1', nombre: 'Incompleta', categorias: [{ id: 'cat:1', nombre: 'Grande', cabeceraId: 'm1', medios: ['m1'] }] }
  ];
  assert.deepEqual(parejasJugables(parejas, medios), []);
});

test('parejasJugables: lista vacía, null o undefined no rompen', () => {
  assert.deepEqual(parejasJugables([], []), []);
  assert.deepEqual(parejasJugables(null, []), []);
  assert.deepEqual(parejasJugables(undefined, []), []);
});

test('parejasJugables: ignora entradas nulas dentro de la lista', () => {
  const medios = [{ id: 'm1', nombre: 'Elefante' }, { id: 'm2', nombre: 'Hormiga' }];
  const parejas = [
    null,
    {
      id: 'catpar:1',
      nombre: 'Grande y pequeño',
      categorias: [
        { id: 'cat:1', nombre: 'Grande', cabeceraId: 'm1', medios: ['m1'] },
        { id: 'cat:2', nombre: 'Pequeño', cabeceraId: 'm2', medios: ['m2'] }
      ]
    },
    undefined
  ];
  const jugables = parejasJugables(parejas, medios);
  assert.equal(jugables.length, 1);
  assert.equal(jugables[0].id, 'catpar:1');
});
