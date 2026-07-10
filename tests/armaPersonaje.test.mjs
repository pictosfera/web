import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generarPersonaje,
  zonasRequeridas,
  esZonaCorrecta,
  composicionCorrecta,
  generarBancoPiezas,
} from '../apps/arma-personaje/armaPersonaje.js';

// ── generarPersonaje ──────────────────────────────────────────────────────────

test('generarPersonaje: tiene los campos requeridos', () => {
  const p = generarPersonaje();
  assert.ok(typeof p.color === 'string', 'color debe ser string');
  assert.ok(typeof p.ojos  === 'string', 'ojos debe ser string');
  assert.ok(typeof p.nariz === 'string', 'nariz debe ser string');
  assert.ok(typeof p.boca  === 'string', 'boca debe ser string');
});

test('generarPersonaje: no tiene campos de versión anterior (piel, pelo, barba, gafas)', () => {
  const p = generarPersonaje();
  assert.strictEqual(p.piel,     undefined, 'piel no debe existir');
  assert.strictEqual(p.pelo,     undefined, 'pelo no debe existir');
  assert.strictEqual(p.barba,    undefined, 'barba no debe existir');
  assert.strictEqual(p.sombrero, undefined, 'sombrero no debe existir');
  assert.strictEqual(p.gafas,    undefined, 'gafas no debe existir');
});

test('generarPersonaje: color es uno de los 20 colores definidos', () => {
  const COLORES_VALIDOS = [
    'rojo','azul','amarillo','verde','naranja','morado','rosa','marron',
    'negro','blanco','gris','celeste','turquesa','beige','lila','violeta',
    'fucsia','dorado','plateado','crema',
  ];
  for (let i = 0; i < 100; i++) {
    const { color } = generarPersonaje();
    assert.ok(COLORES_VALIDOS.includes(color), `color="${color}" no reconocido`);
  }
});

test('generarPersonaje: ojos es uno de los 4 tipos', () => {
  const VALIDOS = ['alegre','triste','sorpresa','dormido'];
  for (let i = 0; i < 100; i++) {
    const { ojos } = generarPersonaje();
    assert.ok(VALIDOS.includes(ojos), `ojos="${ojos}" no reconocido`);
  }
});

test('generarPersonaje: nariz es redonda o respingona', () => {
  for (let i = 0; i < 100; i++) {
    const { nariz } = generarPersonaje();
    assert.ok(['redonda','respingona'].includes(nariz), `nariz="${nariz}" no válida`);
  }
});

test('generarPersonaje: boca es sonrisa o puchero', () => {
  for (let i = 0; i < 100; i++) {
    const { boca } = generarPersonaje();
    assert.ok(['sonrisa','puchero'].includes(boca), `boca="${boca}" no válida`);
  }
});

test('generarPersonaje: produce variedad en 50 llamadas', () => {
  const vistos = new Set();
  for (let i = 0; i < 50; i++) {
    const p = generarPersonaje();
    vistos.add(`${p.color}-${p.ojos}-${p.nariz}-${p.boca}`);
  }
  assert.ok(vistos.size > 1, 'debe haber al menos 2 combinaciones distintas');
});

// ── zonasRequeridas ───────────────────────────────────────────────────────────

test('zonasRequeridas: siempre incluye las 3 zonas base', () => {
  for (let i = 0; i < 50; i++) {
    const p = generarPersonaje();
    const z = zonasRequeridas(p);
    assert.ok(z.includes('ojos'),  'falta ojos');
    assert.ok(z.includes('nariz'), 'falta nariz');
    assert.ok(z.includes('boca'),  'falta boca');
  }
});

test('zonasRequeridas: devuelve exactamente 3 zonas', () => {
  for (let i = 0; i < 30; i++) {
    const p = generarPersonaje();
    const z = zonasRequeridas(p);
    assert.strictEqual(z.length, 3, `debe haber exactamente 3 zonas, hay ${z.length}`);
  }
});

test('zonasRequeridas: no incluye pelo, barba, sombrero ni gafas', () => {
  for (let i = 0; i < 30; i++) {
    const p = generarPersonaje();
    const z = zonasRequeridas(p);
    assert.ok(!z.includes('pelo'),     'no debe incluir pelo');
    assert.ok(!z.includes('barba'),    'no debe incluir barba');
    assert.ok(!z.includes('sombrero'), 'no debe incluir sombrero');
    assert.ok(!z.includes('gafas'),    'no debe incluir gafas');
  }
});

// ── esZonaCorrecta ────────────────────────────────────────────────────────────

test('esZonaCorrecta: devuelve true para pieza correcta', () => {
  const p = generarPersonaje();
  assert.strictEqual(esZonaCorrecta(p, { correcto: true, zona: 'ojos' }), true);
});

test('esZonaCorrecta: devuelve false para pieza incorrecta', () => {
  const p = generarPersonaje();
  assert.strictEqual(esZonaCorrecta(p, { correcto: false, zona: 'ojos' }), false);
});

// ── composicionCorrecta ───────────────────────────────────────────────────────

test('composicionCorrecta: true cuando las 3 zonas están colocadas', () => {
  const p = { color: 'rojo', ojos: 'alegre', nariz: 'redonda', boca: 'sonrisa' };
  const colocadas = { ojos: true, nariz: true, boca: true };
  assert.strictEqual(composicionCorrecta(p, colocadas), true);
});

test('composicionCorrecta: false si falta ojos', () => {
  const p = { color: 'azul', ojos: 'triste', nariz: 'respingona', boca: 'puchero' };
  const colocadas = { nariz: true, boca: true };
  assert.strictEqual(composicionCorrecta(p, colocadas), false);
});

test('composicionCorrecta: false si falta nariz', () => {
  const p = { color: 'verde', ojos: 'sorpresa', nariz: 'redonda', boca: 'sonrisa' };
  const colocadas = { ojos: true, boca: true };
  assert.strictEqual(composicionCorrecta(p, colocadas), false);
});

test('composicionCorrecta: false si falta boca', () => {
  const p = { color: 'morado', ojos: 'dormido', nariz: 'respingona', boca: 'puchero' };
  const colocadas = { ojos: true, nariz: true };
  assert.strictEqual(composicionCorrecta(p, colocadas), false);
});

test('composicionCorrecta: false con objeto vacío', () => {
  const p = generarPersonaje();
  assert.strictEqual(composicionCorrecta(p, {}), false);
});

// ── generarBancoPiezas ────────────────────────────────────────────────────────

test('generarBancoPiezas: cada zona tiene exactamente 2 piezas', () => {
  for (let i = 0; i < 30; i++) {
    const p = generarBancoPiezas(generarPersonaje());
    for (const { zona, piezas } of p) {
      assert.strictEqual(piezas.length, 2, `zona "${zona}" no tiene 2 piezas`);
    }
  }
});

test('generarBancoPiezas: exactamente 1 correcta y 1 incorrecta por zona', () => {
  for (let i = 0; i < 30; i++) {
    const p = generarBancoPiezas(generarPersonaje());
    for (const { zona, piezas } of p) {
      const correctas = piezas.filter(pp => pp.correcto).length;
      assert.strictEqual(correctas, 1, `zona "${zona}" no tiene exactamente 1 correcta`);
    }
  }
});

test('generarBancoPiezas: incluye siempre las 3 zonas', () => {
  for (let i = 0; i < 30; i++) {
    const banco = generarBancoPiezas(generarPersonaje());
    const zonas = banco.map(z => z.zona);
    assert.ok(zonas.includes('ojos'),  'falta ojos en banco');
    assert.ok(zonas.includes('nariz'), 'falta nariz en banco');
    assert.ok(zonas.includes('boca'),  'falta boca en banco');
  }
});

test('generarBancoPiezas: no incluye pelo, barba, sombrero ni gafas', () => {
  for (let i = 0; i < 30; i++) {
    const banco = generarBancoPiezas(generarPersonaje());
    const zonas = banco.map(z => z.zona);
    assert.ok(!zonas.includes('pelo'),     'no debe haber pelo en banco');
    assert.ok(!zonas.includes('barba'),    'no debe haber barba en banco');
    assert.ok(!zonas.includes('sombrero'), 'no debe haber sombrero en banco');
    assert.ok(!zonas.includes('gafas'),    'no debe haber gafas en banco');
  }
});

test('generarBancoPiezas: devuelve exactamente 3 grupos de zonas', () => {
  for (let i = 0; i < 30; i++) {
    const banco = generarBancoPiezas(generarPersonaje());
    assert.strictEqual(banco.length, 3, `el banco debe tener 3 grupos, tiene ${banco.length}`);
  }
});

test('generarBancoPiezas: todas las piezas usan el mismo color del personaje', () => {
  for (let i = 0; i < 30; i++) {
    const p = generarPersonaje();
    const banco = generarBancoPiezas(p);
    for (const { piezas } of banco) {
      for (const pieza of piezas) {
        assert.strictEqual(pieza.color.id, p.color,
          `pieza usa color "${pieza.color.id}" pero el personaje es "${p.color}"`);
      }
    }
  }
});

test('generarBancoPiezas: ojos correcto coincide con el personaje', () => {
  for (let i = 0; i < 30; i++) {
    const p = generarPersonaje();
    const banco = generarBancoPiezas(p);
    const zonaOjos = banco.find(z => z.zona === 'ojos');
    const ojosCorr = zonaOjos.piezas.find(pp => pp.correcto);
    assert.strictEqual(ojosCorr.varOjos, p.ojos,
      `ojos correcto "${ojosCorr.varOjos}" no coincide con personaje "${p.ojos}"`);
  }
});

test('generarBancoPiezas: ojos distractor usa expresión diferente', () => {
  for (let i = 0; i < 30; i++) {
    const p = generarPersonaje();
    const banco = generarBancoPiezas(p);
    const zonaOjos = banco.find(z => z.zona === 'ojos');
    const ojosIncorr = zonaOjos.piezas.find(pp => !pp.correcto);
    assert.notStrictEqual(ojosIncorr.varOjos, p.ojos,
      'ojos distractor no debe tener la misma expresión que el personaje');
  }
});

test('generarBancoPiezas: nariz correcta coincide con el personaje', () => {
  for (let i = 0; i < 30; i++) {
    const p = generarPersonaje();
    const banco = generarBancoPiezas(p);
    const zonaN = banco.find(z => z.zona === 'nariz');
    const narizCorr = zonaN.piezas.find(pp => pp.correcto);
    assert.strictEqual(narizCorr.varNariz, p.nariz,
      `nariz correcta "${narizCorr.varNariz}" no coincide con "${p.nariz}"`);
  }
});

test('generarBancoPiezas: nariz distractor usa forma diferente', () => {
  for (let i = 0; i < 30; i++) {
    const p = generarPersonaje();
    const banco = generarBancoPiezas(p);
    const zonaN = banco.find(z => z.zona === 'nariz');
    const narizIncorr = zonaN.piezas.find(pp => !pp.correcto);
    assert.notStrictEqual(narizIncorr.varNariz, p.nariz,
      'nariz distractor no debe tener la misma forma que el personaje');
  }
});

test('generarBancoPiezas: boca correcta coincide con el personaje', () => {
  for (let i = 0; i < 30; i++) {
    const p = generarPersonaje();
    const banco = generarBancoPiezas(p);
    const zonaB = banco.find(z => z.zona === 'boca');
    const bocaCorr = zonaB.piezas.find(pp => pp.correcto);
    assert.strictEqual(bocaCorr.varBoca, p.boca,
      `boca correcta "${bocaCorr.varBoca}" no coincide con "${p.boca}"`);
  }
});

test('generarBancoPiezas: boca distractor usa forma diferente', () => {
  for (let i = 0; i < 30; i++) {
    const p = generarPersonaje();
    const banco = generarBancoPiezas(p);
    const zonaB = banco.find(z => z.zona === 'boca');
    const bocaIncorr = zonaB.piezas.find(pp => !pp.correcto);
    assert.notStrictEqual(bocaIncorr.varBoca, p.boca,
      'boca distractor no debe tener la misma forma que el personaje');
  }
});
