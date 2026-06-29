// Pruebas: core/js/ajustesJuego.js (ajustes del portal sobre la pista
// de texto: mayúsculas/minúsculas, mostrar/ocultar, la pista de
// teclado de "Teclea la palabra", los cuatro ajustes de "mano amiga"
// al teclear: tildes, mayúsculas de nombres propios, puntuación y
// espacios automáticos, los dos ajustes de presentación del
// pictograma: solo texto y pulsador TTS, los dos ajustes propios de
// "Escribe la letra": letra punteada y tolerancia de trazo, el
// ajuste propio de "Ruleta de letras": dificultad, y los dos ajustes
// propios de "Lista de la compra": listaSoloTexto y estanteSoloImagen).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserShims } from './helpers/shims.mjs';

const localStorage = installBrowserShims();

const ajustesJuego = await import('../core/js/ajustesJuego.js');

const AJUSTES_POR_DEFECTO = {
  mayuscula: true,
  mostrar: true,
  resaltarTeclado: true,
  tildesAutomaticas: true,
  mayusculasAutomaticas: true,
  puntuacionAutomatica: true,
  espaciosAutomaticos: true,
  soloTexto: false,
  pulsadorTts: false,
  letraPunteada: true,
  toleranciaTrazo: 'facil',
  dificultadRuleta: 'facil',
  listaSoloTexto: false,
  estanteSoloImagen: false
};

test('por defecto, la pista se muestra, en mayúsculas, el teclado se resalta, la mano amiga está activada, el pictograma se ve normal (sin solo texto ni pulsador), "Escribe la letra" empieza con letra punteada y tolerancia fácil, "Ruleta de letras" empieza en dificultad fácil, y "Lista de la compra" empieza sin soloTexto/soloImagen en ninguno de sus dos lados', () => {
  assert.equal(ajustesJuego.getMayuscula(), true);
  assert.equal(ajustesJuego.getMostrarPista(), true);
  assert.equal(ajustesJuego.getResaltarTeclado(), true);
  assert.equal(ajustesJuego.getTildesAutomaticas(), true);
  assert.equal(ajustesJuego.getMayusculasAutomaticas(), true);
  assert.equal(ajustesJuego.getPuntuacionAutomatica(), true);
  assert.equal(ajustesJuego.getEspaciosAutomaticos(), true);
  assert.equal(ajustesJuego.getSoloTexto(), false);
  assert.equal(ajustesJuego.getPulsadorTts(), false);
  assert.equal(ajustesJuego.getLetraPunteada(), true);
  assert.equal(ajustesJuego.getToleranciaTrazo(), 'facil');
  assert.equal(ajustesJuego.getDificultadRuleta(), 'facil');
  assert.equal(ajustesJuego.getListaSoloTexto(), false);
  assert.equal(ajustesJuego.getEstanteSoloImagen(), false);
  assert.deepEqual(ajustesJuego.getAjustesPista(), AJUSTES_POR_DEFECTO);
});

test('setMayuscula(false) cambia el ajuste y se mantiene', () => {
  ajustesJuego.setMayuscula(false);
  assert.equal(ajustesJuego.getMayuscula(), false);
  ajustesJuego.setMayuscula(true);
  assert.equal(ajustesJuego.getMayuscula(), true);
});

test('setMostrarPista(false) cambia el ajuste y se mantiene', () => {
  ajustesJuego.setMostrarPista(false);
  assert.equal(ajustesJuego.getMostrarPista(), false);
  assert.deepEqual(ajustesJuego.getAjustesPista(), { ...AJUSTES_POR_DEFECTO, mostrar: false });
  ajustesJuego.setMostrarPista(true);
});

test('setResaltarTeclado(false) cambia el ajuste y se mantiene', () => {
  ajustesJuego.setResaltarTeclado(false);
  assert.equal(ajustesJuego.getResaltarTeclado(), false);
  assert.deepEqual(ajustesJuego.getAjustesPista(), { ...AJUSTES_POR_DEFECTO, resaltarTeclado: false });
  ajustesJuego.setResaltarTeclado(true);
});

test('setTildesAutomaticas(false) cambia el ajuste y se mantiene', () => {
  ajustesJuego.setTildesAutomaticas(false);
  assert.equal(ajustesJuego.getTildesAutomaticas(), false);
  assert.deepEqual(ajustesJuego.getAjustesPista(), { ...AJUSTES_POR_DEFECTO, tildesAutomaticas: false });
  ajustesJuego.setTildesAutomaticas(true);
});

test('setMayusculasAutomaticas(false) cambia el ajuste y se mantiene', () => {
  ajustesJuego.setMayusculasAutomaticas(false);
  assert.equal(ajustesJuego.getMayusculasAutomaticas(), false);
  assert.deepEqual(ajustesJuego.getAjustesPista(), { ...AJUSTES_POR_DEFECTO, mayusculasAutomaticas: false });
  ajustesJuego.setMayusculasAutomaticas(true);
});

test('setPuntuacionAutomatica(false) cambia el ajuste y se mantiene', () => {
  ajustesJuego.setPuntuacionAutomatica(false);
  assert.equal(ajustesJuego.getPuntuacionAutomatica(), false);
  assert.deepEqual(ajustesJuego.getAjustesPista(), { ...AJUSTES_POR_DEFECTO, puntuacionAutomatica: false });
  ajustesJuego.setPuntuacionAutomatica(true);
});

test('setEspaciosAutomaticos(false) cambia el ajuste y se mantiene', () => {
  ajustesJuego.setEspaciosAutomaticos(false);
  assert.equal(ajustesJuego.getEspaciosAutomaticos(), false);
  assert.deepEqual(ajustesJuego.getAjustesPista(), { ...AJUSTES_POR_DEFECTO, espaciosAutomaticos: false });
  ajustesJuego.setEspaciosAutomaticos(true);
});

test('setSoloTexto(true) cambia el ajuste y se mantiene', () => {
  ajustesJuego.setSoloTexto(true);
  assert.equal(ajustesJuego.getSoloTexto(), true);
  assert.deepEqual(ajustesJuego.getAjustesPista(), { ...AJUSTES_POR_DEFECTO, soloTexto: true });
  ajustesJuego.setSoloTexto(false);
});

test('setPulsadorTts(true) cambia el ajuste y se mantiene', () => {
  ajustesJuego.setPulsadorTts(true);
  assert.equal(ajustesJuego.getPulsadorTts(), true);
  assert.deepEqual(ajustesJuego.getAjustesPista(), { ...AJUSTES_POR_DEFECTO, pulsadorTts: true });
  ajustesJuego.setPulsadorTts(false);
});

test('setLetraPunteada(false) cambia el ajuste y se mantiene', () => {
  ajustesJuego.setLetraPunteada(false);
  assert.equal(ajustesJuego.getLetraPunteada(), false);
  assert.deepEqual(ajustesJuego.getAjustesPista(), { ...AJUSTES_POR_DEFECTO, letraPunteada: false });
  ajustesJuego.setLetraPunteada(true);
});

test('setToleranciaTrazo: acepta "facil"/"normal"/"dificil" y se mantiene', () => {
  ajustesJuego.setToleranciaTrazo('dificil');
  assert.equal(ajustesJuego.getToleranciaTrazo(), 'dificil');
  assert.deepEqual(ajustesJuego.getAjustesPista(), { ...AJUSTES_POR_DEFECTO, toleranciaTrazo: 'dificil' });
  ajustesJuego.setToleranciaTrazo('normal');
  assert.equal(ajustesJuego.getToleranciaTrazo(), 'normal');
  ajustesJuego.setToleranciaTrazo('facil');
});

test('setToleranciaTrazo: un valor no reconocido cae a "facil"', () => {
  ajustesJuego.setToleranciaTrazo('imposible');
  assert.equal(ajustesJuego.getToleranciaTrazo(), 'facil');
});

test('setDificultadRuleta: acepta "facil"/"normal"/"dificil" y se mantiene', () => {
  ajustesJuego.setDificultadRuleta('dificil');
  assert.equal(ajustesJuego.getDificultadRuleta(), 'dificil');
  assert.deepEqual(ajustesJuego.getAjustesPista(), { ...AJUSTES_POR_DEFECTO, dificultadRuleta: 'dificil' });
  ajustesJuego.setDificultadRuleta('normal');
  assert.equal(ajustesJuego.getDificultadRuleta(), 'normal');
  ajustesJuego.setDificultadRuleta('facil');
});

test('setDificultadRuleta: un valor no reconocido cae a "facil"', () => {
  ajustesJuego.setDificultadRuleta('imposible');
  assert.equal(ajustesJuego.getDificultadRuleta(), 'facil');
});

test('onChange: avisa cuando cambia un ajuste, y deja de avisar al cancelar', () => {
  const avisos = [];
  const cancelar = ajustesJuego.onChange((ajustes) => avisos.push(ajustes));

  ajustesJuego.setMayuscula(false);
  assert.equal(avisos.length, 1);
  assert.deepEqual(avisos[0], { ...AJUSTES_POR_DEFECTO, mayuscula: false });

  cancelar();
  ajustesJuego.setMayuscula(true);
  assert.equal(avisos.length, 1); // ya no debería llegar un segundo aviso
});

// --- Cadena de resolución por juego: clave propia → clave global
// heredada → valor de fábrica (ver el comentario de cabecera de
// ajustesJuego.js para el diseño completo). ---

test('un juego sin clave propia hereda el valor global (la global sigue siendo la de "siempre")', () => {
  ajustesJuego.setSoloTexto(true); // cambia el global; ningún juego tiene clave propia todavía
  assert.equal(ajustesJuego.getSoloTexto('memoria-animales'), true);
  assert.equal(ajustesJuego.getSoloTexto('teclea-palabra-animales'), true);
  ajustesJuego.setSoloTexto(false); // restaurar el global a su valor de fábrica
});

test('escribir un ajuste con appId crea una clave propia que desacopla ese juego del global', () => {
  assert.equal(ajustesJuego.getPulsadorTts(), false); // global de fábrica

  ajustesJuego.setPulsadorTts(true, 'teclea-palabra-animales'); // crea su clave propia
  assert.equal(ajustesJuego.getPulsadorTts('teclea-palabra-animales'), true);
  assert.equal(ajustesJuego.getPulsadorTts(), false); // el global no se ha tocado

  // Cambiar el global después de crear la clave propia no afecta a este
  // juego (ya quedó desacoplado), pero sigue afectando a cualquier otro
  // juego que no tenga su propia clave.
  ajustesJuego.setPulsadorTts(true);
  assert.equal(ajustesJuego.getPulsadorTts('teclea-palabra-animales'), true); // su propio valor, no el nuevo global
  assert.equal(ajustesJuego.getPulsadorTts('bingo-lectura-animales'), true); // este sí hereda el nuevo global

  ajustesJuego.setPulsadorTts(false); // restaurar el global a su valor de fábrica
  assert.equal(ajustesJuego.getPulsadorTts('teclea-palabra-animales'), true); // su clave propia sigue intacta
});

test('un juego nuevo, sin clave global heredada (nunca se guardó), cae directo al valor de fábrica', () => {
  localStorage.removeItem('pictosfera.pista.mayuscula'); // como si nunca se hubiera guardado nada
  assert.equal(ajustesJuego.getMayuscula('un-juego-que-no-existia-antes'), true);
  ajustesJuego.setMayuscula(true); // deja la clave global como estaba (de fábrica)
});

test('un ajuste de tipo "select" (enum) sigue la misma cadena: hereda el global, y la clave propia lo desacopla', () => {
  ajustesJuego.setToleranciaTrazo('dificil'); // cambia el global
  assert.equal(ajustesJuego.getToleranciaTrazo('escribe-letra-animales'), 'dificil'); // hereda

  ajustesJuego.setToleranciaTrazo('normal', 'escribe-letra-animales'); // clave propia
  assert.equal(ajustesJuego.getToleranciaTrazo('escribe-letra-animales'), 'normal');
  assert.equal(ajustesJuego.getToleranciaTrazo(), 'dificil'); // el global no cambia

  ajustesJuego.setToleranciaTrazo('facil'); // restaurar el global a su valor de fábrica
  assert.equal(ajustesJuego.getToleranciaTrazo('escribe-letra-animales'), 'normal'); // su propia clave no se ve afectada
});

test('getAjustesPista(appId) devuelve la foto fija ya resuelta para ese juego en concreto, sin tocar la global', () => {
  ajustesJuego.setMayuscula(false, 'memoria-animales'); // clave propia solo de este juego
  const propios = ajustesJuego.getAjustesPista('memoria-animales');
  assert.equal(propios.mayuscula, false);
  assert.deepEqual(ajustesJuego.getAjustesPista(), AJUSTES_POR_DEFECTO); // el global sigue de fábrica
});
