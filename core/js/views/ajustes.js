// Pictosfera — vista "Ajustes" (zona del adulto).
//
// Idioma, voz, PIN parental, copia de seguridad y aviso de privacidad.
// Es parte del núcleo (no una app): puede hablar directamente con
// i18n, tts, pin y backup.

import { t, getLanguage, setLanguage, SUPPORTED_LANGS } from '../i18n.js';
import { puedeInstalar, esIOS, estaInstalada, instalar } from '../pwa.js';
import { navigate } from '../router.js';
import * as tts from '../tts.js';
import * as pin from '../pin.js';
import * as backup from '../backup.js';
import * as sounds from '../sounds.js';
import * as ajustesJuego from '../ajustesJuego.js';
import * as mediaLibrary from '../mediaLibrary.js';
import { loadDescriptors, nombreDescriptor } from '../appLoader.js';
import { pintarPanelAjustes, DEFINICIONES_AJUSTE } from '../ajustesCatalogo.js';

/** Repinta el panel de ajustes del juego `appId`, mostrando solo los
 *  campos que tienen sentido para su `mecanica`, leyendo y escribiendo
 *  cada uno en ajustesJuego.js (catálogo de campos: ajustesCatalogo.js). */
function pintarPanelAjustesJuego(panel, appId, mecanica) {
  pintarPanelAjustes(
    panel,
    mecanica,
    ajustesJuego.getAjustesPista(appId),
    (id, nuevoValor) => {
      const definicion = DEFINICIONES_AJUSTE.find((d) => d.id === id);
      if (definicion) ajustesJuego[definicion.setter](nuevoValor, appId);
    },
    'ajustes-juego'
  );
}

export async function render() {
  const view = document.getElementById('view');
  view.innerHTML = '';
  let cancelado = false;

  const raiz = document.createElement('div');
  raiz.className = 'zona-adulto card';

  const titulo = document.createElement('h1');
  titulo.textContent = t('ajustes.titulo');
  raiz.appendChild(titulo);

  // --- Idioma ---
  const seccionIdioma = document.createElement('section');
  const tituloIdioma = document.createElement('h2');
  tituloIdioma.textContent = t('ajustes.idioma');
  const ayudaIdioma = document.createElement('p');
  ayudaIdioma.className = 'ayuda';
  ayudaIdioma.textContent = t('ajustes.idioma_ayuda');

  const campoIdioma = document.createElement('div');
  campoIdioma.className = 'campo';
  const selectIdioma = document.createElement('select');
  SUPPORTED_LANGS.forEach((lang) => {
    const opt = document.createElement('option');
    opt.value = lang.code;
    opt.textContent = lang.nombre;
    if (lang.code === getLanguage()) opt.selected = true;
    selectIdioma.appendChild(opt);
  });
  campoIdioma.appendChild(selectIdioma);

  const avisoVoz = document.createElement('p');
  avisoVoz.className = 'aviso';

  async function refrescarAvisoVoz() {
    if (!tts.isSupported()) {
      avisoVoz.textContent = t('ajustes.voz_no_disponible');
      return;
    }
    const hayVoz = await tts.hasVoiceForActiveLanguage();
    if (cancelado) return;
    avisoVoz.textContent = hayVoz ? t('ajustes.voz_disponible') : t('ajustes.voz_no_disponible');
    avisoVoz.classList.toggle('aviso-atencion', !hayVoz);
  }

  selectIdioma.addEventListener('change', async () => {
    sounds.click();
    const nuevoIdioma = selectIdioma.value;
    await setLanguage(nuevoIdioma);
    // Los pictogramas que ya estaban guardados (el pozo, o los que ya
    // usa algún juego) se retraducen en segundo plano: no se bloquea
    // el cambio de idioma esperando a que ARASAAC responda por cada
    // uno. Si alguno falla o ARASAAC no tiene esa palabra en el nuevo
    // idioma, se queda con el nombre que ya tenía (ver mediaLibrary.js).
    mediaLibrary.actualizarIdiomaArasaac(nuevoIdioma).catch((err) => {
      console.warn('[ajustes] No se pudieron actualizar los nombres de los pictogramas:', err);
    });
    // Se navega a la misma ruta en vez de llamar a render() a pelo,
    // para que el router desmonte bien esta instancia (cancela sus
    // promesas pendientes) antes de montar la nueva: así no quedan
    // dos "render" de Ajustes vivos a la vez.
    navigate('/ajustes');
  });

  seccionIdioma.append(tituloIdioma, ayudaIdioma, campoIdioma, avisoVoz);

  // --- Ajustes de cada juego (cada uno guarda los suyos por separado:
  // ver core/js/ajustesJuego.js) ---
  const seccionPistas = document.createElement('section');
  const tituloPistas = document.createElement('h2');
  tituloPistas.textContent = t('ajustes.pistas_titulo');
  const ayudaPistas = document.createElement('p');
  ayudaPistas.className = 'ayuda';
  ayudaPistas.textContent = t('ajustes.pistas_ayuda');

  const campoSelectorJuego = document.createElement('div');
  campoSelectorJuego.className = 'campo';
  const labelSelectorJuego = document.createElement('label');
  labelSelectorJuego.htmlFor = 'ajustes-selector-juego';
  labelSelectorJuego.textContent = t('ajustes.pistas_elegir_juego');
  const selectorJuego = document.createElement('select');
  selectorJuego.id = 'ajustes-selector-juego';
  campoSelectorJuego.append(labelSelectorJuego, selectorJuego);

  const panelAjustesJuego = document.createElement('div');
  panelAjustesJuego.className = 'ajustes-panel-juego';

  selectorJuego.addEventListener('change', () => {
    sounds.click();
    const opcion = selectorJuego.selectedOptions[0];
    if (!opcion) return;
    pintarPanelAjustesJuego(panelAjustesJuego, opcion.value, opcion.dataset.mecanica);
  });

  async function cargarSelectorJuego() {
    const descriptores = await loadDescriptors();
    if (cancelado) return;
    selectorJuego.innerHTML = '';
    descriptores.forEach((descriptor) => {
      const opt = document.createElement('option');
      opt.value = descriptor.id;
      opt.dataset.mecanica = descriptor.mecanica;
      opt.textContent = nombreDescriptor(descriptor);
      selectorJuego.appendChild(opt);
    });
    if (descriptores.length) {
      pintarPanelAjustesJuego(panelAjustesJuego, descriptores[0].id, descriptores[0].mecanica);
    }
  }

  seccionPistas.append(tituloPistas, ayudaPistas, campoSelectorJuego, panelAjustesJuego);

  // --- PIN parental ---
  const seccionPin = document.createElement('section');
  const tituloPin = document.createElement('h2');
  tituloPin.textContent = t('ajustes.pin_titulo');
  const estadoPin = document.createElement('p');
  estadoPin.textContent = pin.hasPin() ? t('ajustes.pin_estado_activo') : t('ajustes.pin_estado_inactivo');
  const avisoPin = document.createElement('p');
  avisoPin.className = 'aviso';
  avisoPin.textContent = t('pin.aviso');

  const formPin = document.createElement('div');
  formPin.className = 'campo';
  const campoNuevoPin = document.createElement('div');
  campoNuevoPin.className = 'campo';
  const labelNuevoPin = document.createElement('label');
  labelNuevoPin.textContent = t('ajustes.pin_nuevo');
  const inputNuevoPin = document.createElement('input');
  inputNuevoPin.type = 'password';
  inputNuevoPin.inputMode = 'numeric';
  inputNuevoPin.maxLength = 4;
  campoNuevoPin.append(labelNuevoPin, inputNuevoPin);

  const campoConfirmarPin = document.createElement('div');
  campoConfirmarPin.className = 'campo';
  const labelConfirmarPin = document.createElement('label');
  labelConfirmarPin.textContent = t('ajustes.pin_confirmar');
  const inputConfirmarPin = document.createElement('input');
  inputConfirmarPin.type = 'password';
  inputConfirmarPin.inputMode = 'numeric';
  inputConfirmarPin.maxLength = 4;
  campoConfirmarPin.append(labelConfirmarPin, inputConfirmarPin);

  const errorPin = document.createElement('p');
  errorPin.className = 'pin-error';

  const btnGuardarPin = document.createElement('button');
  btnGuardarPin.type = 'button';
  btnGuardarPin.className = 'btn btn-secondary';
  btnGuardarPin.textContent = pin.hasPin() ? t('ajustes.pin_cambiar') : t('ajustes.pin_crear');
  btnGuardarPin.addEventListener('click', () => {
    errorPin.textContent = '';
    const a = inputNuevoPin.value.trim();
    const b = inputConfirmarPin.value.trim();
    if (!/^\d{4}$/.test(a)) {
      errorPin.textContent = t('ajustes.pin_invalido');
      return;
    }
    if (a !== b) {
      errorPin.textContent = t('ajustes.pin_no_coincide');
      return;
    }
    pin.setPin(a);
    sounds.acierto();
    inputNuevoPin.value = '';
    inputConfirmarPin.value = '';
    render();
  });

  const btnQuitarPin = document.createElement('button');
  btnQuitarPin.type = 'button';
  btnQuitarPin.className = 'btn btn-danger';
  btnQuitarPin.textContent = t('ajustes.pin_quitar');
  btnQuitarPin.hidden = !pin.hasPin();
  btnQuitarPin.addEventListener('click', () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(t('ajustes.pin_quitar'))) return;
    pin.removePin();
    sounds.click();
    render();
  });

  formPin.append(campoNuevoPin, campoConfirmarPin, errorPin, btnGuardarPin, btnQuitarPin);
  seccionPin.append(tituloPin, estadoPin, avisoPin, formPin);

  // --- Copia de seguridad ---
  const seccionCopia = document.createElement('section');
  const tituloCopia = document.createElement('h2');
  tituloCopia.textContent = t('ajustes.copia_titulo');
  const explicacionCopia = document.createElement('p');
  explicacionCopia.textContent = t('ajustes.copia_explicacion');
  const recuerdaCopia = document.createElement('p');
  recuerdaCopia.className = 'ayuda';
  recuerdaCopia.textContent = t('ajustes.copia_recuerda');

  const recordatorio = document.createElement('div');
  recordatorio.className = 'aviso aviso-atencion';
  recordatorio.hidden = true;
  const textoRecordatorio = document.createElement('p');
  textoRecordatorio.textContent = t('ajustes.recordatorio_copia');
  const botonesRecordatorio = document.createElement('div');
  const btnRecordatorioAhora = document.createElement('button');
  btnRecordatorioAhora.type = 'button';
  btnRecordatorioAhora.className = 'btn';
  btnRecordatorioAhora.textContent = t('ajustes.recordatorio_ahora');
  btnRecordatorioAhora.addEventListener('click', () => btnExportar.click());
  const btnRecordatorioLuego = document.createElement('button');
  btnRecordatorioLuego.type = 'button';
  btnRecordatorioLuego.className = 'btn btn-ghost';
  btnRecordatorioLuego.textContent = t('ajustes.recordatorio_luego');
  btnRecordatorioLuego.addEventListener('click', () => { recordatorio.hidden = true; });
  botonesRecordatorio.append(btnRecordatorioAhora, btnRecordatorioLuego);
  recordatorio.append(textoRecordatorio, botonesRecordatorio);

  const campoIncluirFotos = document.createElement('div');
  campoIncluirFotos.className = 'campo campo-checkbox';
  const checkFotos = document.createElement('input');
  checkFotos.type = 'checkbox';
  checkFotos.id = 'ajustes-incluir-fotos';
  const labelFotos = document.createElement('label');
  labelFotos.htmlFor = 'ajustes-incluir-fotos';
  labelFotos.textContent = t('ajustes.copia_incluir_fotos');
  campoIncluirFotos.append(checkFotos, labelFotos);

  const avisoFotos = document.createElement('p');
  avisoFotos.className = 'aviso';
  avisoFotos.textContent = t('ajustes.copia_incluir_fotos_aviso');
  avisoFotos.hidden = true;
  checkFotos.addEventListener('change', () => {
    avisoFotos.hidden = !checkFotos.checked;
  });

  const mensajeCopia = document.createElement('p');

  function marcarMensajeCopia(texto, ok) {
    mensajeCopia.textContent = texto;
    mensajeCopia.classList.toggle('mensaje-ok', ok);
    mensajeCopia.classList.toggle('pin-error', !ok);
  }

  const btnExportar = document.createElement('button');
  btnExportar.type = 'button';
  btnExportar.className = 'btn';
  btnExportar.textContent = t('ajustes.copia_exportar');
  btnExportar.addEventListener('click', async () => {
    try {
      await backup.exportarCopia({ incluirFotos: checkFotos.checked });
      sounds.acierto();
      marcarMensajeCopia(t('ajustes.copia_exito_exportar'), true);
      recordatorio.hidden = true;
    } catch (err) {
      marcarMensajeCopia(t('ajustes.copia_error'), false);
    }
  });

  const inputImportar = document.createElement('input');
  inputImportar.type = 'file';
  inputImportar.accept = 'application/json,.json';
  inputImportar.hidden = true;

  const btnImportar = document.createElement('button');
  btnImportar.type = 'button';
  btnImportar.className = 'btn btn-secondary';
  btnImportar.textContent = t('ajustes.copia_importar');
  btnImportar.addEventListener('click', () => inputImportar.click());

  inputImportar.addEventListener('change', async () => {
    const archivo = inputImportar.files && inputImportar.files[0];
    inputImportar.value = '';
    if (!archivo) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm(t('ajustes.copia_importar_confirmar'))) return;
    try {
      await backup.importarDesdeArchivo(archivo);
      sounds.acierto();
      marcarMensajeCopia(t('ajustes.copia_exito_importar'), true);
      recordatorio.hidden = true;
    } catch (err) {
      sounds.fallo();
      marcarMensajeCopia(t('ajustes.copia_error'), false);
    }
  });

  seccionCopia.append(
    tituloCopia,
    explicacionCopia,
    recuerdaCopia,
    recordatorio,
    campoIncluirFotos,
    avisoFotos,
    mensajeCopia,
    btnExportar,
    btnImportar,
    inputImportar
  );

  // --- Instalar app (PWA) ---
  const seccionInstalar = document.createElement('section');
  const tituloInstalar = document.createElement('h2');
  tituloInstalar.textContent = t('pwa.seccion_titulo');
  const textoInstalar = document.createElement('p');
  textoInstalar.textContent = t('pwa.seccion_texto');

  if (estaInstalada()) {
    // Ya instalada: solo mensaje informativo.
    const msgInstalada = document.createElement('p');
    msgInstalada.className = 'mensaje-ok';
    msgInstalada.textContent = t('pwa.ya_instalada');
    seccionInstalar.append(tituloInstalar, textoInstalar, msgInstalada);
  } else if (esIOS()) {
    // iOS: instrucciones manuales.
    const instrIOS = document.createElement('p');
    instrIOS.className = 'ayuda';
    instrIOS.textContent = t('pwa.instrucciones_ios');
    seccionInstalar.append(tituloInstalar, textoInstalar, instrIOS);
  } else if (puedeInstalar()) {
    // Chrome/Android: botón nativo.
    const msgPwa = document.createElement('p');
    msgPwa.className = 'ayuda';
    msgPwa.textContent = t('pwa.explicacion_boton');
    const btnInstalarAjustes = document.createElement('button');
    btnInstalarAjustes.type = 'button';
    btnInstalarAjustes.className = 'btn';
    btnInstalarAjustes.textContent = t('pwa.instalar');
    btnInstalarAjustes.addEventListener('click', async () => {
      sounds.click();
      const aceptado = await instalar();
      if (aceptado) {
        // Redibujar la sección tras la instalación.
        navigate('/ajustes');
      }
    });
    seccionInstalar.append(tituloInstalar, textoInstalar, msgPwa, btnInstalarAjustes);
  } else {
    // Navegador no soportado (Firefox, escritorio sin criterios PWA...).
    const msgNoDisp = document.createElement('p');
    msgNoDisp.className = 'ayuda';
    msgNoDisp.textContent = t('pwa.no_disponible');
    seccionInstalar.append(tituloInstalar, textoInstalar, msgNoDisp);
  }

  // --- Privacidad ---
  const seccionPrivacidad = document.createElement('section');
  const tituloPrivacidad = document.createElement('h2');
  tituloPrivacidad.textContent = t('ajustes.privacidad_titulo');
  const textoPrivacidad = document.createElement('p');
  textoPrivacidad.textContent = t('ajustes.privacidad_texto');
  seccionPrivacidad.append(tituloPrivacidad, textoPrivacidad);

  // Las secciones se agrupan en categorías colapsables para no saturar
  // la pantalla con todo a la vez: el adulto abre solo la que le
  // interesa en cada momento.
  function crearCategoria(claveTitulo, ...secciones) {
    const categoria = document.createElement('details');
    categoria.className = 'ajustes-categoria';
    const resumen = document.createElement('summary');
    resumen.textContent = t(claveTitulo);
    resumen.addEventListener('click', () => sounds.click());
    const contenido = document.createElement('div');
    contenido.className = 'ajustes-categoria-contenido';
    contenido.append(...secciones);
    categoria.append(resumen, contenido);
    return categoria;
  }

  raiz.append(
    crearCategoria('ajustes.cat_idioma', seccionIdioma),
    crearCategoria('ajustes.cat_juegos', seccionPistas),
    crearCategoria('ajustes.cat_seguridad', seccionPin),
    crearCategoria('ajustes.cat_copia', seccionCopia),
    crearCategoria('ajustes.cat_instalar', seccionInstalar),
    crearCategoria('ajustes.cat_privacidad', seccionPrivacidad)
  );
  view.appendChild(raiz);

  refrescarAvisoVoz();
  cargarSelectorJuego();
  backup.comprobarRecordatorio().then((hace) => {
    if (cancelado || !hace) return;
    recordatorio.hidden = false;
  });

  return () => {
    cancelado = true;
  };
}
