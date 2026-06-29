// Pruebas: apps/reconoce-emociones/reconoceEmociones.js (lógica pura
// de la mecánica "Reconoce emociones").
//
// Igual que en el resto de mecánicas del proyecto, aquí solo se
// prueba la lógica pura (barajar, elegir la siguiente expresión,
// comprobar la respuesta y el formateo de texto): pintar la cara y
// los botones depende del navegador (innerHTML, plataforma.cabezas,
// plataforma.fijos...) y no se prueba en este archivo. Esta mecánica
// no tiene "hayMaterialSuficiente": la cara se genera al vuelo sin
// red, así que siempre hay material (ver la nota al principio de
// reconoceEmociones.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  mezclar,
  elegirSiguienteExpresion,
  esRespuestaCorrecta,
  formatearTexto,
  construirOpciones,
  default: mecanica
} = await import('../apps/reconoce-emociones/reconoceEmociones.js');

const EXPRESIONES = ['contento', 'triste', 'enfadado', 'asustado'];

// --- mezclar ---

test('mezclar: devuelve los mismos elementos, en cualquier orden', () => {
  const lista = [1, 2, 3, 4, 5];
  const mezclada = mezclar(lista);
  assert.deepEqual([...mezclada].sort(), lista);
});

test('mezclar: no muta la lista original', () => {
  const lista = [1, 2, 3];
  mezclar(lista);
  assert.deepEqual(lista, [1, 2, 3]);
});

test('mezclar: con lista vacía o nula no rompe', () => {
  assert.deepEqual(mezclar([]), []);
  assert.deepEqual(mezclar(null), []);
  assert.deepEqual(mezclar(undefined), []);
});

test('mezclar: con muchas tiradas, el orden cambia al menos alguna vez', () => {
  const lista = [1, 2, 3, 4, 5, 6];
  let algunaVezDistinto = false;
  for (let i = 0; i < 40; i++) {
    if (mezclar(lista).join(',') !== lista.join(',')) {
      algunaVezDistinto = true;
      break;
    }
  }
  assert.equal(algunaVezDistinto, true);
});

// --- elegirSiguienteExpresion ---

test('elegirSiguienteExpresion: elige siempre una de las cuatro expresiones', () => {
  for (let i = 0; i < 40; i++) {
    assert.ok(EXPRESIONES.includes(elegirSiguienteExpresion([])));
  }
});

test('elegirSiguienteExpresion: evita repetir las ya usadas mientras queden libres', () => {
  const elegido = elegirSiguienteExpresion(['contento', 'triste', 'enfadado']);
  assert.equal(elegido, 'asustado');
});

test('elegirSiguienteExpresion: si ya se usaron todas, puede repetir cualquiera', () => {
  const elegido = elegirSiguienteExpresion(EXPRESIONES);
  assert.ok(EXPRESIONES.includes(elegido));
});

test('elegirSiguienteExpresion: sin argumento no rompe (usadas por defecto)', () => {
  assert.ok(EXPRESIONES.includes(elegirSiguienteExpresion()));
});

test('elegirSiguienteExpresion: con muchas tiradas reparte las cuatro expresiones', () => {
  const vistas = new Set();
  const usadas = [];
  for (let i = 0; i < 20; i++) {
    const expresion = elegirSiguienteExpresion(usadas);
    vistas.add(expresion);
    usadas.push(expresion);
    if (usadas.length >= EXPRESIONES.length) usadas.length = 0;
  }
  assert.deepEqual([...vistas].sort(), [...EXPRESIONES].sort());
});

// --- esRespuestaCorrecta ---

test('esRespuestaCorrecta: la clave del botón coincide con la expresión actual', () => {
  assert.equal(esRespuestaCorrecta('contento', 'contento'), true);
  assert.equal(esRespuestaCorrecta('triste', 'contento'), false);
});

test('esRespuestaCorrecta: con valores nulos no es correcta', () => {
  assert.equal(esRespuestaCorrecta(null, 'contento'), false);
  assert.equal(esRespuestaCorrecta('contento', null), false);
  assert.equal(esRespuestaCorrecta(undefined, undefined), false);
});

// --- formatearTexto ---

test('formatearTexto: respeta el ajuste de mayúscula/minúscula', () => {
  assert.equal(formatearTexto('Contento', true), 'CONTENTO');
  assert.equal(formatearTexto('Contento', false), 'contento');
});

test('formatearTexto: por defecto pone mayúscula', () => {
  assert.equal(formatearTexto('Triste'), 'TRISTE');
});

test('formatearTexto: con texto vacío o nulo devuelve cadena vacía', () => {
  assert.equal(formatearTexto('', true), '');
  assert.equal(formatearTexto(null, true), '');
  assert.equal(formatearTexto(undefined, true), '');
});

// --- construirOpciones ---

test('construirOpciones: devuelve las cuatro emociones, cada una una sola vez', () => {
  const opciones = construirOpciones();
  assert.equal(opciones.length, 4);
  assert.deepEqual(opciones.map((o) => o.clave).sort(), [...EXPRESIONES].sort());
});

test('construirOpciones: cada opción trae emoji de respaldo y clave de etiqueta', () => {
  for (const opcion of construirOpciones()) {
    assert.equal(typeof opcion.emoji, 'string');
    assert.match(opcion.etiquetaClave, /^reconoceEmociones\./);
  }
});

test('construirOpciones: con muchas tiradas, el orden no es siempre el mismo', () => {
  const primero = construirOpciones().map((o) => o.clave).join(',');
  let algunaVezDistinto = false;
  for (let i = 0; i < 40; i++) {
    if (construirOpciones().map((o) => o.clave).join(',') !== primero) {
      algunaVezDistinto = true;
      break;
    }
  }
  assert.equal(algunaVezDistinto, true);
});

// --- contrato de la mecánica (export default) ---

test('export default: cumple el contrato {id, nombre, icono, estante, montar, desmontar}', () => {
  assert.equal(mecanica.id, 'reconoce-emociones');
  assert.equal(typeof mecanica.nombre, 'string');
  assert.equal(typeof mecanica.icono, 'string');
  assert.equal(typeof mecanica.estante, 'string');
  assert.equal(typeof mecanica.montar, 'function');
  assert.equal(typeof mecanica.desmontar, 'function');
});
