// Pictosfera — núcleo: catálogo de ajustes de juego (compartido).
//
// Qué ajustes existen, qué mecánica usa cada uno, y cómo se pinta el
// control de cada uno. Este módulo no guarda nada por sí mismo: es
// solo el "catálogo", a propósito desacoplado de dónde vive el valor
// (ajustesJuego.js + localStorage para la configuración directa de un
// juego desde Ajustes, o un objeto en memoria propio de una instancia
// dentro de una ruta guiada). Quien use este catálogo decide de dónde
// lee y dónde escribe cada valor.

import { t } from './i18n.js';
import * as sounds from './sounds.js';

// Qué ajustes tiene sentido mostrar para cada mecánica: cada juego solo
// ofrece (y el adulto solo ve) los que su propia mecánica usa de
// verdad. La lista de ids se contrasta contra DEFINICIONES_AJUSTE más
// abajo. Si una mecánica nueva se añade sin entrada aquí, no se le
// ofrece ningún ajuste (mejor eso que mostrar controles que no hacen
// nada).
export const CAMPOS_POR_MECANICA = {
  memoria: ['mayuscula', 'soloTexto'],
  'arrastra-palabra': ['mostrar', 'mayuscula', 'soloTexto', 'pulsadorTts'],
  'teclea-palabra': [
    'mostrar', 'mayuscula', 'resaltarTeclado',
    'tildesAutomaticas', 'mayusculasAutomaticas', 'puntuacionAutomatica', 'espaciosAutomaticos',
    'soloTexto', 'pulsadorTts'
  ],
  'ordena-secuencia': ['mayuscula', 'soloTexto'],
  'escribe-letra': ['mostrar', 'mayuscula', 'tildesAutomaticas', 'soloTexto', 'pulsadorTts', 'letraPunteada', 'toleranciaTrazo'],
  'bingo-lectura': ['mostrar', 'mayuscula', 'soloTexto', 'pulsadorTts'],
  'ruleta-letras': ['mayuscula', 'dificultadRuleta'],
  'rosco-pictogramas': [],
  'arrastra-numero': [],
  'escribe-numero': ['letraPunteada', 'toleranciaTrazo'],
  'suma-resultado': [],
  'dedos-pictogramas': [],
  'dedos-numero': [],
  'completa-suma': ['letraPunteada', 'toleranciaTrazo'],
  'arrastra-suma': [],
  'resta-resultado': [],
  'completa-resta': ['letraPunteada', 'toleranciaTrazo'],
  'arrastra-resta': [],
  'clasifica-categorias': ['mostrar', 'mayuscula', 'soloTexto', 'pulsadorTts'],
  'puzzle-pictograma-palabra': ['mayuscula'],
  'relaciona-pictograma-palabra': ['mostrar', 'mayuscula', 'soloTexto', 'pulsadorTts'],
  'me-gusta-no-me-gusta': ['mostrar', 'mayuscula', 'soloTexto'],
  'lista-compra': ['mayuscula', 'listaSoloTexto', 'estanteSoloImagen'],
  'reconoce-emociones': ['mayuscula', 'soloTexto'],
  'cuadricula-multiplicacion': []
};

// Catálogo de los 14 ajustes posibles: cómo se llaman sus get/set en
// ajustesJuego.js (solo lo usa quien configure un juego directamente
// desde Ajustes), qué texto los etiqueta, su valor de fábrica (lo usa
// quien necesite un punto de partida sin depender de ajustesJuego, p.
// ej. una instancia nueva dentro de una ruta) y, si son de tipo
// "select", qué opciones ofrecen. CAMPOS_POR_MECANICA decide cuáles de
// estos se pintan para el juego elegido.
export const DEFINICIONES_AJUSTE = [
  { id: 'mostrar', tipo: 'checkbox', etiqueta: 'ajustes.pistas_mostrar', getter: 'getMostrarPista', setter: 'setMostrarPista', porDefecto: true },
  { id: 'mayuscula', tipo: 'checkbox', etiqueta: 'ajustes.pistas_mayuscula', getter: 'getMayuscula', setter: 'setMayuscula', porDefecto: true },
  { id: 'resaltarTeclado', tipo: 'checkbox', etiqueta: 'ajustes.pistas_resaltar_teclado', getter: 'getResaltarTeclado', setter: 'setResaltarTeclado', porDefecto: true },
  { id: 'tildesAutomaticas', tipo: 'checkbox', etiqueta: 'ajustes.pistas_tildes_automaticas', getter: 'getTildesAutomaticas', setter: 'setTildesAutomaticas', porDefecto: true },
  { id: 'mayusculasAutomaticas', tipo: 'checkbox', etiqueta: 'ajustes.pistas_mayusculas_automaticas', getter: 'getMayusculasAutomaticas', setter: 'setMayusculasAutomaticas', porDefecto: true },
  { id: 'puntuacionAutomatica', tipo: 'checkbox', etiqueta: 'ajustes.pistas_puntuacion_automatica', getter: 'getPuntuacionAutomatica', setter: 'setPuntuacionAutomatica', porDefecto: true },
  { id: 'espaciosAutomaticos', tipo: 'checkbox', etiqueta: 'ajustes.pistas_espacios_automaticos', getter: 'getEspaciosAutomaticos', setter: 'setEspaciosAutomaticos', porDefecto: true },
  { id: 'soloTexto', tipo: 'checkbox', etiqueta: 'ajustes.pistas_solo_texto', getter: 'getSoloTexto', setter: 'setSoloTexto', porDefecto: false },
  { id: 'pulsadorTts', tipo: 'checkbox', etiqueta: 'ajustes.pistas_pulsador_tts', getter: 'getPulsadorTts', setter: 'setPulsadorTts', porDefecto: false },
  { id: 'letraPunteada', tipo: 'checkbox', etiqueta: 'ajustes.pistas_letra_punteada', getter: 'getLetraPunteada', setter: 'setLetraPunteada', porDefecto: true },
  {
    id: 'toleranciaTrazo', tipo: 'select', etiqueta: 'ajustes.pistas_tolerancia_trazo', getter: 'getToleranciaTrazo', setter: 'setToleranciaTrazo', porDefecto: 'facil',
    opciones: [['facil', 'ajustes.tolerancia_facil'], ['normal', 'ajustes.tolerancia_normal'], ['dificil', 'ajustes.tolerancia_dificil']]
  },
  {
    id: 'dificultadRuleta', tipo: 'select', etiqueta: 'ajustes.pistas_dificultad_ruleta', getter: 'getDificultadRuleta', setter: 'setDificultadRuleta', porDefecto: 'facil',
    opciones: [['facil', 'ajustes.tolerancia_facil'], ['normal', 'ajustes.tolerancia_normal'], ['dificil', 'ajustes.tolerancia_dificil']]
  },
  { id: 'listaSoloTexto', tipo: 'checkbox', etiqueta: 'ajustes.pistas_lista_solo_texto', getter: 'getListaSoloTexto', setter: 'setListaSoloTexto', porDefecto: false },
  { id: 'estanteSoloImagen', tipo: 'checkbox', etiqueta: 'ajustes.pistas_estante_solo_imagen', getter: 'getEstanteSoloImagen', setter: 'setEstanteSoloImagen', porDefecto: false }
];

/** Lista de definiciones (objetos completos, no solo ids) que aplican a
 *  una mecánica concreta. Mecánica desconocida -> lista vacía. */
export function camposParaMecanica(mecanica) {
  const ids = CAMPOS_POR_MECANICA[mecanica] || [];
  return ids
    .map((id) => DEFINICIONES_AJUSTE.find((d) => d.id === id))
    .filter(Boolean);
}

/** Objeto {id: valorDeFabrica} con todos los ajustes que aplican a una
 *  mecánica. Útil como punto de partida de una configuración nueva que
 *  no depende de ajustesJuego/localStorage (p.ej. una instancia de
 *  juego recién añadida a una ruta). */
export function valoresPorDefecto(mecanica) {
  const valores = {};
  camposParaMecanica(mecanica).forEach((definicion) => {
    valores[definicion.id] = definicion.porDefecto;
  });
  return valores;
}

/**
 * Construye un campo (checkbox o select) para una definición de ajuste,
 * sin saber nada de dónde vive el valor: lo recibe ya leído
 * (`valorActual`) y avisa con el nuevo valor a través de `alCambiar`
 * cuando el adulto lo cambia. Quien llama decide qué hacer con ese
 * valor (escribir en ajustesJuego+localStorage, o mutar un objeto en
 * memoria).
 */
export function construirCampoGenerico(definicion, valorActual, alCambiar, idPrefijo = 'ajuste') {
  const campo = document.createElement('div');

  if (definicion.tipo === 'select') {
    campo.className = 'campo';
    const label = document.createElement('label');
    label.htmlFor = `${idPrefijo}-${definicion.id}`;
    label.textContent = t(definicion.etiqueta);
    const select = document.createElement('select');
    select.id = `${idPrefijo}-${definicion.id}`;
    definicion.opciones.forEach(([valor, claveEtiqueta]) => {
      const opt = document.createElement('option');
      opt.value = valor;
      opt.textContent = t(claveEtiqueta);
      if (valor === valorActual) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => {
      sounds.click();
      alCambiar(select.value);
    });
    campo.append(label, select);
    return campo;
  }

  campo.className = 'campo campo-checkbox';
  const check = document.createElement('input');
  check.type = 'checkbox';
  check.id = `${idPrefijo}-${definicion.id}`;
  check.checked = Boolean(valorActual);
  const label = document.createElement('label');
  label.htmlFor = check.id;
  label.textContent = t(definicion.etiqueta);
  check.addEventListener('change', () => {
    sounds.click();
    alCambiar(check.checked);
  });
  campo.append(check, label);
  return campo;
}

/**
 * Repinta un panel con todos los campos de una mecánica, leyendo cada
 * valor de `valores[id]` y avisando los cambios con
 * `alCambiarCampo(id, nuevoValor)`. Si la mecánica no tiene ajustes,
 * muestra el aviso "sin ajustes" en su lugar.
 */
export function pintarPanelAjustes(panel, mecanica, valores, alCambiarCampo, idPrefijo = 'ajuste') {
  panel.innerHTML = '';
  const definiciones = camposParaMecanica(mecanica);
  if (!definiciones.length) {
    panel.innerHTML = `<p class="ayuda">${t('ajustes.pistas_sin_ajustes')}</p>`;
    return;
  }
  definiciones.forEach((definicion) => {
    const campo = construirCampoGenerico(
      definicion,
      valores ? valores[definicion.id] : undefined,
      (nuevoValor) => alCambiarCampo(definicion.id, nuevoValor),
      idPrefijo
    );
    panel.appendChild(campo);
  });
}
