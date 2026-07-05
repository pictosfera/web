// Pictosfera — vista "Pictogramas" (gestión de ARASAAC, zona del adulto).
//
// Aquí se busca en ARASAAC y se añade al pozo, y se gestiona solo la
// parte de la biblioteca que viene de ARASAAC (las fotos propias
// tienen su propia vista, /pictogramas/fotos: ver pictogramasFotos.js).
// Es parte del núcleo (no una app), así que sí puede hablar
// directamente con los módulos de i18n, ARASAAC y la biblioteca de
// medios.

import { t, getLanguage } from '../i18n.js';
import { searchPictograms } from '../arasaac.js';
import * as mediaLibrary from '../mediaLibrary.js';
import * as sounds from '../sounds.js';
import { navigate } from '../router.js';
import { CATEGORIAS_CURADAS } from '../categoriasPictogramas.js';
import { crearMedioCard } from './medioCard.js';

export async function render() {
  const view = document.getElementById('view');
  view.innerHTML = '';
  let cancelado = false;
  let controladorBusqueda = null;
  let filtroActivo = null;
  let medios = [];

  const raiz = document.createElement('div');
  raiz.className = 'zona-adulto card';

  const volver = document.createElement('button');
  volver.type = 'button';
  volver.className = 'btn btn-ghost';
  volver.textContent = `← ${t('comunes.volver')}`;
  volver.addEventListener('click', () => navigate('/pictogramas'));
  raiz.appendChild(volver);

  const titulo = document.createElement('h1');
  titulo.textContent = t('pictogramas.menu_pictogramas');
  raiz.appendChild(titulo);

  // --- Buscar en ARASAAC ---
  const seccionBuscar = document.createElement('section');
  const campoBuscar = document.createElement('div');
  campoBuscar.className = 'campo';
  const labelBuscar = document.createElement('label');
  labelBuscar.textContent = t('pictogramas.buscar_placeholder');
  labelBuscar.htmlFor = 'picto-buscar-input';
  const inputBuscar = document.createElement('input');
  inputBuscar.type = 'search';
  inputBuscar.id = 'picto-buscar-input';
  inputBuscar.placeholder = t('pictogramas.buscar_placeholder');
  campoBuscar.append(labelBuscar, inputBuscar);

  const btnBuscar = document.createElement('button');
  btnBuscar.type = 'button';
  btnBuscar.className = 'btn';
  btnBuscar.textContent = t('pictogramas.buscar_boton');

  // --- Panel de selección de categoría ---
  // Aparece al hacer clic en un resultado de ARASAAC: el adulto elige
  // a qué categoría pertenece el pictograma antes de añadirlo al pozo.
  // Así el pictograma queda etiquetado y los minijuegos pueden encontrarlo
  // (los que filtran por "animales", "comida", etc.) y la barra de filtros
  // de "Mi biblioteca" muestra la categoría correspondiente.
  const panelAnadir = document.createElement('div');
  panelAnadir.className = 'panel-anadir';
  panelAnadir.hidden = true;

  const resultados = document.createElement('div');
  resultados.className = 'resultados-busqueda';

  // Muestra el panel de categoría para un resultado concreto.
  // `card` es el botón del resultado para poder marcarlo como "ya añadido".
  function mostrarPanelAnadir(medio, card) {
    panelAnadir.innerHTML = '';
    panelAnadir.hidden = false;

    const fila = document.createElement('div');
    fila.className = 'panel-anadir-fila';

    const previewImg = document.createElement('img');
    previewImg.src = medio.imagen;
    previewImg.alt = medio.nombre;
    previewImg.className = 'panel-anadir-img';

    const info = document.createElement('div');
    info.className = 'panel-anadir-info';
    const nombreEl = document.createElement('strong');
    nombreEl.textContent = medio.nombre;
    const labelCat = document.createElement('p');
    labelCat.className = 'ayuda';
    labelCat.textContent = t('pictogramas.foto_etiqueta');
    info.append(nombreEl, labelCat);

    fila.append(previewImg, info);

    const chipsCateg = document.createElement('div');
    chipsCateg.className = 'etiquetas-lista';
    CATEGORIAS_CURADAS.forEach((clave) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'etiqueta-chip';
      chip.textContent = t(`categorias.${clave}`);
      chip.addEventListener('click', async () => {
        sounds.click();
        // Guardamos el pictograma con la etiqueta elegida por el adulto.
        // Esto es lo que permite que el juego lo encuentre al filtrar por
        // esa categoría, y que el chip de filtro de "Mi biblioteca" aparezca.
        await mediaLibrary.addArasaacMedio({ ...medio, etiquetas: [clave] });
        card.classList.add('ya-anadido');
        card.disabled = true;
        panelAnadir.hidden = true;
        refrescarBiblioteca();
      });
      chipsCateg.appendChild(chip);
    });

    const btnCancelar = document.createElement('button');
    btnCancelar.type = 'button';
    btnCancelar.className = 'btn btn-ghost';
    btnCancelar.textContent = t('comunes.cancelar');
    btnCancelar.addEventListener('click', () => { panelAnadir.hidden = true; });

    panelAnadir.append(fila, chipsCateg, btnCancelar);

    // Desplazarse al panel para que el adulto vea la pregunta de categoría
    panelAnadir.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  seccionBuscar.append(campoBuscar, btnBuscar, panelAnadir, resultados);

  async function buscar() {
    const texto = inputBuscar.value.trim();
    if (!texto) return;
    if (controladorBusqueda) controladorBusqueda.abort();
    controladorBusqueda = new AbortController();
    panelAnadir.hidden = true;
    resultados.innerHTML = `<p class="vacio">${t('pictogramas.buscando')}</p>`;
    try {
      const lista = await searchPictograms(texto, getLanguage(), { signal: controladorBusqueda.signal });
      if (cancelado) return;
      pintarResultados(lista);
    } catch (err) {
      if (cancelado || err.name === 'AbortError') return;
      resultados.innerHTML = `<p class="vacio">${t('pictogramas.error_busqueda')}</p>`;
    }
  }

  function pintarResultados(lista) {
    resultados.innerHTML = '';
    panelAnadir.hidden = true;
    if (!lista.length) {
      resultados.innerHTML = `<p class="vacio">${t('pictogramas.sin_resultados')}</p>`;
      return;
    }
    // Se muestran TODOS los resultados que ARASAAC devuelve, sin límite
    // artificial: la API no pagina, así que lo que llega es lo que hay.
    lista.forEach((medio) => {
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
        if (card.disabled) return;
        sounds.click();
        if (medio.etiquetas && medio.etiquetas.length > 0) {
          // La categoría se detectó automáticamente desde los datos de ARASAAC:
          // guardar directamente sin molestar al adulto con un panel.
          await mediaLibrary.addArasaacMedio(medio);
          card.classList.add('ya-anadido');
          card.disabled = true;
          refrescarBiblioteca();
        } else {
          // No se pudo detectar categoría: pedir al adulto que elija una.
          mostrarPanelAnadir(medio, card);
        }
      });
      resultados.appendChild(card);
    });
  }

  btnBuscar.addEventListener('click', buscar);
  inputBuscar.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') buscar();
  });

  // --- Mi biblioteca (solo pictogramas de ARASAAC) ---
  const seccionBiblioteca = document.createElement('section');
  const tituloBiblioteca = document.createElement('h2');
  tituloBiblioteca.textContent = t('pictogramas.mi_biblioteca');
  const filtroChips = document.createElement('div');
  filtroChips.className = 'etiquetas-lista';
  const listaMedios = document.createElement('div');
  listaMedios.className = 'medios-lista';
  seccionBiblioteca.append(tituloBiblioteca, filtroChips, listaMedios);

  async function refrescarBiblioteca() {
    // Limpia contaminación histórica (etiquetas en inglés que ARASAAC
    // devolvía antes del arreglo de arasaac.js); ver el comentario de
    // limpiarEtiquetasArasaac en mediaLibrary.js.
    await mediaLibrary.limpiarEtiquetasArasaac(CATEGORIAS_CURADAS);
    const todos = await mediaLibrary.listAll();
    medios = todos.filter((m) => m.origen === 'arasaac');
    if (cancelado) return;

    const etiquetas = Array.from(new Set(medios.flatMap((m) => m.etiquetas || []))).sort();
    filtroChips.innerHTML = '';
    const chipTodas = document.createElement('button');
    chipTodas.type = 'button';
    chipTodas.className = `etiqueta-chip${filtroActivo === null ? ' activa' : ''}`;
    chipTodas.textContent = t('pictogramas.todas');
    chipTodas.addEventListener('click', () => { filtroActivo = null; refrescarBiblioteca(); });
    filtroChips.appendChild(chipTodas);
    etiquetas.forEach((etq) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `etiqueta-chip${filtroActivo === etq ? ' activa' : ''}`;
      // Las categorías curadas se traducen; cualquier otra etiqueta se
      // enseña tal cual (en la práctica no debería darse aquí, porque
      // limpiarEtiquetasArasaac ya descarta lo que no esté en la lista
      // curada, pero se deja como red de seguridad).
      chip.textContent = CATEGORIAS_CURADAS.includes(etq) ? t(`categorias.${etq}`) : etq;
      chip.addEventListener('click', () => { filtroActivo = etq; refrescarBiblioteca(); });
      filtroChips.appendChild(chip);
    });

    const visibles = filtroActivo ? medios.filter((m) => (m.etiquetas || []).includes(filtroActivo)) : medios;

    listaMedios.innerHTML = '';
    if (!visibles.length) {
      listaMedios.innerHTML = `<p class="vacio">${t('pictogramas.biblioteca_vacia_arasaac')}</p>`;
      return;
    }
    visibles.forEach((medio) => {
      listaMedios.appendChild(crearMedioCard(medio, {
        origenClave: 'pictogramas.origen_arasaac',
        onCambio: refrescarBiblioteca
      }));
    });
  }

  raiz.append(seccionBuscar, seccionBiblioteca);
  view.appendChild(raiz);

  await refrescarBiblioteca();

  return () => {
    cancelado = true;
    if (controladorBusqueda) controladorBusqueda.abort();
  };
}
