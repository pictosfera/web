// Pruebas: apps/ruleta-letras/ruletaLetras.js (lógica pura de la
// mecánica "ruleta de letras con pictograma oculto").
//
// La rueda animada, el panel pintado en el DOM y los temporizadores no
// se prueban aquí (no hay DOM real en Node, ver tests/helpers/shims.mjs).
// Sí se prueba todo lo demás: normalización de letras, qué resultados
// de la ruleta tienen efecto real, los pesos que le da cada dificultad
// (incluidos los ejemplos exactos de la especificación), el orden de
// revelado del pictograma, el encaje de palabras por dificultad y el
// abecedario reducido de la dificultad fácil.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserShims } from './helpers/shims.mjs';

installBrowserShims();

const {
  letrasDePalabra,
  normalizarLetra,
  letrasNormalizadasDePalabra,
  formatearLetra,
  esVocal,
  letrasOcultasUnicas,
  palabraCompleta,
  indicesDeLetraEnPalabra,
  elegirLetraRegalada,
  resultadosDisponibles,
  pesosResultados,
  elegirResultadoRuleta,
  ORDEN_REVELADO_RETICULA,
  casillasInicialesPictograma,
  siguienteCasillaPictograma,
  palabraEncajaDificultad,
  elegirPalabrasJugables,
  elegirSiguientePalabra,
  ABECEDARIO_COMPLETO,
  crearAbecedario
} = await import('../apps/ruleta-letras/ruletaLetras.js');

function mediosDePrueba(nombres) {
  return nombres.map((nombre, i) => ({ id: `m${i}`, nombre }));
}

// --- letrasDePalabra ---

test('letrasDePalabra: ignora espacios, signos y cifras', () => {
  assert.deepEqual(letrasDePalabra('pájaro'), ['p', 'á', 'j', 'a', 'r', 'o']);
  assert.deepEqual(letrasDePalabra('oso panda'), ['o', 's', 'o', 'p', 'a', 'n', 'd', 'a']);
  assert.deepEqual(letrasDePalabra('3 patos!'), ['p', 'a', 't', 'o', 's']);
  assert.deepEqual(letrasDePalabra(''), []);
  assert.deepEqual(letrasDePalabra(null), []);
});

test('letrasDePalabra: conserva la eñe', () => {
  assert.deepEqual(letrasDePalabra('niño'), ['n', 'i', 'ñ', 'o']);
});

// --- normalizarLetra / letrasNormalizadasDePalabra ---

test('normalizarLetra: mayúscula y sin tilde', () => {
  assert.equal(normalizarLetra('á'), 'A');
  assert.equal(normalizarLetra('Á'), 'A');
  assert.equal(normalizarLetra('b'), 'B');
});

test('normalizarLetra: la eñe nunca pierde su tilde', () => {
  assert.equal(normalizarLetra('ñ'), 'Ñ');
  assert.equal(normalizarLetra('Ñ'), 'Ñ');
});

test('normalizarLetra: carácter vacío/nulo', () => {
  assert.equal(normalizarLetra(''), '');
  assert.equal(normalizarLetra(null), '');
});

test('letrasNormalizadasDePalabra: una entrada normalizada por casilla', () => {
  assert.deepEqual(letrasNormalizadasDePalabra('pájaro'), ['P', 'A', 'J', 'A', 'R', 'O']);
  assert.deepEqual(letrasNormalizadasDePalabra('niño'), ['N', 'I', 'Ñ', 'O']);
});

// --- formatearLetra ---

test('formatearLetra: mayúscula por defecto, conserva la tilde', () => {
  assert.equal(formatearLetra('á'), 'Á');
  assert.equal(formatearLetra('a'), 'A');
});

test('formatearLetra: mayuscula=false pasa a minúsculas', () => {
  assert.equal(formatearLetra('Á', false), 'á');
  assert.equal(formatearLetra('B', false), 'b');
});

test('formatearLetra: carácter vacío', () => {
  assert.equal(formatearLetra(''), '');
});

// --- esVocal ---

test('esVocal: solo A E I O U cuentan como vocal', () => {
  ['A', 'E', 'I', 'O', 'U'].forEach((v) => assert.equal(esVocal(v), true));
  ['B', 'Ñ', 'Z'].forEach((c) => assert.equal(esVocal(c), false));
});

// --- letrasOcultasUnicas ---

test('letrasOcultasUnicas: únicas, sin las ya usadas', () => {
  const letras = ['P', 'A', 'J', 'A', 'R', 'O'];
  assert.deepEqual(letrasOcultasUnicas(letras, []), ['P', 'A', 'J', 'R', 'O']);
  assert.deepEqual(letrasOcultasUnicas(letras, ['P', 'A']), ['J', 'R', 'O']);
  assert.deepEqual(letrasOcultasUnicas(letras, letras), []);
});

// --- palabraCompleta ---

test('palabraCompleta: true solo cuando todas las letras están entre las usadas', () => {
  const letras = ['G', 'A', 'T', 'O'];
  assert.equal(palabraCompleta(letras, ['G', 'A', 'T', 'O']), true);
  assert.equal(palabraCompleta(letras, ['G', 'A', 'T', 'O', 'X']), true);
  assert.equal(palabraCompleta(letras, ['G', 'A']), false);
});

test('palabraCompleta: lista de letras vacía nunca está "completa"', () => {
  assert.equal(palabraCompleta([], []), false);
  assert.equal(palabraCompleta(null, []), false);
});

// --- indicesDeLetraEnPalabra ---

test('indicesDeLetraEnPalabra: todas las apariciones, en orden', () => {
  const letras = ['B', 'A', 'N', 'A', 'N', 'A'];
  assert.deepEqual(indicesDeLetraEnPalabra(letras, 'A'), [1, 3, 5]);
  assert.deepEqual(indicesDeLetraEnPalabra(letras, 'N'), [2, 4]);
  assert.deepEqual(indicesDeLetraEnPalabra(letras, 'Z'), []);
});

test('indicesDeLetraEnPalabra: entradas inválidas devuelven vacío', () => {
  assert.deepEqual(indicesDeLetraEnPalabra(null, 'A'), []);
  assert.deepEqual(indicesDeLetraEnPalabra(['A'], ''), []);
});

// --- elegirLetraRegalada ---

test('elegirLetraRegalada: prioriza la letra más repetida', () => {
  const letras = ['B', 'A', 'N', 'A', 'N', 'A'];
  assert.equal(elegirLetraRegalada(['B', 'A', 'N'], letras), 'A'); // A: 3 veces
});

test('elegirLetraRegalada: en empate, la que aparece antes en la palabra', () => {
  const letras = ['C', 'A', 'C', 'A'];
  // C y A aparecen 2 veces cada una; C va primero (índice 0 < índice 1).
  assert.equal(elegirLetraRegalada(['C', 'A'], letras), 'C');
});

test('elegirLetraRegalada: sin candidatas devuelve null', () => {
  assert.equal(elegirLetraRegalada([], ['A', 'B']), null);
  assert.equal(elegirLetraRegalada(null, ['A', 'B']), null);
});

// --- resultadosDisponibles ---

test('resultadosDisponibles: todo disponible', () => {
  assert.deepEqual(
    resultadosDisponibles({
      quedanLetrasAbecedario: true,
      quedanCasillasPictograma: true,
      quedanVocales: true,
      quedanConsonantes: true
    }),
    ['letra', 'pista', 'vocal', 'consonante']
  );
});

test('resultadosDisponibles: nada disponible', () => {
  assert.deepEqual(resultadosDisponibles({}), []);
  assert.deepEqual(resultadosDisponibles(), []);
});

test('resultadosDisponibles: combinaciones parciales (sin pista, sin vocales)', () => {
  assert.deepEqual(
    resultadosDisponibles({ quedanLetrasAbecedario: true, quedanCasillasPictograma: false, quedanVocales: false, quedanConsonantes: true }),
    ['letra', 'consonante']
  );
});

// --- pesosResultados (ejemplos EXACTOS de la especificación, dificultad normal) ---

test('pesosResultados normal: todo disponible → 75/10/8/7', () => {
  const pesos = pesosResultados(['letra', 'pista', 'vocal', 'consonante'], 'normal');
  assert.deepEqual(pesos, { letra: 75, pista: 10, vocal: 8, consonante: 7 });
});

test('pesosResultados normal: pictograma completo (sin pista) → 80/10/10', () => {
  const pesos = pesosResultados(['letra', 'vocal', 'consonante'], 'normal');
  assert.deepEqual(pesos, { vocal: 10, consonante: 10, letra: 80 });
});

test('pesosResultados normal: sin vocales restantes → 80/10/10 (letra/pista/consonante)', () => {
  const pesos = pesosResultados(['letra', 'pista', 'consonante'], 'normal');
  assert.deepEqual(pesos, { pista: 10, consonante: 10, letra: 80 });
});

test('pesosResultados normal: sin consonantes restantes → 80/10/10 (letra/pista/vocal)', () => {
  const pesos = pesosResultados(['letra', 'pista', 'vocal'], 'normal');
  assert.deepEqual(pesos, { pista: 10, vocal: 10, letra: 80 });
});

test('pesosResultados: solo "letra" tiene efecto → 100%', () => {
  assert.deepEqual(pesosResultados(['letra'], 'normal'), { letra: 100 });
  assert.deepEqual(pesosResultados(['letra'], 'facil'), { letra: 100 });
  assert.deepEqual(pesosResultados(['letra'], 'dificil'), { letra: 100 });
});

test('pesosResultados: las tres dificultades siempre suman 100 y priorizan "letra"', () => {
  ['facil', 'normal', 'dificil'].forEach((dificultad) => {
    const completos = pesosResultados(['letra', 'pista', 'vocal', 'consonante'], dificultad);
    const suma = Object.values(completos).reduce((a, b) => a + b, 0);
    assert.equal(suma, 100);
    assert.ok(completos.letra > completos.pista);
    assert.ok(completos.letra > completos.vocal);
    assert.ok(completos.letra > completos.consonante);

    const degradados = pesosResultados(['letra', 'vocal', 'consonante'], dificultad);
    const sumaDegradada = Object.values(degradados).reduce((a, b) => a + b, 0);
    assert.equal(sumaDegradada, 100);
  });
});

test('pesosResultados: dificultad desconocida cae a "normal"', () => {
  assert.deepEqual(
    pesosResultados(['letra', 'pista', 'vocal', 'consonante'], 'rara'),
    pesosResultados(['letra', 'pista', 'vocal', 'consonante'], 'normal')
  );
});

test('pesosResultados: sin "letra" disponible, reparte el resto a partes iguales (caso límite)', () => {
  const pesos = pesosResultados(['vocal', 'consonante'], 'normal');
  assert.equal(pesos.vocal, 50);
  assert.equal(pesos.consonante, 50);
});

// --- elegirResultadoRuleta ---

test('elegirResultadoRuleta: respeta los umbrales acumulados de los pesos', () => {
  const pesos = { letra: 75, pista: 10, vocal: 8, consonante: 7 };
  assert.equal(elegirResultadoRuleta(pesos, 0), 'letra');
  assert.equal(elegirResultadoRuleta(pesos, 0.74), 'letra');
  assert.equal(elegirResultadoRuleta(pesos, 0.75), 'pista'); // empieza justo donde acaba "letra"
  assert.equal(elegirResultadoRuleta(pesos, 0.84), 'pista');
  assert.equal(elegirResultadoRuleta(pesos, 0.85), 'vocal');
  assert.equal(elegirResultadoRuleta(pesos, 0.92), 'vocal');
  assert.equal(elegirResultadoRuleta(pesos, 0.93), 'consonante');
  assert.equal(elegirResultadoRuleta(pesos, 0.999999), 'consonante');
});

test('elegirResultadoRuleta: pesos simples al 50/50', () => {
  const pesos = { a: 50, b: 50 };
  assert.equal(elegirResultadoRuleta(pesos, 0), 'a');
  assert.equal(elegirResultadoRuleta(pesos, 0.49), 'a');
  assert.equal(elegirResultadoRuleta(pesos, 0.5), 'b');
  assert.equal(elegirResultadoRuleta(pesos, 0.99), 'b');
});

test('elegirResultadoRuleta: ignora pesos a cero o negativos', () => {
  const pesos = { letra: 100, pista: 0 };
  assert.equal(elegirResultadoRuleta(pesos, 0), 'letra');
  assert.equal(elegirResultadoRuleta(pesos, 0.999), 'letra');
});

test('elegirResultadoRuleta: sin pesos válidos devuelve null', () => {
  assert.equal(elegirResultadoRuleta({}, 0.5), null);
  assert.equal(elegirResultadoRuleta(null, 0.5), null);
});

// --- retícula del pictograma ---

test('ORDEN_REVELADO_RETICULA: empieza por el centro, recorre las 9 casillas una vez', () => {
  assert.equal(ORDEN_REVELADO_RETICULA[0], 4);
  assert.equal(ORDEN_REVELADO_RETICULA.length, 9);
  assert.deepEqual([...ORDEN_REVELADO_RETICULA].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
});

test('casillasInicialesPictograma: 2 en fácil, 1 en normal/difícil', () => {
  assert.deepEqual(casillasInicialesPictograma('facil'), [4, 1]);
  assert.deepEqual(casillasInicialesPictograma('normal'), [4]);
  assert.deepEqual(casillasInicialesPictograma('dificil'), [4]);
});

test('casillasInicialesPictograma: dificultad desconocida cae a "normal" (1 casilla)', () => {
  assert.deepEqual(casillasInicialesPictograma('rara'), [4]);
});

test('siguienteCasillaPictograma: sigue el orden de revelado', () => {
  assert.equal(siguienteCasillaPictograma([]), 4);
  assert.equal(siguienteCasillaPictograma([4]), 1);
  assert.equal(siguienteCasillaPictograma([4, 1, 3, 5, 7, 0, 2, 6]), 8);
});

test('siguienteCasillaPictograma: null cuando ya están las 9 visibles', () => {
  assert.equal(siguienteCasillaPictograma([0, 1, 2, 3, 4, 5, 6, 7, 8]), null);
});

// --- palabraEncajaDificultad / elegirPalabrasJugables / elegirSiguientePalabra ---

test('palabraEncajaDificultad: rangos de longitud por dificultad', () => {
  assert.equal(palabraEncajaDificultad('oso', 'facil'), true); // 3 letras
  assert.equal(palabraEncajaDificultad('oso', 'normal'), false);
  assert.equal(palabraEncajaDificultad('pájaro', 'normal'), true); // 6 letras
  assert.equal(palabraEncajaDificultad('pájaro', 'dificil'), true); // 6 letras, límite inferior
  assert.equal(palabraEncajaDificultad('pájaro', 'facil'), false);
  assert.equal(palabraEncajaDificultad('elefante', 'dificil'), true); // 8 letras
  assert.equal(palabraEncajaDificultad('elefante', 'normal'), false);
});

test('elegirPalabrasJugables: filtra por dificultad cuando hay opciones que encajan', () => {
  const medios = mediosDePrueba(['oso', 'pájaro', 'elefante']);
  const jugables = elegirPalabrasJugables(medios, 'facil');
  assert.deepEqual(jugables.map((m) => m.nombre), ['oso']);
});

test('elegirPalabrasJugables: si nada encaja, usa todo lo que tenga al menos 2 letras', () => {
  const medios = mediosDePrueba(['elefante', 'rinoceronte']);
  const jugables = elegirPalabrasJugables(medios, 'facil');
  assert.deepEqual(jugables.map((m) => m.nombre), ['elefante', 'rinoceronte']);
});

test('elegirPalabrasJugables: medios inválido devuelve vacío', () => {
  assert.deepEqual(elegirPalabrasJugables(null, 'normal'), []);
});

test('elegirSiguientePalabra: elige entre las jugables, evitando repetir mientras pueda', () => {
  const medios = mediosDePrueba(['gato', 'pato', 'lobo']);
  const elegido = elegirSiguientePalabra(medios, 'normal', ['m0', 'm1']);
  assert.equal(elegido.id, 'm2');
});

test('elegirSiguientePalabra: si ya se usaron todas, puede repetir', () => {
  const medios = mediosDePrueba(['gato', 'pato']);
  const elegido = elegirSiguientePalabra(medios, 'normal', ['m0', 'm1']);
  assert.ok(['m0', 'm1'].includes(elegido.id));
});

test('elegirSiguientePalabra: sin material jugable devuelve null', () => {
  assert.equal(elegirSiguientePalabra([], 'normal', []), null);
});

// --- abecedario ---

test('ABECEDARIO_COMPLETO: A-Z y la eñe en su sitio, 27 letras', () => {
  assert.equal(ABECEDARIO_COMPLETO.length, 27);
  assert.equal(ABECEDARIO_COMPLETO.includes('Ñ'), true);
  assert.deepEqual(ABECEDARIO_COMPLETO.slice(13, 15), ['N', 'Ñ']);
});

test('crearAbecedario: dificultad normal/difícil usa el abecedario completo', () => {
  assert.deepEqual(crearAbecedario(['S', 'O', 'L'], 'normal'), ABECEDARIO_COMPLETO);
  assert.deepEqual(crearAbecedario(['S', 'O', 'L'], 'dificil'), ABECEDARIO_COMPLETO);
});

test('crearAbecedario: dificultad fácil reduce a las letras propias + 4 distractoras, en orden', () => {
  const abecedario = crearAbecedario(['S', 'O', 'L'], 'facil');
  assert.equal(abecedario.length, 7); // S, O, L + 4 distractoras
  ['S', 'O', 'L'].forEach((letra) => assert.ok(abecedario.includes(letra)));
  // Se mantiene el orden del abecedario completo (para que el teclado salga ordenado).
  const indices = abecedario.map((letra) => ABECEDARIO_COMPLETO.indexOf(letra));
  assert.deepEqual([...indices].sort((a, b) => a - b), indices);
});
