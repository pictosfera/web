// Pruebas: apps/escribe-letra/escribeLetra.js (lógica pura de la
// mecánica "escribe la letra: escritura guiada letra a letra").
//
// Lo que pinta en un <canvas> real y escucha eventos de puntero no se
// prueba aquí (no hay Canvas en Node, ver tests/helpers/shims.mjs).
// Sí se prueba todo lo demás: qué letras hay que trazar para una
// palabra dada, con qué forma exacta según los ajustes de pista, y la
// comparación de máscaras (rejillas de 0/1) que decide si un trazo es
// válido para cada nivel de tolerancia.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserShims } from './helpers/shims.mjs';

installBrowserShims();

const {
  letrasDePalabra,
  letraEsperada,
  casillasObjetivo,
  dilatarMascara,
  contarPixeles,
  proporcionDentro,
  indicesPorZona,
  cubreTodasLasZonas,
  NIVELES_TRAZO,
  configTolerancia,
  evaluarTrazo,
  formatearTexto,
  elegirSiguienteMedio,
  puedeResponder
} = await import('../apps/escribe-letra/escribeLetra.js');

function mediosDePrueba(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `m${i}`, nombre: `Medio ${i}` }));
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

// --- letraEsperada ---

test('letraEsperada: mayúscula por defecto y tildes fuera por defecto', () => {
  assert.equal(letraEsperada('á', {}), 'A');
  assert.equal(letraEsperada('a', {}), 'A');
  assert.equal(letraEsperada('o', {}), 'O');
});

test('letraEsperada: respeta tildesAutomaticas=false (hay que trazar el acento)', () => {
  assert.equal(letraEsperada('á', { tildesAutomaticas: false }), 'Á');
  assert.equal(letraEsperada('a', { tildesAutomaticas: false }), 'A');
});

test('letraEsperada: respeta mayuscula=false (minúsculas)', () => {
  assert.equal(letraEsperada('á', { mayuscula: false }), 'a');
  assert.equal(letraEsperada('á', { mayuscula: false, tildesAutomaticas: false }), 'á');
});

test('letraEsperada: la eñe nunca pierde la tilde aunque tildesAutomaticas esté activo', () => {
  assert.equal(letraEsperada('ñ', {}), 'Ñ');
  assert.equal(letraEsperada('Ñ', { mayuscula: false }), 'ñ');
});

// --- casillasObjetivo ---

test('casillasObjetivo: una letra por casilla, en orden, con los ajustes aplicados', () => {
  assert.deepEqual(casillasObjetivo('Pájaro', {}), ['P', 'A', 'J', 'A', 'R', 'O']);
  assert.deepEqual(casillasObjetivo('Pájaro', { tildesAutomaticas: false }), ['P', 'Á', 'J', 'A', 'R', 'O']);
  assert.deepEqual(casillasObjetivo('Pájaro', { mayuscula: false }), ['p', 'a', 'j', 'a', 'r', 'o']);
});

// --- dilatarMascara / contarPixeles / proporcionDentro ---

test('dilatarMascara: con radio 0 devuelve una copia igual', () => {
  const m = [0, 1, 0, 0, 1, 0];
  const resultado = dilatarMascara(m, 3, 2, 0);
  assert.deepEqual(resultado, m);
  assert.notEqual(resultado, m); // es una copia, no la misma referencia
});

test('dilatarMascara: ensancha cada píxel a sus vecinos dentro del radio', () => {
  // rejilla 3x3, un único píxel encendido en el centro (índice 4)
  const m = [0, 0, 0, 0, 1, 0, 0, 0, 0];
  const resultado = dilatarMascara(m, 3, 3, 1);
  assert.deepEqual(resultado, [1, 1, 1, 1, 1, 1, 1, 1, 1]); // toda la rejilla 3x3 queda dentro del radio 1
});

test('dilatarMascara: no se sale de los bordes de la rejilla', () => {
  // rejilla 2x2, píxel encendido en la esquina (índice 0)
  const m = [1, 0, 0, 0];
  const resultado = dilatarMascara(m, 2, 2, 1);
  assert.deepEqual(resultado, [1, 1, 1, 1]); // toda la rejilla cabe en el radio 1 desde la esquina
});

test('contarPixeles: cuenta los píxeles a 1', () => {
  assert.equal(contarPixeles([0, 1, 1, 0, 1]), 3);
  assert.equal(contarPixeles([0, 0, 0]), 0);
});

test('proporcionDentro: proporción de píxeles de A que también están en B', () => {
  const a = [1, 1, 0, 1];
  const b = [1, 0, 0, 1];
  assert.equal(proporcionDentro(a, b), 2 / 3);
  assert.equal(proporcionDentro([0, 0, 0], b), 0); // si A no tiene píxeles, no hay división por cero
  assert.equal(proporcionDentro(a, a), 1);
});

// --- configTolerancia / evaluarTrazo ---

test('configTolerancia: facil es más permisivo que normal, y normal que dificil', () => {
  const facil = configTolerancia('facil');
  const normal = configTolerancia('normal');
  const dificil = configTolerancia('dificil');
  assert.ok(facil.radio >= normal.radio && normal.radio >= dificil.radio);
  assert.ok(facil.minCobertura <= normal.minCobertura && normal.minCobertura <= dificil.minCobertura);
  assert.ok(facil.maxDesvio >= normal.maxDesvio && normal.maxDesvio >= dificil.maxDesvio);
  assert.ok(facil.minRatioTrazo <= normal.minRatioTrazo && normal.minRatioTrazo <= dificil.minRatioTrazo);
});

test('configTolerancia: un nivel desconocido cae a "facil"', () => {
  assert.deepEqual(configTolerancia('lo-que-sea'), NIVELES_TRAZO.facil);
  assert.deepEqual(configTolerancia(undefined), NIVELES_TRAZO.facil);
});

test('evaluarTrazo: un trazo que cubre bien la letra y no se sale es correcto', () => {
  const ancho = 6;
  const alto = 6;
  // letra de referencia: una fila horizontal completa
  const mascaraReferencia = new Array(ancho * alto).fill(0);
  for (let x = 0; x < ancho; x++) mascaraReferencia[2 * ancho + x] = 1;
  // trazo: la misma fila, calcado
  const mascaraTrazo = mascaraReferencia.slice();

  const resultado = evaluarTrazo({ mascaraReferencia, mascaraTrazo, ancho, alto }, 'normal');
  assert.equal(resultado.correcto, true);
  assert.equal(resultado.cobertura, 1);
  assert.equal(resultado.desvio, 0);
});

test('evaluarTrazo: un trazo casi vacío no es correcto en ningún nivel', () => {
  const ancho = 6;
  const alto = 6;
  const mascaraReferencia = new Array(ancho * alto).fill(0);
  for (let x = 0; x < ancho; x++) mascaraReferencia[2 * ancho + x] = 1;
  const mascaraTrazo = new Array(ancho * alto).fill(0);
  mascaraTrazo[0] = 1; // un único punto, lejos de la letra

  for (const nivel of ['facil', 'normal', 'dificil']) {
    const resultado = evaluarTrazo({ mascaraReferencia, mascaraTrazo, ancho, alto }, nivel);
    assert.equal(resultado.correcto, false, `nivel ${nivel} no debería aceptar un punto suelto`);
  }
});

test('evaluarTrazo: un trazo desplazado dos celdas pasa en "facil" pero no en "dificil"', () => {
  const ancho = 14;
  const alto = 14;
  const mascaraReferencia = new Array(ancho * alto).fill(0);
  for (let x = 2; x < 10; x++) mascaraReferencia[6 * ancho + x] = 1; // fila de referencia
  const mascaraTrazo = new Array(ancho * alto).fill(0);
  for (let x = 2; x < 10; x++) mascaraTrazo[8 * ancho + x] = 1; // misma fila, dos celdas más abajo

  const facil = evaluarTrazo({ mascaraReferencia, mascaraTrazo, ancho, alto }, 'facil');
  const dificil = evaluarTrazo({ mascaraReferencia, mascaraTrazo, ancho, alto }, 'dificil');
  assert.equal(facil.correcto, true);
  assert.equal(dificil.correcto, false);
});

test('evaluarTrazo: una raya corta que solo calca UN brazo de una letra con varios trazos (ej. "V") no es correcta en normal/dificil', () => {
  // Letra de referencia con forma de "V": dos brazos diagonales que
  // convergen abajo. Esto reproduce el caso real reportado: un trazo
  // simple (una sola raya) coincidiendo por casualidad con parte de
  // una letra compuesta de varios trazos no debería aceptarse, ni
  // siquiera cuando el nivel de tolerancia es "dificil".
  const ancho = 12;
  const alto = 12;
  const mascaraReferencia = new Array(ancho * alto).fill(0);
  for (let y = 0; y <= 9; y++) {
    const xIzq = Math.round((4 / 9) * y); // brazo izquierdo: de (0,0) a (4,9)
    const xDer = Math.round(9 - (5 / 9) * y); // brazo derecho: de (9,0) a (4,9)
    mascaraReferencia[y * ancho + xIzq] = 1;
    mascaraReferencia[y * ancho + xDer] = 1;
  }

  // El trazo del niño: solo el brazo izquierdo, calcado exactamente.
  const mascaraTrazo = new Array(ancho * alto).fill(0);
  for (let y = 0; y <= 9; y++) {
    const xIzq = Math.round((4 / 9) * y);
    mascaraTrazo[y * ancho + xIzq] = 1;
  }

  const normal = evaluarTrazo({ mascaraReferencia, mascaraTrazo, ancho, alto }, 'normal');
  const dificil = evaluarTrazo({ mascaraReferencia, mascaraTrazo, ancho, alto }, 'dificil');
  assert.equal(normal.correcto, false, 'normal no debería aceptar solo medio trazo de la letra');
  assert.equal(dificil.correcto, false, 'dificil no debería aceptar solo medio trazo de la letra');
});

test('indicesPorZona: reparte una rejilla en divisiones×divisiones zonas que cubren toda la rejilla sin solapes', () => {
  const zonas = indicesPorZona(6, 6, 3);
  assert.equal(zonas.length, 9);
  const todos = zonas.flat().sort((a, b) => a - b);
  assert.deepEqual(todos, Array.from({ length: 36 }, (_, i) => i)); // cada índice aparece exactamente una vez
});

test('cubreTodasLasZonas: exige tinta de trazo solo en las zonas con tinta de referencia de sobra', () => {
  // rejilla 4x4, dos zonas (2x2 cada una): arriba-izq con referencia,
  // abajo-der sin referencia.
  const zonas = indicesPorZona(4, 4, 2);
  const referencia = [
    1, 1, 0, 0,
    1, 1, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 0
  ];
  const trazoCompleto = referencia.slice();
  const trazoVacio = new Array(16).fill(0);
  assert.equal(cubreTodasLasZonas(referencia, trazoCompleto, zonas, 2), true);
  assert.equal(cubreTodasLasZonas(referencia, trazoVacio, zonas, 2), false);
  // si la zona con tinta no llega al mínimo exigido, no se exige nada
  assert.equal(cubreTodasLasZonas(referencia, trazoVacio, zonas, 5), true);
});

test('evaluarTrazo: un trazo que solo recorre UNA de dos partes muy separadas de la letra no es correcto, ni en "facil" ni en "normal" (aunque cobertura/desvío agregados parezcan suficientes)', () => {
  // Letra de referencia con dos bloques de tinta muy alejados entre sí
  // (como las dos partes de una letra con trazos separados, p.ej. "Ü"
  // o los dos extremos de una "Z"): uno arriba a la izquierda y otro
  // abajo a la derecha, en una rejilla de 18x18 (el GRID real de la
  // mecánica). El niño solo traza (con un garabato grueso) el bloque de
  // arriba a la izquierda, sin acercarse siquiera al de abajo a la
  // derecha.
  //
  // Esto es justo el caso real que motivó este cambio: con solo
  // cobertura/desvío/minRatioTrazo (el método anterior), un trazo así
  // "cuela" en facil y normal porque, aunque solo toca la mitad de la
  // letra, esa mitad es suficiente para superar el umbral AGREGADO de
  // cobertura sin generar desvío (el trazo no se sale de la letra
  // ensanchada, simplemente no llega a la otra mitad). El control por
  // zonas (cubreTodasLasZonas) es el que detecta que falta una región
  // estructural completa y lo rechaza.
  const ancho = 18;
  const alto = 18;
  const mascaraReferencia = new Array(ancho * alto).fill(0);
  for (let y = 0; y <= 3; y++) {
    for (let x = 0; x <= 3; x++) mascaraReferencia[y * ancho + x] = 1; // bloque arriba-izquierda
  }
  for (let y = 14; y <= 17; y++) {
    for (let x = 14; x <= 17; x++) mascaraReferencia[y * ancho + x] = 1; // bloque abajo-derecha
  }

  const mascaraTrazo = new Array(ancho * alto).fill(0);
  for (let y = 0; y <= 5; y++) {
    for (let x = 0; x <= 5; x++) mascaraTrazo[y * ancho + x] = 1; // garabato grueso, solo arriba-izquierda
  }

  for (const nivel of ['facil', 'normal']) {
    const cfg = configTolerancia(nivel);
    const resultado = evaluarTrazo({ mascaraReferencia, mascaraTrazo, ancho, alto }, nivel);
    // Las métricas agregadas (heredadas del método anterior) sí pasan:
    // confirma que este caso es justo el que antes se aceptaba por error.
    assert.ok(resultado.cobertura >= cfg.minCobertura, `nivel ${nivel}: la cobertura agregada debería bastar`);
    assert.ok(resultado.desvio <= cfg.maxDesvio, `nivel ${nivel}: el desvío agregado debería bastar`);
    // Pero el control por zonas detecta que falta toda una región
    // estructural de la letra, así que el resultado final es incorrecto.
    assert.equal(resultado.zonasCubiertas, false, `nivel ${nivel}: debería faltar una zona`);
    assert.equal(resultado.correcto, false, `nivel ${nivel} no debería aceptar solo una de dos partes separadas`);
  }
});

test('evaluarTrazo: un garabato que cubre la letra pero se sale mucho no es correcto', () => {
  const ancho = 10;
  const alto = 10;
  const mascaraReferencia = new Array(ancho * alto).fill(0);
  for (let x = 2; x < 8; x++) mascaraReferencia[5 * ancho + x] = 1;
  const mascaraTrazo = new Array(ancho * alto).fill(1); // toda la rejilla rellena

  const resultado = evaluarTrazo({ mascaraReferencia, mascaraTrazo, ancho, alto }, 'normal');
  assert.equal(resultado.correcto, false);
  assert.ok(resultado.desvio > configTolerancia('normal').maxDesvio);
});

// --- lógica compartida con el resto de mecánicas (duplicada a propósito) ---

test('formatearTexto: aplica mayúscula/minúscula', () => {
  assert.equal(formatearTexto('pájaro', true), 'PÁJARO');
  assert.equal(formatearTexto('PÁJARO', false), 'pájaro');
  assert.equal(formatearTexto('', true), '');
});

test('elegirSiguienteMedio: evita repetir mientras queden medios sin usar', () => {
  const medios = mediosDePrueba(3);
  const elegido = elegirSiguienteMedio(medios, { evitarIds: ['m0', 'm1'] });
  assert.equal(elegido.id, 'm2');
});

test('elegirSiguienteMedio: si ya se usaron todos, puede volver a elegir cualquiera', () => {
  const medios = mediosDePrueba(2);
  const elegido = elegirSiguienteMedio(medios, { evitarIds: ['m0', 'm1'] });
  assert.ok(['m0', 'm1'].includes(elegido.id));
});

test('elegirSiguienteMedio: sin medios, devuelve null', () => {
  assert.equal(elegirSiguienteMedio([], {}), null);
  assert.equal(elegirSiguienteMedio(null, {}), null);
});

test('puedeResponder: bloquea solo cuando hay pulsador TTS y no se ha escuchado', () => {
  assert.equal(puedeResponder({ pulsadorTts: false }, false), true);
  assert.equal(puedeResponder({ pulsadorTts: true }, false), false);
  assert.equal(puedeResponder({ pulsadorTts: true }, true), true);
});
