// Pictosfera — vista "Imágenes propias" (zona del adulto).
//
// Aquí se añaden fotos locales (con categoría obligatoria) y se
// gestiona solo la parte de la biblioteca que viene de fotos propias
// (los pictogramas de ARASAAC tienen su propia vista,
// /pictogramas/arasaac: ver pictogramasArasaac.js).

import { t } from '../i18n.js';
import * as mediaLibrary from '../mediaLibrary.js';
import * as sounds from '../sounds.js';
import { navigate } from '../router.js';
import { CATEGORIAS_CURADAS } from '../categoriasPictogramas.js';
import { crearMedioCard } from './medioCard.js';

export async function render() {
  const view = document.getElementById('view');
  view.innerHTML = '';
  let cancelado = false;
  const seleccionEtiquetas = new Set();
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
  titulo.textContent = t('pictogramas.menu_fotos');
  raiz.appendChild(titulo);

  // --- Añadir foto local ---
  const seccionFoto = document.createElement('section');
  const tituloFoto = document.createElement('h2');
  tituloFoto.textContent = t('pictogramas.anadir_foto');

  // El botón nativo de "elegir archivo" no se puede traducir: su texto
  // lo pone el navegador/sistema operativo en SU idioma, no en el de
  // Pictosfera. Por eso el input real va oculto y se sustituye por un
  // botón propio (mismo patrón que "Importar copia" en Ajustes).
  const inputFoto = document.createElement('input');
  inputFoto.type = 'file';
  inputFoto.accept = 'image/*';
  inputFoto.capture = 'environment';
  inputFoto.hidden = true;

  const btnElegirFoto = document.createElement('button');
  btnElegirFoto.type = 'button';
  btnElegirFoto.className = 'btn btn-secondary';
  btnElegirFoto.textContent = t('pictogramas.elegir_foto');
  btnElegirFoto.addEventListener('click', () => {
    sounds.click();
    inputFoto.click();
  });

  const nombreFotoElegida = document.createElement('span');
  nombreFotoElegida.className = 'ayuda';
  nombreFotoElegida.textContent = t('pictogramas.ningun_archivo');
  inputFoto.addEventListener('change', () => {
    const archivo = inputFoto.files && inputFoto.files[0];
    nombreFotoElegida.textContent = archivo ? archivo.name : t('pictogramas.ningun_archivo');
  });

  const campoNombre = document.createElement('div');
  campoNombre.className = 'campo';
  const labelNombre = document.createElement('label');
  labelNombre.textContent = t('pictogramas.foto_nombre');
  const inputNombre = document.createElement('input');
  inputNombre.type = 'text';
  campoNombre.append(labelNombre, inputNombre);

  const campoEtiquetas = document.createElement('div');
  campoEtiquetas.className = 'campo';
  const labelEtiquetas = document.createElement('label');
  labelEtiquetas.textContent = t('pictogramas.foto_etiqueta');
  const chips = document.createElement('div');
  chips.className = 'etiquetas-lista';
  CATEGORIAS_CURADAS.forEach((clave) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'etiqueta-chip';
    chip.textContent = t(`categorias.${clave}`);
    chip.addEventListener('click', () => {
      sounds.click();
      if (seleccionEtiquetas.has(clave)) {
        seleccionEtiquetas.delete(clave);
        chip.classList.remove('activa');
      } else {
        seleccionEtiquetas.add(clave);
        chip.classList.add('activa');
      }
    });
    chips.appendChild(chip);
  });
  const inputOtra = document.createElement('input');
  inputOtra.type = 'text';
  inputOtra.placeholder = t('categorias.otra_placeholder');
  campoEtiquetas.append(labelEtiquetas, chips, inputOtra);

  const avisoArbol = document.createElement('p');
  avisoArbol.className = 'aviso';
  avisoArbol.textContent = t('categorias.aviso_arbol');

  const errorFoto = document.createElement('p');
  errorFoto.className = 'pin-error';

  const btnGuardarFoto = document.createElement('button');
  btnGuardarFoto.type = 'button';
  btnGuardarFoto.className = 'btn btn-secondary';
  btnGuardarFoto.textContent = t('pictogramas.guardar');
  btnGuardarFoto.addEventListener('click', async () => {
    errorFoto.textContent = '';
    const archivo = inputFoto.files && inputFoto.files[0];
    const nombre = inputNombre.value.trim();
    const otras = inputOtra.value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const etiquetas = Array.from(new Set([...seleccionEtiquetas, ...otras]));
    try {
      if (!archivo) throw new Error(t('pictogramas.foto_nombre'));
      if (!etiquetas.length) throw new Error(t('pictogramas.foto_etiqueta_obligatoria'));
      await mediaLibrary.addFotoLocal({ archivo, nombre: nombre || archivo.name, etiquetas });
      sounds.acierto();
      inputFoto.value = '';
      nombreFotoElegida.textContent = t('pictogramas.ningun_archivo');
      inputNombre.value = '';
      inputOtra.value = '';
      seleccionEtiquetas.clear();
      chips.querySelectorAll('.etiqueta-chip').forEach((c) => c.classList.remove('activa'));
      refrescarBiblioteca();
    } catch (err) {
      errorFoto.textContent = err.message || t('comunes.error_generico');
    }
  });

  seccionFoto.append(
    tituloFoto,
    btnElegirFoto,
    nombreFotoElegida,
    inputFoto,
    campoNombre,
    campoEtiquetas,
    avisoArbol,
    errorFoto,
    btnGuardarFoto
  );

  // --- Mis fotos (solo fotos propias) ---
  const seccionBiblioteca = document.createElement('section');
  const tituloBiblioteca = document.createElement('h2');
  tituloBiblioteca.textContent = t('pictogramas.mi_biblioteca');
  const filtroChips = document.createElement('div');
  filtroChips.className = 'etiquetas-lista';
  const listaMedios = document.createElement('div');
  listaMedios.className = 'medios-lista';
  seccionBiblioteca.append(tituloBiblioteca, filtroChips, listaMedios);

  async function refrescarBiblioteca() {
    const todos = await mediaLibrary.listAll();
    medios = todos.filter((m) => m.origen === 'foto');
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
      // Las categorías curadas se traducen (igual que en "Añadir
      // foto"); cualquier otra etiqueta (una categoría escrita a mano
      // en "otra") se enseña tal cual, en el idioma en que el adulto
      // la escribió.
      chip.textContent = CATEGORIAS_CURADAS.includes(etq) ? t(`categorias.${etq}`) : etq;
      chip.addEventListener('click', () => { filtroActivo = etq; refrescarBiblioteca(); });
      filtroChips.appendChild(chip);
    });

    const visibles = filtroActivo ? medios.filter((m) => (m.etiquetas || []).includes(filtroActivo)) : medios;

    listaMedios.innerHTML = '';
    if (!visibles.length) {
      listaMedios.innerHTML = `<p class="vacio">${t('pictogramas.biblioteca_vacia_fotos')}</p>`;
      return;
    }
    visibles.forEach((medio) => {
      listaMedios.appendChild(crearMedioCard(medio, {
        origenClave: 'pictogramas.origen_foto',
        onCambio: refrescarBiblioteca
      }));
    });
  }

  raiz.append(seccionFoto, seccionBiblioteca);
  view.appendChild(raiz);

  await refrescarBiblioteca();

  return () => {
    cancelado = true;
  };
}
