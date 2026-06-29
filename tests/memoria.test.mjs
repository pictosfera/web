// Pruebas: apps/memoria/memoria.js (lógica pura del juego de Memoria)
//
// Estas funciones se exportan precisamente para poder probarlas sin
// tocar el DOM: cuántas parejas jugar según el material, cómo se
// construye el mazo, cómo se decide si dos cartas son pareja, y cómo
// se formatea el nombre de la carta según el ajuste de mayúscula del
// portal (bug: Memoria debía respetar el ajuste, igual que las otras
// mecánicas).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserShims } from './helpers/shims.mjs';

installBrowserShims();

const memoriaModulo = await import('../apps/memoria/memoria.js');
const { elegirNumeroParejas, crearMazo, sonPareja, formatearNombre } = memoriaModulo;

test('elegirNumeroParejas: sin material suficiente, no se juega', () => {
  assert.equal(elegirNumeroParejas(0), 0);
  assert.equal(elegirNumeroParejas(2), 0);
});

test('elegirNumeroParejas: usa todo el material disponible entre 3 y 5 parejas', () => {
  assert.equal(elegirNumeroParejas(3), 3);
  assert.equal(elegirNumeroParejas(4), 4);
  assert.equal(elegirNumeroParejas(5), 5);
});

test('elegirNumeroParejas: nunca pasa de 5 parejas (10 tarjetas) aunque haya mucho material', () => {
  assert.equal(elegirNumeroParejas(6), 5);
  assert.equal(elegirNumeroParejas(50), 5);
});

function mediosDePrueba(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `m${i}`, nombre: `Medio ${i}` }));
}

test('crearMazo: crea dos cartas por cada medio elegido', () => {
  const medios = mediosDePrueba(5);
  const mazo = crearMazo(medios, 4);
  assert.equal(mazo.length, 8);
  const conteoPorMedio = new Map();
  mazo.forEach((carta) => {
    conteoPorMedio.set(carta.medioId, (conteoPorMedio.get(carta.medioId) || 0) + 1);
  });
  assert.equal(conteoPorMedio.size, 4);
  for (const cuenta of conteoPorMedio.values()) assert.equal(cuenta, 2);
});

test('crearMazo: con 0 parejas no hay mazo', () => {
  assert.deepEqual(crearMazo(mediosDePrueba(5), 0), []);
});

test('crearMazo: cada carta tiene un cartaId distinto (no hay duplicados de id de carta)', () => {
  const mazo = crearMazo(mediosDePrueba(6), 6);
  const ids = mazo.map((c) => c.cartaId);
  assert.equal(new Set(ids).size, ids.length);
});

test('sonPareja: dos cartas del mismo medio (pero distinta carta) son pareja', () => {
  const a = { cartaId: '0-a', medioId: 'm1' };
  const b = { cartaId: '0-b', medioId: 'm1' };
  assert.equal(sonPareja(a, b), true);
});

test('sonPareja: cartas de medios distintos no son pareja', () => {
  const a = { cartaId: '0-a', medioId: 'm1' };
  const b = { cartaId: '1-a', medioId: 'm2' };
  assert.equal(sonPareja(a, b), false);
});

test('sonPareja: la misma carta consigo misma no cuenta como pareja', () => {
  const a = { cartaId: '0-a', medioId: 'm1' };
  assert.equal(sonPareja(a, a), false);
});

test('sonPareja: si falta alguna carta, no es pareja', () => {
  assert.equal(sonPareja(null, { cartaId: '0-a', medioId: 'm1' }), false);
  assert.equal(sonPareja(undefined, undefined), false);
});

// formatearNombre(): bug 2 — el nombre de la carta debe respetar el
// ajuste de mayúscula/minúscula del portal, igual que ya hacen
// formatearPista() en arrastraPalabra.js y formatearTexto() en
// tecleaPalabra.js.
test('formatearNombre: mayuscula=true pasa el nombre a MAYÚSCULAS', () => {
  assert.equal(formatearNombre('perro', true), 'PERRO');
});

test('formatearNombre: mayuscula=false pasa el nombre a minúsculas', () => {
  assert.equal(formatearNombre('PERRO', false), 'perro');
});

test('formatearNombre: por defecto (sin segundo argumento) usa mayúsculas', () => {
  assert.equal(formatearNombre('gato'), 'GATO');
});

test('formatearNombre: nombre vacío o nulo devuelve cadena vacía', () => {
  assert.equal(formatearNombre(''), '');
  assert.equal(formatearNombre(null), '');
});

// rutaPerfectoSinFallos: bug — dentro de una ruta de aprendizaje, voltear
// dos cartas que no son pareja es parte normal del juego, no un error
// que deba bloquear el progreso (ver core/js/rutas.js: esPartidaPerfecta).
test('export default: declara rutaPerfectoSinFallos en false (fallar no bloquea el progreso en rutas)', () => {
  assert.equal(memoriaModulo.default.rutaPerfectoSinFallos, false);
});
