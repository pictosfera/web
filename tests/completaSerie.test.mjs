import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COLORES_SERIE,
  hayMaterialSuficiente,
  generarSerie,
  esColocacionCorrecta,
  serieCompleta,
} from '../apps/completa-serie/completaSerie.js';

// ── COLORES_SERIE ─────────────────────────────────────────────────────────────

test('COLORES_SERIE: tiene 8 colores', () => {
  assert.strictEqual(COLORES_SERIE.length, 8);
});

test('COLORES_SERIE: cada color tiene id, nombre y hex únicos', () => {
  const ids     = new Set(COLORES_SERIE.map((c) => c.id));
  const nombres = new Set(COLORES_SERIE.map((c) => c.nombre));
  const hexs    = new Set(COLORES_SERIE.map((c) => c.hex));
  assert.strictEqual(ids.size,     8, 'ids duplicados');
  assert.strictEqual(nombres.size, 8, 'nombres duplicados');
  assert.strictEqual(hexs.size,    8, 'hexs duplicados');
  COLORES_SERIE.forEach((c) => {
    assert.ok(typeof c.id     === 'string' && c.id.length     > 0, `id inválido en ${JSON.stringify(c)}`);
    assert.ok(typeof c.nombre === 'string' && c.nombre.length > 0, `nombre inválido en ${JSON.stringify(c)}`);
    assert.ok(typeof c.hex    === 'string' && c.hex.startsWith('#'), `hex inválido en ${JSON.stringify(c)}`);
  });
});

// ── hayMaterialSuficiente ─────────────────────────────────────────────────────

test('hayMaterialSuficiente: pictogramas necesita al menos 3 medios', () => {
  assert.strictEqual(hayMaterialSuficiente('pictogramas', []),         false);
  assert.strictEqual(hayMaterialSuficiente('pictogramas', [{}]),       false);
  assert.strictEqual(hayMaterialSuficiente('pictogramas', [{}, {}]),   false);
  assert.strictEqual(hayMaterialSuficiente('pictogramas', [{}, {}, {}]), true);
});

test('hayMaterialSuficiente: pictogramas filtra medios falsy', () => {
  assert.strictEqual(hayMaterialSuficiente('pictogramas', [null, null, null]),      false);
  assert.strictEqual(hayMaterialSuficiente('pictogramas', [null, {}, {}, {}]),      true);
});

test('hayMaterialSuficiente: colores siempre es true', () => {
  assert.strictEqual(hayMaterialSuficiente('colores', []),   true);
  assert.strictEqual(hayMaterialSuficiente('colores', null), true);
});

test('hayMaterialSuficiente: numeros siempre es true', () => {
  assert.strictEqual(hayMaterialSuficiente('numeros', []),   true);
  assert.strictEqual(hayMaterialSuficiente('numeros', null), true);
});

// ── generarSerie — estructura general ────────────────────────────────────────

const MEDIOS_TEST = [
  { id: '1', nombre: 'gato' },
  { id: '2', nombre: 'perro' },
  { id: '3', nombre: 'vaca' },
  { id: '4', nombre: 'pato' },
  { id: '5', nombre: 'rana' },
];

test('generarSerie: pictogramas — devuelve null sin suficiente material', () => {
  assert.strictEqual(generarSerie('pictogramas', [],     false), null);
  assert.strictEqual(generarSerie('pictogramas', [{}],   false), null);
  assert.strictEqual(generarSerie('pictogramas', [{}, {}], false), null);
});

test('generarSerie: pictogramas — devuelve objeto válido con 5 medios', () => {
  const res = generarSerie('pictogramas', MEDIOS_TEST, false);
  assert.ok(res !== null, 'debe devolver resultado');
  assert.ok(Array.isArray(res.serie),   'serie debe ser array');
  assert.ok(Array.isArray(res.huecos),  'huecos debe ser array');
  assert.ok(Array.isArray(res.banco),   'banco debe ser array');
});

test('generarSerie: colores — siempre devuelve resultado', () => {
  const res = generarSerie('colores', [], false);
  assert.ok(res !== null);
  assert.ok(Array.isArray(res.serie));
  assert.ok(Array.isArray(res.huecos));
  assert.ok(Array.isArray(res.banco));
});

test('generarSerie: numeros — siempre devuelve resultado', () => {
  const res = generarSerie('numeros', [], false);
  assert.ok(res !== null);
  assert.ok(Array.isArray(res.serie));
  assert.ok(Array.isArray(res.huecos));
  assert.ok(Array.isArray(res.banco));
});

test('generarSerie: tipo desconocido devuelve null', () => {
  assert.strictEqual(generarSerie('desconocido', [], false), null);
});

// ── generarSerie — serie ──────────────────────────────────────────────────────

test('generarSerie: serie siempre tiene 6 elementos', () => {
  for (let i = 0; i < 40; i++) {
    const resP = generarSerie('pictogramas', MEDIOS_TEST, false);
    const resC = generarSerie('colores',     [],           false);
    const resN = generarSerie('numeros',     [],           false);
    assert.strictEqual(resP.serie.length, 6, 'pictogramas: 6 elementos');
    assert.strictEqual(resC.serie.length, 6, 'colores: 6 elementos');
    assert.strictEqual(resN.serie.length, 6, 'numeros: 6 elementos');
  }
});

test('generarSerie: pictogramas — patrón AB (alternado A/B)', () => {
  for (let i = 0; i < 30; i++) {
    const { serie } = generarSerie('pictogramas', MEDIOS_TEST, false);
    // posiciones pares: mismo id; impares: mismo id; pares ≠ impares
    const idA = serie[0].id;
    const idB = serie[1].id;
    assert.notStrictEqual(idA, idB, 'A y B deben ser distintos');
    serie.forEach((el, idx) => {
      const esperado = idx % 2 === 0 ? idA : idB;
      assert.strictEqual(el.id, esperado, `posición ${idx}: esperaba ${esperado}, tiene ${el.id}`);
    });
  }
});

test('generarSerie: colores — patrón AB alternado', () => {
  for (let i = 0; i < 30; i++) {
    const { serie } = generarSerie('colores', [], false);
    const idA = serie[0].id;
    const idB = serie[1].id;
    assert.notStrictEqual(idA, idB);
    serie.forEach((el, idx) => {
      assert.strictEqual(el.id, idx % 2 === 0 ? idA : idB);
    });
  }
});

test('generarSerie: colores — todos los elementos son colores válidos de COLORES_SERIE', () => {
  const idsValidos = new Set(COLORES_SERIE.map((c) => c.id));
  for (let i = 0; i < 30; i++) {
    const { serie } = generarSerie('colores', [], false);
    serie.forEach((el) => {
      assert.ok(idsValidos.has(el.id), `color "${el.id}" no está en COLORES_SERIE`);
      assert.ok(typeof el.hex === 'string', 'hex debe ser string');
    });
  }
});

test('generarSerie: numeros — secuencia aritmética con paso constante positivo', () => {
  for (let i = 0; i < 50; i++) {
    const { serie } = generarSerie('numeros', [], false);
    assert.ok(serie[0].valor >= 1, 'el primer valor debe ser ≥ 1');
    const paso = serie[1].valor - serie[0].valor;
    assert.ok(paso >= 1 && paso <= 3, `paso=${paso} fuera del rango [1,3]`);
    for (let k = 1; k < serie.length; k++) {
      assert.strictEqual(serie[k].valor - serie[k - 1].valor, paso, `paso inconsistente en posición ${k}`);
    }
  }
});

test('generarSerie: numeros — el id de cada elemento es el string de su valor', () => {
  for (let i = 0; i < 20; i++) {
    const { serie } = generarSerie('numeros', [], false);
    serie.forEach((el) => {
      assert.strictEqual(el.id, String(el.valor));
    });
  }
});

// ── generarSerie — huecos ─────────────────────────────────────────────────────

test('generarSerie: siempre 2 huecos', () => {
  for (let i = 0; i < 40; i++) {
    const resP = generarSerie('pictogramas', MEDIOS_TEST, false);
    const resC = generarSerie('colores',     [],           true);
    const resN = generarSerie('numeros',     [],           false);
    assert.strictEqual(resP.huecos.length, 2);
    assert.strictEqual(resC.huecos.length, 2);
    assert.strictEqual(resN.huecos.length, 2);
  }
});

test('generarSerie: huecos sin huecosLibres siempre en posiciones 4 y 5', () => {
  for (let i = 0; i < 30; i++) {
    const resP = generarSerie('pictogramas', MEDIOS_TEST, false);
    const resC = generarSerie('colores',     [],           false);
    const resN = generarSerie('numeros',     [],           false);
    assert.deepStrictEqual(resP.huecos, [4, 5]);
    assert.deepStrictEqual(resC.huecos, [4, 5]);
    assert.deepStrictEqual(resN.huecos, [4, 5]);
  }
});

test('generarSerie: huecos siempre ordenados', () => {
  for (let i = 0; i < 40; i++) {
    const resP = generarSerie('pictogramas', MEDIOS_TEST, true);
    const resC = generarSerie('colores',     [],           true);
    const resN = generarSerie('numeros',     [],           true);
    [resP, resC, resN].forEach(({ huecos }) => {
      assert.ok(huecos[0] < huecos[1], `huecos no ordenados: ${huecos}`);
    });
  }
});

test('generarSerie: AB con huecosLibres: un hueco par y uno impar', () => {
  for (let i = 0; i < 60; i++) {
    const resP = generarSerie('pictogramas', MEDIOS_TEST, true);
    const resC = generarSerie('colores',     [],           true);
    [resP, resC].forEach(({ huecos, serie }) => {
      const [h0, h1] = huecos;
      // Uno debe ser par (posición A) y otro impar (posición B)
      const paridad0 = h0 % 2; // 0=par, 1=impar
      const paridad1 = h1 % 2;
      assert.notStrictEqual(paridad0, paridad1,
        `ambos huecos en posición del mismo elemento (huecos=${huecos})`);
    });
  }
});

test('generarSerie: huecos son posiciones válidas [0..5]', () => {
  for (let i = 0; i < 40; i++) {
    const res = generarSerie('numeros', [], true);
    res.huecos.forEach((h) => {
      assert.ok(h >= 0 && h <= 5, `hueco ${h} fuera de rango`);
    });
  }
});

// ── generarSerie — banco ──────────────────────────────────────────────────────

test('generarSerie: banco siempre tiene 3 piezas', () => {
  for (let i = 0; i < 30; i++) {
    const resP = generarSerie('pictogramas', MEDIOS_TEST, false);
    const resC = generarSerie('colores',     [],           false);
    const resN = generarSerie('numeros',     [],           false);
    assert.strictEqual(resP.banco.length, 3);
    assert.strictEqual(resC.banco.length, 3);
    assert.strictEqual(resN.banco.length, 3);
  }
});

test('generarSerie: banco tiene claves 0, 1 y 2', () => {
  for (let i = 0; i < 20; i++) {
    const { banco } = generarSerie('colores', [], false);
    const claves = banco.map((p) => p.clave).sort((a, b) => a - b);
    assert.deepStrictEqual(claves, [0, 1, 2]);
  }
});

test('generarSerie: banco contiene las piezas correctas para los dos huecos', () => {
  for (let i = 0; i < 30; i++) {
    const { serie, huecos, banco } = generarSerie('pictogramas', MEDIOS_TEST, false);
    const idEsperado0 = serie[huecos[0]].id;
    const idEsperado1 = serie[huecos[1]].id;
    const idsEnBanco = banco.map((p) => p.id);
    assert.ok(idsEnBanco.includes(idEsperado0), `id ${idEsperado0} para hueco 0 no está en banco`);
    assert.ok(idsEnBanco.includes(idEsperado1), `id ${idEsperado1} para hueco 1 no está en banco`);
  }
});

test('generarSerie: colores — banco contiene ids correctos', () => {
  for (let i = 0; i < 30; i++) {
    const { serie, huecos, banco } = generarSerie('colores', [], false);
    const idsEnBanco = banco.map((p) => p.id);
    assert.ok(idsEnBanco.includes(serie[huecos[0]].id));
    assert.ok(idsEnBanco.includes(serie[huecos[1]].id));
  }
});

test('generarSerie: numeros — banco contiene los valores correctos', () => {
  for (let i = 0; i < 30; i++) {
    const { serie, huecos, banco } = generarSerie('numeros', [], false);
    const idsEnBanco = banco.map((p) => p.id);
    assert.ok(idsEnBanco.includes(serie[huecos[0]].id), 'falta valor del hueco 0');
    assert.ok(idsEnBanco.includes(serie[huecos[1]].id), 'falta valor del hueco 1');
  }
});

test('generarSerie: numeros — el distractor no está en la serie', () => {
  for (let i = 0; i < 50; i++) {
    const { serie, banco } = generarSerie('numeros', [], false);
    const distractor = banco.find((p) => p.esDistractor);
    assert.ok(distractor, 'debe haber un distractor');
    const valoresSerie = new Set(serie.map((e) => e.id));
    assert.ok(!valoresSerie.has(distractor.id),
      `distractor id="${distractor.id}" está en la serie`);
  }
});

test('generarSerie: pictogramas — el distractor no coincide con A ni B del patrón', () => {
  for (let i = 0; i < 30; i++) {
    const { serie, banco } = generarSerie('pictogramas', MEDIOS_TEST, false);
    const idA = serie[0].id;
    const idB = serie[1].id;
    const distractor = banco.find((p) => p.esDistractor);
    assert.ok(distractor, 'debe haber un distractor');
    assert.notStrictEqual(distractor.id, idA, 'distractor coincide con A');
    assert.notStrictEqual(distractor.id, idB, 'distractor coincide con B');
  }
});

// ── esColocacionCorrecta ──────────────────────────────────────────────────────

test('esColocacionCorrecta: true para la pieza correcta', () => {
  const { serie, huecos } = generarSerie('colores', [], false);
  const piezaCorrecta = { ...serie[huecos[0]] };
  assert.strictEqual(esColocacionCorrecta(serie, huecos[0], piezaCorrecta), true);
});

test('esColocacionCorrecta: false para pieza con id distinto', () => {
  const { serie, huecos } = generarSerie('colores', [], false);
  const piezaWrong = { ...serie[huecos[0]], id: '__WRONG__' };
  assert.strictEqual(esColocacionCorrecta(serie, huecos[0], piezaWrong), false);
});

test('esColocacionCorrecta: false con posición fuera de rango', () => {
  const { serie } = generarSerie('numeros', [], false);
  assert.strictEqual(esColocacionCorrecta(serie, -1, serie[0]), false);
  assert.strictEqual(esColocacionCorrecta(serie, 99, serie[0]), false);
});

test('esColocacionCorrecta: false con pieza null', () => {
  const { serie } = generarSerie('numeros', [], false);
  assert.strictEqual(esColocacionCorrecta(serie, 0, null), false);
});

test('esColocacionCorrecta: false con serie vacía', () => {
  assert.strictEqual(esColocacionCorrecta([], 0, { id: 'x' }), false);
});

// ── serieCompleta ─────────────────────────────────────────────────────────────

test('serieCompleta: true cuando todos los huecos están bien rellenos', () => {
  const { serie, huecos } = generarSerie('colores', [], false);
  const colocadas = {};
  huecos.forEach((pos) => { colocadas[pos] = { ...serie[pos] }; });
  assert.strictEqual(serieCompleta(serie, huecos, colocadas), true);
});

test('serieCompleta: false cuando falta un hueco', () => {
  const { serie, huecos } = generarSerie('numeros', [], false);
  const colocadas = {};
  colocadas[huecos[0]] = { ...serie[huecos[0]] };
  // huecos[1] vacío
  assert.strictEqual(serieCompleta(serie, huecos, colocadas), false);
});

test('serieCompleta: false con colocadas vacías', () => {
  const { serie, huecos } = generarSerie('colores', [], false);
  assert.strictEqual(serieCompleta(serie, huecos, {}), false);
});

test('serieCompleta: false si una pieza colocada tiene id incorrecto', () => {
  const { serie, huecos } = generarSerie('numeros', [], false);
  const colocadas = {};
  huecos.forEach((pos) => { colocadas[pos] = { ...serie[pos], id: '__WRONG__' }; });
  assert.strictEqual(serieCompleta(serie, huecos, colocadas), false);
});

test('serieCompleta: false con huecos vacíos', () => {
  const { serie } = generarSerie('colores', [], false);
  assert.strictEqual(serieCompleta(serie, [], {}), false);
});

test('serieCompleta: false con huecos null', () => {
  const { serie } = generarSerie('numeros', [], false);
  assert.strictEqual(serieCompleta(serie, null, {}), false);
});
