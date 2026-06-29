// Pictosfera — vista "Categorías" (submenú de Pictogramas, zona del adulto).
//
// Aquí el adulto diseña el banco de "parejas de categorías
// dicotómicas" (p.ej. grande/pequeño, rojo/verde...) que alimenta el
// minijuego "Clasifica los pictogramas en dos categorías". Cada pareja
// tiene un nombre y dos categorías; cada categoría tiene su propio
// nombre, un pictograma "cabecera" que la representa (el concepto en
// sí, no un ejemplo más) y una lista de pictogramas del pozo que
// pertenecen a ella. En cada partida el juego elige al azar UNA pareja
// jugable del banco (ver elegirParejaAleatoria/resolverCategorias en
// appLoader.js).
//
// Es la misma idea que pictogramasSecuencias.js (su propia ruta,
// /pictogramas/categorias, con un botón desde Pictogramas; su propia
// copia en memoria de la biblioteca de medios), adaptada a una forma
// de datos distinta: en vez de una lista ORDENADA de pasos, aquí hay
// DOS categorías independientes, cada una con su cabecera (selección
// única) y su pool de pictogramas (selección múltiple). Para no
// duplicar cuatro veces el mismo buscador ARASAAC + grid de biblioteca
// (uno por cabecera y uno por pool, por categoría), se usa un único
// "selector" reutilizable cuyo destino (`objetivoActivo`) decide si el
// pictograma elegido fija la cabecera o se añade/quita del pool.

import { t, getLanguage } from '../i18n.js';
import { searchPictograms } from '../arasaac.js';
import * as mediaLibrary from '../mediaLibrary.js';
import * as categorias from '../categorias.js';
import * as sounds from '../sounds.js';
import { navigate } from '../router.js';

const MENSAJES_ERROR_PAREJA = {
  'falta-nombre': 'pictogramas.categoria_error_nombre',
  'categorias-invalidas': 'pictogramas.categoria_error_categorias',
  'falta-nombre-categoria': 'pictogramas.categoria_error_nombre_categoria',
  'falta-cabecera': 'pictogramas.categoria_error_cabecera',
  'medios-insuficientes': 'pictogramas.categoria_error_pictogramas'
};

export async function render() {
  const view = document.getElementById('view');
  view.innerHTML = '';
  let cancelado = false;
  let controladorBusqueda = null;
  let medios = [];
  let editandoParejaId = null;
  // Estado del formulario: dos categorías en edición.
  let formCategorias = [
    { nombre: '', cabeceraId: null, medios: [] },
    { nombre: '', cabeceraId: null, medios: [] }
  ];
  // Qué está eligiendo el adulto ahora mismo con el selector compartido:
  // { tipo: 'cabecera'|'pool', indice: 0|1 } o null si está cerrado.
  let objetivoActivo = null;

  const raiz = document.createElement('div');
  raiz.className = 'zona-adulto card';

  const volver = document.createElement('button');
  volver.type = 'button';
  volver.className = 'btn btn-ghost';
  volver.textContent = `← ${t('comunes.volver')}`;
  volver.addEventListener('click', () => navigate('/pictogramas'));
  raiz.appendChild(volver);

  const titulo = document.createElement('h1');
  titulo.textContent = t('pictogramas.categorias_titulo');
  raiz.appendChild(titulo);

  const ayuda = document.createElement('p');
  ayuda.className = 'ayuda';
  ayuda.textContent = t('pictogramas.categorias_ayuda');

  const campoNombrePareja = document.createElement('div');
  campoNombrePareja.className = 'campo';
  const labelNombrePareja = document.createElement('label');
  labelNombrePareja.textContent = t('pictogramas.categoria_pareja_nombre');
  const inputNombrePareja = document.createElement('input');
  inputNombrePareja.type = 'text';
  inputNombrePareja.placeholder = t('pictogramas.categoria_pareja_nombre_placeholder');
  campoNombrePareja.append(labelNombrePareja, inputNombrePareja);

  const bloquesCategorias = document.createElement('div');
  bloquesCategorias.className = 'categoria-bloques';

  // --- Selector compartido (cabecera o pool, según objetivoActivo) ---

  const selector = document.createElement('div');
  selector.className = 'categoria-selector';
  selector.hidden = true;

  const selectorTitulo = document.createElement('h3');
  const selectorBiblioteca = document.createElement('div');
  selectorBiblioteca.className = 'resultados-busqueda';

  const selectorTituloBuscar = document.createElement('h4');
  selectorTituloBuscar.textContent = t('pictogramas.categoria_buscar_arasaac');

  const campoBuscar = document.createElement('div');
  campoBuscar.className = 'campo';
  const labelBuscar = document.createElement('label');
  labelBuscar.textContent = t('pictogramas.buscar_placeholder');
  labelBuscar.htmlFor = 'picto-categoria-buscar-input';
  const inputBuscar = document.createElement('input');
  inputBuscar.type = 'search';
  inputBuscar.id = 'picto-categoria-buscar-input';
  inputBuscar.placeholder = t('pictogramas.buscar_placeholder');
  campoBuscar.append(labelBuscar, inputBuscar);

  const btnBuscar = document.createElement('button');
  btnBuscar.type = 'button';
  btnBuscar.className = 'btn';
  btnBuscar.textContent = t('pictogramas.buscar_boton');

  const resultadosBuscar = document.createElement('div');
  resultadosBuscar.className = 'resultados-busqueda';

  const btnCerrarSelector = document.createElement('button');
  btnCerrarSelector.type = 'button';
  btnCerrarSelector.className = 'btn btn-ghost';
  btnCerrarSelector.textContent = t('pictogramas.categoria_listo');
  btnCerrarSelector.addEventListener('click', () => {
    sounds.click();
    cerrarSelector();
  });

  selector.append(
    selectorTitulo,
    selectorBiblioteca,
    selectorTituloBuscar,
    campoBuscar,
    btnBuscar,
    resultadosBuscar,
    btnCerrarSelector
  );

  const errorPareja = document.createElement('p');
  errorPareja.className = 'pin-error';

  const btnCancelarEdicionPareja = document.createElement('button');
  btnCancelarEdicionPareja.type = 'button';
  btnCancelarEdicionPareja.className = 'btn btn-ghost';
  btnCancelarEdicionPareja.textContent = t('comunes.cancelar');
  btnCancelarEdicionPareja.hidden = true;

  const btnGuardarPareja = document.createElement('button');
  btnGuardarPareja.type = 'button';
  btnGuardarPareja.className = 'btn btn-secondary';
  btnGuardarPareja.textContent = t('pictogramas.guardar');

  const tituloMisCategorias = document.createElement('h3');
  tituloMisCategorias.textContent = t('pictogramas.mis_categorias');
  const listaParejas = document.createElement('div');
  listaParejas.className = 'categorias-lista';

  function medioPorId(id) {
    return medios.find((m) => m.id === id) || null;
  }

  function pintarBloqueCategoria(indice) {
    const datos = formCategorias[indice];
    const bloque = document.createElement('div');
    bloque.className = 'categoria-bloque';

    const tituloBloque = document.createElement('h3');
    tituloBloque.textContent = t('pictogramas.categoria_numero', { n: indice + 1 });
    bloque.appendChild(tituloBloque);

    const campoNombre = document.createElement('div');
    campoNombre.className = 'campo';
    const labelNombre = document.createElement('label');
    labelNombre.textContent = t('pictogramas.categoria_nombre');
    const inputNombre = document.createElement('input');
    inputNombre.type = 'text';
    inputNombre.placeholder = t('pictogramas.categoria_nombre_placeholder');
    inputNombre.value = datos.nombre;
    inputNombre.addEventListener('input', () => {
      formCategorias[indice].nombre = inputNombre.value;
    });
    campoNombre.append(labelNombre, inputNombre);
    bloque.appendChild(campoNombre);

    const tituloCabecera = document.createElement('h4');
    tituloCabecera.textContent = t('pictogramas.categoria_cabecera_titulo');
    bloque.appendChild(tituloCabecera);

    const previewCabecera = document.createElement('div');
    previewCabecera.className = 'categoria-cabecera-preview';
    bloque.appendChild(previewCabecera);

    const btnElegirCabecera = document.createElement('button');
    btnElegirCabecera.type = 'button';
    btnElegirCabecera.className = 'btn btn-ghost';
    btnElegirCabecera.textContent = t('pictogramas.categoria_cabecera_elegir');
    btnElegirCabecera.addEventListener('click', () => {
      sounds.click();
      abrirSelector({ tipo: 'cabecera', indice });
    });
    bloque.appendChild(btnElegirCabecera);

    const tituloPool = document.createElement('h4');
    tituloPool.textContent = t('pictogramas.categoria_pictogramas_titulo');
    bloque.appendChild(tituloPool);

    const listaPool = document.createElement('div');
    listaPool.className = 'categoria-pool';
    bloque.appendChild(listaPool);

    const btnAnadirPool = document.createElement('button');
    btnAnadirPool.type = 'button';
    btnAnadirPool.className = 'btn btn-ghost';
    btnAnadirPool.textContent = t('pictogramas.categoria_pictogramas_anadir');
    btnAnadirPool.addEventListener('click', () => {
      sounds.click();
      abrirSelector({ tipo: 'pool', indice });
    });
    bloque.appendChild(btnAnadirPool);

    bloque._previewCabecera = previewCabecera;
    bloque._listaPool = listaPool;
    return bloque;
  }

  function pintarCabeceraPreview(bloque, indice) {
    const previewCabecera = bloque._previewCabecera;
    previewCabecera.innerHTML = '';
    const medio = medioPorId(formCategorias[indice].cabeceraId);
    if (!medio) {
      previewCabecera.innerHTML = `<p class="vacio">${t('pictogramas.categoria_sin_cabecera')}</p>`;
      return;
    }
    const img = document.createElement('img');
    img.className = 'categoria-cabecera-img';
    img.src = mediaLibrary.getDisplayUrl(medio);
    img.alt = medio.nombre;
    const nombre = document.createElement('span');
    nombre.textContent = medio.nombre;
    previewCabecera.append(img, nombre);
  }

  function pintarPool(bloque, indice) {
    const listaPool = bloque._listaPool;
    listaPool.innerHTML = '';
    const idsMedios = formCategorias[indice].medios;
    if (!idsMedios.length) {
      listaPool.innerHTML = `<p class="vacio">${t('pictogramas.categoria_sin_pictogramas')}</p>`;
      return;
    }
    idsMedios.forEach((id) => {
      const medio = medioPorId(id);
      const chip = document.createElement('div');
      chip.className = 'categoria-pool-chip';
      if (medio) {
        const img = document.createElement('img');
        img.className = 'categoria-pool-chip-img';
        img.src = mediaLibrary.getDisplayUrl(medio);
        img.alt = medio.nombre;
        const nombre = document.createElement('span');
        nombre.textContent = medio.nombre;
        chip.append(img, nombre);
      } else {
        chip.classList.add('categoria-pool-chip-roto');
        chip.textContent = t('pictogramas.secuencia_paso_roto');
      }
      const btnQuitar = document.createElement('button');
      btnQuitar.type = 'button';
      btnQuitar.setAttribute('aria-label', t('comunes.cerrar'));
      btnQuitar.textContent = '✕';
      btnQuitar.addEventListener('click', () => {
        sounds.click();
        formCategorias[indice].medios = formCategorias[indice].medios.filter((m) => m !== id);
        pintarPool(bloque, indice);
      });
      chip.appendChild(btnQuitar);
      listaPool.appendChild(chip);
    });
  }

  const bloquesEls = [];

  function pintarBloques() {
    bloquesCategorias.innerHTML = '';
    bloquesEls.length = 0;
    [0, 1].forEach((indice) => {
      const bloque = pintarBloqueCategoria(indice);
      bloquesCategorias.appendChild(bloque);
      bloquesEls.push(bloque);
      pintarCabeceraPreview(bloque, indice);
      pintarPool(bloque, indice);
    });
  }

  function refrescarBloques() {
    bloquesEls.forEach((bloque, indice) => {
      pintarCabeceraPreview(bloque, indice);
      pintarPool(bloque, indice);
    });
  }

  // --- Selector compartido: abrir/cerrar y pintar su biblioteca ---

  function abrirSelector(objetivo) {
    objetivoActivo = objetivo;
    selector.hidden = false;
    selectorTitulo.textContent = objetivo.tipo === 'cabecera'
      ? t('pictogramas.categoria_seleccionar_cabecera_titulo', { n: objetivo.indice + 1 })
      : t('pictogramas.categoria_seleccionar_pictogramas_titulo', { n: objetivo.indice + 1 });
    resultadosBuscar.innerHTML = '';
    inputBuscar.value = '';
    pintarSelectorBiblioteca();
    selector.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function cerrarSelector() {
    objetivoActivo = null;
    selector.hidden = true;
  }

  function elegirMedioParaObjetivo(medio) {
    if (!objetivoActivo) return;
    const { tipo, indice } = objetivoActivo;
    if (tipo === 'cabecera') {
      formCategorias[indice].cabeceraId = medio.id;
      cerrarSelector();
    } else {
      const lista = formCategorias[indice].medios;
      const ya = lista.includes(medio.id);
      formCategorias[indice].medios = ya ? lista.filter((id) => id !== medio.id) : [...lista, medio.id];
      pintarSelectorBiblioteca();
    }
    refrescarBloques();
  }

  function pintarSelectorBiblioteca() {
    selectorBiblioteca.innerHTML = '';
    if (!medios.length) {
      selectorBiblioteca.innerHTML = `<p class="vacio">${t('pictogramas.biblioteca_vacia')}</p>`;
      return;
    }
    const seleccionados = objetivoActivo && objetivoActivo.tipo === 'pool'
      ? new Set(formCategorias[objetivoActivo.indice].medios)
      : new Set();
    medios.forEach((medio) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'resultado-card';
      if (seleccionados.has(medio.id)) card.classList.add('resultado-card-seleccionada');
      const img = document.createElement('img');
      img.src = mediaLibrary.getDisplayUrl(medio);
      img.alt = medio.nombre;
      img.loading = 'lazy';
      const nombre = document.createElement('div');
      nombre.textContent = medio.nombre;
      card.append(img, nombre);
      card.addEventListener('click', () => {
        sounds.click();
        elegirMedioParaObjetivo(medio);
      });
      selectorBiblioteca.appendChild(card);
    });
  }

  /** Carga (o recarga) la biblioteca completa de medios desde el pozo
   *  común. Esta vista mantiene su propia copia en memoria, así que hay
   *  que llamarlo al montar y cada vez que se añade un medio nuevo
   *  desde la búsqueda ARASAAC integrada en el selector. */
  async function cargarMedios() {
    medios = await mediaLibrary.listAll();
    if (cancelado) return;
    refrescarBloques();
    if (!selector.hidden) pintarSelectorBiblioteca();
  }

  async function buscarParaSelector() {
    const texto = inputBuscar.value.trim();
    if (!texto) return;
    if (controladorBusqueda) controladorBusqueda.abort();
    controladorBusqueda = new AbortController();
    resultadosBuscar.innerHTML = `<p class="vacio">${t('pictogramas.buscando')}</p>`;
    try {
      const lista = await searchPictograms(texto, getLanguage(), { signal: controladorBusqueda.signal });
      if (cancelado) return;
      pintarResultadosBuscar(lista);
    } catch (err) {
      if (cancelado || err.name === 'AbortError') return;
      resultadosBuscar.innerHTML = `<p class="vacio">${t('pictogramas.error_busqueda')}</p>`;
    }
  }

  function pintarResultadosBuscar(lista) {
    resultadosBuscar.innerHTML = '';
    if (!lista.length) {
      resultadosBuscar.innerHTML = `<p class="vacio">${t('pictogramas.sin_resultados')}</p>`;
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
      card.addEventListener('click', async () => {
        sounds.click();
        const medioCreado = await mediaLibrary.addArasaacMedio(medio);
        await cargarMedios();
        elegirMedioParaObjetivo(medioCreado);
        if (!objetivoActivo) {
          // Se cerró el selector (era una cabecera): limpia la búsqueda.
          inputBuscar.value = '';
          resultadosBuscar.innerHTML = '';
        } else {
          inputBuscar.value = '';
          resultadosBuscar.innerHTML = '';
          inputBuscar.focus();
        }
      });
      resultadosBuscar.appendChild(card);
    });
  }

  btnBuscar.addEventListener('click', buscarParaSelector);
  inputBuscar.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); buscarParaSelector(); }
  });

  function limpiarFormularioPareja() {
    editandoParejaId = null;
    inputNombrePareja.value = '';
    formCategorias = [
      { nombre: '', cabeceraId: null, medios: [] },
      { nombre: '', cabeceraId: null, medios: [] }
    ];
    cerrarSelector();
    errorPareja.textContent = '';
    btnCancelarEdicionPareja.hidden = true;
    btnGuardarPareja.textContent = t('pictogramas.guardar');
    pintarBloques();
  }

  btnCancelarEdicionPareja.addEventListener('click', () => {
    sounds.click();
    limpiarFormularioPareja();
  });

  btnGuardarPareja.addEventListener('click', async () => {
    errorPareja.textContent = '';
    const nombre = inputNombrePareja.value.trim();
    const categoriasForm = formCategorias.map((c) => ({ ...c, nombre: c.nombre.trim() }));

    const resumen = categoriasForm
      .map((c, i) => `${i + 1}. ${c.nombre || t('pictogramas.categoria_nombre_placeholder')} (${c.medios.length})`)
      .join('\n');
    // eslint-disable-next-line no-alert
    const confirma = window.confirm(t('pictogramas.categoria_confirmar_guardar', { nombre, resumen }));
    if (!confirma) return;

    try {
      if (editandoParejaId) {
        await categorias.actualizarPareja(editandoParejaId, { nombre, categorias: categoriasForm });
      } else {
        await categorias.crearPareja({ nombre, categorias: categoriasForm });
      }
      sounds.acierto();
      limpiarFormularioPareja();
      await refrescarParejas();
    } catch (err) {
      const clave = MENSAJES_ERROR_PAREJA[err.message];
      errorPareja.textContent = clave ? t(clave) : t('comunes.error_generico');
    }
  });

  async function refrescarParejas() {
    const todas = await categorias.listAll();
    if (cancelado) return;
    listaParejas.innerHTML = '';
    if (!todas.length) {
      listaParejas.innerHTML = `<p class="vacio">${t('pictogramas.categorias_vacio')}</p>`;
      return;
    }
    todas.forEach((pareja) => {
      const categoriasResueltas = (pareja.categorias || []).map((c) => categorias.resolverCategoria(c, medios));
      const rota = categoriasResueltas.some((c) => !c);

      const card = document.createElement('div');
      card.className = 'categoria-card';

      const cabecera = document.createElement('div');
      cabecera.className = 'categoria-card-cabecera';
      const nombreSpan = document.createElement('span');
      nombreSpan.className = 'categoria-card-nombre';
      nombreSpan.textContent = pareja.nombre;
      cabecera.appendChild(nombreSpan);
      if (rota) {
        const aviso = document.createElement('span');
        aviso.className = 'categoria-card-aviso';
        aviso.textContent = `⚠️ ${t('pictogramas.categoria_rota')}`;
        cabecera.appendChild(aviso);
      }

      const preview = document.createElement('div');
      preview.className = 'categoria-card-preview';
      (pareja.categorias || []).forEach((c, indice) => {
        if (indice > 0) {
          const contra = document.createElement('span');
          contra.className = 'categoria-card-preview-contra';
          contra.setAttribute('aria-hidden', 'true');
          contra.textContent = '↔';
          preview.appendChild(contra);
        }
        const bloque = document.createElement('div');
        bloque.className = 'categoria-card-preview-bloque';
        const medioCabecera = medioPorId(c.cabeceraId);
        if (medioCabecera) {
          const img = document.createElement('img');
          img.className = 'categoria-card-preview-img';
          img.src = mediaLibrary.getDisplayUrl(medioCabecera);
          img.alt = medioCabecera.nombre;
          bloque.appendChild(img);
        } else {
          const roto = document.createElement('span');
          roto.className = 'categoria-card-preview-roto';
          roto.textContent = '❓';
          bloque.appendChild(roto);
        }
        const nombreCat = document.createElement('span');
        nombreCat.textContent = `${c.nombre} (${(c.medios || []).length})`;
        bloque.appendChild(nombreCat);
        preview.appendChild(bloque);
      });

      const btnEditarPareja = document.createElement('button');
      btnEditarPareja.type = 'button';
      btnEditarPareja.className = 'categoria-card-editar';
      btnEditarPareja.setAttribute('aria-label', t('pictogramas.categoria_editar'));
      btnEditarPareja.textContent = '✏️';
      btnEditarPareja.addEventListener('click', () => {
        sounds.click();
        editandoParejaId = pareja.id;
        inputNombrePareja.value = pareja.nombre;
        formCategorias = (pareja.categorias || []).map((c) => ({
          nombre: c.nombre,
          cabeceraId: c.cabeceraId,
          medios: [...(c.medios || [])]
        }));
        while (formCategorias.length < 2) formCategorias.push({ nombre: '', cabeceraId: null, medios: [] });
        cerrarSelector();
        btnCancelarEdicionPareja.hidden = false;
        btnGuardarPareja.textContent = t('pictogramas.guardar_cambios');
        errorPareja.textContent = '';
        pintarBloques();
        inputNombrePareja.focus();
      });

      const btnBorrarPareja = document.createElement('button');
      btnBorrarPareja.type = 'button';
      btnBorrarPareja.className = 'categoria-card-borrar';
      btnBorrarPareja.setAttribute('aria-label', t('comunes.cerrar'));
      btnBorrarPareja.textContent = '✕';
      btnBorrarPareja.addEventListener('click', async () => {
        // eslint-disable-next-line no-alert
        if (!window.confirm(t('pictogramas.categoria_borrar_confirmar'))) return;
        await categorias.eliminarPareja(pareja.id);
        if (editandoParejaId === pareja.id) limpiarFormularioPareja();
        await refrescarParejas();
      });

      const acciones = document.createElement('div');
      acciones.className = 'categoria-card-acciones';
      acciones.append(btnEditarPareja, btnBorrarPareja);

      card.append(cabecera, preview, acciones);
      listaParejas.appendChild(card);
    });
  }

  raiz.append(
    ayuda,
    campoNombrePareja,
    bloquesCategorias,
    selector,
    errorPareja,
    btnCancelarEdicionPareja,
    btnGuardarPareja,
    tituloMisCategorias,
    listaParejas
  );
  view.appendChild(raiz);

  pintarBloques();
  await cargarMedios();
  await refrescarParejas();

  return () => {
    cancelado = true;
    if (controladorBusqueda) controladorBusqueda.abort();
  };
}
