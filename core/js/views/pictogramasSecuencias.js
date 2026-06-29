// Pictosfera — vista "Secuencias" (submenú de Pictogramas, zona del adulto).
//
// Crear y gestionar secuencias (rutinas reales: lavarse los dientes,
// vestirse...) vivía antes dentro de la propia pantalla de Pictogramas,
// pero esa pantalla ya tenía bastante (buscar en ARASAAC, añadir
// fotos, Mi biblioteca) como para añadir encima un formulario entero
// de varios pasos: obligaba a un scroll largo solo para llegar a esta
// parte. Por eso vive en su propia ruta (/pictogramas/secuencias), a
// la que se llega con un botón desde Pictogramas.
//
// Es la misma lógica que había antes en pictogramas.js, solo que aquí
// gestiona su propia copia de la biblioteca de medios (la pide ella
// misma al montar, y la vuelve a pedir cuando añade un pictograma
// nuevo desde ARASAAC), en vez de compartirla con la sección "Mi
// biblioteca" de la pantalla principal.

import { t, getLanguage } from '../i18n.js';
import { searchPictograms } from '../arasaac.js';
import * as mediaLibrary from '../mediaLibrary.js';
import * as secuencias from '../secuencias.js';
import * as sounds from '../sounds.js';
import { navigate } from '../router.js';

const MENSAJES_ERROR_SECUENCIA = {
  'falta-nombre': 'pictogramas.secuencia_error_nombre',
  'pasos-insuficientes': 'pictogramas.secuencia_error_pasos',
  'paso-invalido': 'pictogramas.secuencia_error_pasos'
};

export async function render() {
  const view = document.getElementById('view');
  view.innerHTML = '';
  let cancelado = false;
  let controladorBusquedaSecuencia = null;
  let medios = [];
  let pasosElegidos = [];
  let editandoSecuenciaId = null;

  const raiz = document.createElement('div');
  raiz.className = 'zona-adulto card';

  const volver = document.createElement('button');
  volver.type = 'button';
  volver.className = 'btn btn-ghost';
  volver.textContent = `← ${t('comunes.volver')}`;
  volver.addEventListener('click', () => navigate('/pictogramas'));
  raiz.appendChild(volver);

  const titulo = document.createElement('h1');
  titulo.textContent = t('pictogramas.secuencias_titulo');
  raiz.appendChild(titulo);

  const ayudaSecuencias = document.createElement('p');
  ayudaSecuencias.className = 'ayuda';
  ayudaSecuencias.textContent = t('pictogramas.secuencias_ayuda');

  const campoNombreSecuencia = document.createElement('div');
  campoNombreSecuencia.className = 'campo';
  const labelNombreSecuencia = document.createElement('label');
  labelNombreSecuencia.textContent = t('pictogramas.secuencia_nombre');
  const inputNombreSecuencia = document.createElement('input');
  inputNombreSecuencia.type = 'text';
  inputNombreSecuencia.placeholder = t('pictogramas.secuencia_nombre_placeholder');
  campoNombreSecuencia.append(labelNombreSecuencia, inputNombreSecuencia);

  const tituloPasos = document.createElement('h3');
  tituloPasos.textContent = t('pictogramas.secuencia_pasos');
  const listaPasos = document.createElement('div');
  listaPasos.className = 'secuencia-pasos';

  const tituloElegir = document.createElement('h3');
  tituloElegir.textContent = t('pictogramas.secuencia_elegir');
  const elegirGrid = document.createElement('div');
  elegirGrid.className = 'resultados-busqueda';

  // Si el pictograma que hace falta para este paso todavía no está en
  // la biblioteca, el adulto puede buscarlo directamente en ARASAAC sin
  // salir de la edición de la secuencia: al elegir un resultado se añade
  // a la biblioteca Y a este paso a la vez (ver pintarResultadosBuscarSecuencia).
  const tituloBuscarArasaacSecuencia = document.createElement('h3');
  tituloBuscarArasaacSecuencia.textContent = t('pictogramas.secuencia_buscar_arasaac');
  const ayudaBuscarArasaacSecuencia = document.createElement('p');
  ayudaBuscarArasaacSecuencia.className = 'ayuda';
  ayudaBuscarArasaacSecuencia.textContent = t('pictogramas.secuencia_buscar_arasaac_ayuda');

  const campoBuscarSecuencia = document.createElement('div');
  campoBuscarSecuencia.className = 'campo';
  const labelBuscarSecuencia = document.createElement('label');
  labelBuscarSecuencia.textContent = t('pictogramas.buscar_placeholder');
  labelBuscarSecuencia.htmlFor = 'picto-secuencia-buscar-input';
  const inputBuscarSecuencia = document.createElement('input');
  inputBuscarSecuencia.type = 'search';
  inputBuscarSecuencia.id = 'picto-secuencia-buscar-input';
  inputBuscarSecuencia.placeholder = t('pictogramas.buscar_placeholder');
  campoBuscarSecuencia.append(labelBuscarSecuencia, inputBuscarSecuencia);

  const btnBuscarSecuencia = document.createElement('button');
  btnBuscarSecuencia.type = 'button';
  btnBuscarSecuencia.className = 'btn';
  btnBuscarSecuencia.textContent = t('pictogramas.buscar_boton');

  const resultadosBuscarSecuencia = document.createElement('div');
  resultadosBuscarSecuencia.className = 'resultados-busqueda';

  const errorSecuencia = document.createElement('p');
  errorSecuencia.className = 'pin-error';

  const btnCancelarEdicionSecuencia = document.createElement('button');
  btnCancelarEdicionSecuencia.type = 'button';
  btnCancelarEdicionSecuencia.className = 'btn btn-ghost';
  btnCancelarEdicionSecuencia.textContent = t('comunes.cancelar');
  btnCancelarEdicionSecuencia.hidden = true;

  const btnGuardarSecuencia = document.createElement('button');
  btnGuardarSecuencia.type = 'button';
  btnGuardarSecuencia.className = 'btn btn-secondary';
  btnGuardarSecuencia.textContent = t('pictogramas.guardar');

  const tituloMisSecuencias = document.createElement('h3');
  tituloMisSecuencias.textContent = t('pictogramas.mis_secuencias');
  const listaSecuencias = document.createElement('div');
  listaSecuencias.className = 'secuencias-lista';

  function pintarPasosElegidos() {
    listaPasos.innerHTML = '';
    if (!pasosElegidos.length) {
      listaPasos.innerHTML = `<p class="vacio">${t('pictogramas.secuencia_sin_pasos')}</p>`;
      return;
    }
    pasosElegidos.forEach((medioId, indice) => {
      const medio = medios.find((m) => m.id === medioId);
      const fila = document.createElement('div');
      fila.className = 'secuencia-paso';

      const orden = document.createElement('span');
      orden.className = 'secuencia-paso-orden';
      orden.textContent = String(indice + 1);

      const img = document.createElement('img');
      img.className = 'secuencia-paso-img';
      img.src = medio ? mediaLibrary.getDisplayUrl(medio) : '';
      img.alt = medio ? medio.nombre : '';

      const nombre = document.createElement('span');
      nombre.className = 'secuencia-paso-nombre';
      nombre.textContent = medio ? medio.nombre : t('pictogramas.secuencia_paso_roto');

      const btnSubir = document.createElement('button');
      btnSubir.type = 'button';
      btnSubir.className = 'secuencia-paso-mover';
      btnSubir.setAttribute('aria-label', t('pictogramas.secuencia_subir'));
      btnSubir.textContent = '⬆️';
      btnSubir.disabled = indice === 0;
      btnSubir.addEventListener('click', () => {
        sounds.click();
        [pasosElegidos[indice - 1], pasosElegidos[indice]] = [pasosElegidos[indice], pasosElegidos[indice - 1]];
        pintarPasosElegidos();
      });

      const btnBajar = document.createElement('button');
      btnBajar.type = 'button';
      btnBajar.className = 'secuencia-paso-mover';
      btnBajar.setAttribute('aria-label', t('pictogramas.secuencia_bajar'));
      btnBajar.textContent = '⬇️';
      btnBajar.disabled = indice === pasosElegidos.length - 1;
      btnBajar.addEventListener('click', () => {
        sounds.click();
        [pasosElegidos[indice + 1], pasosElegidos[indice]] = [pasosElegidos[indice], pasosElegidos[indice + 1]];
        pintarPasosElegidos();
      });

      const btnQuitar = document.createElement('button');
      btnQuitar.type = 'button';
      btnQuitar.className = 'secuencia-paso-quitar';
      btnQuitar.setAttribute('aria-label', t('comunes.cerrar'));
      btnQuitar.textContent = '✕';
      btnQuitar.addEventListener('click', () => {
        sounds.click();
        pasosElegidos.splice(indice, 1);
        pintarPasosElegidos();
      });

      const botones = document.createElement('div');
      botones.className = 'secuencia-paso-botones';
      botones.append(btnSubir, btnBajar, btnQuitar);

      fila.append(orden, img, nombre, botones);
      listaPasos.appendChild(fila);
    });
  }

  function pintarElegirGrid() {
    elegirGrid.innerHTML = '';
    if (!medios.length) {
      elegirGrid.innerHTML = `<p class="vacio">${t('pictogramas.biblioteca_vacia')}</p>`;
      return;
    }
    medios.forEach((medio) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'resultado-card';
      const img = document.createElement('img');
      img.src = mediaLibrary.getDisplayUrl(medio);
      img.alt = medio.nombre;
      img.loading = 'lazy';
      const nombre = document.createElement('div');
      nombre.textContent = medio.nombre;
      card.append(img, nombre);
      // No se deshabilita tras añadir: una rutina real puede repetir un
      // mismo paso (p.ej. "abrir grifo" puede aparecer dos veces).
      card.addEventListener('click', () => {
        sounds.click();
        pasosElegidos.push(medio.id);
        pintarPasosElegidos();
      });
      elegirGrid.appendChild(card);
    });
  }

  /** Carga (o recarga) la biblioteca completa de medios desde el pozo
   *  común. Esta vista mantiene su propia copia en memoria (no la
   *  comparte con la pantalla principal de Pictogramas), así que hay
   *  que llamarlo al montar y cada vez que se añade un medio nuevo
   *  desde la búsqueda ARASAAC integrada en el editor de pasos. */
  async function cargarMedios() {
    medios = await mediaLibrary.listAll();
    if (cancelado) return;
    pintarElegirGrid();
  }

  /** Busca en ARASAAC desde el editor de secuencias, para cuando el
   *  pictograma que hace falta para un paso todavía no está en la
   *  biblioteca. */
  async function buscarParaSecuencia() {
    const texto = inputBuscarSecuencia.value.trim();
    if (!texto) return;
    if (controladorBusquedaSecuencia) controladorBusquedaSecuencia.abort();
    controladorBusquedaSecuencia = new AbortController();
    resultadosBuscarSecuencia.innerHTML = `<p class="vacio">${t('pictogramas.buscando')}</p>`;
    try {
      const lista = await searchPictograms(texto, getLanguage(), { signal: controladorBusquedaSecuencia.signal });
      if (cancelado) return;
      pintarResultadosBuscarSecuencia(lista);
    } catch (err) {
      if (cancelado || err.name === 'AbortError') return;
      resultadosBuscarSecuencia.innerHTML = `<p class="vacio">${t('pictogramas.error_busqueda')}</p>`;
    }
  }

  function pintarResultadosBuscarSecuencia(lista) {
    resultadosBuscarSecuencia.innerHTML = '';
    if (!lista.length) {
      resultadosBuscarSecuencia.innerHTML = `<p class="vacio">${t('pictogramas.sin_resultados')}</p>`;
      return;
    }
    lista.slice(0, 30).forEach((medio) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'resultado-card';
      const img = document.createElement('img');
      img.src = medio.imagen;
      img.alt = medio.nombre;
      img.loading = 'lazy';
      const nombre = document.createElement('div');
      nombre.textContent = medio.nombre;
      card.append(img, nombre);
      // A diferencia de la búsqueda principal de Pictogramas, esta
      // tarjeta NUNCA se deshabilita tras añadirla: una rutina real
      // puede necesitar el mismo pictograma en más de un paso (p.ej.
      // "abrir el grifo" dos veces). Pero sí se vacía la búsqueda
      // entera tras elegir un resultado: cada paso de la rutina suele
      // necesitar una palabra distinta, así que dejamos el campo listo
      // para la siguiente búsqueda.
      card.addEventListener('click', async () => {
        sounds.click();
        const medioCreado = await mediaLibrary.addArasaacMedio(medio);
        pasosElegidos.push(medioCreado.id);
        await cargarMedios();
        pintarPasosElegidos();
        inputBuscarSecuencia.value = '';
        resultadosBuscarSecuencia.innerHTML = '';
        inputBuscarSecuencia.focus();
      });
      resultadosBuscarSecuencia.appendChild(card);
    });
  }

  btnBuscarSecuencia.addEventListener('click', buscarParaSecuencia);
  inputBuscarSecuencia.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); buscarParaSecuencia(); }
  });

  function limpiarFormularioSecuencia() {
    editandoSecuenciaId = null;
    inputNombreSecuencia.value = '';
    pasosElegidos = [];
    errorSecuencia.textContent = '';
    btnCancelarEdicionSecuencia.hidden = true;
    btnGuardarSecuencia.textContent = t('pictogramas.guardar');
    pintarPasosElegidos();
  }

  btnCancelarEdicionSecuencia.addEventListener('click', () => {
    sounds.click();
    limpiarFormularioSecuencia();
  });

  btnGuardarSecuencia.addEventListener('click', async () => {
    errorSecuencia.textContent = '';
    const nombre = inputNombreSecuencia.value.trim();

    // Antes de guardar de verdad, si ya hay pasos suficientes para
    // formar una secuencia, se muestra un resumen para que el adulto
    // revise que están todos los pasos previstos (y en el orden
    // correcto) antes de confirmar.
    if (pasosElegidos.length >= secuencias.MIN_PASOS) {
      const resumen = pasosElegidos
        .map((id, indice) => {
          const medio = medios.find((m) => m.id === id);
          return `${indice + 1}. ${medio ? medio.nombre : t('pictogramas.secuencia_paso_roto')}`;
        })
        .join('\n');
      // eslint-disable-next-line no-alert
      const confirma = window.confirm(
        t('pictogramas.secuencia_confirmar_guardar', { n: pasosElegidos.length, resumen })
      );
      if (!confirma) return;
    }

    try {
      if (editandoSecuenciaId) {
        await secuencias.actualizarSecuencia(editandoSecuenciaId, { nombre, pasos: pasosElegidos });
      } else {
        await secuencias.crearSecuencia({ nombre, pasos: pasosElegidos });
      }
      sounds.acierto();
      limpiarFormularioSecuencia();
      await refrescarSecuencias();
    } catch (err) {
      const clave = MENSAJES_ERROR_SECUENCIA[err.message];
      errorSecuencia.textContent = clave
        ? t(clave, { n: secuencias.MIN_PASOS })
        : t('comunes.error_generico');
    }
  });

  async function refrescarSecuencias() {
    const todas = await secuencias.listAll();
    if (cancelado) return;
    listaSecuencias.innerHTML = '';
    if (!todas.length) {
      listaSecuencias.innerHTML = `<p class="vacio">${t('pictogramas.secuencias_vacio')}</p>`;
      return;
    }
    todas.forEach((secuencia) => {
      const pasosResueltos = secuencia.pasos.map((id) => medios.find((m) => m.id === id));
      const rota = pasosResueltos.some((m) => !m);

      const card = document.createElement('div');
      card.className = 'secuencia-card';

      const cabecera = document.createElement('div');
      cabecera.className = 'secuencia-card-cabecera';
      const nombreSpan = document.createElement('span');
      nombreSpan.className = 'secuencia-card-nombre';
      nombreSpan.textContent = secuencia.nombre;
      cabecera.appendChild(nombreSpan);
      if (rota) {
        const aviso = document.createElement('span');
        aviso.className = 'secuencia-card-aviso';
        aviso.textContent = `⚠️ ${t('pictogramas.secuencia_rota')}`;
        cabecera.appendChild(aviso);
      }

      const preview = document.createElement('div');
      preview.className = 'secuencia-preview';
      pasosResueltos.forEach((medio, indice) => {
        if (indice > 0) {
          const flecha = document.createElement('span');
          flecha.className = 'secuencia-preview-flecha';
          flecha.setAttribute('aria-hidden', 'true');
          flecha.textContent = '→';
          preview.appendChild(flecha);
        }
        if (medio) {
          const img = document.createElement('img');
          img.className = 'secuencia-preview-img';
          img.src = mediaLibrary.getDisplayUrl(medio);
          img.alt = medio.nombre;
          preview.appendChild(img);
        } else {
          const roto = document.createElement('span');
          roto.className = 'secuencia-preview-roto';
          roto.setAttribute('aria-label', t('pictogramas.secuencia_paso_roto'));
          roto.textContent = '❓';
          preview.appendChild(roto);
        }
      });

      const btnEditarSecuencia = document.createElement('button');
      btnEditarSecuencia.type = 'button';
      btnEditarSecuencia.className = 'secuencia-card-editar';
      btnEditarSecuencia.setAttribute('aria-label', t('pictogramas.secuencia_editar'));
      btnEditarSecuencia.textContent = '✏️';
      btnEditarSecuencia.addEventListener('click', () => {
        sounds.click();
        editandoSecuenciaId = secuencia.id;
        inputNombreSecuencia.value = secuencia.nombre;
        pasosElegidos = secuencia.pasos.filter((id) => medios.some((m) => m.id === id));
        btnCancelarEdicionSecuencia.hidden = false;
        btnGuardarSecuencia.textContent = t('pictogramas.guardar_cambios');
        errorSecuencia.textContent = '';
        pintarPasosElegidos();
        inputNombreSecuencia.focus();
      });

      const btnBorrarSecuencia = document.createElement('button');
      btnBorrarSecuencia.type = 'button';
      btnBorrarSecuencia.className = 'secuencia-card-borrar';
      btnBorrarSecuencia.setAttribute('aria-label', t('comunes.cerrar'));
      btnBorrarSecuencia.textContent = '✕';
      btnBorrarSecuencia.addEventListener('click', async () => {
        // eslint-disable-next-line no-alert
        if (!window.confirm(t('pictogramas.secuencia_borrar_confirmar'))) return;
        await secuencias.eliminarSecuencia(secuencia.id);
        if (editandoSecuenciaId === secuencia.id) limpiarFormularioSecuencia();
        await refrescarSecuencias();
      });

      const acciones = document.createElement('div');
      acciones.className = 'secuencia-card-acciones';
      acciones.append(btnEditarSecuencia, btnBorrarSecuencia);

      card.append(cabecera, preview, acciones);
      listaSecuencias.appendChild(card);
    });
  }

  raiz.append(
    ayudaSecuencias,
    campoNombreSecuencia,
    tituloPasos,
    listaPasos,
    tituloElegir,
    elegirGrid,
    tituloBuscarArasaacSecuencia,
    ayudaBuscarArasaacSecuencia,
    campoBuscarSecuencia,
    btnBuscarSecuencia,
    resultadosBuscarSecuencia,
    errorSecuencia,
    btnCancelarEdicionSecuencia,
    btnGuardarSecuencia,
    tituloMisSecuencias,
    listaSecuencias
  );
  view.appendChild(raiz);

  pintarPasosElegidos();
  await cargarMedios();
  await refrescarSecuencias();

  return () => {
    cancelado = true;
    if (controladorBusquedaSecuencia) controladorBusquedaSecuencia.abort();
  };
}
