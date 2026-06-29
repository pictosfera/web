// Pruebas: apps/dedos-numero/dedosNumero.js (lógica pura de la
// mecánica "relaciona los dedos con el número escrito").
//
// Lo que pinta en el DOM y escucha clics no se prueba aquí. Esta
// mecánica no usa material de la biblioteca (no hay pictogramas), así
// que generarNivel() no recibe medios y nunca devuelve null.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  iconoMano,
  generarManos,
  totalDedos,
  generarOpciones,
  generarNivel,
  esRespuestaCorrecta
} = await import('../apps/dedos-numero/dedosNumero.js');

// --- iconoMano ---

test('iconoMano: el aria-label refleja el número de dedos pedido', () => {
  for (let n = 1; n <= 5; n++) {
    assert.match(iconoMano(n), new RegExp(`aria-label="${n}"`));
  }
});

test('iconoMano: se queda dentro de 1 a 5 dedos aunque se pida fuera de rango', () => {
  assert.match(iconoMano(0), /aria-label="1"/);
  assert.match(iconoMano(9), /aria-label="5"/);
});

// Bug: con 5 dedos, el icono dibujaba 5 dedos idénticos en abanico (sin
// pulgar diferenciado). Una mano real tiene 4 dedos rectos + 1 pulgar
// más corto/grueso, insertado en el lateral de la palma y girado hacia
// fuera. Con 1-4 no cambia nada (no hay pulgar que distinguir).
test('iconoMano: con 5 dedos dibuja un pulgar distinto (más corto, girado, en el lateral)', () => {
  const svg = iconoMano(5);
  assert.match(svg, /class="iconomano-dedo iconomano-pulgar"/);
  assert.match(svg, /transform="rotate\(/);
  // 4 dedos rectos + 1 pulgar: sigue habiendo 5 "dedos" en total.
  const dedos = svg.match(/iconomano-dedo/g) || [];
  assert.equal(dedos.length, 5);
});

test('iconoMano: con 1 a 4 dedos no dibuja pulgar (todos los dedos son iguales)', () => {
  for (let n = 1; n <= 4; n++) {
    assert.doesNotMatch(iconoMano(n), /iconomano-pulgar/);
  }
});

// --- generarManos / totalDedos ---

test('generarManos: genera entre 1 y 2 manos, cada una con 1 a 5 dedos, por defecto', () => {
  for (let i = 0; i < 100; i++) {
    const manos = generarManos();
    assert.ok(manos.length === 1 || manos.length === 2);
    manos.forEach((n) => assert.ok(n >= 1 && n <= 5));
  }
});

test('totalDedos: suma los dedos de todas las manos', () => {
  assert.equal(totalDedos([1, 5]), 6);
  assert.equal(totalDedos([4]), 4);
  assert.equal(totalDedos([]), 0);
});

// --- generarOpciones ---

test('generarOpciones: incluye el total correcto, 3 opciones distintas, sin distractores repetidos', () => {
  for (let i = 0; i < 50; i++) {
    const opciones = generarOpciones(7);
    assert.equal(opciones.length, 3);
    assert.equal(new Set(opciones).size, 3);
    assert.ok(opciones.includes(7));
  }
});

// --- generarNivel ---

test('generarNivel: no necesita medios, nunca devuelve null', () => {
  for (let i = 0; i < 30; i++) {
    const nivel = generarNivel();
    assert.ok(nivel);
    assert.equal(nivel.total, totalDedos(nivel.manos));
    assert.ok(nivel.opciones.includes(nivel.total));
  }
});

// --- esRespuestaCorrecta ---

test('esRespuestaCorrecta: compara numéricamente', () => {
  assert.equal(esRespuestaCorrecta(7, 7), true);
  assert.equal(esRespuestaCorrecta('7', 7), true);
  assert.equal(esRespuestaCorrecta(6, 7), false);
});
