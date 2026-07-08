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
  assert.ok(typeof p.piel     === 'string', 'piel debe ser string');
  assert.ok(typeof p.pelo     === 'string', 'pelo debe ser string');
  assert.ok(typeof p.ojos     === 'string', 'ojos debe ser string');
  assert.ok(typeof p.nariz    === 'string', 'nariz debe ser string');
  assert.ok(typeof p.boca     === 'string', 'boca debe ser string');
  assert.ok(typeof p.barba    === 'boolean','barba debe ser boolean');
  assert.ok(typeof p.gafas    === 'boolean','gafas debe ser boolean');
});

test('generarPersonaje: piel es uno de los 5 tonos definidos', () => {
  const TONOS_VALIDOS = ['p1','p2','p3','p4','p5'];
  for (let i = 0; i < 100; i++) {
    const { piel } = generarPersonaje();
    assert.ok(TONOS_VALIDOS.includes(piel), `piel="${piel}" no reconocido`);
  }
});

test('generarPersonaje: pelo es uno de los 7 peinados definidos', () => {
  const PELOS_VALIDOS = ['dk-c','dk-l','lt-c','lt-l','rd-m','bl-r','gr-c'];
  for (let i = 0; i < 100; i++) {
    const { pelo } = generarPersonaje();
    assert.ok(PELOS_VALIDOS.includes(pelo), `pelo="${pelo}" no reconocido`);
  }
});

test('generarPersonaje: ojos es uno de los 4 tipos', () => {
  const VALIDOS = ['alegre','triste','sorpresa','dormido'];
  for (let i = 0; i < 100; i++) {
    const { ojos } = generarPersonaje();
    assert.ok(VALIDOS.includes(ojos), `ojos="${ojos}" no reconocido`);
  }
});

test('generarPersonaje: nariz es ancha o fina', () => {
  for (let i = 0; i < 100; i++) {
    const { nariz } = generarPersonaje();
    assert.ok(['ancha','fina'].includes(nariz), `nariz="${nariz}" no válida`);
  }
});

test('generarPersonaje: boca es sonrisa o neutral', () => {
  for (let i = 0; i < 100; i++) {
    const { boca } = generarPersonaje();
    assert.ok(['sonrisa','neutral'].includes(boca), `boca="${boca}" no válida`);
  }
});

test('generarPersonaje: produce variedad en 50 llamadas', () => {
  const vistos = new Set();
  for (let i = 0; i < 50; i++) {
    const p = generarPersonaje();
    vistos.add(`${p.piel}-${p.pelo}-${p.ojos}-${p.nariz}-${p.boca}`);
  }
  assert.ok(vistos.size > 1, 'debe haber al menos 2 combinaciones distintas');
});

test('generarPersonaje: sombrero y gafas no coexisten', () => {
  for (let i = 0; i < 200; i++) {
    const p = generarPersonaje();
    if (p.sombrero && p.gafas) {
      assert.fail('sombrero y gafas no pueden coexistir');
    }
  }
});

// ── zonasRequeridas ───────────────────────────────────────────────────────────

test('zonasRequeridas: siempre incluye las 4 zonas base', () => {
  for (let i = 0; i < 50; i++) {
    const p = generarPersonaje();
    const z = zonasRequeridas(p);
    assert.ok(z.includes('ojos'),  'falta ojos');
    assert.ok(z.includes('nariz'), 'falta nariz');
    assert.ok(z.includes('boca'),  'falta boca');
    assert.ok(z.includes('pelo'),  'falta pelo');
  }
});

test('zonasRequeridas: incluye barba si el personaje tiene barba', () => {
  const p = { piel:'p1', pelo:'dk-c', ojos:'alegre', nariz:'ancha', boca:'sonrisa',
               barba:true, sombrero:null, gafas:false };
  const z = zonasRequeridas(p);
  assert.ok(z.includes('barba'), 'debe incluir barba');
});

test('zonasRequeridas: no incluye barba si no la tiene', () => {
  const p = { piel:'p1', pelo:'dk-c', ojos:'alegre', nariz:'ancha', boca:'sonrisa',
               barba:false, sombrero:null, gafas:false };
  const z = zonasRequeridas(p);
  assert.ok(!z.includes('barba'), 'no debe incluir barba');
});

test('zonasRequeridas: incluye sombrero si lo tiene', () => {
  const p = { piel:'p1', pelo:'dk-c', ojos:'alegre', nariz:'ancha', boca:'sonrisa',
               barba:false, sombrero:'#E03030', gafas:false };
  const z = zonasRequeridas(p);
  assert.ok(z.includes('sombrero'), 'debe incluir sombrero');
});

test('zonasRequeridas: incluye gafas si las tiene', () => {
  const p = { piel:'p1', pelo:'dk-c', ojos:'alegre', nariz:'ancha', boca:'sonrisa',
               barba:false, sombrero:null, gafas:true };
  const z = zonasRequeridas(p);
  assert.ok(z.includes('gafas'), 'debe incluir gafas');
});

// ── esZonaCorrecta ────────────────────────────────────────────────────────────

test('esZonaCorrecta: devuelve true para pieza correcta', () => {
  const p = generarPersonaje();
  assert.strictEqual(esZonaCorrecta(p, { correcto:true, zona:'ojos' }), true);
});

test('esZonaCorrecta: devuelve false para pieza incorrecta', () => {
  const p = generarPersonaje();
  assert.strictEqual(esZonaCorrecta(p, { correcto:false, zona:'ojos' }), false);
});

// ── composicionCorrecta ───────────────────────────────────────────────────────

test('composicionCorrecta: true cuando todas las zonas requeridas están colocadas', () => {
  const p = { piel:'p1', pelo:'dk-c', ojos:'alegre', nariz:'ancha', boca:'sonrisa',
               barba:false, sombrero:null, gafas:false };
  const colocadas = { ojos:true, nariz:true, boca:true, pelo:true };
  assert.strictEqual(composicionCorrecta(p, colocadas), true);
});

test('composicionCorrecta: false si falta alguna zona base', () => {
  const p = { piel:'p1', pelo:'dk-c', ojos:'alegre', nariz:'ancha', boca:'sonrisa',
               barba:false, sombrero:null, gafas:false };
  const colocadas = { ojos:true, nariz:true, boca:true };  // falta pelo
  assert.strictEqual(composicionCorrecta(p, colocadas), false);
});

test('composicionCorrecta: false si falta zona opcional requerida (barba)', () => {
  const p = { piel:'p1', pelo:'dk-c', ojos:'alegre', nariz:'ancha', boca:'sonrisa',
               barba:true, sombrero:null, gafas:false };
  const colocadas = { ojos:true, nariz:true, boca:true, pelo:true };  // falta barba
  assert.strictEqual(composicionCorrecta(p, colocadas), false);
});

test('composicionCorrecta: true incluyendo accesorios opcionales', () => {
  const p = { piel:'p2', pelo:'lt-l', ojos:'triste', nariz:'fina', boca:'neutral',
               barba:true, sombrero:null, gafas:true };
  const colocadas = { ojos:true, nariz:true, boca:true, pelo:true, barba:true, gafas:true };
  assert.strictEqual(composicionCorrecta(p, colocadas), true);
});

// ── generarBancoPiezas ────────────────────────────────────────────────────────

test('generarBancoPiezas: cada zona tiene exactamente 2 piezas', () => {
  for (let i = 0; i < 30; i++) {
    const p = generarPersonaje();
    const banco = generarBancoPiezas(p);
    for (const { zona, piezas } of banco) {
      assert.strictEqual(piezas.length, 2, `zona "${zona}" no tiene 2 piezas`);
    }
  }
});

test('generarBancoPiezas: exactamente 1 pieza correcta y 1 incorrecta por zona', () => {
  for (let i = 0; i < 30; i++) {
    const p = generarPersonaje();
    const banco = generarBancoPiezas(p);
    for (const { zona, piezas } of banco) {
      const correctas = piezas.filter(pp => pp.correcto).length;
      assert.strictEqual(correctas, 1, `zona "${zona}" no tiene exactamente 1 correcta`);
    }
  }
});

test('generarBancoPiezas: incluye las 4 zonas base siempre', () => {
  for (let i = 0; i < 30; i++) {
    const p = generarPersonaje();
    const banco = generarBancoPiezas(p);
    const zonas = banco.map(z => z.zona);
    assert.ok(zonas.includes('ojos'),  'falta ojos en banco');
    assert.ok(zonas.includes('nariz'), 'falta nariz en banco');
    assert.ok(zonas.includes('boca'),  'falta boca en banco');
    assert.ok(zonas.includes('pelo'),  'falta pelo en banco');
  }
});

test('generarBancoPiezas: incluye barba si personaje tiene barba', () => {
  const p = { piel:'p3', pelo:'rd-m', ojos:'sorpresa', nariz:'ancha', boca:'sonrisa',
               barba:true, sombrero:null, gafas:false };
  const banco = generarBancoPiezas(p);
  const zonas = banco.map(z => z.zona);
  assert.ok(zonas.includes('barba'), 'debe haber zona barba en banco');
});

test('generarBancoPiezas: no incluye barba si personaje no la tiene', () => {
  const p = { piel:'p3', pelo:'rd-m', ojos:'sorpresa', nariz:'ancha', boca:'sonrisa',
               barba:false, sombrero:null, gafas:false };
  const banco = generarBancoPiezas(p);
  const zonas = banco.map(z => z.zona);
  assert.ok(!zonas.includes('barba'), 'no debe haber zona barba si personaje no la tiene');
});

test('generarBancoPiezas: pieza de pelo correcto coincide con personaje', () => {
  for (let i = 0; i < 30; i++) {
    const p = generarPersonaje();
    const banco = generarBancoPiezas(p);
    const zonaPelo = banco.find(z => z.zona === 'pelo');
    const peloCorrect = zonaPelo.piezas.find(pp => pp.correcto);
    assert.strictEqual(peloCorrect.varPelo, p.pelo,
      `pelo correcto "${peloCorrect.varPelo}" no coincide con personaje "${p.pelo}"`);
  }
});

test('generarBancoPiezas: pieza de pelo distractor difiere del personaje', () => {
  for (let i = 0; i < 30; i++) {
    const p = generarPersonaje();
    const banco = generarBancoPiezas(p);
    const zonaPelo = banco.find(z => z.zona === 'pelo');
    const peloIncorrecto = zonaPelo.piezas.find(pp => !pp.correcto);
    assert.notStrictEqual(peloIncorrecto.varPelo, p.pelo,
      'pelo distractor no debe ser igual al del personaje');
  }
});

test('generarBancoPiezas: pieza de ojos distractor usa expresión diferente', () => {
  for (let i = 0; i < 30; i++) {
    const p = generarPersonaje();
    const banco = generarBancoPiezas(p);
    const zonaOjos = banco.find(z => z.zona === 'ojos');
    const ojosIncorrecto = zonaOjos.piezas.find(pp => !pp.correcto);
    assert.notStrictEqual(ojosIncorrecto.varOjos, p.ojos,
      'ojos distractor no debe tener la misma expresión que el personaje');
  }
});

test('generarBancoPiezas: nariz correcta coincide con personaje', () => {
  for (let i = 0; i < 30; i++) {
    const p = generarPersonaje();
    const banco = generarBancoPiezas(p);
    const zonaN = banco.find(z => z.zona === 'nariz');
    const narizCorrect = zonaN.piezas.find(pp => pp.correcto);
    assert.strictEqual(narizCorrect.varNariz, p.nariz);
  }
});

test('generarBancoPiezas: nariz distractor usa tono de piel diferente', () => {
  for (let i = 0; i < 30; i++) {
    const p = generarPersonaje();
    const banco = generarBancoPiezas(p);
    const zonaN = banco.find(z => z.zona === 'nariz');
    const narizIncorrect = zonaN.piezas.find(pp => !pp.correcto);
    assert.notStrictEqual(narizIncorrect.piel.id, p.piel,
      'nariz distractor debe tener tono de piel diferente');
  }
});
