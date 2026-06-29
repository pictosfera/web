// Pictosfera — tarjeta reutilizable de un medio de la biblioteca.
//
// Pinta una imagen, un nombre editable y un botón de borrar para un
// medio (foto propia o pictograma de ARASAAC). La usan tanto la vista
// "Pictogramas" (ARASAAC) como "Imágenes propias": ambas comparten el
// mismo "look" de tarjeta y solo cambian en qué subconjunto de la
// biblioteca enseñan (filtrado por origen en cada vista, no aquí).
import { t } from '../i18n.js';
import * as mediaLibrary from '../mediaLibrary.js';
import * as sounds from '../sounds.js';

/**
 * @param {object} medio
 * @param {object} opciones
 * @param {string} opciones.origenClave clave i18n para la etiqueta de origen
 *   (p.ej. 'pictogramas.origen_arasaac' o 'pictogramas.origen_foto').
 * @param {() => void} opciones.onCambio se llama tras renombrar o borrar,
 *   para que la vista que llama vuelva a pintar su lista.
 */
export function crearMedioCard(medio, { origenClave, onCambio }) {
  const card = document.createElement('div');
  card.className = 'medio-card';
  const img = document.createElement('img');
  img.src = mediaLibrary.getDisplayUrl(medio);
  img.alt = medio.nombre;

  // El nombre del medio es editable: empieza como texto + botón de
  // lápiz; al pulsarlo se convierte en un campo de texto que guarda
  // con mediaLibrary.actualizarMedio() al confirmar.
  const nombre = document.createElement('div');
  nombre.className = 'medio-nombre';

  const textoNombre = document.createElement('span');
  textoNombre.className = 'medio-nombre-texto';
  textoNombre.textContent = medio.nombre;

  const btnEditarNombre = document.createElement('button');
  btnEditarNombre.type = 'button';
  btnEditarNombre.className = 'medio-editar-nombre';
  btnEditarNombre.setAttribute('aria-label', t('pictogramas.editar_nombre'));
  btnEditarNombre.textContent = '✏️';
  btnEditarNombre.addEventListener('click', () => {
    sounds.click();
    let resuelto = false;

    const inputNombreMedio = document.createElement('input');
    inputNombreMedio.type = 'text';
    inputNombreMedio.className = 'medio-nombre-input';
    inputNombreMedio.value = medio.nombre;

    async function confirmar() {
      if (resuelto) return;
      resuelto = true;
      const nuevoNombre = inputNombreMedio.value.trim();
      if (nuevoNombre && nuevoNombre !== medio.nombre) {
        await mediaLibrary.actualizarMedio(medio.id, { nombre: nuevoNombre });
        sounds.acierto();
      }
      onCambio();
    }

    function cancelar() {
      if (resuelto) return;
      resuelto = true;
      onCambio();
    }

    inputNombreMedio.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); confirmar(); }
      if (ev.key === 'Escape') { ev.preventDefault(); cancelar(); }
    });
    inputNombreMedio.addEventListener('blur', confirmar);

    nombre.innerHTML = '';
    nombre.appendChild(inputNombreMedio);
    inputNombreMedio.focus();
    inputNombreMedio.select();
  });

  nombre.append(textoNombre, btnEditarNombre);

  const origen = document.createElement('div');
  origen.className = 'medio-origen';
  origen.textContent = t(origenClave);

  const btnBorrar = document.createElement('button');
  btnBorrar.type = 'button';
  btnBorrar.className = 'medio-borrar';
  btnBorrar.setAttribute('aria-label', t('comunes.cerrar'));
  btnBorrar.textContent = '✕';
  btnBorrar.addEventListener('click', async () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(t('pictogramas.borrar_medio_confirmar'))) return;
    await mediaLibrary.removeMedio(medio.id);
    onCambio();
  });

  card.append(btnBorrar, img, nombre, origen);
  return card;
}
