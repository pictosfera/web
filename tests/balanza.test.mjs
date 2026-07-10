import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularTorque,
  estadoBalanza,
  calcularAngulo,
  generarCombinacion,
  todasLasCombinaciones,
  generarDistractores,
  generarRondaEquilibra,
  generarRondaCompleta,
  generarRondaSuma,
  generarRondaDescompone,
  generarRondaCopia,
  generarRondaFalta,
  generarRondaCualPesa,
  generarRondaCorrige,
  generarRondaLimitado,
  generarRondaSoluciones,
} from '../apps/balanza/balanza.js';

// ── calcularTorque ────────────────────────────────────────────────────────────

test('calcularTorque: array vacío → 0', () => {
  assert.strictEqual(calcularTorque([]), 0);
});

test('calcularTorque: posición única', () => {
  assert.strictEqual(calcularTorque([5]), 5);
});

test('calcularTorque: varias posiciones', () => {
  assert.strictEqual(calcularTorque([1, 3, 6]), 10);
});

test('calcularTorque: todas las posiciones', () => {
  assert.strictEqual(calcularTorque([1,2,3,4,5,6,7,8,9,10]), 55);
});

// ── estadoBalanza ─────────────────────────────────────────────────────────────

test('estadoBalanza: torques iguales → equilibrio', () => {
  assert.strictEqual(estadoBalanza(5, 5), 'equilibrio');
});

test('estadoBalanza: izquierda mayor → izquierda', () => {
  assert.strictEqual(estadoBalanza(10, 3), 'izquierda');
});

test('estadoBalanza: derecha mayor → derecha', () => {
  assert.strictEqual(estadoBalanza(2, 8), 'derecha');
});

test('estadoBalanza: ambos cero → equilibrio', () => {
  assert.strictEqual(estadoBalanza(0, 0), 'equilibrio');
});

// ── calcularAngulo ────────────────────────────────────────────────────────────

test('calcularAngulo: equilibrio → 0°', () => {
  assert.strictEqual(calcularAngulo(5, 5), 0);
});

test('calcularAngulo: izquierda más pesada → ángulo negativo (izquierda baja)', () => {
  assert.ok(calcularAngulo(10, 5) < 0);
});

test('calcularAngulo: derecha más pesada → ángulo positivo (derecha baja)', () => {
  assert.ok(calcularAngulo(3, 9) > 0);
});

test('calcularAngulo: no supera 22° (máximo)', () => {
  const ang = calcularAngulo(55, 0);
  assert.ok(ang <= 22);
  assert.ok(ang >= -22);
});

test('calcularAngulo: no baja de -22° (mínimo)', () => {
  const ang = calcularAngulo(0, 55);
  assert.ok(ang >= -22);
});

// ── generarCombinacion ────────────────────────────────────────────────────────

test('generarCombinacion: suma correcta', () => {
  for (let i = 0; i < 20; i++) {
    const combo = generarCombinacion(8);
    assert.strictEqual(combo.reduce((s, p) => s + p, 0), 8);
  }
});

test('generarCombinacion: sin repetición', () => {
  for (let i = 0; i < 30; i++) {
    const combo = generarCombinacion(10, { maxPiezas: 4 });
    const set = new Set(combo);
    assert.strictEqual(set.size, combo.length);
  }
});

test('generarCombinacion: respeta excluir', () => {
  for (let i = 0; i < 20; i++) {
    const combo = generarCombinacion(6, { excluir: [6] });
    assert.ok(!combo.includes(6));
  }
});

test('generarCombinacion: respeta maxPiezas', () => {
  for (let i = 0; i < 20; i++) {
    const combo = generarCombinacion(15, { maxPiezas: 2 });
    if (combo.length) assert.ok(combo.length <= 2);
  }
});

test('generarCombinacion: objetivo imposible → []', () => {
  // No hay combinación de 1 pieza que sume 55 (máximo es 10+9+...=55 con todas)
  const combo = generarCombinacion(55, { maxPiezas: 1 });
  assert.strictEqual(combo.length, 0);
});

// ── todasLasCombinaciones ─────────────────────────────────────────────────────

test('todasLasCombinaciones: objetivo 1 → solo [1]', () => {
  const res = todasLasCombinaciones(1);
  assert.strictEqual(res.length, 1);
  assert.deepStrictEqual(res[0], [1]);
});

test('todasLasCombinaciones: objetivo 3 → al menos [3] y [1,2]', () => {
  const res = todasLasCombinaciones(3);
  assert.ok(res.some(c => c.length === 1 && c[0] === 3));
  assert.ok(res.some(c => c.length === 2 && c.includes(1) && c.includes(2)));
});

test('todasLasCombinaciones: todas las combinaciones tienen la suma correcta', () => {
  const objetivo = 7;
  const res = todasLasCombinaciones(objetivo);
  for (const combo of res) {
    assert.strictEqual(combo.reduce((s, p) => s + p, 0), objetivo);
  }
});

test('todasLasCombinaciones: sin combinaciones repetidas', () => {
  const res = todasLasCombinaciones(5);
  const llaves = res.map(c => c.join(','));
  const set = new Set(llaves);
  assert.strictEqual(set.size, llaves.length);
});

// ── generarDistractores ───────────────────────────────────────────────────────

test('generarDistractores: no incluye el valor correcto', () => {
  for (let i = 0; i < 20; i++) {
    const dist = generarDistractores(5, 2);
    assert.ok(!dist.includes(5));
  }
});

test('generarDistractores: devuelve n elementos', () => {
  assert.strictEqual(generarDistractores(3, 2).length, 2);
  assert.strictEqual(generarDistractores(7, 3).length, 3);
});

test('generarDistractores: valores entre 1 y 10', () => {
  const dist = generarDistractores(4, 9);
  for (const d of dist) {
    assert.ok(d >= 1 && d <= 10);
  }
});

// ── generarRondaEquilibra ────────────────────────────────────────────────────

test('generarRondaEquilibra: modo correcto', () => {
  const r = generarRondaEquilibra(1);
  assert.strictEqual(r.modo, 'equilibra');
});

test('generarRondaEquilibra: lado izquierdo no vacío', () => {
  for (let i = 0; i < 10; i++) {
    const r = generarRondaEquilibra(1);
    assert.ok(r.izquierda.length > 0);
  }
});

test('generarRondaEquilibra: derecha empieza vacía', () => {
  const r = generarRondaEquilibra(1);
  assert.strictEqual(r.derecha.length, 0);
});

test('generarRondaEquilibra: izquierda está fija', () => {
  const r = generarRondaEquilibra(1);
  assert.deepStrictEqual(r.fijo.izquierda, r.izquierda);
  assert.deepStrictEqual(r.fijo.derecha, []);
});

test('generarRondaEquilibra: interactivo solo en derecha', () => {
  const r = generarRondaEquilibra(1);
  assert.strictEqual(r.interactivo.izquierda, false);
  assert.strictEqual(r.interactivo.derecha, true);
});

test('generarRondaEquilibra: objetivo = torque izquierdo', () => {
  for (let i = 0; i < 15; i++) {
    const r = generarRondaEquilibra(1);
    assert.strictEqual(r.objetivo, calcularTorque(r.izquierda));
  }
});

// ── generarRondaCompleta ──────────────────────────────────────────────────────

test('generarRondaCompleta: modo correcto', () => {
  assert.strictEqual(generarRondaCompleta(1).modo, 'completa');
});

test('generarRondaCompleta: tiene 3 opciones', () => {
  for (let i = 0; i < 15; i++) {
    const r = generarRondaCompleta(1);
    assert.strictEqual(r.opciones.length, 3);
  }
});

test('generarRondaCompleta: piezaFaltante está entre opciones', () => {
  for (let i = 0; i < 15; i++) {
    const r = generarRondaCompleta(1);
    assert.ok(r.opciones.includes(r.piezaFaltante));
  }
});

test('generarRondaCompleta: derecha sin la pieza faltante + faltante equilibra', () => {
  for (let i = 0; i < 15; i++) {
    const r = generarRondaCompleta(1);
    const torqIzq = calcularTorque(r.izquierda);
    const torqDerConFalta = calcularTorque([...r.derecha, r.piezaFaltante]);
    assert.strictEqual(torqIzq, torqDerConFalta);
  }
});

// ── generarRondaSuma ──────────────────────────────────────────────────────────

test('generarRondaSuma: modo correcto', () => {
  assert.strictEqual(generarRondaSuma(1).modo, 'suma');
});

test('generarRondaSuma: objetivo entre 1 y 10', () => {
  for (let i = 0; i < 20; i++) {
    const r = generarRondaSuma(1);
    assert.ok(r.objetivo >= 1 && r.objetivo <= 10);
  }
});

test('generarRondaSuma: izquierda suma el objetivo', () => {
  for (let i = 0; i < 20; i++) {
    const r = generarRondaSuma(1);
    assert.strictEqual(calcularTorque(r.izquierda), r.objetivo);
  }
});

test('generarRondaSuma: objetivo entre opciones', () => {
  for (let i = 0; i < 20; i++) {
    const r = generarRondaSuma(1);
    assert.ok(r.opciones.includes(r.objetivo));
  }
});

test('generarRondaSuma: tiene 3 opciones', () => {
  for (let i = 0; i < 15; i++) {
    assert.strictEqual(generarRondaSuma(1).opciones.length, 3);
  }
});

// ── generarRondaDescompone ────────────────────────────────────────────────────

test('generarRondaDescompone: modo correcto', () => {
  assert.strictEqual(generarRondaDescompone(1).modo, 'descompone');
});

test('generarRondaDescompone: derecha tiene 1 pieza fija', () => {
  for (let i = 0; i < 15; i++) {
    const r = generarRondaDescompone(1);
    assert.strictEqual(r.derecha.length, 1);
    assert.deepStrictEqual(r.fijo.derecha, r.derecha);
  }
});

test('generarRondaDescompone: izquierda empieza vacía', () => {
  const r = generarRondaDescompone(1);
  assert.strictEqual(r.izquierda.length, 0);
});

test('generarRondaDescompone: interactivo solo en izquierda', () => {
  const r = generarRondaDescompone(1);
  assert.strictEqual(r.interactivo.izquierda, true);
  assert.strictEqual(r.interactivo.derecha, false);
});

// ── generarRondaCopia ─────────────────────────────────────────────────────────

test('generarRondaCopia: modo correcto', () => {
  assert.strictEqual(generarRondaCopia(1).modo, 'copia');
});

test('generarRondaCopia: referencia equilibrada', () => {
  for (let i = 0; i < 15; i++) {
    const r = generarRondaCopia(1);
    const tIzq = calcularTorque(r.referencia.izquierda);
    const tDer = calcularTorque(r.referencia.derecha);
    assert.strictEqual(tIzq, tDer);
  }
});

test('generarRondaCopia: balanza interactiva empieza vacía', () => {
  const r = generarRondaCopia(1);
  assert.strictEqual(r.izquierda.length, 0);
  assert.strictEqual(r.derecha.length, 0);
});

test('generarRondaCopia: ambos lados interactivos', () => {
  const r = generarRondaCopia(1);
  assert.strictEqual(r.interactivo.izquierda, true);
  assert.strictEqual(r.interactivo.derecha, true);
});

// ── generarRondaFalta ─────────────────────────────────────────────────────────

test('generarRondaFalta: modo correcto', () => {
  assert.strictEqual(generarRondaFalta(1).modo, 'falta');
});

test('generarRondaFalta: piezaFaltante entre opciones', () => {
  for (let i = 0; i < 15; i++) {
    const r = generarRondaFalta(1);
    assert.ok(r.opciones.includes(r.piezaFaltante));
  }
});

// ── generarRondaCualPesa ──────────────────────────────────────────────────────

test('generarRondaCualPesa: modo correcto', () => {
  assert.strictEqual(generarRondaCualPesa(1).modo, 'cual-pesa');
});

test('generarRondaCualPesa: respuestaCorrecta coherente con torques', () => {
  for (let i = 0; i < 30; i++) {
    const r = generarRondaCualPesa(1);
    const tIzq = calcularTorque(r.izquierda);
    const tDer = calcularTorque(r.derecha);
    if (r.respuestaCorrecta === 'equilibrio') {
      assert.strictEqual(tIzq, tDer);
    } else if (r.respuestaCorrecta === 'izquierda') {
      assert.ok(tIzq > tDer);
    } else {
      assert.ok(tDer > tIzq);
    }
  }
});

test('generarRondaCualPesa: tiene exactamente 3 opciones', () => {
  for (let i = 0; i < 10; i++) {
    assert.strictEqual(generarRondaCualPesa(1).opciones.length, 3);
  }
});

test('generarRondaCualPesa: opciones contienen izquierda, derecha y equilibrio', () => {
  for (let i = 0; i < 10; i++) {
    const r = generarRondaCualPesa(1);
    assert.ok(r.opciones.includes('izquierda'));
    assert.ok(r.opciones.includes('derecha'));
    assert.ok(r.opciones.includes('equilibrio'));
  }
});

// ── generarRondaCorrige ───────────────────────────────────────────────────────

test('generarRondaCorrige: modo correcto', () => {
  assert.strictEqual(generarRondaCorrige(1).modo, 'corrige');
});

test('generarRondaCorrige: balanza empieza desequilibrada', () => {
  for (let i = 0; i < 15; i++) {
    const r = generarRondaCorrige(1);
    const tIzq = calcularTorque(r.izquierda);
    const tDer = calcularTorque(r.derecha);
    assert.notStrictEqual(tIzq, tDer);
  }
});

test('generarRondaCorrige: izquierda está fija, derecha es interactiva', () => {
  const r = generarRondaCorrige(1);
  assert.strictEqual(r.interactivo.izquierda, false);
  assert.strictEqual(r.interactivo.derecha, true);
  assert.deepStrictEqual(r.fijo.izquierda, r.izquierda);
});

// ── generarRondaLimitado ──────────────────────────────────────────────────────

test('generarRondaLimitado: modo correcto', () => {
  assert.strictEqual(generarRondaLimitado(1).modo, 'limitado');
});

test('generarRondaLimitado: piezasMaximas ≥ 2', () => {
  for (let i = 0; i < 10; i++) {
    assert.ok(generarRondaLimitado(1).piezasMaximas >= 2);
  }
});

test('generarRondaLimitado: balanza empieza vacía', () => {
  const r = generarRondaLimitado(1);
  assert.strictEqual(r.izquierda.length, 0);
  assert.strictEqual(r.derecha.length, 0);
});

test('generarRondaLimitado: ambos lados interactivos', () => {
  const r = generarRondaLimitado(1);
  assert.strictEqual(r.interactivo.izquierda, true);
  assert.strictEqual(r.interactivo.derecha, true);
});

// ── generarRondaSoluciones ────────────────────────────────────────────────────

test('generarRondaSoluciones: modo correcto', () => {
  assert.strictEqual(generarRondaSoluciones(1).modo, 'soluciones');
});

test('generarRondaSoluciones: meta ≥ 2', () => {
  for (let i = 0; i < 10; i++) {
    assert.ok(generarRondaSoluciones(1).meta >= 2);
  }
});

test('generarRondaSoluciones: objetivo tiene suficientes combinaciones', () => {
  for (let i = 0; i < 10; i++) {
    const r = generarRondaSoluciones(1);
    const todas = todasLasCombinaciones(r.objetivo);
    assert.ok(todas.length >= r.meta);
  }
});

test('generarRondaSoluciones: balanza empieza vacía y encontradas = []', () => {
  const r = generarRondaSoluciones(1);
  assert.strictEqual(r.izquierda.length, 0);
  assert.strictEqual(r.derecha.length, 0);
  assert.deepStrictEqual(r.encontradas, []);
});

// ── todasLasCombinaciones: objetivo 10 conocido ────────────────────────────

test('todasLasCombinaciones: objetivo 10 tiene múltiples soluciones', () => {
  const res = todasLasCombinaciones(10);
  assert.ok(res.length > 1);
});

test('todasLasCombinaciones: cada combo suma al objetivo', () => {
  const res = todasLasCombinaciones(15);
  for (const combo of res) {
    assert.strictEqual(combo.reduce((s, p) => s + p, 0), 15);
  }
});
