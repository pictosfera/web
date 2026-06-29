// Pruebas: apps/arrastra-palabra/arrastraPalabra.js (lógica pura de la
// mecánica "arrastra la palabra hasta el pictograma").
//
// Estas funciones se exportan precisamente para poder probarlas sin
// tocar el DOM ni el arrastre: cómo se eligen los distractores, cómo
// se genera un nivel completo, cómo se decide si una opción es la
// respuesta correcta, y cómo se aplica mayúsculas/minúsculas a la pista.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserShims } from './helpers/shims.mjs';

installBrowserShims();

const { elegirDistractores, generarNivel, esRespuestaCorrecta, formatearPista, puedeResponder } =
  await import('../apps/arrastra-palabra/arrastraPalabra.js');

function mediosDePrueba(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `m${i}`, nombre: `Medio ${i}` }));
}

test('elegirDistractores: nunca incluye el medio correcto', () => {
  const medios = mediosDePrueba(6);
  for (let i = 0; i < 20; i++) {
    const distractores = elegirDistractores(medios, 'm0', 2);
    assert.equal(distractores.some((d) => d.id === 'm0'), false);
  }
});

test('elegirDistractores: devuelve la cantidad pedida si hay material suficiente', () => {
  const medios = mediosDePrueba(6);
  const distractores = elegirDistractores(medios, 'm0', 2);
  assert.equal(distractores.length, 2);
  assert.equal(new Set(distractores.map((d) => d.id)).size, 2);
});

test('elegirDistractores: si no hay suficiente material, devuelve lo que pueda', () => {
  const medios = mediosDePrueba(2); // 1 correcto + solo 1 candidato a distractor
  const distractores = elegirDistractores(medios, 'm0', 2);
  assert.equal(distractores.length, 1);
});

test('generarNivel: con menos de 3 medios no se puede jugar', () => {
  assert.equal(generarNivel(mediosDePrueba(2)), null);
  assert.equal(generarNivel([]), null);
  assert.equal(generarNivel(null), null);
});

test('generarNivel: devuelve un medio correcto y exactamente 3 opciones, una sola correcta', () => {
  const medios = mediosDePrueba(6);
  const nivel = generarNivel(medios);
  assert.ok(nivel.medioCorrecto);
  assert.equal(nivel.opciones.length, 3);
  const correctas = nivel.opciones.filter((o) => o.esCorrecta);
  assert.equal(correctas.length, 1);
  assert.equal(correctas[0].medio.id, nivel.medioCorrecto.id);
  // Las otras dos deben ser medios distintos entre sí y del correcto.
  const idsOpciones = nivel.opciones.map((o) => o.medio.id);
  assert.equal(new Set(idsOpciones).size, 3);
});

test('generarNivel: con exactamente 3 medios, siempre usa los 3 como opciones', () => {
  const medios = mediosDePrueba(3);
  const nivel = generarNivel(medios);
  const idsOpciones = new Set(nivel.opciones.map((o) => o.medio.id));
  assert.deepEqual(idsOpciones, new Set(['m0', 'm1', 'm2']));
});

test('generarNivel: evita repetir como correcto un medio ya usado, si puede', () => {
  const medios = mediosDePrueba(4);
  for (let i = 0; i < 20; i++) {
    const nivel = generarNivel(medios, { evitarIds: ['m0', 'm1', 'm2'] });
    assert.equal(nivel.medioCorrecto.id, 'm3');
  }
});

test('generarNivel: si ya se usaron todos, vuelve a elegir entre todos (no se atasca)', () => {
  const medios = mediosDePrueba(4);
  const nivel = generarNivel(medios, { evitarIds: ['m0', 'm1', 'm2', 'm3'] });
  assert.ok(nivel);
  assert.ok(medios.some((m) => m.id === nivel.medioCorrecto.id));
});

test('esRespuestaCorrecta: la opción con el mismo medio que el objetivo es correcta', () => {
  const medioCorrecto = { id: 'm0', nombre: 'Vaca' };
  assert.equal(esRespuestaCorrecta({ medio: medioCorrecto, esCorrecta: true }, medioCorrecto), true);
});

test('esRespuestaCorrecta: una opción de otro medio no es correcta', () => {
  const medioCorrecto = { id: 'm0', nombre: 'Vaca' };
  const otra = { medio: { id: 'm1', nombre: 'Perro' }, esCorrecta: false };
  assert.equal(esRespuestaCorrecta(otra, medioCorrecto), false);
});

test('esRespuestaCorrecta: con datos incompletos, nunca es correcta', () => {
  assert.equal(esRespuestaCorrecta(null, { id: 'm0' }), false);
  assert.equal(esRespuestaCorrecta({ medio: null }, { id: 'm0' }), false);
  assert.equal(esRespuestaCorrecta({ medio: { id: 'm0' } }, null), false);
});

test('formatearPista: por defecto pone la palabra en mayúsculas', () => {
  assert.equal(formatearPista('vaca'), 'VACA');
});

test('formatearPista: con mayuscula=false la deja en minúsculas', () => {
  assert.equal(formatearPista('VACA', false), 'vaca');
});

test('formatearPista: respeta acentos y eñes al cambiar de caja', () => {
  assert.equal(formatearPista('pájaro', true), 'PÁJARO');
  assert.equal(formatearPista('PEÓN', false), 'peón');
});

test('formatearPista: sin palabra, devuelve cadena vacía', () => {
  assert.equal(formatearPista(''), '');
  assert.equal(formatearPista(null), '');
  assert.equal(formatearPista(undefined), '');
});

test('puedeResponder: con el pulsador TTS desactivado, siempre se puede responder', () => {
  assert.equal(puedeResponder({ pulsadorTts: false }, false), true);
  assert.equal(puedeResponder({ pulsadorTts: false }, true), true);
});

test('puedeResponder: con el pulsador TTS activado, hace falta haber escuchado la palabra', () => {
  assert.equal(puedeResponder({ pulsadorTts: true }, false), false);
  assert.equal(puedeResponder({ pulsadorTts: true }, true), true);
});
