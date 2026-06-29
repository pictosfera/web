// Pruebas: core/js/i18n.js
//
// Comprueba lo más importante del idioma: que arranca en castellano,
// que cambiar de idioma de verdad cambia los textos, y que una clave
// que falta en un idioma parcial (catalán, euskera, valenciano,
// gallego) cae al castellano en vez de romperse o salir en blanco.

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserShims } from './helpers/shims.mjs';

installBrowserShims();

const { initI18n, setLanguage, getLanguage, t } = await import('../core/js/i18n.js');

before(async () => {
  await initI18n();
});

test('arranca en castellano por defecto', () => {
  assert.equal(getLanguage(), 'es');
  assert.equal(t('nav.inicio'), 'Inicio');
});

test('cambiar de idioma cambia los textos', async () => {
  await setLanguage('en');
  assert.equal(getLanguage(), 'en');
  assert.equal(t('nav.inicio'), 'Home');
  await setLanguage('es');
});

test('una clave que falta en un idioma parcial cae al castellano', async () => {
  await setLanguage('eu');
  // "ajustes.privacidad_texto" se ha dejado deliberadamente sin
  // traducir al euskera (texto largo y delicado): debe verse en
  // castellano hasta que alguien lo revise, nunca vacío ni la clave.
  const texto = t('ajustes.privacidad_texto');
  assert.equal(texto, 'Pictosfera no tiene servidor ni base de datos propios. Todo lo que añades vive solo en este dispositivo y en este navegador. Si borras los datos del navegador, se perderá todo salvo que tengas una copia de seguridad exportada; las fotos solo se recuperan si las incluiste en esa copia.');
  await setLanguage('es');
});

test('una clave que no existe en ningún idioma devuelve la propia clave (no rompe)', () => {
  assert.equal(t('esto.no.existe'), 'esto.no.existe');
});

test('interpola variables tipo {n}', async () => {
  await setLanguage('es');
  assert.equal(t('memoria.intentos', { n: 3 }), 'Intentos: 3');
});

test('idioma desconocido cae a castellano sin romper', async () => {
  await setLanguage('xx');
  assert.equal(getLanguage(), 'es');
});
