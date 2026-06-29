// Pruebas: apps/ordena-secuencia/ordenaSecuencia.js (lógica pura de la
// mecánica "ordena la secuencia").
//
// Estas funciones se exportan precisamente para poder probarlas sin
// tocar el DOM ni el arrastre: cómo se baraja el montón de piezas,
// cómo se elige la siguiente secuencia a jugar (evitando repetir),
// cómo se genera una ronda a partir de una secuencia ya resuelta, y
// cómo se decide si una colocación es correcta o si la ronda terminó.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserShims } from './helpers/shims.mjs';

installBrowserShims();

const { mezclar, elegirSiguienteSecuencia, generarRonda, colocacionCorrecta, rondaCompleta, formatearNombre } =
  await import('../apps/ordena-secuencia/ordenaSecuencia.js');

test('mezclar: devuelve los mismos elementos, sin perder ni duplicar ninguno', () => {
  const lista = [1, 2, 3, 4, 5];
  const mezclada = mezclar(lista);
  assert.equal(mezclada.length, lista.length);
  assert.deepEqual([...mezclada].sort(), [...lista].sort());
});

test('mezclar: no modifica la lista original (devuelve una copia)', () => {
  const lista = [1, 2, 3];
  const copia = [...lista];
  mezclar(lista);
  assert.deepEqual(lista, copia);
});

test('mezclar: lista vacía o nula no rompe', () => {
  assert.deepEqual(mezclar([]), []);
  assert.deepEqual(mezclar(null), []);
  assert.deepEqual(mezclar(undefined), []);
});

test('elegirSiguienteSecuencia: con una sola secuencia, la devuelve siempre', () => {
  const secuencias = [{ id: 'seq:1', nombre: 'Única' }];
  for (let i = 0; i < 10; i++) {
    assert.equal(elegirSiguienteSecuencia(secuencias).id, 'seq:1');
  }
});

test('elegirSiguienteSecuencia: evita repetir las ya usadas si hay otras disponibles', () => {
  const secuencias = [{ id: 'seq:1' }, { id: 'seq:2' }, { id: 'seq:3' }];
  for (let i = 0; i < 20; i++) {
    const elegida = elegirSiguienteSecuencia(secuencias, { evitarIds: ['seq:1', 'seq:2'] });
    assert.equal(elegida.id, 'seq:3');
  }
});

test('elegirSiguienteSecuencia: si ya se usaron todas, vuelve a elegir entre todas (no se atasca)', () => {
  const secuencias = [{ id: 'seq:1' }, { id: 'seq:2' }];
  const elegida = elegirSiguienteSecuencia(secuencias, { evitarIds: ['seq:1', 'seq:2'] });
  assert.ok(secuencias.some((s) => s.id === elegida.id));
});

test('elegirSiguienteSecuencia: sin secuencias, devuelve null', () => {
  assert.equal(elegirSiguienteSecuencia([]), null);
  assert.equal(elegirSiguienteSecuencia(null), null);
  assert.equal(elegirSiguienteSecuencia(undefined), null);
});

test('generarRonda: conserva el orden correcto en "pasos" y baraja "piezas"', () => {
  const secuencia = {
    pasos: [{ id: 'm1', nombre: 'Abrir tubo' }, { id: 'm2', nombre: 'Untar pasta' }, { id: 'm3', nombre: 'Cepillar' }]
  };
  const ronda = generarRonda(secuencia);
  assert.deepEqual(ronda.pasos.map((m) => m.id), ['m1', 'm2', 'm3']);
  assert.equal(ronda.piezas.length, 3);
  const idsPiezas = ronda.piezas.map((p) => p.medio.id);
  assert.deepEqual([...idsPiezas].sort(), ['m1', 'm2', 'm3']);
});

test('generarRonda: cada pieza tiene un piezaId propio, distinto del id del medio', () => {
  const secuencia = { pasos: [{ id: 'm1', nombre: 'A' }, { id: 'm2', nombre: 'B' }] };
  const ronda = generarRonda(secuencia);
  const piezaIds = ronda.piezas.map((p) => p.piezaId);
  assert.equal(new Set(piezaIds).size, piezaIds.length);
});

test('generarRonda: un mismo pictograma repetido en dos pasos genera dos piezas independientes', () => {
  const medioRepetido = { id: 'm1', nombre: 'Abrir grifo' };
  const secuencia = { pasos: [medioRepetido, { id: 'm2', nombre: 'Mojar cepillo' }, medioRepetido] };
  const ronda = generarRonda(secuencia);
  assert.equal(ronda.piezas.length, 3);
  const piezasDelRepetido = ronda.piezas.filter((p) => p.medio.id === 'm1');
  assert.equal(piezasDelRepetido.length, 2);
  assert.notEqual(piezasDelRepetido[0].piezaId, piezasDelRepetido[1].piezaId);
});

test('generarRonda: secuencia sin pasos no rompe', () => {
  assert.deepEqual(generarRonda(null), { pasos: [], piezas: [] });
  assert.deepEqual(generarRonda({}), { pasos: [], piezas: [] });
});

test('colocacionCorrecta: una pieza va en el hueco cuyo paso esperado es su mismo medio', () => {
  const pasosCorrectos = [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }];
  const pieza = { piezaId: 'p1', medio: { id: 'm2' } };
  assert.equal(colocacionCorrecta(pieza, 1, pasosCorrectos), true);
});

test('colocacionCorrecta: la misma pieza en un hueco distinto no es correcta', () => {
  const pasosCorrectos = [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }];
  const pieza = { piezaId: 'p1', medio: { id: 'm2' } };
  assert.equal(colocacionCorrecta(pieza, 0, pasosCorrectos), false);
  assert.equal(colocacionCorrecta(pieza, 2, pasosCorrectos), false);
});

test('colocacionCorrecta: con datos incompletos, nunca es correcta', () => {
  assert.equal(colocacionCorrecta(null, 0, [{ id: 'm1' }]), false);
  assert.equal(colocacionCorrecta({ piezaId: 'p1' }, 0, [{ id: 'm1' }]), false);
  assert.equal(colocacionCorrecta({ piezaId: 'p1', medio: { id: 'm1' } }, 0, null), false);
  assert.equal(colocacionCorrecta({ piezaId: 'p1', medio: { id: 'm1' } }, 5, [{ id: 'm1' }]), false);
});

test('rondaCompleta: true solo cuando todos los huecos están rellenos', () => {
  assert.equal(rondaCompleta([{ id: 'm1' }, { id: 'm2' }]), true);
  assert.equal(rondaCompleta([{ id: 'm1' }, null]), false);
  assert.equal(rondaCompleta([]), false);
});

test('rondaCompleta: con datos inválidos, devuelve false', () => {
  assert.equal(rondaCompleta(null), false);
  assert.equal(rondaCompleta(undefined), false);
  assert.equal(rondaCompleta('no-es-lista'), false);
});

test('formatearNombre: por defecto pone el nombre en mayúsculas', () => {
  assert.equal(formatearNombre('abrir el grifo'), 'ABRIR EL GRIFO');
});

test('formatearNombre: con mayuscula=false lo deja en minúsculas', () => {
  assert.equal(formatearNombre('ABRIR EL GRIFO', false), 'abrir el grifo');
});

test('formatearNombre: sin nombre, devuelve cadena vacía', () => {
  assert.equal(formatearNombre(''), '');
  assert.equal(formatearNombre(null), '');
  assert.equal(formatearNombre(undefined), '');
});
