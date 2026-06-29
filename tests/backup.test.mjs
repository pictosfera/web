// Pruebas: core/js/backup.js
//
// La copia de seguridad es la única red de seguridad real del
// proyecto (todo lo demás vive solo en este dispositivo), así que
// aquí se comprueba con cuidado: qué se guarda según se incluyan o no
// las fotos, que un archivo con forma rara no se acepta a ciegas, que
// importar reconstruye bien los medios y los ajustes, y cuándo debe
// avisarse de que toca hacer una copia.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserShims } from './helpers/shims.mjs';

installBrowserShims();

const {
  TIPO_COPIA,
  VERSION_COPIA,
  construirCopia,
  validarCopia,
  aplicarCopia,
  necesitaRecordatorio
} = await import('../core/js/backup.js');

const medios = [
  { id: 'arasaac:1', origen: 'arasaac', nombre: 'Casa', etiquetas: ['vivienda'], imagen: 'https://x/1.png', creado: '2026-01-01T00:00:00.000Z' },
  { id: 'foto:1', origen: 'foto', nombre: 'Mi perro', etiquetas: ['animales'], archivo: { tipo: 'blob-falso' }, creado: '2026-01-02T00:00:00.000Z' }
];
const ajustes = { idioma: 'es', pin: '1234' };

test('construirCopia: por defecto NO incluye la imagen de las fotos, pero sí su nombre/etiquetas', async () => {
  const copia = await construirCopia(medios, ajustes);
  assert.equal(copia.tipo, TIPO_COPIA);
  assert.equal(copia.version, VERSION_COPIA);
  assert.equal(copia.incluyeFotos, false);
  assert.deepEqual(copia.ajustes, { idioma: 'es', pin: '1234', accesoLibreJuegos: true });
  assert.equal(copia.medios.length, 2);

  const foto = copia.medios.find((m) => m.origen === 'foto');
  assert.equal(foto.nombre, 'Mi perro');
  assert.deepEqual(foto.etiquetas, ['animales']);
  assert.equal('archivoDataUrl' in foto, false);
  assert.equal('archivo' in foto, false); // un Blob no se puede meter en JSON

  const arasaac = copia.medios.find((m) => m.origen === 'arasaac');
  assert.equal(arasaac.nombre, 'Casa');
  assert.equal(arasaac.imagen, 'https://x/1.png');
});

test('construirCopia: con incluirFotos:true, convierte el archivo con la función inyectada', async () => {
  const blobADataUrl = async (archivo) => `data:image/png;base64,FALSO(${archivo.tipo})`;
  const copia = await construirCopia(medios, ajustes, { incluirFotos: true, blobADataUrl });
  assert.equal(copia.incluyeFotos, true);
  const foto = copia.medios.find((m) => m.origen === 'foto');
  assert.equal(foto.archivoDataUrl, 'data:image/png;base64,FALSO(blob-falso)');
});

test('validarCopia: acepta una copia con forma correcta', () => {
  assert.deepEqual(validarCopia({ tipo: TIPO_COPIA, medios: [] }), { ok: true });
});

test('validarCopia: rechaza null/undefined/no-objeto', () => {
  assert.equal(validarCopia(null).ok, false);
  assert.equal(validarCopia(undefined).ok, false);
  assert.equal(validarCopia('texto').ok, false);
});

test('validarCopia: rechaza un archivo de otro tipo (no es una copia de Pictosfera)', () => {
  const r = validarCopia({ tipo: 'otra-cosa', medios: [] });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'tipo-desconocido');
});

test('validarCopia: rechaza si "medios" no es una lista', () => {
  const r = validarCopia({ tipo: TIPO_COPIA, medios: 'no-es-una-lista' });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'medios-invalidos');
});

test('aplicarCopia: reconstruye fotos con archivoDataUrl en Blob, y deja igual lo demás', async () => {
  const json = {
    tipo: TIPO_COPIA,
    medios: [
      { id: 'arasaac:1', origen: 'arasaac', nombre: 'Casa' },
      { id: 'foto:1', origen: 'foto', nombre: 'Mi perro', etiquetas: ['animales'], archivoDataUrl: 'data:xyz' }
    ],
    ajustes: { idioma: 'en', pin: '4321' }
  };

  let mediosGuardados = null;
  let ajustesRestaurados = null;

  const resumen = await aplicarCopia(json, {
    dataUrlABlob: async (texto) => ({ __blobFalso: texto }),
    reemplazarMedios: async (lista) => { mediosGuardados = lista; },
    restaurarAjustes: async (a) => { ajustesRestaurados = a; }
  });

  assert.equal(mediosGuardados.length, 2);
  const foto = mediosGuardados.find((m) => m.origen === 'foto');
  assert.deepEqual(foto.archivo, { __blobFalso: 'data:xyz' });
  assert.equal('archivoDataUrl' in foto, false);

  assert.deepEqual(ajustesRestaurados, { idioma: 'en', pin: '4321' });
  assert.equal(resumen.totalMedios, 2);
  assert.equal(resumen.idioma, 'en');
  assert.equal(resumen.pinRestaurado, true);
});

test('aplicarCopia: una copia sin PIN marca pinRestaurado como false', async () => {
  const json = { tipo: TIPO_COPIA, medios: [], ajustes: { idioma: 'es', pin: null } };
  const resumen = await aplicarCopia(json, {
    reemplazarMedios: async () => {},
    restaurarAjustes: async () => {}
  });
  assert.equal(resumen.pinRestaurado, false);
});

test('necesitaRecordatorio: si no se ha añadido material nuevo, no avisa', () => {
  assert.equal(
    necesitaRecordatorio({ ultimaCopiaISO: null, conteoMediosUltimaCopia: 5, conteoMediosActual: 5 }),
    false
  );
});

test('necesitaRecordatorio: hay material nuevo y nunca se hizo copia -> avisa', () => {
  assert.equal(
    necesitaRecordatorio({ ultimaCopiaISO: null, conteoMediosUltimaCopia: 0, conteoMediosActual: 3 }),
    true
  );
});

test('necesitaRecordatorio: hay material nuevo pero la última copia es reciente -> no avisa', () => {
  const hace5dias = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(
    necesitaRecordatorio({ ultimaCopiaISO: hace5dias, conteoMediosUltimaCopia: 5, conteoMediosActual: 8 }),
    false
  );
});

test('necesitaRecordatorio: hay material nuevo y la última copia tiene 15 días o más -> avisa', () => {
  const hace15dias = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(
    necesitaRecordatorio({ ultimaCopiaISO: hace15dias, conteoMediosUltimaCopia: 5, conteoMediosActual: 8 }),
    true
  );
});

// ---------------------------------------------------------------------
// Secuencias en la copia de seguridad (retrocompatible: nunca obligatorio)
// ---------------------------------------------------------------------

const secuenciasDePrueba = [{ id: 'seq:1', nombre: 'Lavarse los dientes', pasos: ['arasaac:1'] }];

test('construirCopia: sin pasar secuencias, el campo queda como lista vacía', async () => {
  const copia = await construirCopia(medios, ajustes);
  assert.deepEqual(copia.secuencias, []);
});

test('construirCopia: con opciones.secuencias, se incluyen tal cual en la copia', async () => {
  const copia = await construirCopia(medios, ajustes, { secuencias: secuenciasDePrueba });
  assert.deepEqual(copia.secuencias, secuenciasDePrueba);
});

test('validarCopia: acepta una copia SIN el campo "secuencias" (archivo de una versión anterior)', () => {
  assert.deepEqual(validarCopia({ tipo: TIPO_COPIA, medios: [] }), { ok: true });
});

test('validarCopia: acepta una copia con "secuencias" como lista (vacía o con datos)', () => {
  assert.deepEqual(validarCopia({ tipo: TIPO_COPIA, medios: [], secuencias: [] }), { ok: true });
  assert.deepEqual(validarCopia({ tipo: TIPO_COPIA, medios: [], secuencias: secuenciasDePrueba }), { ok: true });
});

test('validarCopia: rechaza si "secuencias" está presente pero no es una lista', () => {
  const r = validarCopia({ tipo: TIPO_COPIA, medios: [], secuencias: 'no-es-una-lista' });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'secuencias-invalidas');
});

test('aplicarCopia: con json.secuencias como lista, la reemplaza y lo refleja en el resumen', async () => {
  let secuenciasGuardadas = null;
  const json = { tipo: TIPO_COPIA, medios: [], secuencias: secuenciasDePrueba, ajustes: { idioma: 'es', pin: null } };
  const resumen = await aplicarCopia(json, {
    reemplazarMedios: async () => {},
    restaurarAjustes: async () => {},
    reemplazarSecuencias: async (lista) => { secuenciasGuardadas = lista; }
  });
  assert.deepEqual(secuenciasGuardadas, secuenciasDePrueba);
  assert.equal(resumen.totalSecuencias, 1);
});

test('aplicarCopia: una copia antigua sin "secuencias" no toca las secuencias existentes', async () => {
  let seReemplazaronSecuencias = false;
  const json = { tipo: TIPO_COPIA, medios: [], ajustes: { idioma: 'es', pin: null } };
  const resumen = await aplicarCopia(json, {
    reemplazarMedios: async () => {},
    restaurarAjustes: async () => {},
    reemplazarSecuencias: async () => { seReemplazaronSecuencias = true; }
  });
  assert.equal(seReemplazaronSecuencias, false);
  assert.equal(resumen.totalSecuencias, 0);
});

// ---------------------------------------------------------------------
// Rutas de aprendizaje en la copia de seguridad (retrocompatible, igual
// que las secuencias: una copia antigua sin "rutas" sigue siendo válida)
// ---------------------------------------------------------------------

const rutasDePrueba = [
  {
    id: 'ruta:1',
    nombre: 'Rutina de la mañana',
    pasos: [{ appId: 'memoria-animales', ajustesPista: {} }],
    progreso: 0
  }
];

test('construirCopia: sin pasar rutas, el campo queda como lista vacía', async () => {
  const copia = await construirCopia(medios, ajustes);
  assert.deepEqual(copia.rutas, []);
});

test('construirCopia: con opciones.rutas, se incluyen tal cual en la copia', async () => {
  const copia = await construirCopia(medios, ajustes, { rutas: rutasDePrueba });
  assert.deepEqual(copia.rutas, rutasDePrueba);
});

test('construirCopia: accesoLibreJuegos por defecto es true si no se especifica', async () => {
  const copia = await construirCopia(medios, { idioma: 'es', pin: null });
  assert.equal(copia.ajustes.accesoLibreJuegos, true);
});

test('construirCopia: accesoLibreJuegos se respeta cuando es false', async () => {
  const copia = await construirCopia(medios, { idioma: 'es', pin: null, accesoLibreJuegos: false });
  assert.equal(copia.ajustes.accesoLibreJuegos, false);
});

test('validarCopia: acepta una copia SIN el campo "rutas" (archivo de una versión anterior)', () => {
  assert.deepEqual(validarCopia({ tipo: TIPO_COPIA, medios: [] }), { ok: true });
});

test('validarCopia: acepta una copia con "rutas" como lista (vacía o con datos)', () => {
  assert.deepEqual(validarCopia({ tipo: TIPO_COPIA, medios: [], rutas: [] }), { ok: true });
  assert.deepEqual(validarCopia({ tipo: TIPO_COPIA, medios: [], rutas: rutasDePrueba }), { ok: true });
});

test('validarCopia: rechaza si "rutas" está presente pero no es una lista', () => {
  const r = validarCopia({ tipo: TIPO_COPIA, medios: [], rutas: 'no-es-una-lista' });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'rutas-invalidas');
});

test('aplicarCopia: con json.rutas como lista, la reemplaza y lo refleja en el resumen', async () => {
  let rutasGuardadas = null;
  const json = { tipo: TIPO_COPIA, medios: [], rutas: rutasDePrueba, ajustes: { idioma: 'es', pin: null } };
  const resumen = await aplicarCopia(json, {
    reemplazarMedios: async () => {},
    restaurarAjustes: async () => {},
    reemplazarRutas: async (lista) => { rutasGuardadas = lista; }
  });
  assert.deepEqual(rutasGuardadas, rutasDePrueba);
  assert.equal(resumen.totalRutas, 1);
});

test('aplicarCopia: una copia antigua sin "rutas" no toca las rutas existentes', async () => {
  let seReemplazaronRutas = false;
  const json = { tipo: TIPO_COPIA, medios: [], ajustes: { idioma: 'es', pin: null } };
  const resumen = await aplicarCopia(json, {
    reemplazarMedios: async () => {},
    restaurarAjustes: async () => {},
    reemplazarRutas: async () => { seReemplazaronRutas = true; }
  });
  assert.equal(seReemplazaronRutas, false);
  assert.equal(resumen.totalRutas, 0);
});

// ---------------------------------------------------------------------
// Categorías dicotómicas en la copia de seguridad (retrocompatible,
// igual que secuencias y rutas: una copia antigua sin "categorias"
// sigue siendo válida)
// ---------------------------------------------------------------------

const categoriasDePrueba = [
  {
    id: 'catpar:1',
    nombre: 'Grande y pequeño',
    categorias: [
      { id: 'cat:1', nombre: 'Grande', cabeceraId: 'arasaac:1', medios: ['arasaac:1'] },
      { id: 'cat:2', nombre: 'Pequeño', cabeceraId: 'foto:1', medios: ['foto:1'] }
    ]
  }
];

test('construirCopia: sin pasar categorias, el campo queda como lista vacía', async () => {
  const copia = await construirCopia(medios, ajustes);
  assert.deepEqual(copia.categorias, []);
});

test('construirCopia: con opciones.categorias, se incluyen tal cual en la copia', async () => {
  const copia = await construirCopia(medios, ajustes, { categorias: categoriasDePrueba });
  assert.deepEqual(copia.categorias, categoriasDePrueba);
});

test('validarCopia: acepta una copia SIN el campo "categorias" (archivo de una versión anterior)', () => {
  assert.deepEqual(validarCopia({ tipo: TIPO_COPIA, medios: [] }), { ok: true });
});

test('validarCopia: acepta una copia con "categorias" como lista (vacía o con datos)', () => {
  assert.deepEqual(validarCopia({ tipo: TIPO_COPIA, medios: [], categorias: [] }), { ok: true });
  assert.deepEqual(validarCopia({ tipo: TIPO_COPIA, medios: [], categorias: categoriasDePrueba }), { ok: true });
});

test('validarCopia: rechaza si "categorias" está presente pero no es una lista', () => {
  const r = validarCopia({ tipo: TIPO_COPIA, medios: [], categorias: 'no-es-una-lista' });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'categorias-invalidas');
});

test('aplicarCopia: con json.categorias como lista, la reemplaza y lo refleja en el resumen', async () => {
  let categoriasGuardadas = null;
  const json = { tipo: TIPO_COPIA, medios: [], categorias: categoriasDePrueba, ajustes: { idioma: 'es', pin: null } };
  const resumen = await aplicarCopia(json, {
    reemplazarMedios: async () => {},
    restaurarAjustes: async () => {},
    reemplazarCategorias: async (lista) => { categoriasGuardadas = lista; }
  });
  assert.deepEqual(categoriasGuardadas, categoriasDePrueba);
  assert.equal(resumen.totalCategorias, 1);
});

test('aplicarCopia: una copia antigua sin "categorias" no toca las categorías existentes', async () => {
  let seReemplazaronCategorias = false;
  const json = { tipo: TIPO_COPIA, medios: [], ajustes: { idioma: 'es', pin: null } };
  const resumen = await aplicarCopia(json, {
    reemplazarMedios: async () => {},
    restaurarAjustes: async () => {},
    reemplazarCategorias: async () => { seReemplazaronCategorias = true; }
  });
  assert.equal(seReemplazaronCategorias, false);
  assert.equal(resumen.totalCategorias, 0);
});
