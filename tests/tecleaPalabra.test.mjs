// Pruebas: apps/teclea-palabra/tecleaPalabra.js (lógica pura de la
// mecánica "teclea la palabra con el teclado en pantalla").
//
// Igual que en arrastraPalabra.test.mjs, solo se prueba lo que no
// toca el DOM: normalización de texto (acentos/eñe), qué letras hacen
// falta para resaltar el teclado, si lo tecleado coincide con la
// palabra objetivo, qué teclado corresponde a cada idioma, y cómo se
// elige el siguiente pictograma evitando repetir.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserShims } from './helpers/shims.mjs';

installBrowserShims();

const {
  normalizarTexto,
  letrasNecesarias,
  comprobarPalabra,
  tecladoParaIdioma,
  elegirSiguienteMedio,
  formatearTexto,
  necesitaTeclaMayus,
  necesitaTeclaSimbolos,
  necesitaTeclaNumeros,
  necesitaTeclaEspacio,
  tildesNecesarias,
  simbolosNecesarios,
  numerosNecesarios,
  puedeResponder
} = await import('../apps/teclea-palabra/tecleaPalabra.js');

function mediosDePrueba(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `m${i}`, nombre: `Medio ${i}` }));
}

test('normalizarTexto: quita acentos y pone en minúsculas', () => {
  assert.equal(normalizarTexto('PÁJARO'), 'pajaro');
  assert.equal(normalizarTexto('León'), 'leon');
  assert.equal(normalizarTexto('Único'), 'unico');
});

test('normalizarTexto: respeta la Ñ como letra propia, no la quita', () => {
  assert.equal(normalizarTexto('Ñandú'), 'ñandu');
  assert.equal(normalizarTexto('PIÑA'), 'piña');
});

test('normalizarTexto: sin texto, devuelve cadena vacía', () => {
  assert.equal(normalizarTexto(''), '');
  assert.equal(normalizarTexto(null), '');
  assert.equal(normalizarTexto(undefined), '');
});

test('letrasNecesarias: letras únicas, normalizadas, sin espacios', () => {
  assert.deepEqual(letrasNecesarias('vaca'), ['v', 'a', 'c']);
  assert.deepEqual(letrasNecesarias('pájaro'), ['p', 'a', 'j', 'r', 'o']);
});

test('letrasNecesarias: ignora espacios en nombres con varias palabras', () => {
  const letras = letrasNecesarias('oso panda');
  assert.equal(letras.includes(' '), false);
  assert.ok(letras.includes('o'));
  assert.ok(letras.includes('p'));
});

test('comprobarPalabra: acierta sin importar mayúsculas ni acentos', () => {
  assert.equal(comprobarPalabra('pajaro', 'Pájaro'), true);
  assert.equal(comprobarPalabra('PAJARO', 'pájaro'), true);
  assert.equal(comprobarPalabra('piña', 'PIÑA'), true);
});

test('comprobarPalabra: distingue ñ de n (no son intercambiables)', () => {
  assert.equal(comprobarPalabra('pina', 'piña'), false);
});

test('comprobarPalabra: palabra distinta no acierta', () => {
  assert.equal(comprobarPalabra('gato', 'vaca'), false);
});

test('tecladoParaIdioma: castellano y demás lenguas de España llevan Ñ', () => {
  for (const lang of ['es', 'ca', 'eu', 'gl', 'va']) {
    const teclado = tecladoParaIdioma(lang);
    const letras = teclado.flat();
    assert.ok(letras.includes('ñ'), `el teclado de "${lang}" debería tener Ñ`);
  }
});

test('tecladoParaIdioma: inglés no lleva Ñ', () => {
  const teclado = tecladoParaIdioma('en');
  assert.equal(teclado.flat().includes('ñ'), false);
});

test('tecladoParaIdioma: idioma desconocido cae al teclado castellano', () => {
  const teclado = tecladoParaIdioma('xx');
  assert.deepEqual(teclado, tecladoParaIdioma('es'));
});

test('formatearTexto: por defecto pone en mayúsculas', () => {
  assert.equal(formatearTexto('vaca'), 'VACA');
});

test('formatearTexto: con mayuscula=false deja en minúsculas', () => {
  assert.equal(formatearTexto('VACA', false), 'vaca');
});

test('elegirSiguienteMedio: con menos de 1 medio no hay nada que elegir', () => {
  assert.equal(elegirSiguienteMedio([]), null);
  assert.equal(elegirSiguienteMedio(null), null);
});

test('elegirSiguienteMedio: evita repetir los ya usados si puede', () => {
  const medios = mediosDePrueba(4);
  for (let i = 0; i < 20; i++) {
    const medio = elegirSiguienteMedio(medios, { evitarIds: ['m0', 'm1', 'm2'] });
    assert.equal(medio.id, 'm3');
  }
});

test('elegirSiguienteMedio: si ya se usaron todos, vuelve a elegir entre todos', () => {
  const medios = mediosDePrueba(4);
  const medio = elegirSiguienteMedio(medios, { evitarIds: ['m0', 'm1', 'm2', 'm3'] });
  assert.ok(medio);
  assert.ok(medios.some((m) => m.id === medio.id));
});

// --- Ajustes de "mano amiga" (tildes/mayúsculas/puntuación/espacios automáticos) ---

test('normalizarTexto: por defecto (todo automático) ignora tildes, mayúsculas, puntuación y espacios', () => {
  assert.equal(normalizarTexto('¡Pájaro!'), 'pajaro');
  assert.equal(normalizarTexto('Oso Panda'), 'osopanda');
});

test('normalizarTexto: con tildesAutomaticas=false exige la tilde', () => {
  assert.equal(normalizarTexto('pájaro', { tildesAutomaticas: false }), 'pájaro');
  assert.notEqual(normalizarTexto('pajaro', { tildesAutomaticas: false }), normalizarTexto('pájaro', { tildesAutomaticas: false }));
});

test('normalizarTexto: con mayusculasAutomaticas=false respeta el caso', () => {
  assert.equal(normalizarTexto('Juan', { mayusculasAutomaticas: false }), 'Juan');
  assert.notEqual(normalizarTexto('Juan', { mayusculasAutomaticas: false }), normalizarTexto('juan', { mayusculasAutomaticas: false }));
});

test('normalizarTexto: con puntuacionAutomatica=false conserva los signos', () => {
  assert.equal(normalizarTexto('¿Qué?', { puntuacionAutomatica: false, mayusculasAutomaticas: false }), '¿Qué?'.replace('é', 'e'));
});

test('normalizarTexto: con espaciosAutomaticos=false conserva los espacios', () => {
  assert.equal(normalizarTexto('oso panda', { espaciosAutomaticos: false }), 'oso panda');
  assert.equal(normalizarTexto('oso panda', { espaciosAutomaticos: true }), 'osopanda');
});

test('comprobarPalabra: con todo automático (por defecto) perdona tildes, mayúsculas y espacios', () => {
  assert.equal(comprobarPalabra('oso panda', 'Oso Panda'), true);
  assert.equal(comprobarPalabra('osopanda', 'Oso Panda'), true);
});

test('comprobarPalabra: con mayusculasAutomaticas=false exige la mayúscula correcta', () => {
  const ajustes = { mayusculasAutomaticas: false };
  assert.equal(comprobarPalabra('Juan', 'Juan', ajustes), true);
  assert.equal(comprobarPalabra('juan', 'Juan', ajustes), false);
});

test('comprobarPalabra: con espaciosAutomaticos=false exige el espacio', () => {
  const ajustes = { espaciosAutomaticos: false };
  assert.equal(comprobarPalabra('oso panda', 'oso panda', ajustes), true);
  assert.equal(comprobarPalabra('osopanda', 'oso panda', ajustes), false);
});

test('letrasNecesarias: con tildes:false conserva las vocales con tilde como letras propias', () => {
  const letras = letrasNecesarias('pájaro', { tildes: false });
  assert.ok(letras.includes('á'));
  assert.equal(letras.includes('a'), true); // la "a" sin tilde de "jaro" sigue haciendo falta
});

test('necesitaTeclaMayus: solo si mayusculasAutomaticas=false y la palabra mezcla mayúsculas', () => {
  assert.equal(necesitaTeclaMayus('Juan', { mayusculasAutomaticas: false }), true);
  assert.equal(necesitaTeclaMayus('Juan', { mayusculasAutomaticas: true }), false);
  assert.equal(necesitaTeclaMayus('perro', { mayusculasAutomaticas: false }), false);
});

test('necesitaTeclaSimbolos: solo si puntuacionAutomatica=false y la palabra lleva signos', () => {
  assert.equal(necesitaTeclaSimbolos('¿Qué?', { puntuacionAutomatica: false }), true);
  assert.equal(necesitaTeclaSimbolos('¿Qué?', { puntuacionAutomatica: true }), false);
  assert.equal(necesitaTeclaSimbolos('perro', { puntuacionAutomatica: false }), false);
});

test('necesitaTeclaNumeros: si la palabra lleva alguna cifra (no depende de ajustes)', () => {
  assert.equal(necesitaTeclaNumeros('3 patos'), true);
  assert.equal(necesitaTeclaNumeros('patos'), false);
});

test('necesitaTeclaEspacio: solo si hay más de una palabra y espaciosAutomaticos=false', () => {
  assert.equal(necesitaTeclaEspacio('oso panda', { espaciosAutomaticos: false }), true);
  assert.equal(necesitaTeclaEspacio('oso panda', { espaciosAutomaticos: true }), false);
  assert.equal(necesitaTeclaEspacio('perro', { espaciosAutomaticos: false }), false);
});

test('tildesNecesarias: solo si tildesAutomaticas=false y la palabra lleva alguna tilde', () => {
  assert.deepEqual(tildesNecesarias('pájaro', { tildesAutomaticas: false }), ['á']);
  assert.deepEqual(tildesNecesarias('pajaro', { tildesAutomaticas: false }), []);
  assert.deepEqual(tildesNecesarias('pájaro', { tildesAutomaticas: true }), []);
});

test('simbolosNecesarios: signos únicos presentes en la palabra', () => {
  assert.deepEqual(simbolosNecesarios('¿Qué?'), ['¿', '?']);
  assert.deepEqual(simbolosNecesarios('perro'), []);
});

test('simbolosNecesarios: reconoce el guión bajo como símbolo', () => {
  assert.deepEqual(simbolosNecesarios('mi_palabra'), ['_']);
});

test('simbolosNecesarios: reconoce cualquier símbolo ASCII, no solo una lista cerrada', () => {
  assert.deepEqual(simbolosNecesarios('a*b'), ['*']);
  assert.deepEqual(simbolosNecesarios('1+1=2'), ['+', '=']);
  assert.deepEqual(simbolosNecesarios('50%'), ['%']);
});

test('numerosNecesarios: cifras únicas presentes en la palabra', () => {
  assert.deepEqual(numerosNecesarios('1 perro, 2 gatos'), ['1', '2']);
  assert.deepEqual(numerosNecesarios('perro'), []);
});

test('puedeResponder: con el pulsador TTS desactivado, siempre se puede responder', () => {
  assert.equal(puedeResponder({ pulsadorTts: false }, false), true);
  assert.equal(puedeResponder({ pulsadorTts: false }, true), true);
});

test('puedeResponder: con el pulsador TTS activado, hace falta haber escuchado la palabra', () => {
  assert.equal(puedeResponder({ pulsadorTts: true }, false), false);
  assert.equal(puedeResponder({ pulsadorTts: true }, true), true);
});
