// Pruebas: core/js/appLoader.js (solo la lógica pura: nombreDescriptor
// y elegirParejaAleatoria)
//
// El resto de appLoader.js (loadDescriptors, mountApp...) depende de
// fetch real y de importar dinámicamente el código de cada app, así
// que no se prueba aquí (igual que el resto del proyecto no prueba esa
// capa de orquestación). Lo que sí es lógica pura, y vale la pena
// comprobar, es cómo se decide el nombre a mostrar de una app (este es
// justo el arreglo del bug de "los nombres de los juegos no se
// traducen al cambiar el idioma") y, para la mecánica "clasifica los
// pictogramas en dos categorías", qué pareja del banco le toca a una
// partida nueva.

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserShims } from './helpers/shims.mjs';

installBrowserShims();

const { initI18n, setLanguage } = await import('../core/js/i18n.js');
const { nombreDescriptor, elegirParejaAleatoria } = await import('../core/js/appLoader.js');

before(async () => {
  await initI18n();
});

test('con nombreClave, traduce el nombre al idioma activo', async () => {
  const descriptor = { nombre: 'Memoria', nombreClave: 'juegos_nombres.memoria_animales' };
  assert.equal(nombreDescriptor(descriptor), 'Memoria');
  await setLanguage('en');
  assert.equal(nombreDescriptor(descriptor), 'Memory');
  await setLanguage('es');
});

test('sin nombreClave, usa el nombre literal del descriptor', () => {
  const descriptor = { nombre: 'Una app sin traducir todavía' };
  assert.equal(nombreDescriptor(descriptor), 'Una app sin traducir todavía');
});

test('descriptor nulo o indefinido no rompe: devuelve cadena vacía', () => {
  assert.equal(nombreDescriptor(null), '');
  assert.equal(nombreDescriptor(undefined), '');
});

test('una nombreClave mal escrita se ve como la propia clave (error visible, no en blanco)', () => {
  const descriptor = { nombre: 'Nombre original', nombreClave: 'esto.no.existe' };
  assert.equal(nombreDescriptor(descriptor), 'esto.no.existe');
});

// --- elegirParejaAleatoria ---

function parejasDePrueba() {
  return [
    { id: 'grande-pequeno', categorias: [{ id: 'grande' }, { id: 'pequeno' }] },
    { id: 'rojo-verde', categorias: [{ id: 'rojo' }, { id: 'verde' }] }
  ];
}

test('elegirParejaAleatoria: devuelve una de las parejas del banco', () => {
  const parejas = parejasDePrueba();
  for (let i = 0; i < 50; i++) {
    const elegida = elegirParejaAleatoria(parejas);
    assert.ok(parejas.includes(elegida));
  }
});

test('elegirParejaAleatoria: con una sola pareja, siempre devuelve esa', () => {
  const parejas = [parejasDePrueba()[0]];
  for (let i = 0; i < 10; i++) {
    assert.equal(elegirParejaAleatoria(parejas), parejas[0]);
  }
});

test('elegirParejaAleatoria: sin parejas (o valor inválido), devuelve null', () => {
  assert.equal(elegirParejaAleatoria([]), null);
  assert.equal(elegirParejaAleatoria(null), null);
  assert.equal(elegirParejaAleatoria(undefined), null);
});
