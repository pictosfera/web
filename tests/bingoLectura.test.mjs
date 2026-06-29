// Pruebas: apps/bingo-lectura/bingoLectura.js (lógica pura de la
// mecánica "bingo de lectura").
//
// Lo que pinta el cartón en el DOM y escucha toques reales no se
// prueba aquí (no hay DOM real en Node, ver tests/helpers/shims.mjs).
// Sí se prueba todo lo demás: el mapeo de los ajustes de pista a los
// tres modos oficiales de la especificación, la elección del cartón,
// la elección de la siguiente bola y la comprobación de aciertos.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserShims } from './helpers/shims.mjs';

installBrowserShims();

const {
  bolaConPalabra,
  cartonConPictograma,
  elegirCarton,
  elegirSiguienteBola,
  esRespuestaCorrecta,
  formatearPista,
  puedeResponder
} = await import('../apps/bingo-lectura/bingoLectura.js');

function mediosDePrueba(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `m${i}`, nombre: `Medio ${i}` }));
}

// --- mapeo de modos (bolaConPalabra / cartonConPictograma) ---

test('modo 1 — pictograma con palabra → pictograma con palabra', () => {
  const ajustes = { mostrar: true, soloTexto: false };
  assert.equal(bolaConPalabra(ajustes), true);
  assert.equal(cartonConPictograma(ajustes), true);
});

test('modo 2 — pictograma con palabra → palabra', () => {
  const ajustes = { mostrar: true, soloTexto: true };
  assert.equal(bolaConPalabra(ajustes), true);
  assert.equal(cartonConPictograma(ajustes), false);
});

test('modo 3 — pictograma → palabra', () => {
  const ajustes = { mostrar: false, soloTexto: true };
  assert.equal(bolaConPalabra(ajustes), false);
  assert.equal(cartonConPictograma(ajustes), false);
});

test('variante extra — pictograma → pictograma con palabra (mostrar y soloTexto desactivados)', () => {
  const ajustes = { mostrar: false, soloTexto: false };
  assert.equal(bolaConPalabra(ajustes), false);
  assert.equal(cartonConPictograma(ajustes), true);
});

test('bolaConPalabra/cartonConPictograma: toleran ajustesPista vacío o ausente', () => {
  assert.equal(bolaConPalabra({}), false);
  assert.equal(cartonConPictograma({}), true);
  assert.equal(bolaConPalabra(undefined), false);
});

// --- elegirCarton ---

test('elegirCarton: elige exactamente "tamano" elementos distintos', () => {
  const medios = mediosDePrueba(12);
  const carton = elegirCarton(medios, 9);
  assert.equal(carton.length, 9);
  const ids = new Set(carton.map((m) => m.id));
  assert.equal(ids.size, 9); // sin repetidos
  carton.forEach((m) => assert.ok(medios.includes(m)));
});

test('elegirCarton: con justo el material mínimo, usa todos los elementos', () => {
  const medios = mediosDePrueba(9);
  const carton = elegirCarton(medios, 9);
  assert.equal(carton.length, 9);
  assert.deepEqual(new Set(carton.map((m) => m.id)), new Set(medios.map((m) => m.id)));
});

test('elegirCarton: sin material suficiente, devuelve null', () => {
  assert.equal(elegirCarton(mediosDePrueba(5), 9), null);
  assert.equal(elegirCarton([], 9), null);
  assert.equal(elegirCarton(null, 9), null);
});

// --- elegirSiguienteBola ---

test('elegirSiguienteBola: prefiere casillas todavía no marcadas', () => {
  const carton = mediosDePrueba(3);
  const elegido = elegirSiguienteBola(carton, ['m0', 'm1']);
  assert.equal(elegido.id, 'm2');
});

test('elegirSiguienteBola: si todo el cartón está marcado, puede repetir cualquiera', () => {
  const carton = mediosDePrueba(3);
  const elegido = elegirSiguienteBola(carton, ['m0', 'm1', 'm2']);
  assert.ok(['m0', 'm1', 'm2'].includes(elegido.id));
});

test('elegirSiguienteBola: cartón vacío o inválido, devuelve null', () => {
  assert.equal(elegirSiguienteBola([], []), null);
  assert.equal(elegirSiguienteBola(null, []), null);
});

// --- esRespuestaCorrecta ---

test('esRespuestaCorrecta: compara por id', () => {
  const objetivo = { id: 'm1', nombre: 'Medio 1' };
  assert.equal(esRespuestaCorrecta({ id: 'm1', nombre: 'Medio 1' }, objetivo), true);
  assert.equal(esRespuestaCorrecta({ id: 'm2', nombre: 'Medio 2' }, objetivo), false);
  assert.equal(esRespuestaCorrecta(null, objetivo), false);
  assert.equal(esRespuestaCorrecta(objetivo, null), false);
});

// --- lógica compartida con el resto de mecánicas (duplicada a propósito) ---

test('formatearPista: aplica mayúscula/minúscula', () => {
  assert.equal(formatearPista('rana', true), 'RANA');
  assert.equal(formatearPista('RANA', false), 'rana');
  assert.equal(formatearPista('', true), '');
});

test('puedeResponder: bloquea solo cuando hay pulsador TTS y no se ha escuchado', () => {
  assert.equal(puedeResponder({ pulsadorTts: false }, false), true);
  assert.equal(puedeResponder({ pulsadorTts: true }, false), false);
  assert.equal(puedeResponder({ pulsadorTts: true }, true), true);
});
