// Pruebas: apps/rosco-pictogramas/roscoPictogramas.js (lógica pura de
// la mecánica "rosco de pictogramas").
//
// Lo que pinta el anillo y los pictogramas en el DOM, y escucha
// toques reales, no se prueba aquí (no hay DOM real en Node, ver
// tests/helpers/shims.mjs). Sí se prueba todo lo demás: la
// normalización de letras, la detección de "empieza por"/"tiene", la
// elección del modo de consigna, la construcción de cada ronda (con
// sus distractores) y de la secuencia completa de la partida, y la
// comprobación de aciertos. construirRonda/construirSecuenciaRosco
// usan Math.random() internamente, así que se prueban por estructura
// y pertenencia, no por valor exacto (igual que
// elegirSiguientePalabra/crearAbecedario en otras mecánicas).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserShims } from './helpers/shims.mjs';

installBrowserShims();

const {
  ABECEDARIO_ROSCO,
  normalizarLetra,
  primeraLetraNormalizada,
  letrasNormalizadasDePalabra,
  medioEmpiezaPorLetra,
  medioTieneLetra,
  medioSatisfaceConsigna,
  determinarModoConsigna,
  candidatosObjetivo,
  candidatosDistractor,
  construirRonda,
  construirSecuenciaRosco,
  esSeleccionCorrecta,
  claveConsigna
} = await import('../apps/rosco-pictogramas/roscoPictogramas.js');

const ANIMALES = [
  { id: 'perro', nombre: 'perro' },
  { id: 'gato', nombre: 'gato' },
  { id: 'vaca', nombre: 'vaca' },
  { id: 'pajaro', nombre: 'pájaro' },
  { id: 'conejo', nombre: 'conejo' },
  { id: 'pez', nombre: 'pez' },
  { id: 'caballo', nombre: 'caballo' },
  { id: 'oveja', nombre: 'oveja' },
  { id: 'pato', nombre: 'pato' },
  { id: 'rana', nombre: 'rana' },
  { id: 'leon', nombre: 'león' },
  { id: 'elefante', nombre: 'elefante' }
];

// --- ABECEDARIO_ROSCO ---

test('ABECEDARIO_ROSCO: 26 letras, de la A a la Z, sin Ñ', () => {
  assert.equal(ABECEDARIO_ROSCO.length, 26);
  assert.equal(ABECEDARIO_ROSCO[0], 'A');
  assert.equal(ABECEDARIO_ROSCO[25], 'Z');
  assert.ok(!ABECEDARIO_ROSCO.includes('Ñ'));
});

// --- normalizarLetra ---

test('normalizarLetra: mayúscula y sin acentos', () => {
  assert.equal(normalizarLetra('a'), 'A');
  assert.equal(normalizarLetra('á'), 'A');
  assert.equal(normalizarLetra('É'), 'E');
  assert.equal(normalizarLetra('z'), 'Z');
});

test('normalizarLetra: protege la Ñ (nunca se convierte en N)', () => {
  assert.equal(normalizarLetra('ñ'), 'Ñ');
  assert.equal(normalizarLetra('Ñ'), 'Ñ');
});

test('normalizarLetra: cadena vacía o nula devuelve cadena vacía', () => {
  assert.equal(normalizarLetra(''), '');
  assert.equal(normalizarLetra(null), '');
  assert.equal(normalizarLetra(undefined), '');
});

// --- primeraLetraNormalizada ---

test('primeraLetraNormalizada: primera letra, en mayúscula y sin acento', () => {
  assert.equal(primeraLetraNormalizada('elefante'), 'E');
  assert.equal(primeraLetraNormalizada('Águila'), 'A');
  assert.equal(primeraLetraNormalizada('pájaro'), 'P');
});

test('primeraLetraNormalizada: nombre vacío o nulo devuelve cadena vacía', () => {
  assert.equal(primeraLetraNormalizada(''), '');
  assert.equal(primeraLetraNormalizada(null), '');
});

// --- letrasNormalizadasDePalabra ---

test('letrasNormalizadasDePalabra: todas las letras, en orden, sin espacios ni símbolos', () => {
  assert.deepEqual(letrasNormalizadasDePalabra('pez'), ['P', 'E', 'Z']);
  assert.deepEqual(letrasNormalizadasDePalabra('pájaro'), ['P', 'A', 'J', 'A', 'R', 'O']);
});

test('letrasNormalizadasDePalabra: nombre vacío o nulo devuelve lista vacía', () => {
  assert.deepEqual(letrasNormalizadasDePalabra(''), []);
  assert.deepEqual(letrasNormalizadasDePalabra(null), []);
});

// --- medioEmpiezaPorLetra / medioTieneLetra ---

test('medioEmpiezaPorLetra: compara solo la primera letra', () => {
  const pato = { id: '1', nombre: 'pato' };
  assert.equal(medioEmpiezaPorLetra(pato, 'P'), true);
  assert.equal(medioEmpiezaPorLetra(pato, 'A'), false);
  assert.equal(medioEmpiezaPorLetra(null, 'P'), false);
});

test('medioTieneLetra: la letra puede estar en cualquier posición', () => {
  const pato = { id: '1', nombre: 'pato' };
  assert.equal(medioTieneLetra(pato, 'T'), true); // pa-T-o
  assert.equal(medioTieneLetra(pato, 'P'), true); // empieza también cuenta como "tiene"
  assert.equal(medioTieneLetra(pato, 'Z'), false);
  assert.equal(medioTieneLetra(null, 'P'), false);
});

// --- medioSatisfaceConsigna ---

test('medioSatisfaceConsigna: despacha según el modo', () => {
  const pato = { id: '1', nombre: 'pato' };
  assert.equal(medioSatisfaceConsigna(pato, 'P', 'empieza'), true);
  assert.equal(medioSatisfaceConsigna(pato, 'T', 'empieza'), false);
  assert.equal(medioSatisfaceConsigna(pato, 'T', 'tiene'), true);
  assert.equal(medioSatisfaceConsigna(pato, 'Z', 'tiene'), false);
});

// --- determinarModoConsigna ---

test('determinarModoConsigna: "empieza" cuando hay alguna palabra que empieza por la letra', () => {
  assert.equal(determinarModoConsigna(ANIMALES, 'P'), 'empieza'); // perro, pájaro, pez, pato
  assert.equal(determinarModoConsigna(ANIMALES, 'C'), 'empieza'); // conejo, caballo
});

test('determinarModoConsigna: cae a "tiene" cuando nada empieza por la letra pero algo la contiene', () => {
  // ningún animal de la lista empieza por "Z", pero "pez" la contiene
  assert.equal(determinarModoConsigna(ANIMALES, 'Z'), 'tiene');
});

test('determinarModoConsigna: null cuando la letra no aparece de ninguna forma', () => {
  // ningún animal de la lista contiene "K"
  assert.equal(determinarModoConsigna(ANIMALES, 'K'), null);
});

test('determinarModoConsigna: lista de medios vacía o inválida devuelve null', () => {
  assert.equal(determinarModoConsigna([], 'A'), null);
  assert.equal(determinarModoConsigna(null, 'A'), null);
});

// --- candidatosObjetivo / candidatosDistractor ---

test('candidatosObjetivo: filtra los medios que cumplen la consigna', () => {
  const candidatos = candidatosObjetivo(ANIMALES, 'P', 'empieza');
  const ids = candidatos.map((m) => m.id).sort();
  assert.deepEqual(ids, ['pajaro', 'pato', 'perro', 'pez']);
});

test('candidatosDistractor: excluye al objetivo y a cualquiera que también cumpla la consigna', () => {
  const distractores = candidatosDistractor(ANIMALES, 'pez', 'P', 'empieza');
  const ids = distractores.map((m) => m.id);
  assert.ok(!ids.includes('pez')); // el propio objetivo, fuera
  assert.ok(!ids.includes('pajaro')); // también empieza por P
  assert.ok(!ids.includes('pato'));
  assert.ok(!ids.includes('perro'));
  assert.ok(ids.includes('gato'));
  assert.ok(ids.includes('vaca'));
});

// --- construirRonda ---

test('construirRonda: modo "empieza", objetivo válido y exactamente 3 distractores que no cumplen la consigna', () => {
  const ronda = construirRonda(ANIMALES, 'P');
  assert.ok(ronda);
  assert.equal(ronda.modo, 'empieza');
  assert.equal(ronda.letra, 'P');
  assert.ok(['pajaro', 'pato', 'perro', 'pez'].includes(ronda.objetivo.id));
  assert.equal(ronda.distractores.length, 3);
  ronda.distractores.forEach((d) => {
    assert.equal(medioEmpiezaPorLetra(d, 'P'), false);
    assert.notEqual(d.id, ronda.objetivo.id);
  });
  // pictogramas: el objetivo + los 3 distractores, en algún orden
  assert.equal(ronda.pictogramas.length, 4);
  const idsPictogramas = ronda.pictogramas.map((m) => m.id).sort();
  const idsEsperados = [ronda.objetivo.id, ...ronda.distractores.map((d) => d.id)].sort();
  assert.deepEqual(idsPictogramas, idsEsperados);
});

test('construirRonda: cae a modo "tiene" cuando ninguna palabra empieza por la letra', () => {
  const ronda = construirRonda(ANIMALES, 'Z');
  assert.ok(ronda);
  assert.equal(ronda.modo, 'tiene');
  assert.equal(ronda.objetivo.id, 'pez'); // el único animal de la lista con "z"
  assert.equal(ronda.distractores.length, 3);
  ronda.distractores.forEach((d) => assert.equal(medioTieneLetra(d, 'Z'), false));
});

test('construirRonda: letra no jugable (ni "empieza" ni "tiene") devuelve null', () => {
  assert.equal(construirRonda(ANIMALES, 'K'), null);
});

test('construirRonda: sin al menos 3 distractores válidos, devuelve null', () => {
  // con solo 2 animales, nunca hay 3 distractores posibles
  const pocos = [
    { id: 'perro', nombre: 'perro' },
    { id: 'pato', nombre: 'pato' }
  ];
  assert.equal(construirRonda(pocos, 'P'), null);
});

test('construirRonda: medios vacíos o inválidos devuelve null', () => {
  assert.equal(construirRonda([], 'A'), null);
  assert.equal(construirRonda(null, 'A'), null);
});

// --- construirSecuenciaRosco ---

test('construirSecuenciaRosco: solo incluye letras jugables, en el orden del abecedario', () => {
  const secuencia = construirSecuenciaRosco(ANIMALES);
  assert.ok(secuencia.length > 0);
  assert.ok(secuencia.length <= ABECEDARIO_ROSCO.length);

  // el orden de las letras de la secuencia respeta el orden A→Z
  const indicesEnAbecedario = secuencia.map((ronda) => ABECEDARIO_ROSCO.indexOf(ronda.letra));
  const ordenados = [...indicesEnAbecedario].sort((a, b) => a - b);
  assert.deepEqual(indicesEnAbecedario, ordenados);

  // ninguna letra de la secuencia es "K" (no jugable con este material)
  assert.ok(!secuencia.some((ronda) => ronda.letra === 'K'));

  // cada ronda es estructuralmente válida
  secuencia.forEach((ronda) => {
    assert.equal(ronda.pictogramas.length, 4);
    assert.ok(ronda.objetivo);
    assert.equal(ronda.distractores.length, 3);
  });
});

test('construirSecuenciaRosco: con material insuficiente, omite esa letra', () => {
  const pocos = [
    { id: 'perro', nombre: 'perro' },
    { id: 'pato', nombre: 'pato' }
  ];
  assert.deepEqual(construirSecuenciaRosco(pocos), []);
});

test('construirSecuenciaRosco: medios vacíos o inválidos devuelve lista vacía', () => {
  assert.deepEqual(construirSecuenciaRosco([]), []);
  assert.deepEqual(construirSecuenciaRosco(null), []);
});

// --- esSeleccionCorrecta ---

test('esSeleccionCorrecta: compara el id tocado con el id del objetivo de la ronda', () => {
  const ronda = { objetivo: { id: 'pato', nombre: 'pato' } };
  assert.equal(esSeleccionCorrecta(ronda, 'pato'), true);
  assert.equal(esSeleccionCorrecta(ronda, 'perro'), false);
  assert.equal(esSeleccionCorrecta(null, 'pato'), false);
  assert.equal(esSeleccionCorrecta(ronda, null), false);
  assert.equal(esSeleccionCorrecta(ronda, undefined), false);
});

// --- claveConsigna ---

test('claveConsigna: clave de i18n según el modo, con "empieza" como valor seguro por defecto', () => {
  assert.equal(claveConsigna('empieza'), 'rosco.consigna_empieza');
  assert.equal(claveConsigna('tiene'), 'rosco.consigna_tiene');
  assert.equal(claveConsigna('otro'), 'rosco.consigna_empieza');
  assert.equal(claveConsigna(undefined), 'rosco.consigna_empieza');
});
