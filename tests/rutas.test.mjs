// Pruebas: core/js/rutas.js (solo lógica pura)
//
// Las funciones que tocan IndexedDB (listAll, crearRuta, actualizarRuta,
// registrarProgreso...) no se prueban aquí, igual que en
// secuencias.test.mjs/mediaLibrary.test.mjs: no hay shim de IndexedDB en
// este proyecto. Lo que sí es lógica pura, y es la parte con más riesgo
// de error, es: validar la forma de una ruta antes de guardarla, el
// modelo de desbloqueo secuencial (qué paso está jugable, cómo avanza el
// progreso tras terminar un paso con o sin puntuación perfecta) y el
// interruptor de acceso libre al menú JUEGOS (persistido en localStorage).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserShims } from './helpers/shims.mjs';

installBrowserShims();

const {
  MIN_PASOS,
  crearPaso,
  validarRuta,
  pasoDesbloqueado,
  siguienteProgreso,
  esPartidaPerfecta,
  getAccesoLibreJuegos,
  setAccesoLibreJuegos
} = await import('../core/js/rutas.js');

// ---------------------------------------------------------------------
// crearPaso
// ---------------------------------------------------------------------

test('crearPaso: genera un instanciaId propio y copia appId/config', () => {
  const paso = crearPaso('memoria-animales', { mayuscula: true });
  assert.equal(typeof paso.instanciaId, 'string');
  assert.ok(paso.instanciaId.length > 0);
  assert.equal(paso.appId, 'memoria-animales');
  assert.deepEqual(paso.config, { mayuscula: true });
});

test('crearPaso: sin config, usa un objeto vacío (no undefined)', () => {
  const paso = crearPaso('memoria-animales');
  assert.deepEqual(paso.config, {});
});

test('crearPaso: el config es una copia, no la misma referencia que se le pasó', () => {
  const original = { mayuscula: true };
  const paso = crearPaso('memoria-animales', original);
  paso.config.mayuscula = false;
  assert.equal(original.mayuscula, true);
});

test('crearPaso: dos llamadas generan instanciaId distintos (incluso para el mismo juego)', () => {
  const a = crearPaso('memoria-animales');
  const b = crearPaso('memoria-animales');
  assert.notEqual(a.instanciaId, b.instanciaId);
});

// ---------------------------------------------------------------------
// validarRuta
// ---------------------------------------------------------------------

const pasoValido = { instanciaId: 'i1', appId: 'memoria-animales', config: {} };

test('validarRuta: rechaza si falta el nombre', () => {
  assert.deepEqual(validarRuta({ nombre: '', pasos: [pasoValido] }), { ok: false, error: 'falta-nombre' });
  assert.deepEqual(validarRuta({ nombre: '   ', pasos: [pasoValido] }), { ok: false, error: 'falta-nombre' });
  assert.deepEqual(validarRuta({ pasos: [pasoValido] }), { ok: false, error: 'falta-nombre' });
});

test('validarRuta: rechaza menos de MIN_PASOS pasos', () => {
  assert.equal(MIN_PASOS, 1);
  assert.deepEqual(validarRuta({ nombre: 'Mañanas', pasos: [] }), { ok: false, error: 'pasos-insuficientes' });
  assert.deepEqual(validarRuta({ nombre: 'Mañanas' }), { ok: false, error: 'pasos-insuficientes' });
  assert.deepEqual(validarRuta({ nombre: 'Mañanas', pasos: 'no-es-lista' }), { ok: false, error: 'pasos-insuficientes' });
});

test('validarRuta: rechaza si algún paso es falsy o no tiene appId', () => {
  assert.deepEqual(validarRuta({ nombre: 'Mañanas', pasos: [pasoValido, null] }), { ok: false, error: 'paso-invalido' });
  assert.deepEqual(
    validarRuta({ nombre: 'Mañanas', pasos: [pasoValido, { instanciaId: 'i2', config: {} }] }),
    { ok: false, error: 'paso-invalido' }
  );
});

test('validarRuta: acepta nombre y al menos MIN_PASOS pasos válidos (1 solo paso ya vale)', () => {
  assert.deepEqual(validarRuta({ nombre: 'Mañanas', pasos: [pasoValido] }), { ok: true });
});

test('validarRuta: acepta el mismo juego repetido varias veces como pasos distintos', () => {
  const otraInstancia = { instanciaId: 'i2', appId: 'memoria-animales', config: { mayuscula: false } };
  assert.deepEqual(validarRuta({ nombre: 'Mañanas', pasos: [pasoValido, otraInstancia] }), { ok: true });
});

// ---------------------------------------------------------------------
// pasoDesbloqueado (modelo de desbloqueo secuencial)
// ---------------------------------------------------------------------

test('pasoDesbloqueado: el primer paso (índice 0) está desbloqueado incluso sin progreso', () => {
  assert.equal(pasoDesbloqueado({ progreso: undefined }, 0), true);
  assert.equal(pasoDesbloqueado(null, 0), true);
});

test('pasoDesbloqueado: un índice por debajo o igual a "desbloqueadoHasta" está desbloqueado', () => {
  const ruta = { progreso: { desbloqueadoHasta: 2 } };
  assert.equal(pasoDesbloqueado(ruta, 0), true);
  assert.equal(pasoDesbloqueado(ruta, 1), true);
  assert.equal(pasoDesbloqueado(ruta, 2), true);
});

test('pasoDesbloqueado: un índice por encima de "desbloqueadoHasta" está bloqueado', () => {
  const ruta = { progreso: { desbloqueadoHasta: 2 } };
  assert.equal(pasoDesbloqueado(ruta, 3), false);
});

// ---------------------------------------------------------------------
// siguienteProgreso (avance del desbloqueo tras terminar un paso)
// ---------------------------------------------------------------------

test('siguienteProgreso: avanza el desbloqueo si el paso terminado era justo la frontera y fue perfecto', () => {
  const ruta = { progreso: { desbloqueadoHasta: 0 }, pasos: [{}, {}, {}] };
  assert.deepEqual(siguienteProgreso(ruta, 0, true), { desbloqueadoHasta: 1 });
});

test('siguienteProgreso: NO avanza si el paso no fue perfecto (tuvo algún fallo)', () => {
  const ruta = { progreso: { desbloqueadoHasta: 0 }, pasos: [{}, {}, {}] };
  assert.deepEqual(siguienteProgreso(ruta, 0, false), { desbloqueadoHasta: 0 });
});

test('siguienteProgreso: NO avanza si el paso terminado no es la frontera actual (ya superado antes)', () => {
  const ruta = { progreso: { desbloqueadoHasta: 2 }, pasos: [{}, {}, {}, {}] };
  // Rejugar y superar perfecto el paso 0, que ya estaba superado hace tiempo: no cambia el desbloqueo.
  assert.deepEqual(siguienteProgreso(ruta, 0, true), { desbloqueadoHasta: 2 });
});

test('siguienteProgreso: NO avanza si el índice está por delante de la frontera (no se puede saltar)', () => {
  const ruta = { progreso: { desbloqueadoHasta: 0 }, pasos: [{}, {}, {}] };
  assert.deepEqual(siguienteProgreso(ruta, 2, true), { desbloqueadoHasta: 0 });
});

test('siguienteProgreso: el desbloqueo no sobrepasa el último paso de la ruta', () => {
  const ruta = { progreso: { desbloqueadoHasta: 1 }, pasos: [{}, {}] }; // último índice válido: 1
  assert.deepEqual(siguienteProgreso(ruta, 1, true), { desbloqueadoHasta: 1 });
});

test('siguienteProgreso: con una ruta de un solo paso, terminarlo perfecto no avanza más allá del único índice', () => {
  const ruta = { progreso: { desbloqueadoHasta: 0 }, pasos: [{}] };
  assert.deepEqual(siguienteProgreso(ruta, 0, true), { desbloqueadoHasta: 0 });
});

test('siguienteProgreso: con ruta null/sin pasos, no rompe y no avanza por encima de 0', () => {
  assert.deepEqual(siguienteProgreso(null, 0, true), { desbloqueadoHasta: 0 });
  assert.deepEqual(siguienteProgreso({}, 0, true), { desbloqueadoHasta: 0 });
});

// ---------------------------------------------------------------------
// esPartidaPerfecta (bug: en Memoria es casi imposible no fallar nunca,
// así que esa mecánica no debe exigir cero fallos para desbloquear el
// siguiente paso de la ruta)
// ---------------------------------------------------------------------

test('esPartidaPerfecta: por defecto (mecánica sin el flag) exige cero fallos', () => {
  assert.equal(esPartidaPerfecta({ id: 'arrastra-palabra' }, false), true);
  assert.equal(esPartidaPerfecta({ id: 'arrastra-palabra' }, true), false);
});

test('esPartidaPerfecta: con rutaPerfectoSinFallos=false, completar la partida ya es perfecto aunque hubiera fallos', () => {
  const memoriaFalsa = { id: 'memoria', rutaPerfectoSinFallos: false };
  assert.equal(esPartidaPerfecta(memoriaFalsa, true), true);
  assert.equal(esPartidaPerfecta(memoriaFalsa, false), true);
});

test('esPartidaPerfecta: con rutaPerfectoSinFallos=true explícito, se comporta igual que el valor por defecto', () => {
  const mecanica = { id: 'algo', rutaPerfectoSinFallos: true };
  assert.equal(esPartidaPerfecta(mecanica, false), true);
  assert.equal(esPartidaPerfecta(mecanica, true), false);
});

test('esPartidaPerfecta: mecánica null/undefined no rompe y exige cero fallos (comportamiento por defecto)', () => {
  assert.equal(esPartidaPerfecta(null, false), true);
  assert.equal(esPartidaPerfecta(undefined, true), false);
});

// ---------------------------------------------------------------------
// Interruptor de acceso libre al menú JUEGOS (localStorage)
// ---------------------------------------------------------------------

test('getAccesoLibreJuegos: por defecto (nada guardado todavía) es true', () => {
  assert.equal(getAccesoLibreJuegos(), true);
});

test('setAccesoLibreJuegos/getAccesoLibreJuegos: persiste false y se puede volver a activar', () => {
  setAccesoLibreJuegos(false);
  assert.equal(getAccesoLibreJuegos(), false);
  setAccesoLibreJuegos(true);
  assert.equal(getAccesoLibreJuegos(), true);
});
