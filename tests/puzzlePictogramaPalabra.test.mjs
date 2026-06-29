// Pruebas: apps/puzzle-pictograma-palabra/puzzlePictogramaPalabra.js
// (lógica pura de la mecánica "puzzle de pictograma y selección de
// palabra").
//
// Aquí solo se prueba la lógica pura (mezclar, material suficiente,
// elegir el pictograma de la ronda, generar las 4 piezas del puzzle,
// comprobar colocaciones, detectar el puzzle completo, construir las 3
// opciones de palabra y el formateo de texto): el arrastre con
// puntero, la selección por toque/teclado y la pintura del DOM
// dependen del navegador y no se prueban en este archivo, igual que en
// el resto de mecánicas de arrastrar/soltar del proyecto.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  mezclar,
  hayMaterialSuficiente,
  elegirSiguienteMedio,
  generarPiezas,
  colocacionCorrecta,
  piezasCompletas,
  generarOpcionesPalabra,
  formatearTexto
} = await import('../apps/puzzle-pictograma-palabra/puzzlePictogramaPalabra.js');

function mediosDePrueba(prefijo, n) {
  return Array.from({ length: n }, (_, i) => ({ id: `${prefijo}${i}`, nombre: `${prefijo} ${i}` }));
}

// --- mezclar ---

test('mezclar: conserva todos los elementos, solo cambia el orden', () => {
  const original = mediosDePrueba('m', 6);
  const copia = mezclar(original);
  assert.equal(copia.length, original.length);
  assert.deepEqual([...copia].sort((a, b) => a.id.localeCompare(b.id)), original);
});

test('mezclar: con lista vacía, null o undefined no rompe', () => {
  assert.deepEqual(mezclar([]), []);
  assert.deepEqual(mezclar(null), []);
  assert.deepEqual(mezclar(undefined), []);
});

// --- hayMaterialSuficiente ---

test('hayMaterialSuficiente: hacen falta al menos 3 pictogramas con nombre', () => {
  assert.equal(hayMaterialSuficiente(mediosDePrueba('m', 3)), true);
  assert.equal(hayMaterialSuficiente(mediosDePrueba('m', 5)), true);
  assert.equal(hayMaterialSuficiente(mediosDePrueba('m', 2)), false);
});

test('hayMaterialSuficiente: descarta medios sin nombre antes de contar', () => {
  const medios = [...mediosDePrueba('m', 2), { id: 'sin-nombre' }, { id: 'otro' }];
  assert.equal(hayMaterialSuficiente(medios), false);
});

test('hayMaterialSuficiente: con lista vacía, null o algo que no es lista, devuelve false', () => {
  assert.equal(hayMaterialSuficiente([]), false);
  assert.equal(hayMaterialSuficiente(null), false);
  assert.equal(hayMaterialSuficiente(undefined), false);
  assert.equal(hayMaterialSuficiente('no-es-lista'), false);
});

// --- elegirSiguienteMedio ---

test('elegirSiguienteMedio: elige siempre uno de los medios válidos', () => {
  const medios = mediosDePrueba('m', 5);
  for (let i = 0; i < 30; i++) {
    const elegido = elegirSiguienteMedio(medios, { evitarIds: [] });
    assert.ok(medios.some((m) => m.id === elegido.id));
  }
});

test('elegirSiguienteMedio: evita repetir los ya usados mientras queden libres', () => {
  const medios = mediosDePrueba('m', 3);
  const elegido = elegirSiguienteMedio(medios, { evitarIds: ['m0', 'm1'] });
  assert.equal(elegido.id, 'm2');
});

test('elegirSiguienteMedio: si ya se usaron todos, puede repetir', () => {
  const medios = mediosDePrueba('m', 2);
  const elegido = elegirSiguienteMedio(medios, { evitarIds: ['m0', 'm1'] });
  assert.ok(['m0', 'm1'].includes(elegido.id));
});

test('elegirSiguienteMedio: sin medios válidos devuelve null', () => {
  assert.equal(elegirSiguienteMedio([], {}), null);
  assert.equal(elegirSiguienteMedio(null, {}), null);
  assert.equal(elegirSiguienteMedio([{ id: 'sin-nombre' }], {}), null);
});

test('elegirSiguienteMedio: sin segundo argumento no rompe (evitarIds por defecto)', () => {
  const medios = mediosDePrueba('m', 3);
  const elegido = elegirSiguienteMedio(medios);
  assert.ok(medios.some((m) => m.id === elegido.id));
});

// --- generarPiezas ---

test('generarPiezas: devuelve 4 piezas, una por cada cuadrante (0-3), sin repetir', () => {
  const piezas = generarPiezas();
  assert.equal(piezas.length, 4);
  assert.deepEqual(piezas.map((p) => p.cuadrante).sort(), [0, 1, 2, 3]);
});

test('generarPiezas: cada pieza lleva un piezaId coherente con su cuadrante', () => {
  const piezas = generarPiezas();
  piezas.forEach((p) => assert.equal(p.piezaId, `p${p.cuadrante}`));
});

test('generarPiezas: el orden varía entre llamadas (no siempre el mismo)', () => {
  const ordenes = new Set();
  for (let i = 0; i < 20; i++) {
    ordenes.add(generarPiezas().map((p) => p.cuadrante).join(','));
  }
  assert.ok(ordenes.size > 1);
});

// --- colocacionCorrecta ---

test('colocacionCorrecta: true si el cuadrante de la pieza coincide con el hueco', () => {
  assert.equal(colocacionCorrecta({ piezaId: 'p2', cuadrante: 2 }, 2), true);
});

test('colocacionCorrecta: false si no coincide', () => {
  assert.equal(colocacionCorrecta({ piezaId: 'p2', cuadrante: 2 }, 0), false);
});

test('colocacionCorrecta: con pieza nula o indefinida devuelve false', () => {
  assert.equal(colocacionCorrecta(null, 0), false);
  assert.equal(colocacionCorrecta(undefined, 0), false);
});

// --- piezasCompletas ---

test('piezasCompletas: true solo cuando las 4 posiciones están ocupadas', () => {
  assert.equal(piezasCompletas([{ cuadrante: 0 }, { cuadrante: 1 }, { cuadrante: 2 }, { cuadrante: 3 }]), true);
  assert.equal(piezasCompletas([{ cuadrante: 0 }, null, { cuadrante: 2 }, { cuadrante: 3 }]), false);
});

test('piezasCompletas: con menos o más de 4 posiciones devuelve false', () => {
  assert.equal(piezasCompletas([{ cuadrante: 0 }, { cuadrante: 1 }, { cuadrante: 2 }]), false);
  assert.equal(piezasCompletas([{ cuadrante: 0 }, { cuadrante: 1 }, { cuadrante: 2 }, { cuadrante: 3 }, { cuadrante: 0 }]), false);
});

test('piezasCompletas: con algo que no es lista devuelve false', () => {
  assert.equal(piezasCompletas(null), false);
  assert.equal(piezasCompletas(undefined), false);
});

// --- generarOpcionesPalabra ---

test('generarOpcionesPalabra: devuelve 3 opciones, exactamente una correcta', () => {
  const correcto = { nombre: 'Perro' };
  const pool = mediosDePrueba('animal', 8);
  const opciones = generarOpcionesPalabra(correcto, pool);
  assert.equal(opciones.length, 3);
  assert.equal(opciones.filter((o) => o.correcta).length, 1);
  assert.equal(opciones.find((o) => o.correcta).texto, 'Perro');
});

test('generarOpcionesPalabra: las intrusas no repiten el nombre correcto', () => {
  const correcto = { nombre: 'animal0' };
  const pool = mediosDePrueba('animal', 5); // incluye "animal0", igual al correcto
  const opciones = generarOpcionesPalabra(correcto, pool);
  opciones.filter((o) => !o.correcta).forEach((o) => assert.notEqual(o.texto, 'animal0'));
});

test('generarOpcionesPalabra: con pozo pequeño (menos de 2 nombres distintos disponibles), repite en vez de fallar', () => {
  const correcto = { nombre: 'Perro' };
  const pool = [{ id: 'x1', nombre: 'Gato' }]; // solo 1 nombre distinto disponible
  const opciones = generarOpcionesPalabra(correcto, pool);
  assert.equal(opciones.length, 3);
  assert.equal(opciones.filter((o) => o.correcta).length, 1);
});

test('generarOpcionesPalabra: sin pozo de intrusas en absoluto, sigue devolviendo 3 opciones', () => {
  const correcto = { nombre: 'Perro' };
  const opciones = generarOpcionesPalabra(correcto, []);
  assert.equal(opciones.length, 3);
  assert.equal(opciones.filter((o) => o.correcta).length, 1);
});

test('generarOpcionesPalabra: el orden de las 3 opciones varía entre llamadas', () => {
  const correcto = { nombre: 'Perro' };
  const pool = mediosDePrueba('animal', 8);
  const posiciones = new Set();
  for (let i = 0; i < 30; i++) {
    const opciones = generarOpcionesPalabra(correcto, pool);
    posiciones.add(opciones.findIndex((o) => o.correcta));
  }
  assert.ok(posiciones.size > 1);
});

// --- formatearTexto ---

test('formatearTexto: respeta el ajuste de mayúscula/minúscula', () => {
  assert.equal(formatearTexto('Perro', true), 'PERRO');
  assert.equal(formatearTexto('Perro', false), 'perro');
});

test('formatearTexto: por defecto pone mayúscula', () => {
  assert.equal(formatearTexto('Gato'), 'GATO');
});

test('formatearTexto: con texto vacío o nulo devuelve cadena vacía', () => {
  assert.equal(formatearTexto('', true), '');
  assert.equal(formatearTexto(null, true), '');
  assert.equal(formatearTexto(undefined, true), '');
});
