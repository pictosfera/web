import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generarEjercicio,
  calcularSeleccion,
  esCorrecta,
  rangoDesde
} from '../apps/cuadricula-multiplicacion/cuadriculaMultiplicacion.js';

// ── generarEjercicio ─────────────────────────────────────────────────────────

test('generarEjercicio: a y b siempre entre 1 y 10', () => {
  for (let i = 0; i < 300; i++) {
    const { a, b } = generarEjercicio();
    assert.ok(a >= 1 && a <= 10, `a=${a} fuera de rango`);
    assert.ok(b >= 1 && b <= 10, `b=${b} fuera de rango`);
  }
});

test('generarEjercicio: produce variedad en 50 llamadas', () => {
  const vistos = new Set();
  for (let i = 0; i < 50; i++) {
    const { a, b } = generarEjercicio();
    vistos.add(`${a},${b}`);
  }
  assert.ok(vistos.size > 1, 'debe haber al menos 2 pares distintos');
});

// ── calcularSeleccion ────────────────────────────────────────────────────────

test('calcularSeleccion: celda unica 1x1', () => {
  const r = calcularSeleccion(3, 3, 3, 3);
  assert.strictEqual(r.filas, 1);
  assert.strictEqual(r.cols,  1);
  assert.strictEqual(r.total, 1);
});

test('calcularSeleccion: rectangulo 2x3', () => {
  const r = calcularSeleccion(1, 1, 2, 3);
  assert.strictEqual(r.filas, 2);
  assert.strictEqual(r.cols,  3);
  assert.strictEqual(r.total, 6);
});

test('calcularSeleccion: cuadricula completa 10x10', () => {
  const r = calcularSeleccion(1, 1, 10, 10);
  assert.strictEqual(r.filas,  10);
  assert.strictEqual(r.cols,   10);
  assert.strictEqual(r.total, 100);
});

test('calcularSeleccion: coordenadas invertidas (fin < inicio)', () => {
  const r = calcularSeleccion(5, 5, 2, 3);
  assert.strictEqual(r.filas, 4);  // |2-5|+1
  assert.strictEqual(r.cols,  3);  // |3-5|+1
  assert.strictEqual(r.total, 12);
});

test('calcularSeleccion: fila unica, varias columnas', () => {
  const r = calcularSeleccion(4, 1, 4, 7);
  assert.strictEqual(r.filas, 1);
  assert.strictEqual(r.cols,  7);
  assert.strictEqual(r.total, 7);
});

// ── esCorrecta ───────────────────────────────────────────────────────────────

test('esCorrecta: orientacion directa', () => {
  assert.strictEqual(esCorrecta(2, 3, 2, 3), true);
});

test('esCorrecta: orientacion inversa (propiedad conmutativa)', () => {
  assert.strictEqual(esCorrecta(3, 2, 2, 3), true);
});

test('esCorrecta: seleccion erronea — ni directa ni inversa', () => {
  assert.strictEqual(esCorrecta(2, 4, 2, 3), false);
  assert.strictEqual(esCorrecta(1, 6, 2, 3), false);
  assert.strictEqual(esCorrecta(4, 2, 2, 3), false);
});

test('esCorrecta: a === b, cuadrado correcto', () => {
  assert.strictEqual(esCorrecta(4, 4, 4, 4), true);
});

test('esCorrecta: a === b, dimensiones erroneas', () => {
  assert.strictEqual(esCorrecta(3, 4, 4, 4), false);
  assert.strictEqual(esCorrecta(4, 3, 4, 4), false);
});

test('esCorrecta: todo el tablero 10x10 para 10x10', () => {
  assert.strictEqual(esCorrecta(10, 10, 10, 10), true);
});

test('esCorrecta: celda unica para 1x1', () => {
  assert.strictEqual(esCorrecta(1, 1, 1, 1), true);
});

// ── rangoDesde ───────────────────────────────────────────────────────────────

test('rangoDesde: coordenadas en orden normal', () => {
  const r = rangoDesde(1, 1, 3, 5);
  assert.strictEqual(r.filaMin, 1);
  assert.strictEqual(r.filaMax, 3);
  assert.strictEqual(r.colMin,  1);
  assert.strictEqual(r.colMax,  5);
});

test('rangoDesde: normaliza coordenadas invertidas', () => {
  const r = rangoDesde(8, 9, 3, 2);
  assert.strictEqual(r.filaMin, 3);
  assert.strictEqual(r.filaMax, 8);
  assert.strictEqual(r.colMin,  2);
  assert.strictEqual(r.colMax,  9);
});

test('rangoDesde: celda unica', () => {
  const r = rangoDesde(5, 5, 5, 5);
  assert.strictEqual(r.filaMin, 5);
  assert.strictEqual(r.filaMax, 5);
  assert.strictEqual(r.colMin,  5);
  assert.strictEqual(r.colMax,  5);
});
