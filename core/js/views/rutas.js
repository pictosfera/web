// Pictosfera — vista "Rutas de aprendizaje" (zona del adulto): pantalla principal.
//
// Una ruta de aprendizaje es un itinerario guiado: una lista ordenada
// de juegos, cada uno con su propia configuración (ver
// core/js/rutas.js), que el niño juega en orden. El adulto puede crear
// tantas rutas como quiera desde aquí; cada una aparece luego en
// "Inicio" como una tarjeta más, junto al acceso normal a Juegos.

import { t } from '../i18n.js';
import { navigate } from '../router.js';
import * as rutas from '../rutas.js';
import * as sounds from '../sounds.js';
import { cargarContenidoComunidad } from '../contentLoader.js';

export async function render() {
  const view = document.getElementById('view');
  view.innerHTML = '';
  let cancelado = false;

  const raiz = document.createElement('div');
  raiz.className = 'zona-adulto card';

  const titulo = document.createElement('h1');
  titulo.textContent = t('rutas.titulo');
  raiz.appendChild(titulo);

  const explicacion = document.createElement('p');
  explicacion.className = 'ayuda';
  explicacion.textContent = t('rutas.explicacion');
  raiz.appendChild(explicacion);

  const btnCrear = document.createElement('button');
  btnCrear.type = 'button';
  btnCrear.className = 'btn';
  btnCrear.textContent = t('rutas.crear_boton');
  btnCrear.addEventListener('click', () => {
    sounds.click();
    navigate('/rutas/crear');
  });
  raiz.appendChild(btnCrear);

  // --- Botón "Cargar contenido de la comunidad" ---
  const btnComunidad = document.createElement('button');
  btnComunidad.type = 'button';
  btnComunidad.className = 'btn btn-comunidad';
  btnComunidad.textContent = t('contentLoader.boton');
  btnComunidad.addEventListener('click', async () => {
    btnComunidad.disabled = true;
    const textoOriginal = btnComunidad.textContent;
    btnComunidad.textContent = t('contentLoader.cargando');
    const r = await cargarContenidoComunidad();
    btnComunidad.disabled = false;
    btnComunidad.textContent = textoOriginal;
    const total = r.mediosNuevos + r.secuenciasNuevas + r.categoriasNuevas + r.rutasNuevas;
    if (r.error) {
      alert(t('contentLoader.error', { detalle: r.error }));
    } else if (total === 0) {
      alert(t('contentLoader.sin_novedades'));
    } else {
      alert(t('contentLoader.exito', {
        medios:     r.mediosNuevos,
        secuencias: r.secuenciasNuevas,
        categorias: r.categoriasNuevas,
        rutas:      r.rutasNuevas
      }));
      await refrescar();
    }
  });
  raiz.appendChild(btnComunidad);

  const tituloLista = document.createElement('h3');
  tituloLista.textContent = t('rutas.mis_rutas');
  raiz.appendChild(tituloLista);

  const lista = document.createElement('div');
  lista.className = 'rutas-lista';
  raiz.appendChild(lista);

  async function refrescar() {
    const todas = await rutas.listAll();
    if (cancelado) return;
    lista.innerHTML = '';
    if (!todas.length) {
      lista.innerHTML = `<p class="vacio">${t('rutas.vacio')}</p>`;
      return;
    }
    todas.forEach((ruta) => {
      const card = document.createElement('div');
      card.className = 'ruta-card';

      const cabecera = document.createElement('div');
      cabecera.className = 'ruta-card-cabecera';
      const nombreSpan = document.createElement('span');
      nombreSpan.className = 'ruta-card-nombre';
      nombreSpan.textContent = ruta.nombre;
      const pasosSpan = document.createElement('span');
      pasosSpan.className = 'ruta-card-pasos';
      pasosSpan.textContent = t('rutas.numero_pasos', { n: ruta.pasos.length });
      cabecera.append(nombreSpan, pasosSpan);

      const btnEditar = document.createElement('button');
      btnEditar.type = 'button';
      btnEditar.className = 'ruta-card-editar';
      btnEditar.setAttribute('aria-label', t('rutas.editar'));
      btnEditar.textContent = '✏️';
      btnEditar.addEventListener('click', () => {
        sounds.click();
        navigate(`/rutas/editar/${ruta.id}`);
      });

      const btnBorrar = document.createElement('button');
      btnBorrar.type = 'button';
      btnBorrar.className = 'ruta-card-borrar';
      btnBorrar.setAttribute('aria-label', t('comunes.cerrar'));
      btnBorrar.textContent = '✕';
      btnBorrar.addEventListener('click', async () => {
        // eslint-disable-next-line no-alert
        if (!window.confirm(t('rutas.borrar_confirmar'))) return;
        await rutas.eliminarRuta(ruta.id);
        sounds.click();
        await refrescar();
      });

      const acciones = document.createElement('div');
      acciones.className = 'ruta-card-acciones';
      acciones.append(btnEditar, btnBorrar);

      card.append(cabecera, acciones);
      lista.appendChild(card);
    });
  }

  view.appendChild(raiz);
  await refrescar();

  return () => {
    cancelado = true;
  };
}
