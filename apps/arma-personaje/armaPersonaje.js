// Pictosfera — mecánica: arma el fantasma.
//
// El niño ve un fantasma modelo (izquierda) y debe reconstruir el mismo
// en el panel de ensamblaje (derecha) eligiendo las piezas correctas.
//
// Generación procedural: 20 colores × 12 expresiones × 6 narices × 6 bocas.
// Zonas siempre presentes: ojos, nariz, boca (sin pelo ni accesorios).
// Validación inmediata: clic en pieza → correcto / incorrecto (shake).
// 10 fantasmas por partida; al terminar → plataforma.mostrarRecompensa().

const ESTILOS_ID   = 'arma-personaje-estilos';
const TOTAL_RONDAS = 10;
const IRIS_COLOR   = '#2E8ECC';
const DARK_COLOR   = '#111111';

let estado = null;

// ── Colores de fantasma ───────────────────────────────────────────────────────
// fill=color principal, sombra=color oscurecido, brillo=color aclarado

const COLORES_FANTASMA = [
  { id: 'rojo',     fill: '#E83030', sombra: '#A81818', brillo: '#FF7070' },
  { id: 'azul',     fill: '#2850D0', sombra: '#1030A8', brillo: '#6080F0' },
  { id: 'amarillo', fill: '#F0C020', sombra: '#C08800', brillo: '#FFE060' },
  { id: 'verde',    fill: '#28A840', sombra: '#107828', brillo: '#50D070' },
  { id: 'naranja',  fill: '#F07820', sombra: '#C05000', brillo: '#FFAA50' },
  { id: 'morado',   fill: '#7830C0', sombra: '#501898', brillo: '#A060E8' },
  { id: 'rosa',     fill: '#F060A8', sombra: '#C03880', brillo: '#FF90CC' },
  { id: 'marron',   fill: '#9A5520', sombra: '#6A3510', brillo: '#C07840' },
  { id: 'negro',    fill: '#383838', sombra: '#181818', brillo: '#686868' },
  { id: 'blanco',   fill: '#F0F0F0', sombra: '#C0C0C0', brillo: '#FFFFFF' },
  { id: 'gris',     fill: '#909090', sombra: '#606060', brillo: '#C0C0C0' },
  { id: 'celeste',  fill: '#38B8F0', sombra: '#1080C0', brillo: '#80D8FF' },
  { id: 'turquesa', fill: '#20C8A8', sombra: '#009878', brillo: '#50F0D0' },
  { id: 'beige',    fill: '#E8D8A0', sombra: '#C0A868', brillo: '#FFF8D8' },
  { id: 'lila',     fill: '#C898E8', sombra: '#9868C0', brillo: '#E8C0FF' },
  { id: 'violeta',  fill: '#9020C0', sombra: '#600090', brillo: '#C050F0' },
  { id: 'fucsia',   fill: '#E81888', sombra: '#B00060', brillo: '#FF50B8' },
  { id: 'dorado',   fill: '#D4A800', sombra: '#A07800', brillo: '#FFD840' },
  { id: 'plateado', fill: '#B0B8C8', sombra: '#8090A8', brillo: '#D8E0F0' },
  { id: 'crema',    fill: '#FFF0D0', sombra: '#D8C090', brillo: '#FFFFF8' },
];

const OJOS_OPTS  = [
  'alegre', 'triste', 'sorpresa', 'dormido',
  'enfadado', 'guino', 'llanto', 'enamorado',
  'estrella', 'verde', 'marron', 'rojo',
];
const NARIZ_OPTS = ['redonda', 'respingona', 'pequena', 'grande', 'boton', 'lineas'];
const BOCA_OPTS  = ['sonrisa', 'puchero', 'carcajada', 'sorpresa_o', 'enfadada', 'lengua'];

// Recortes de viewBox para las vistas de pieza (relación 3:2)
const VIEWBOX_ZONA = {
  ojos:  '44 75 152 101',
  nariz: '84 140 72 48',
  boca:  '75 162 90 60',
};

// ── Lógica pura (testable sin DOM) ────────────────────────────────────────────

/** Genera un personaje fantasma de forma procedural. */
export function generarPersonaje() {
  const color = COLORES_FANTASMA[Math.floor(Math.random() * COLORES_FANTASMA.length)].id;
  const ojos  = OJOS_OPTS[Math.floor(Math.random() * OJOS_OPTS.length)];
  const nariz = NARIZ_OPTS[Math.floor(Math.random() * NARIZ_OPTS.length)];
  const boca  = BOCA_OPTS[Math.floor(Math.random() * BOCA_OPTS.length)];
  return { color, ojos, nariz, boca };
}

/** Lista de zonas que debe completar el niño para este personaje. */
export function zonasRequeridas(_personaje) {
  return ['ojos', 'nariz', 'boca'];
}

/** True si la pieza corresponde a la zona correcta del personaje. */
export function esZonaCorrecta(_personaje, pieza) {
  return pieza.correcto === true;
}

/** True si todas las zonas requeridas están correctamente colocadas. */
export function composicionCorrecta(personaje, colocadas) {
  return zonasRequeridas(personaje).every(z => colocadas[z] === true);
}

/** Genera el banco: 2 piezas por zona (correcta + distractor de forma distinta). */
export function generarBancoPiezas(personaje) {
  const c = COLORES_FANTASMA.find(col => col.id === personaje.color);
  const zonas = [];

  // Ojos: distractor = expresión diferente
  const ojosOtros = OJOS_OPTS.filter(o => o !== personaje.ojos);
  const ojosD = ojosOtros[Math.floor(Math.random() * ojosOtros.length)];
  zonas.push({ zona: 'ojos', piezas: _barajar([
    { id: `oj-${personaje.ojos}-${c.id}`, correcto: true,  zona: 'ojos', varOjos: personaje.ojos, color: c },
    { id: `oj-${ojosD}-${c.id}`,          correcto: false, zona: 'ojos', varOjos: ojosD,          color: c },
  ])});

  // Nariz: distractor = forma diferente
  const narizD = NARIZ_OPTS.find(n => n !== personaje.nariz);
  zonas.push({ zona: 'nariz', piezas: _barajar([
    { id: `nz-${personaje.nariz}-${c.id}`, correcto: true,  zona: 'nariz', varNariz: personaje.nariz, color: c },
    { id: `nz-${narizD}-${c.id}`,          correcto: false, zona: 'nariz', varNariz: narizD,          color: c },
  ])});

  // Boca: distractor = forma diferente
  const bocaD = BOCA_OPTS.find(b => b !== personaje.boca);
  zonas.push({ zona: 'boca', piezas: _barajar([
    { id: `bk-${personaje.boca}-${c.id}`, correcto: true,  zona: 'boca', varBoca: personaje.boca, color: c },
    { id: `bk-${bocaD}-${c.id}`,          correcto: false, zona: 'boca', varBoca: bocaD,          color: c },
  ])});

  return zonas;
}

// ── Helpers privados ──────────────────────────────────────────────────────────

function _barajar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── SVG: cuerpo del fantasma ──────────────────────────────────────────────────
// ViewBox fijo: 0 0 240 280
// Forma: cúpula redondeada arriba + 4 protuberancias abajo (estilo Pac-Man).

function svgCuerpoFantasma(c) {
  return `
    <path d="M 38 192 L 38 104 C 38 22 202 22 202 104 L 202 192
             Q 202 228 182 228 Q 161 228 161 192
             Q 161 228 141 228 Q 120 228 120 192
             Q 120 228 100 228 Q 79 228 79 192
             Q 79 228 59 228 Q 38 228 38 192 Z"
          fill="${c.fill}" stroke="${c.sombra}" stroke-width="3" stroke-linejoin="round"/>
    <ellipse cx="155" cy="70" rx="38" ry="26" fill="white" opacity="0.18"/>
  `;
}

// ── SVG: globos oculares blancos (siempre visibles) ───────────────────────────

function svgOjosBlancos() {
  return `
    <ellipse cx="88"  cy="120" rx="36" ry="32" fill="white"/>
    <ellipse cx="152" cy="120" rx="36" ry="32" fill="white"/>
  `;
}

// ── SVG: expresiones oculares ─────────────────────────────────────────────────

function svgOjosAlegres() {
  return `
    <circle cx="88"  cy="120" r="21" fill="${IRIS_COLOR}"/>
    <circle cx="152" cy="120" r="21" fill="${IRIS_COLOR}"/>
    <circle cx="88"  cy="120" r="12" fill="${DARK_COLOR}"/>
    <circle cx="152" cy="120" r="12" fill="${DARK_COLOR}"/>
    <circle cx="82"  cy="113" r="5"  fill="white"/>
    <circle cx="146" cy="113" r="5"  fill="white"/>
    <path d="M 55 95 Q 88 82 121 95"   fill="none" stroke="${DARK_COLOR}" stroke-width="6" stroke-linecap="round"/>
    <path d="M 119 95 Q 152 82 185 95" fill="none" stroke="${DARK_COLOR}" stroke-width="6" stroke-linecap="round"/>
  `;
}

function svgOjosTristes() {
  return `
    <circle cx="88"  cy="124" r="21" fill="${IRIS_COLOR}"/>
    <circle cx="152" cy="124" r="21" fill="${IRIS_COLOR}"/>
    <circle cx="88"  cy="124" r="12" fill="${DARK_COLOR}"/>
    <circle cx="152" cy="124" r="12" fill="${DARK_COLOR}"/>
    <circle cx="82"  cy="117" r="5"  fill="white"/>
    <circle cx="146" cy="117" r="5"  fill="white"/>
    <path d="M 56 96 Q 73 108 96 98"    fill="none" stroke="${DARK_COLOR}" stroke-width="6" stroke-linecap="round"/>
    <path d="M 144 98 Q 167 108 184 96" fill="none" stroke="${DARK_COLOR}" stroke-width="6" stroke-linecap="round"/>
  `;
}

function svgOjosSorpresa() {
  return `
    <circle cx="88"  cy="118" r="25" fill="${IRIS_COLOR}"/>
    <circle cx="152" cy="118" r="25" fill="${IRIS_COLOR}"/>
    <circle cx="88"  cy="118" r="16" fill="${DARK_COLOR}"/>
    <circle cx="152" cy="118" r="16" fill="${DARK_COLOR}"/>
    <circle cx="80"  cy="109" r="6"  fill="white"/>
    <circle cx="144" cy="109" r="6"  fill="white"/>
    <path d="M 50 88 Q 88 72 126 88"   fill="none" stroke="${DARK_COLOR}" stroke-width="6" stroke-linecap="round"/>
    <path d="M 114 88 Q 152 72 190 88" fill="none" stroke="${DARK_COLOR}" stroke-width="6" stroke-linecap="round"/>
  `;
}

function svgOjosDormidos(ghostFill) {
  return `
    <circle cx="88"  cy="126" r="21" fill="${IRIS_COLOR}"/>
    <circle cx="152" cy="126" r="21" fill="${IRIS_COLOR}"/>
    <circle cx="88"  cy="126" r="12" fill="${DARK_COLOR}"/>
    <circle cx="152" cy="126" r="12" fill="${DARK_COLOR}"/>
    <circle cx="82"  cy="119" r="5"  fill="white"/>
    <circle cx="146" cy="119" r="5"  fill="white"/>
    <path d="M 52 120 Q 88 101 124 120 L 124 88 Q 88 88 52 88 Z"   fill="${ghostFill}"/>
    <path d="M 116 120 Q 152 101 188 120 L 188 88 Q 152 88 116 88 Z" fill="${ghostFill}"/>
    <path d="M 52 120 Q 88 101 124 120"   fill="none" stroke="${DARK_COLOR}" stroke-width="4" stroke-linecap="round"/>
    <path d="M 116 120 Q 152 101 188 120" fill="none" stroke="${DARK_COLOR}" stroke-width="4" stroke-linecap="round"/>
  `;
}

function svgOjosEnfadados() {
  return `
    <circle cx="88"  cy="122" r="21" fill="${IRIS_COLOR}"/>
    <circle cx="152" cy="122" r="21" fill="${IRIS_COLOR}"/>
    <circle cx="88"  cy="122" r="12" fill="${DARK_COLOR}"/>
    <circle cx="152" cy="122" r="12" fill="${DARK_COLOR}"/>
    <circle cx="82"  cy="115" r="5"  fill="white"/>
    <circle cx="146" cy="115" r="5"  fill="white"/>
    <path d="M 54 88 Q 73 103 100 96"   fill="none" stroke="${DARK_COLOR}" stroke-width="6" stroke-linecap="round"/>
    <path d="M 140 96 Q 167 103 186 88" fill="none" stroke="${DARK_COLOR}" stroke-width="6" stroke-linecap="round"/>
  `;
}

function svgOjosGuino(ghostFill) {
  return `
    <circle cx="88"  cy="120" r="21" fill="${IRIS_COLOR}"/>
    <circle cx="88"  cy="120" r="12" fill="${DARK_COLOR}"/>
    <circle cx="82"  cy="113" r="5"  fill="white"/>
    <path d="M 55 95 Q 88 82 121 95"   fill="none" stroke="${DARK_COLOR}" stroke-width="6" stroke-linecap="round"/>
    <path d="M 116 120 Q 152 101 188 120 L 188 88 Q 152 88 116 88 Z" fill="${ghostFill}"/>
    <path d="M 116 120 Q 152 101 188 120" fill="none" stroke="${DARK_COLOR}" stroke-width="4" stroke-linecap="round"/>
    <path d="M 119 95 Q 152 82 185 95" fill="none" stroke="${DARK_COLOR}" stroke-width="6" stroke-linecap="round"/>
  `;
}

function svgOjosLlanto() {
  return `
    <circle cx="88"  cy="124" r="21" fill="${IRIS_COLOR}"/>
    <circle cx="152" cy="124" r="21" fill="${IRIS_COLOR}"/>
    <circle cx="88"  cy="124" r="12" fill="${DARK_COLOR}"/>
    <circle cx="152" cy="124" r="12" fill="${DARK_COLOR}"/>
    <circle cx="82"  cy="117" r="5"  fill="white"/>
    <circle cx="146" cy="117" r="5"  fill="white"/>
    <path d="M 56 96 Q 73 108 96 98"    fill="none" stroke="${DARK_COLOR}" stroke-width="6" stroke-linecap="round"/>
    <path d="M 144 98 Q 167 108 184 96" fill="none" stroke="${DARK_COLOR}" stroke-width="6" stroke-linecap="round"/>
    <ellipse cx="88"  cy="152" rx="5" ry="9" fill="#88CCFF" opacity="0.9"/>
    <ellipse cx="152" cy="152" rx="5" ry="9" fill="#88CCFF" opacity="0.9"/>
  `;
}

function svgOjosEnamorados() {
  return `
    <path d="M 88 128 Q 70 116 70 107 Q 70 95 80 95 Q 84 95 88 103 Q 92 95 96 95 Q 106 95 106 107 Q 106 116 88 128 Z"
          fill="#E83030"/>
    <path d="M 152 128 Q 134 116 134 107 Q 134 95 144 95 Q 148 95 152 103 Q 156 95 160 95 Q 170 95 170 107 Q 170 116 152 128 Z"
          fill="#E83030"/>
    <path d="M 55 95 Q 88 82 121 95"   fill="none" stroke="${DARK_COLOR}" stroke-width="6" stroke-linecap="round"/>
    <path d="M 119 95 Q 152 82 185 95" fill="none" stroke="${DARK_COLOR}" stroke-width="6" stroke-linecap="round"/>
  `;
}

function svgOjosEstrellas() {
  return `
    <path d="M 88 102 L 92 112 L 106 120 L 92 128 L 88 138 L 84 128 L 70 120 L 84 112 Z"
          fill="#FFD700" stroke="${DARK_COLOR}" stroke-width="1.5"/>
    <path d="M 152 102 L 156 112 L 170 120 L 156 128 L 152 138 L 148 128 L 134 120 L 148 112 Z"
          fill="#FFD700" stroke="${DARK_COLOR}" stroke-width="1.5"/>
    <path d="M 55 95 Q 88 82 121 95"   fill="none" stroke="${DARK_COLOR}" stroke-width="6" stroke-linecap="round"/>
    <path d="M 119 95 Q 152 82 185 95" fill="none" stroke="${DARK_COLOR}" stroke-width="6" stroke-linecap="round"/>
  `;
}

function svgOjosVerdes() {
  return `
    <circle cx="88"  cy="120" r="21" fill="#28A848"/>
    <circle cx="152" cy="120" r="21" fill="#28A848"/>
    <circle cx="88"  cy="120" r="12" fill="${DARK_COLOR}"/>
    <circle cx="152" cy="120" r="12" fill="${DARK_COLOR}"/>
    <circle cx="82"  cy="113" r="5"  fill="white"/>
    <circle cx="146" cy="113" r="5"  fill="white"/>
    <path d="M 55 95 Q 88 82 121 95"   fill="none" stroke="${DARK_COLOR}" stroke-width="6" stroke-linecap="round"/>
    <path d="M 119 95 Q 152 82 185 95" fill="none" stroke="${DARK_COLOR}" stroke-width="6" stroke-linecap="round"/>
  `;
}

function svgOjosMarrones() {
  return `
    <circle cx="88"  cy="120" r="21" fill="#8B4513"/>
    <circle cx="152" cy="120" r="21" fill="#8B4513"/>
    <circle cx="88"  cy="120" r="12" fill="${DARK_COLOR}"/>
    <circle cx="152" cy="120" r="12" fill="${DARK_COLOR}"/>
    <circle cx="82"  cy="113" r="5"  fill="white"/>
    <circle cx="146" cy="113" r="5"  fill="white"/>
    <path d="M 55 95 Q 88 82 121 95"   fill="none" stroke="${DARK_COLOR}" stroke-width="6" stroke-linecap="round"/>
    <path d="M 119 95 Q 152 82 185 95" fill="none" stroke="${DARK_COLOR}" stroke-width="6" stroke-linecap="round"/>
  `;
}

function svgOjosRojos() {
  return `
    <circle cx="88"  cy="120" r="21" fill="#CC0000"/>
    <circle cx="152" cy="120" r="21" fill="#CC0000"/>
    <circle cx="88"  cy="120" r="12" fill="${DARK_COLOR}"/>
    <circle cx="152" cy="120" r="12" fill="${DARK_COLOR}"/>
    <circle cx="82"  cy="113" r="5"  fill="#FF6060" opacity="0.7"/>
    <circle cx="146" cy="113" r="5"  fill="#FF6060" opacity="0.7"/>
    <path d="M 54 88 Q 73 103 100 96"   fill="none" stroke="${DARK_COLOR}" stroke-width="6" stroke-linecap="round"/>
    <path d="M 140 96 Q 167 103 186 88" fill="none" stroke="${DARK_COLOR}" stroke-width="6" stroke-linecap="round"/>
  `;
}

function svgOjosPorTipo(tipo, ghostFill) {
  switch (tipo) {
    case 'alegre':   return svgOjosAlegres();
    case 'triste':   return svgOjosTristes();
    case 'sorpresa': return svgOjosSorpresa();
    case 'dormido':  return svgOjosDormidos(ghostFill);
    case 'enfadado': return svgOjosEnfadados();
    case 'guino':    return svgOjosGuino(ghostFill);
    case 'llanto':   return svgOjosLlanto();
    case 'enamorado': return svgOjosEnamorados();
    case 'estrella': return svgOjosEstrellas();
    case 'verde':    return svgOjosVerdes();
    case 'marron':   return svgOjosMarrones();
    case 'rojo':     return svgOjosRojos();
    default:         return svgOjosAlegres();
  }
}

// ── SVG: nariz ────────────────────────────────────────────────────────────────

function svgNarizRedonda(c) {
  return `
    <circle cx="120" cy="163" r="11" fill="${c.sombra}"/>
    <circle cx="116" cy="160" r="3.5" fill="${c.brillo}" opacity="0.45"/>
  `;
}

function svgNarizRespingona(c) {
  return `
    <path d="M 106 168 Q 120 155 134 168 Q 128 178 120 177 Q 112 178 106 168 Z"
          fill="${c.sombra}"/>
    <ellipse cx="110" cy="170" rx="4" ry="3" fill="${DARK_COLOR}" opacity="0.45"/>
    <ellipse cx="130" cy="170" rx="4" ry="3" fill="${DARK_COLOR}" opacity="0.45"/>
    <circle cx="109" cy="169" r="1.5" fill="white" opacity="0.5"/>
    <circle cx="129" cy="169" r="1.5" fill="white" opacity="0.5"/>
  `;
}

function svgNarizPequena(c) {
  return `
    <circle cx="120" cy="162" r="6" fill="${c.sombra}"/>
    <circle cx="117" cy="160" r="2" fill="${c.brillo}" opacity="0.55"/>
  `;
}

function svgNarizGrande(c) {
  return `
    <ellipse cx="120" cy="165" rx="19" ry="14" fill="${c.sombra}"/>
    <ellipse cx="113" cy="161" rx="5" ry="4" fill="${c.brillo}" opacity="0.45"/>
    <ellipse cx="108" cy="168" rx="5" ry="4" fill="${DARK_COLOR}" opacity="0.35"/>
    <ellipse cx="132" cy="168" rx="5" ry="4" fill="${DARK_COLOR}" opacity="0.35"/>
  `;
}

function svgNarizBoton(c) {
  return `
    <circle cx="120" cy="162" r="10" fill="${c.sombra}"/>
    <circle cx="115" cy="158" r="4"  fill="${c.brillo}" opacity="0.5"/>
    <circle cx="111" cy="165" r="3"  fill="${DARK_COLOR}" opacity="0.4"/>
    <circle cx="129" cy="165" r="3"  fill="${DARK_COLOR}" opacity="0.4"/>
  `;
}

function svgNarizLineas(c) {
  return `
    <ellipse cx="107" cy="165" rx="7" ry="5" fill="${c.sombra}"/>
    <ellipse cx="133" cy="165" rx="7" ry="5" fill="${c.sombra}"/>
    <circle cx="105"  cy="164" r="1.5" fill="white" opacity="0.4"/>
    <circle cx="131"  cy="164" r="1.5" fill="white" opacity="0.4"/>
  `;
}

function svgNarizPorTipo(tipo, c) {
  switch (tipo) {
    case 'redonda':    return svgNarizRedonda(c);
    case 'respingona': return svgNarizRespingona(c);
    case 'pequena':    return svgNarizPequena(c);
    case 'grande':     return svgNarizGrande(c);
    case 'boton':      return svgNarizBoton(c);
    case 'lineas':     return svgNarizLineas(c);
    default:           return svgNarizRedonda(c);
  }
}

// ── SVG: boca ─────────────────────────────────────────────────────────────────

function svgBocaSonrisa(c) {
  return `
    <path d="M 82 186 Q 120 218 158 186"
          fill="${c.sombra}" stroke="${DARK_COLOR}" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M 82 186 Q 120 206 158 186" fill="white"/>
  `;
}

function svgBocaPuchero(c) {
  return `
    <path d="M 86 198 Q 120 180 154 198"
          fill="${c.sombra}" stroke="${DARK_COLOR}" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M 86 198 Q 120 190 154 198" fill="${c.fill}"/>
  `;
}

function svgBocaCarcajada(c) {
  // Boca muy abierta; interior oscuro con dientes blancos arriba
  return `
    <path d="M 78 183 Q 120 232 162 183 Q 120 200 78 183 Z"
          fill="${DARK_COLOR}" stroke="${DARK_COLOR}" stroke-width="3" stroke-linecap="round"/>
    <path d="M 78 183 Q 120 200 162 183" fill="white"/>
    <path d="M 78 183 Q 120 232 162 183" fill="none" stroke="${DARK_COLOR}" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="100" y1="183" x2="99"  y2="195" stroke="${DARK_COLOR}" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="112" y1="183" x2="111" y2="198" stroke="${DARK_COLOR}" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="128" y1="183" x2="129" y2="198" stroke="${DARK_COLOR}" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="140" y1="183" x2="141" y2="195" stroke="${DARK_COLOR}" stroke-width="1.5" stroke-linecap="round"/>
  `;
}

function svgBocaSorpresaO(c) {
  return `
    <ellipse cx="120" cy="198" rx="21" ry="17" fill="${c.sombra}" stroke="${DARK_COLOR}" stroke-width="3"/>
    <ellipse cx="120" cy="198" rx="13" ry="10" fill="${DARK_COLOR}"/>
  `;
}

function svgBocaEnfadada(c) {
  return `
    <path d="M 87 200 Q 120 183 153 200"
          fill="${c.sombra}" stroke="${DARK_COLOR}" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M 87 200 Q 120 192 153 200" fill="${c.fill}"/>
    <path d="M 87 200 Q 104 208 120 206 Q 136 208 153 200" fill="none" stroke="${DARK_COLOR}" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
  `;
}

function svgBocaLengua(c) {
  return `
    <path d="M 82 186 Q 120 220 158 186"
          fill="${c.sombra}" stroke="${DARK_COLOR}" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M 82 186 Q 120 206 158 186" fill="${DARK_COLOR}"/>
    <ellipse cx="120" cy="210" rx="15" ry="12" fill="#E8305A"/>
    <path d="M 105 210 Q 120 222 135 210" fill="#B8103A" stroke="none"/>
  `;
}

function svgBocaPorTipo(tipo, c) {
  switch (tipo) {
    case 'sonrisa':    return svgBocaSonrisa(c);
    case 'puchero':    return svgBocaPuchero(c);
    case 'carcajada':  return svgBocaCarcajada(c);
    case 'sorpresa_o': return svgBocaSorpresaO(c);
    case 'enfadada':   return svgBocaEnfadada(c);
    case 'lengua':     return svgBocaLengua(c);
    default:           return svgBocaSonrisa(c);
  }
}

// ── Composición SVG ───────────────────────────────────────────────────────────

/**
 * Renderiza el SVG completo del personaje fantasma.
 * @param {object}   personaje
 * @param {Set|null} soloZonas  null = modelo completo; Set = zonas ya colocadas
 */
function svgComponerPersonaje(personaje, soloZonas) {
  const c   = COLORES_FANTASMA.find(col => col.id === personaje.color);
  const inc = z => soloZonas === null || soloZonas === undefined || soloZonas.has(z);

  let svg = svgCuerpoFantasma(c);
  svg += svgOjosBlancos();
  if (inc('ojos'))  svg += svgOjosPorTipo(personaje.ojos, c.fill);
  if (inc('nariz')) svg += svgNarizPorTipo(personaje.nariz, c);
  if (inc('boca'))  svg += svgBocaPorTipo(personaje.boca, c);

  return `<svg viewBox="0 0 240 280" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">${svg}</svg>`;
}

/** Renderiza el SVG de vista previa de una pieza individual. */
function svgPieza(pieza) {
  const vb = VIEWBOX_ZONA[pieza.zona];
  const c  = pieza.color;
  let cont = `<rect x="0" y="0" width="240" height="280" fill="${c.fill}"/>`;

  switch (pieza.zona) {
    case 'ojos':
      cont += svgOjosBlancos();
      cont += svgOjosPorTipo(pieza.varOjos, c.fill);
      break;
    case 'nariz':
      cont += svgNarizPorTipo(pieza.varNariz, c);
      break;
    case 'boca':
      cont += svgBocaPorTipo(pieza.varBoca, c);
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
  const marc    = document.createElement('div');
  marc.className = 'ap-ronda';

  // Panel principal: modelo | ensamblaje
  const panelEl = document.createElement('div');
  panelEl.className = 'ap-panel';

  // Modelo
  const modeloEl  = document.createElement('div');
  modeloEl.className = 'ap-modelo ap-cara';
  const modeloLbl = document.createElement('span');
  modeloLbl.className = 'ap-cara-label';
  modeloLbl.textContent = plataforma.t('armaPersonaje.etiqueta_modelo');
  const modeloSvg = document.createElement('div');
  modeloSvg.className = 'ap-cara-svg';
  modeloEl.append(modeloLbl, modeloSvg);

  // Ensamblaje
  const ensamEl  = document.createElement('div');
  ensamEl.className = 'ap-ensam ap-cara';
  const ensamLbl = document.createElement('span');
  ensamLbl.className = 'ap-cara-label';
  ensamLbl.textContent = plataforma.t('armaPersonaje.etiqueta_tu_cara');
  const ensamSvg = document.createElement('div');
  ensamSvg.className = 'ap-cara-svg';
  ensamEl.append(ensamLbl, ensamSvg);

  panelEl.append(modeloEl, ensamEl);

  // Banco de piezas (se rellena dinámicamente)
  const bancoEl = document.createElement('div');
  bancoEl.className = 'ap-banco';

  // Celebración (oculta hasta que acierte)
  const celEl  = document.createElement('div');
  celEl.className = 'ap-celebracion ap-oculto';
  const celBtn = document.createElement('button');
  celBtn.className = 'ap-btn-siguiente';
  celBtn.textContent = plataforma.t('armaPersonaje.siguiente');
  celEl.appendChild(celBtn);

  raiz.append(cab, marc, panelEl, bancoEl, celEl);
  return raiz;
}

// ── Banco y ensamblaje dinámicos ──────────────────────────────────────────────

function pintarBanco(contenedor) {
  const { raiz, personaje, colocadas, plataforma } = estado;
  const bancoEl = raiz.querySelector('.ap-banco');
  bancoEl.innerHTML = '';

  const zonas = generarBancoPiezas(personaje);

  zonas.forEach(({ zona, piezas }) => {
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
    bancoEl.appendChild(grupo);
  });
}

function actualizarEnsam() {
  const { raiz, personaje, colocadas } = estado;
  const ensamSvg = raiz.querySelector('.ap-ensam .ap-cara-svg');
  const zonasPuestas = new Set(Object.keys(colocadas).filter(z => colocadas[z]));
  ensamSvg.innerHTML = svgComponerPersonaje(personaje, zonasPuestas);
}

function pintarRonda() {
  const { plataforma, personaje, rondaActual, raiz } = estado;

  raiz.querySelector('.ap-ronda').textContent =
    plataforma.t('armaPersonaje.nivel', { n: rondaActual, total: TOTAL_RONDAS });

  raiz.querySelector('.ap-modelo .ap-cara-svg').innerHTML =
    svgComponerPersonaje(personaje, null);

  actualizarEnsam();
  pintarBanco();
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
    estado.plataforma.mostrarRecompensa({ onContinuar: () => iniciarPartida() });
    return;
  }
  estado.personaje  = generarPersonaje();
  estado.colocadas  = {};
  estado.bloqueado  = false;
  pintarRonda();
}

// ── Punto de entrada ──────────────────────────────────────────────────────────

function montar(contenedor, plataforma) {
  if (estado) desmontar();

  inyectarEstilosUnaVez();

  const raiz = construirDOM(plataforma);
  contenedor.appendChild(raiz);

  estado = {
    plataforma,
    raiz,
    personaje:   generarPersonaje(),
    rondaActual: 1,
    colocadas:   {},
    bloqueado:   false,
    timeoutId:   null,
  };

  // Botón "siguiente"
  raiz.querySelector('.ap-btn-siguiente').addEventListener('click', siguienteRonda);

  pintarRonda();
}

function desmontar() {
  if (estado && estado.timeoutId) clearTimeout(estado.timeoutId);
  estado = null;
}

function iniciarPartida() {
  if (!estado) return;
  estado.rondaActual = 1;
  estado.personaje   = generarPersonaje();
  estado.colocadas   = {};
  estado.bloqueado   = false;
  estado.raiz.querySelector('.ap-celebracion').classList.add('ap-oculto');
  pintarRonda();
}

export default { id: 'arma-personaje', icono: '👻', montar, desmontar };
