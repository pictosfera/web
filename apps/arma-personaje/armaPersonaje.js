// Pictosfera — mecánica: arma la cara.
//
// El niño ve una carta modelo con un personaje SVG completo (izquierda)
// y debe reconstruir la misma cara en el panel de ensamblaje (derecha)
// eligiendo las piezas correctas de un banco inferior.
//
// Generación procedural: 5 tonos de piel × 7 peinados × 4 expresiones
// × 2 narices × 2 bocas + accesorios opcionales (barba, sombrero, gafas).
// Validación inmediata: clic en pieza → correcto (se coloca) | incorrecto (shake).
// 10 personajes por partida; al terminar → plataforma.mostrarRecompensa().

const ESTILOS_ID   = 'arma-personaje-estilos';
const TOTAL_RONDAS = 10;

let estado = null;

// ── Paletas de piel ───────────────────────────────────────────────────────────
// f=fondo, s=sombra, o=oreja, l=labio, d=muy oscuro (cejas/pupila)
const TONOS = [
  { id:'p1', f:'#FDDBB4', s:'#E8B880', o:'#F0C898', l:'#D08060', d:'#A05030' },
  { id:'p2', f:'#F1C27D', s:'#D49A50', o:'#E0AE60', l:'#C07840', d:'#7A4010' },
  { id:'p3', f:'#C07840', s:'#9A5820', o:'#A86830', l:'#7A3C14', d:'#3C1808' },
  { id:'p4', f:'#8D5524', s:'#6B3A10', o:'#7A4818', l:'#5A2808', d:'#200A00' },
  { id:'p5', f:'#4A2D1B', s:'#2E1A0A', o:'#3C2212', l:'#2A1208', d:'#0A0402' },
];

// ── Opciones de pelo ──────────────────────────────────────────────────────────
const PELOS = [
  { id:'dk-c', color:'#1C0C04', largo:'corto',  rizado:false },
  { id:'dk-l', color:'#2A1A0C', largo:'largo',  rizado:false },
  { id:'lt-c', color:'#D4A828', largo:'corto',  rizado:false },
  { id:'lt-l', color:'#C89818', largo:'largo',  rizado:false },
  { id:'rd-m', color:'#8B2010', largo:'medio',  rizado:false },
  { id:'bl-r', color:'#E8C028', largo:'corto',  rizado:true  },
  { id:'gr-c', color:'#909090', largo:'corto',  rizado:false },
];

const OJOS_OPTS    = ['alegre','triste','sorpresa','dormido'];
const NARIZ_OPTS   = ['ancha','fina'];
const BOCA_OPTS    = ['sonrisa','neutral'];
const COLORES_SOMB = ['#E03030','#3060D0','#20A040','#E08010','#8030A0'];
const PROB_BARBA   = 0.35;
const PROB_SOMB    = 0.25;
const PROB_GAFAS   = 0.20;

// Recortes de viewBox para las vistas de pieza
const VIEWBOX_ZONA = {
  pelo:     '26 4 188 110',
  ojos:     '56 82 128 72',
  nariz:    '86 138 68 52',
  boca:     '74 180 92 64',
  barba:    '58 194 124 68',
  sombrero: '42 2 156 62',
  gafas:    '48 98 144 46',
};

// ── Lógica pura (testable sin DOM) ────────────────────────────────────────────

/** Genera un personaje de forma procedural. */
export function generarPersonaje() {
  const piel     = TONOS[Math.floor(Math.random() * TONOS.length)].id;
  const pelo     = PELOS[Math.floor(Math.random() * PELOS.length)].id;
  const ojos     = OJOS_OPTS[Math.floor(Math.random() * OJOS_OPTS.length)];
  const nariz    = NARIZ_OPTS[Math.floor(Math.random() * NARIZ_OPTS.length)];
  const boca     = BOCA_OPTS[Math.floor(Math.random() * BOCA_OPTS.length)];
  const barba    = Math.random() < PROB_BARBA;
  const sombrero = Math.random() < PROB_SOMB
    ? COLORES_SOMB[Math.floor(Math.random() * COLORES_SOMB.length)]
    : null;
  const gafas    = !sombrero && Math.random() < PROB_GAFAS ? true : false;
  return { piel, pelo, ojos, nariz, boca, barba, sombrero, gafas };
}

/** Lista de zonas que debe completar el niño para este personaje. */
export function zonasRequeridas(personaje) {
  const z = ['ojos', 'nariz', 'boca', 'pelo'];
  if (personaje.barba)    z.push('barba');
  if (personaje.sombrero) z.push('sombrero');
  if (personaje.gafas)    z.push('gafas');
  return z;
}

/** True si la pieza corresponde a la zona correcta del personaje. */
export function esZonaCorrecta(_personaje, pieza) {
  return pieza.correcto === true;
}

/** True si todas las zonas requeridas están correctamente colocadas. */
export function composicionCorrecta(personaje, colocadas) {
  return zonasRequeridas(personaje).every(z => colocadas[z] === true);
}

/** Genera el banco: 2 piezas por zona (correcta + 1 distractor). */
export function generarBancoPiezas(personaje) {
  const t     = TONOS.find(p => p.id === personaje.piel);
  const tD    = _toneDistractor(personaje.piel);
  const pDist = _peloDistractor(personaje.pelo);
  const zonas = [];

  // Ojos: distractor = otra expresión (misma piel)
  const ojosD = OJOS_OPTS.filter(o => o !== personaje.ojos);
  const ojosDistVar = ojosD[Math.floor(Math.random() * ojosD.length)];
  zonas.push({ zona:'ojos', piezas: _barajar([
    { id:`oj-${personaje.ojos}-${t.id}`,  correcto:true,  zona:'ojos',  varOjos:personaje.ojos, piel:t  },
    { id:`oj-${ojosDistVar}-${t.id}`,     correcto:false, zona:'ojos',  varOjos:ojosDistVar,    piel:t  },
  ])});

  // Nariz: distractor = misma forma, tono de piel diferente
  zonas.push({ zona:'nariz', piezas: _barajar([
    { id:`nz-${personaje.nariz}-${t.id}`, correcto:true,  zona:'nariz', varNariz:personaje.nariz, piel:t  },
    { id:`nz-${personaje.nariz}-${tD.id}`,correcto:false, zona:'nariz', varNariz:personaje.nariz, piel:tD },
  ])});

  // Boca: distractor = misma forma, tono de piel diferente
  zonas.push({ zona:'boca', piezas: _barajar([
    { id:`bk-${personaje.boca}-${t.id}`,  correcto:true,  zona:'boca', varBoca:personaje.boca, piel:t  },
    { id:`bk-${personaje.boca}-${tD.id}`, correcto:false, zona:'boca', varBoca:personaje.boca, piel:tD },
  ])});

  // Pelo: distractor = diferente peinado
  zonas.push({ zona:'pelo', piezas: _barajar([
    { id:`pl-${personaje.pelo}`,  correcto:true,  zona:'pelo', varPelo:personaje.pelo },
    { id:`pl-${pDist.id}`,        correcto:false, zona:'pelo', varPelo:pDist.id       },
  ])});

  if (personaje.barba) {
    zonas.push({ zona:'barba', piezas: _barajar([
      { id:`ba-${t.id}`,  correcto:true,  zona:'barba', piel:t  },
      { id:`ba-${tD.id}`, correcto:false, zona:'barba', piel:tD },
    ])});
  }

  if (personaje.sombrero) {
    const colD = COLORES_SOMB.filter(c => c !== personaje.sombrero)[0];
    zonas.push({ zona:'sombrero', piezas: _barajar([
      { id:`so-${personaje.sombrero}`, correcto:true,  zona:'sombrero', varColor:personaje.sombrero },
      { id:`so-${colD}`,              correcto:false, zona:'sombrero', varColor:colD               },
    ])});
  }

  if (personaje.gafas) {
    zonas.push({ zona:'gafas', piezas: _barajar([
      { id:'ga-normal',  correcto:true,  zona:'gafas', varGafas:'normal'  },
      { id:'ga-tintado', correcto:false, zona:'gafas', varGafas:'tintado' },
    ])});
  }

  return zonas;
}

// ── Helpers privados ──────────────────────────────────────────────────────────

function _toneDistractor(idPiel) {
  const otros = TONOS.filter(t => t.id !== idPiel);
  return otros[Math.floor(Math.random() * otros.length)];
}

function _peloDistractor(idPelo) {
  const otros = PELOS.filter(p => p.id !== idPelo);
  return otros[Math.floor(Math.random() * otros.length)];
}

function _barajar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function _lighten(hex, amt) {
  const parse = (s, o) => Math.min(255, parseInt(hex.slice(o, o + 2), 16) + amt).toString(16).padStart(2, '0');
  return '#' + parse(hex, 1) + parse(hex, 3) + parse(hex, 5);
}

// ── SVG: cabeza base ──────────────────────────────────────────────────────────
// ViewBox fijo: 0 0 240 280

function svgBase(t) {
  return `
    <rect x="106" y="218" width="28" height="62" rx="8" fill="${t.f}"/>
    <ellipse cx="50" cy="132" rx="15" ry="20" fill="${t.o}"/>
    <path d="M55 120 Q66 126 62 136 Q69 142 60 149 Q52 146 50 140" fill="${t.s}" opacity="0.65"/>
    <ellipse cx="190" cy="132" rx="15" ry="20" fill="${t.o}"/>
    <path d="M185 120 Q174 126 178 136 Q171 142 180 149 Q188 146 190 140" fill="${t.s}" opacity="0.65"/>
    <ellipse cx="120" cy="132" rx="72" ry="90" fill="${t.f}"/>
    <ellipse cx="87" cy="166" rx="11" ry="7" fill="#FF8888" opacity="0.22"/>
    <ellipse cx="153" cy="166" rx="11" ry="7" fill="#FF8888" opacity="0.22"/>`;
}

// ── SVG: pelo atrás (dibujado ANTES de la cabeza) ────────────────────────────

function svgPeloAtras(p) {
  const c = p.color;
  if (p.rizado) {
    return `<ellipse cx="120" cy="58" rx="80" ry="48" fill="${c}"/>
    <circle cx="60" cy="80" r="20" fill="${c}"/>
    <circle cx="95" cy="50" r="18" fill="${c}"/>
    <circle cx="145" cy="50" r="18" fill="${c}"/>
    <circle cx="180" cy="80" r="20" fill="${c}"/>`;
  }
  if (p.largo === 'largo') {
    return `<ellipse cx="120" cy="58" rx="80" ry="50" fill="${c}"/>
    <ellipse cx="46" cy="158" rx="22" ry="78" fill="${c}"/>
    <ellipse cx="194" cy="158" rx="22" ry="78" fill="${c}"/>`;
  }
  if (p.largo === 'medio') {
    return `<ellipse cx="120" cy="58" rx="80" ry="50" fill="${c}"/>
    <ellipse cx="48" cy="148" rx="20" ry="56" fill="${c}"/>
    <ellipse cx="192" cy="148" rx="20" ry="56" fill="${c}"/>`;
  }
  // corto
  return `<ellipse cx="120" cy="56" rx="80" ry="46" fill="${c}"/>`;
}

// ── SVG: pelo frente (dibujado DESPUÉS de los rasgos) ────────────────────────

function svgPeloFrente(p) {
  const c  = p.color;
  const hl = _lighten(c, 45);
  if (p.rizado) {
    return `<path d="M48 104 Q52 54 120 46 Q188 54 192 104 Q168 70 120 66 Q72 70 48 104Z" fill="${c}"/>
    <circle cx="74" cy="90" r="14" fill="${c}"/>
    <circle cx="100" cy="80" r="13" fill="${c}"/>
    <circle cx="126" cy="78" r="13" fill="${c}"/>
    <circle cx="152" cy="80" r="13" fill="${c}"/>
    <circle cx="170" cy="90" r="12" fill="${c}"/>`;
  }
  if (p.largo === 'largo') {
    return `<path d="M48 104 Q52 54 120 46 Q188 54 192 104 Q168 70 120 66 Q72 70 48 104Z" fill="${c}"/>
    <path d="M82 58 Q104 48 120 48 Q108 54 92 64Z" fill="${hl}" opacity="0.35"/>`;
  }
  if (p.largo === 'medio') {
    return `<path d="M48 104 Q52 54 120 46 Q188 54 192 104 Q168 70 120 66 Q72 70 48 104Z" fill="${c}"/>`;
  }
  // corto
  return `<path d="M48 104 Q52 54 120 46 Q188 54 192 104 Q168 70 120 66 Q72 70 48 104Z" fill="${c}"/>
    <path d="M82 58 Q104 48 120 48 Q108 54 92 64Z" fill="${hl}" opacity="0.4"/>`;
}

// ── SVG: ojos ────────────────────────────────────────────────────────────────

function svgOjosAlegres(t) {
  return `
    <path d="M76 102 Q90 93 104 102" fill="none" stroke="${t.d}" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M136 102 Q150 93 164 102" fill="none" stroke="${t.d}" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M72 112 Q78 105 90 107 Q95 114 90 122 Q80 126 72 119Z" fill="white"/>
    <path d="M90 107 Q102 105 108 112 Q110 120 100 123 Q90 126 88 119Z" fill="white"/>
    <circle cx="90" cy="115" r="7.5" fill="${t.s}"/>
    <circle cx="90" cy="115" r="4.5" fill="${t.d}"/>
    <circle cx="93" cy="112" r="2" fill="white"/>
    <path d="M136 112 Q142 105 154 107 Q159 114 154 122 Q144 126 136 119Z" fill="white"/>
    <path d="M154 107 Q166 105 172 112 Q174 120 164 123 Q154 126 152 119Z" fill="white"/>
    <circle cx="154" cy="115" r="7.5" fill="${t.s}"/>
    <circle cx="154" cy="115" r="4.5" fill="${t.d}"/>
    <circle cx="157" cy="112" r="2" fill="white"/>
    <path d="M74 120 Q83 130 94 121" fill="none" stroke="${t.s}" stroke-width="2" opacity="0.45"/>
    <path d="M140 120 Q149 130 158 121" fill="none" stroke="${t.s}" stroke-width="2" opacity="0.45"/>`;
}

function svgOjosTristes(t) {
  return `
    <path d="M76 104 Q90 112 104 104" fill="none" stroke="${t.d}" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M136 104 Q150 112 164 104" fill="none" stroke="${t.d}" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M72 116 Q78 109 90 111 Q95 118 90 125 Q80 129 72 122Z" fill="white"/>
    <path d="M90 111 Q102 109 108 116 Q110 124 100 127 Q90 129 88 122Z" fill="white"/>
    <circle cx="90" cy="119" r="7.5" fill="${t.s}"/>
    <circle cx="90" cy="119" r="4.5" fill="${t.d}"/>
    <circle cx="93" cy="116" r="2" fill="white"/>
    <path d="M136 116 Q142 109 154 111 Q159 118 154 125 Q144 129 136 122Z" fill="white"/>
    <path d="M154 111 Q166 109 172 116 Q174 124 164 127 Q154 129 152 122Z" fill="white"/>
    <circle cx="154" cy="119" r="7.5" fill="${t.s}"/>
    <circle cx="154" cy="119" r="4.5" fill="${t.d}"/>
    <circle cx="157" cy="116" r="2" fill="white"/>
    <line x1="78" y1="107" x2="85" y2="113" stroke="${t.d}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="164" y1="107" x2="157" y2="113" stroke="${t.d}" stroke-width="2.5" stroke-linecap="round"/>`;
}

function svgOjosSorpresa(t) {
  return `
    <path d="M72 96 Q90 84 108 96" fill="none" stroke="${t.d}" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M132 96 Q150 84 168 96" fill="none" stroke="${t.d}" stroke-width="5.5" stroke-linecap="round"/>
    <ellipse cx="90" cy="116" rx="19" ry="17" fill="white"/>
    <circle cx="90" cy="116" r="10" fill="${t.s}"/>
    <circle cx="90" cy="116" r="6" fill="${t.d}"/>
    <circle cx="94" cy="111" r="2.5" fill="white"/>
    <ellipse cx="154" cy="116" rx="19" ry="17" fill="white"/>
    <circle cx="154" cy="116" r="10" fill="${t.s}"/>
    <circle cx="154" cy="116" r="6" fill="${t.d}"/>
    <circle cx="158" cy="111" r="2.5" fill="white"/>`;
}

function svgOjosDormidos(t) {
  return `
    <path d="M76 102 Q90 97 104 102" fill="none" stroke="${t.d}" stroke-width="5" stroke-linecap="round"/>
    <path d="M136 102 Q150 97 164 102" fill="none" stroke="${t.d}" stroke-width="5" stroke-linecap="round"/>
    <path d="M72 113 Q81 107 108 113 Q100 124 80 122Z" fill="white"/>
    <path d="M72 113 Q90 120 108 113" fill="none" stroke="${t.d}" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M136 113 Q145 107 172 113 Q164 124 144 122Z" fill="white"/>
    <path d="M136 113 Q154 120 172 113" fill="none" stroke="${t.d}" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="112" y1="97" x2="116" y2="91" stroke="${t.s}" stroke-width="2.5" opacity="0.6"/>
    <line x1="120" y1="95" x2="120" y2="89" stroke="${t.s}" stroke-width="2.5" opacity="0.6"/>
    <line x1="128" y1="97" x2="124" y2="91" stroke="${t.s}" stroke-width="2.5" opacity="0.6"/>`;
}

function svgOjosPorTipo(tipo, t) {
  switch (tipo) {
    case 'alegre':   return svgOjosAlegres(t);
    case 'triste':   return svgOjosTristes(t);
    case 'sorpresa': return svgOjosSorpresa(t);
    case 'dormido':  return svgOjosDormidos(t);
    default:         return svgOjosAlegres(t);
  }
}

// ── SVG: nariz ────────────────────────────────────────────────────────────────

function svgNarizAncha(t) {
  return `
    <path d="M107 150 Q102 164 100 172 Q110 180 120 178 Q130 180 140 172 Q138 164 133 150"
          fill="none" stroke="${t.s}" stroke-width="3.5" stroke-linecap="round"/>
    <ellipse cx="102" cy="174" rx="8" ry="5" fill="${t.s}" opacity="0.45"/>
    <ellipse cx="138" cy="174" rx="8" ry="5" fill="${t.s}" opacity="0.45"/>`;
}

function svgNarizFina(t) {
  return `
    <path d="M114 150 Q111 164 109 172 Q114 178 120 177 Q126 178 131 172 Q129 164 126 150"
          fill="none" stroke="${t.s}" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="110" cy="174" rx="5.5" ry="3.5" fill="${t.s}" opacity="0.38"/>
    <ellipse cx="130" cy="174" rx="5.5" ry="3.5" fill="${t.s}" opacity="0.38"/>`;
}

// ── SVG: boca ─────────────────────────────────────────────────────────────────

function svgBocaSonrisa(t) {
  return `
    <path d="M88 193 Q120 218 152 193" fill="${t.l}"/>
    <path d="M88 193 Q120 210 152 193" fill="white"/>
    <path d="M88 193 Q120 218 152 193" fill="none" stroke="${t.d}" stroke-width="3" stroke-linecap="round"/>
    <path d="M88 193 Q94 202 100 195" fill="${t.f}"/>
    <path d="M140 195 Q146 202 152 193" fill="${t.f}"/>
    <ellipse cx="82" cy="194" rx="7" ry="4.5" fill="${t.s}" opacity="0.35"/>
    <ellipse cx="158" cy="194" rx="7" ry="4.5" fill="${t.s}" opacity="0.35"/>`;
}

function svgBocaNeutral(t) {
  return `
    <path d="M92 196 Q120 204 148 196" fill="none" stroke="${t.l}" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M92 196 Q120 200 148 196" fill="none" stroke="${t.d}" stroke-width="2.5" stroke-linecap="round"/>`;
}

// ── SVG: accesorios ───────────────────────────────────────────────────────────

function svgBarba(t) {
  return `
    <path d="M70 204 Q76 232 120 242 Q164 232 170 204 Q148 222 120 224 Q92 222 70 204Z"
          fill="${t.s}" opacity="0.85"/>
    <path d="M76 208 Q84 230 120 238 Q156 230 164 208"
          fill="none" stroke="${t.d}" stroke-width="1.5" opacity="0.3"/>`;
}

function svgSombrero(color) {
  const hl = _lighten(color, 35);
  return `
    <rect x="82" y="14" width="76" height="34" rx="10" fill="${color}"/>
    <rect x="52" y="44" width="136" height="18" rx="5" fill="${color}"/>
    <rect x="82" y="40" width="76" height="8" rx="3" fill="${hl}" opacity="0.45"/>`;
}

function svgGafas() {
  return `
    <rect x="66" y="104" width="44" height="30" rx="13" fill="white" opacity="0.2"/>
    <rect x="66" y="104" width="44" height="30" rx="13" fill="none" stroke="#2A2A2A" stroke-width="3.5"/>
    <rect x="130" y="104" width="44" height="30" rx="13" fill="white" opacity="0.2"/>
    <rect x="130" y="104" width="44" height="30" rx="13" fill="none" stroke="#2A2A2A" stroke-width="3.5"/>
    <line x1="110" y1="119" x2="130" y2="119" stroke="#2A2A2A" stroke-width="3.5"/>
    <line x1="66" y1="119" x2="52" y2="115" stroke="#2A2A2A" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="174" y1="119" x2="188" y2="115" stroke="#2A2A2A" stroke-width="3.5" stroke-linecap="round"/>`;
}

function svgGafasTintado() {
  return `
    <rect x="66" y="104" width="44" height="30" rx="13" fill="#4090C8" opacity="0.45"/>
    <rect x="66" y="104" width="44" height="30" rx="13" fill="none" stroke="#1A5080" stroke-width="3.5"/>
    <rect x="130" y="104" width="44" height="30" rx="13" fill="#4090C8" opacity="0.45"/>
    <rect x="130" y="104" width="44" height="30" rx="13" fill="none" stroke="#1A5080" stroke-width="3.5"/>
    <line x1="110" y1="119" x2="130" y2="119" stroke="#1A5080" stroke-width="3.5"/>
    <line x1="66" y1="119" x2="52" y2="115" stroke="#1A5080" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="174" y1="119" x2="188" y2="115" stroke="#1A5080" stroke-width="3.5" stroke-linecap="round"/>`;
}

// ── Composición SVG ───────────────────────────────────────────────────────────

/**
 * Renderiza el SVG completo del personaje.
 * @param {object} personaje
 * @param {Set|null} soloZonas - si se pasa un Set, solo incluye esas zonas
 */
function svgComponerPersonaje(personaje, soloZonas) {
  const t = TONOS.find(p => p.id === personaje.piel);
  const p = PELOS.find(pp => pp.id === personaje.pelo);
  const inc = (z) => soloZonas === null || soloZonas === undefined || soloZonas.has(z);
  let svg = '';

  if (inc('pelo')) svg += svgPeloAtras(p);
  svg += svgBase(t);
  if (inc('nariz'))    svg += personaje.nariz  === 'ancha'   ? svgNarizAncha(t)  : svgNarizFina(t);
  if (inc('ojos'))     svg += svgOjosPorTipo(personaje.ojos, t);
  if (inc('boca'))     svg += personaje.boca   === 'sonrisa' ? svgBocaSonrisa(t) : svgBocaNeutral(t);
  if (inc('pelo'))     svg += svgPeloFrente(p);
  if (personaje.barba    && inc('barba'))    svg += svgBarba(t);
  if (personaje.gafas    && inc('gafas'))    svg += svgGafas();
  if (personaje.sombrero && inc('sombrero')) svg += svgSombrero(personaje.sombrero);

  return `<svg viewBox="0 0 240 280" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">${svg}</svg>`;
}

/** Renderiza el SVG de vista previa de una pieza individual. */
function svgPieza(pieza) {
  const vb = VIEWBOX_ZONA[pieza.zona];
  let cont = '';

  // Fondo de piel para zonas sensibles al tono
  if (['ojos','nariz','boca','barba'].includes(pieza.zona) && pieza.piel) {
    cont += `<rect x="0" y="0" width="240" height="280" fill="${pieza.piel.f}"/>`;
  }

  switch (pieza.zona) {
    case 'ojos':
      cont += svgOjosPorTipo(pieza.varOjos, pieza.piel);
      break;
    case 'nariz':
      cont += pieza.varNariz === 'ancha' ? svgNarizAncha(pieza.piel) : svgNarizFina(pieza.piel);
      break;
    case 'boca':
      cont += pieza.varBoca === 'sonrisa' ? svgBocaSonrisa(pieza.piel) : svgBocaNeutral(pieza.piel);
      break;
    case 'pelo': {
      const p = PELOS.find(pp => pp.id === pieza.varPelo);
      cont += svgPeloAtras(p);
      cont += `<ellipse cx="120" cy="132" rx="72" ry="90" fill="#C07840"/>`;
      cont += svgPeloFrente(p);
      break;
    }
    case 'barba':
      cont += `<rect x="0" y="0" width="240" height="280" fill="${pieza.piel.f}"/>`;
      cont += svgBarba(pieza.piel);
      break;
    case 'sombrero':
      cont += svgSombrero(pieza.varColor);
      break;
    case 'gafas':
      cont += pieza.varGafas === 'tintado' ? svgGafasTintado() : svgGafas();
      break;
  }

  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">${cont}</svg>`;
}

// ── CSS ───────────────────────────────────────────────────────────────────────

function inyectarEstilosUnaVez() {
  if (document.getElementById(ESTILOS_ID)) return;
  const link = document.createElement('link');
  link.id   = ESTILOS_ID;
  link.rel  = 'stylesheet';
  link.href = new URL('armaPersonaje.css', import.meta.url).href;
  document.head.appendChild(link);
}

// ── Construcción del DOM ──────────────────────────────────────────────────────

function construirDOM(plataforma) {
  const raiz = document.createElement('div');
  raiz.className = 'ap-app';

  // Cabecera
  const cab   = document.createElement('header');
  cab.className = 'ap-cabecera';
  const h1    = document.createElement('h1');
  h1.textContent = ((plataforma.icono || '') + ' ' + plataforma.nombre).trim();
  const instr = document.createElement('p');
  instr.className = 'ap-instrucciones';
  instr.textContent = plataforma.t('armaPersonaje.instrucciones');
  cab.append(h1, instr);

  // Marcador de ronda
  const marc = document.createElement('div');
  marc.className = 'ap-marcador';
  const rondaEl = document.createElement('span');
  rondaEl.className = 'ap-ronda';
  marc.appendChild(rondaEl);

  // Arena: modelo + ensamblaje
  const arena = document.createElement('div');
  arena.className = 'ap-arena';

  const cartaModelo = document.createElement('div');
  cartaModelo.className = 'ap-carta ap-modelo';
  const etiqMod = document.createElement('div');
  etiqMod.className = 'ap-etiqueta';
  etiqMod.textContent = plataforma.t('armaPersonaje.etiqueta_modelo');
  const svgMod = document.createElement('div');
  svgMod.className = 'ap-cara-svg';
  cartaModelo.append(etiqMod, svgMod);

  const cartaEnsam = document.createElement('div');
  cartaEnsam.className = 'ap-carta ap-ensamblaje';
  const etiqEns = document.createElement('div');
  etiqEns.className = 'ap-etiqueta';
  etiqEns.textContent = plataforma.t('armaPersonaje.etiqueta_tu_cara');
  const svgEns = document.createElement('div');
  svgEns.className = 'ap-cara-svg ap-cara-ensam';
  cartaEnsam.append(etiqEns, svgEns);

  arena.append(cartaModelo, cartaEnsam);

  // Banco de piezas
  const banco = document.createElement('div');
  banco.className = 'ap-banco';

  // Celebración overlay
  const overlay = document.createElement('div');
  overlay.className = 'ap-celebracion ap-oculto';
  const ovCont = document.createElement('div');
  ovCont.className = 'ap-celeb-contenido';
  const ovText = document.createElement('p');
  ovText.textContent = '⭐';
  const ovBtn = document.createElement('button');
  ovBtn.className = 'ap-btn-siguiente';
  ovBtn.textContent = plataforma.t('armaPersonaje.siguiente');
  ovBtn.addEventListener('click', siguienteRonda);
  ovCont.append(ovText, ovBtn);
  overlay.appendChild(ovCont);

  raiz.append(cab, marc, arena, banco, overlay);
  return raiz;
}

// ── Flujo del juego ───────────────────────────────────────────────────────────

function actualizarEnsam() {
  const { personaje, colocadas, raiz } = estado;
  const zonaSet = new Set(
    Object.entries(colocadas).filter(([, v]) => v).map(([k]) => k)
  );
  raiz.querySelector('.ap-cara-ensam').innerHTML = svgComponerPersonaje(personaje, zonaSet);
}

function pintarBanco() {
  const { plataforma, banco, colocadas, raiz } = estado;
  const contenedor = raiz.querySelector('.ap-banco');
  contenedor.innerHTML = '';

  banco.forEach(({ zona, piezas }) => {
    const grupo = document.createElement('div');
    grupo.className = 'ap-zona-grupo';
    grupo.dataset.zona = zona;

    const label = document.createElement('span');
    label.className = 'ap-zona-label';
    label.textContent = plataforma.t(`armaPersonaje.zona_${zona}`);
    grupo.appendChild(label);

    const piezasDiv = document.createElement('div');
    piezasDiv.className = 'ap-piezas';

    piezas.forEach(pieza => {
      const btn = document.createElement('button');
      btn.className = 'ap-pieza';
      if (colocadas[zona]) btn.classList.add('ap-usado');
      btn.innerHTML = svgPieza(pieza);
      btn.addEventListener('click', () => manejarClic(zona, pieza, btn));
      piezasDiv.appendChild(btn);
    });

    grupo.appendChild(piezasDiv);
    contenedor.appendChild(grupo);
  });
}

function pintarRonda() {
  const { plataforma, personaje, rondaActual, raiz } = estado;

  raiz.querySelector('.ap-ronda').textContent =
    plataforma.t('armaPersonaje.nivel', { n: rondaActual, total: TOTAL_RONDAS });

  raiz.querySelector('.ap-modelo .ap-cara-svg').innerHTML =
    svgComponerPersonaje(personaje, null);

  actualizarEnsam();
  pintarBanco();

  plataforma.tts.speak(plataforma.t('armaPersonaje.tts_enunciado'));
}

function manejarClic(zona, pieza, btnEl) {
  if (!estado || estado.bloqueado) return;
  if (estado.colocadas[zona]) return;

  if (esZonaCorrecta(estado.personaje, pieza)) {
    estado.colocadas[zona] = true;

    // Marcar todos los botones de la zona como usados
    estado.raiz.querySelectorAll(`.ap-zona-grupo[data-zona="${zona}"] .ap-pieza`)
      .forEach(b => b.classList.add('ap-usado'));

    actualizarEnsam();
    estado.plataforma.tts.speak(estado.plataforma.t('armaPersonaje.tts_correcto'));

    if (composicionCorrecta(estado.personaje, estado.colocadas)) {
      mostrarCelebracion();
    }
  } else {
    estado.bloqueado = true;
    btnEl.classList.add('ap-sacudida');
    estado.plataforma.tts.speak(estado.plataforma.t('armaPersonaje.tts_incorrecto'));

    estado.timeoutId = setTimeout(() => {
      if (!estado) return;
      btnEl.classList.remove('ap-sacudida');
      estado.bloqueado = false;
    }, 700);
  }
}

function mostrarCelebracion() {
  estado.bloqueado = true;
  estado.raiz.querySelector('.ap-celebracion').classList.remove('ap-oculto');
}

function siguienteRonda() {
  if (!estado) return;
  estado.raiz.querySelector('.ap-celebracion').classList.add('ap-oculto');
  estado.rondaActual++;

  if (estado.rondaActual > TOTAL_RONDAS) {
    estado.plataforma.mostrarRecompensa();
    return;
  }

  estado.personaje = generarPersonaje();
  estado.banco     = generarBancoPiezas(estado.personaje);
  estado.colocadas = {};
  estado.bloqueado = false;
  pintarRonda();
}

function iniciarPartida() {
  estado.rondaActual = 1;
  estado.personaje   = generarPersonaje();
  estado.banco       = generarBancoPiezas(estado.personaje);
  estado.colocadas   = {};
  estado.bloqueado   = false;
  pintarRonda();
}

// ── Montaje / desmontaje ──────────────────────────────────────────────────────

function montar(contenedor, plataforma) {
  inyectarEstilosUnaVez();
  contenedor.innerHTML = '';

  const raiz = construirDOM(plataforma);
  contenedor.appendChild(raiz);

  estado = {
    plataforma,
    raiz,
    personaje:   null,
    banco:       null,
    colocadas:   {},
    rondaActual: 1,
    bloqueado:   false,
    timeoutId:   null,
  };

  iniciarPartida();
}

function desmontar() {
  if (estado && estado.timeoutId) clearTimeout(estado.timeoutId);
  estado = null;
}

export default {
  id:       'arma-personaje',
  nombre:   'Arma la cara',
  icono:    '🧩',
  estante:  'CONCEPTOS',
  montar,
  desmontar,
};
