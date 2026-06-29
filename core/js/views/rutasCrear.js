// Pictosfera — vista "Crear/editar ruta guiada" (zona del adulto).
//
// Una sola pantalla sirve para crear (/rutas/crear) y editar
// (/rutas/editar/:id) una ruta: si llega un `id`, se carga esa ruta y
// se precargan su nombre y sus pasos; si no, se empieza en blanco.
//
// El adulto elige juegos de la lista completa (agrupada por estante,
// igual que en "Juegos") y pulsa "Añadir" en cada uno: eso abre una
// ventana de configuración con los mismos ajustes que tendría ese
// juego en "Ajustes de juegos" (ver core/js/ajustesCatalogo.js), pero
// guardados como un objeto propio de ESTA instancia dentro de ESTA
// ruta, totalmente independiente de la configuración directa del
// juego y de cualquier otra instancia (incluso del mismo juego
// repetido varias veces en la misma ruta: no hay límite de
// repeticiones). Los juegos añadidos forman una lista ordenada con
// flechas para reordenar, un lápiz para reabrir su configuración y una
// "✕" para quitarlos.

import { t } from '../i18n.js';
import { navigate } from '../router.js';
import { loadDescriptors, nombreDescriptor } from '../appLoader.js';
import { pintarPanelAjustes, valoresPorDefecto } from '../ajustesCatalogo.js';
import * as rutas from '../rutas.js';
import * as sounds from '../sounds.js';

const MENSAJES_ERROR_RUTA = {
  'falta-nombre': 'rutas.error_nombre',
  'pasos-insuficientes': 'rutas.error_pasos',
  'paso-invalido': 'rutas.error_pasos',
  'esa-ruta-no-existe': 'rutas.no_encontrada'
};

function nombreEstante(estante) {
  const clave = `estantes.${estante}`;
  const traducido = t(clave);
  return traducido === clave ? estante : traducido;
}

function agruparPorEstante(lista) {
  const orden = [];
  const grupos = new Map();
  lista.forEach((d) => {
    if (!grupos.has(d.estante)) {
      grupos.set(d.estante, []);
      orden.push(d.estante);
    }
    grupos.get(d.estante).push(d);
  });
  return orden.map((estante) => ({ estante, apps: grupos.get(estante) }));
}

/** Ventana modal para configurar una instancia de juego (al añadirlo o
 *  al editar una ya añadida). No sabe nada de dónde se guardará el
 *  resultado: solo construye el panel con ajustesCatalogo.js sobre una
 *  copia en memoria y resuelve la Promise con el objeto final (o
 *  `null` si se cancela). */
function abrirModalConfig({ descriptor, valoresIniciales, textoBoton }) {
  return new Promise((resolve) => {
    const root = document.getElementById('modal-root');
    if (!root) {
      resolve(null);
      return;
    }
    const valoresTrabajo = { ...(valoresIniciales || {}) };

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const box = document.createElement('div');
    box.className = 'modal-box modal-config-ruta';

    const cabecera = document.createElement('h2');
    cabecera.textContent = `${descriptor.icono || '🎮'} ${nombreDescriptor(descriptor)}`;

    const ayuda = document.createElement('p');
    ayuda.className = 'ayuda';
    ayuda.textContent = t('rutas.config_ayuda');

    const panel = document.createElement('div');
    pintarPanelAjustes(
      panel,
      descriptor.mecanica,
      valoresTrabajo,
      (campoId, nuevoValor) => {
        valoresTrabajo[campoId] = nuevoValor;
      },
      'ruta-config'
    );

    const botones = document.createElement('div');
    botones.className = 'modal-botones';

    function cerrar(resultado) {
      overlay.remove();
      resolve(resultado);
    }

    const btnCancelar = document.createElement('button');
    btnCancelar.type = 'button';
    btnCancelar.className = 'btn btn-ghost';
    btnCancelar.textContent = t('comunes.cancelar');
    btnCancelar.addEventListener('click', () => cerrar(null));

    const btnConfirmar = document.createElement('button');
    btnConfirmar.type = 'button';
    btnConfirmar.className = 'btn';
    btnConfirmar.textContent = textoBoton;
    btnConfirmar.addEventListener('click', () => {
      sounds.click();
      cerrar({ ...valoresTrabajo });
    });

    botones.append(btnCancelar, btnConfirmar);
    box.append(cabecera, ayuda, panel, botones);
    overlay.appendChild(box);
    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) cerrar(null);
    });
    root.appendChild(overlay);
  });
}

export async function render({ id } = {}) {
  const view = document.getElementById('view');
  view.innerHTML = '';
  let cancelado = false;
  const editandoRutaId = id || null;

  const raiz = document.createElement('div');
  raiz.className = 'zona-adulto card';
  view.appendChild(raiz);

  const volver = document.createElement('button');
  volver.type = 'button';
  volver.className = 'btn btn-ghost';
  volver.textContent = `← ${t('comunes.volver')}`;
  volver.addEventListener('click', () => navigate('/rutas'));
  raiz.appendChild(volver);

  const estado = document.createElement('p');
  estado.className = 'vacio';
  estado.textContent = t('comunes.cargando');
  raiz.appendChild(estado);

  let descriptores = [];
  let rutaExistente = null;
  try {
    descriptores = await loadDescriptors();
    if (editandoRutaId) {
      rutaExistente = await rutas.getById(editandoRutaId);
    }
  } catch (err) {
    if (cancelado) return undefined;
    estado.textContent = t('core.error_cargar_apps');
    return () => { cancelado = true; };
  }
  if (cancelado) return undefined;

  if (editandoRutaId && !rutaExistente) {
    estado.textContent = t('rutas.no_encontrada');
    return () => { cancelado = true; };
  }

  estado.remove();

  const descriptoresPorId = new Map(descriptores.map((d) => [d.id, d]));
  let pasosElegidos = rutaExistente
    ? rutaExistente.pasos.map((p) => ({ instanciaId: p.instanciaId, appId: p.appId, config: { ...p.config } }))
    : [];

  const titulo = document.createElement('h1');
  titulo.textContent = editandoRutaId ? t('rutas.titulo_editar') : t('rutas.titulo_crear');
  raiz.appendChild(titulo);

  if (editandoRutaId) {
    const avisoReinicio = document.createElement('p');
    avisoReinicio.className = 'aviso';
    avisoReinicio.textContent = t('rutas.aviso_editar_reinicia');
    raiz.appendChild(avisoReinicio);
  }

  const campoNombre = document.createElement('div');
  campoNombre.className = 'campo';
  const labelNombre = document.createElement('label');
  labelNombre.textContent = t('rutas.nombre');
  const inputNombre = document.createElement('input');
  inputNombre.type = 'text';
  inputNombre.placeholder = t('rutas.nombre_placeholder');
  inputNombre.value = rutaExistente ? rutaExistente.nombre : '';
  campoNombre.append(labelNombre, inputNombre);
  raiz.appendChild(campoNombre);

  const tituloPasos = document.createElement('h3');
  tituloPasos.textContent = t('rutas.pasos_titulo');
  const listaPasos = document.createElement('div');
  listaPasos.className = 'ruta-pasos';
  raiz.append(tituloPasos, listaPasos);

  function pintarPasosElegidos() {
    listaPasos.innerHTML = '';
    if (!pasosElegidos.length) {
      listaPasos.innerHTML = `<p class="vacio">${t('rutas.sin_pasos')}</p>`;
      return;
    }
    pasosElegidos.forEach((paso, indice) => {
      const descriptorPaso = descriptoresPorId.get(paso.appId);
      const fila = document.createElement('div');
      fila.className = 'ruta-paso';

      const orden = document.createElement('span');
      orden.className = 'ruta-paso-orden';
      orden.textContent = String(indice + 1);

      const icono = document.createElement('span');
      icono.className = 'ruta-paso-icono';
      icono.setAttribute('aria-hidden', 'true');
      icono.textContent = descriptorPaso ? (descriptorPaso.icono || '🎮') : '❓';

      const nombre = document.createElement('span');
      nombre.className = 'ruta-paso-nombre';
      nombre.textContent = descriptorPaso ? nombreDescriptor(descriptorPaso) : t('rutas.paso_roto');

      const btnSubir = document.createElement('button');
      btnSubir.type = 'button';
      btnSubir.className = 'ruta-paso-mover';
      btnSubir.setAttribute('aria-label', t('rutas.paso_subir'));
      btnSubir.textContent = '⬆️';
      btnSubir.disabled = indice === 0;
      btnSubir.addEventListener('click', () => {
        sounds.click();
        [pasosElegidos[indice - 1], pasosElegidos[indice]] = [pasosElegidos[indice], pasosElegidos[indice - 1]];
        pintarPasosElegidos();
      });

      const btnBajar = document.createElement('button');
      btnBajar.type = 'button';
      btnBajar.className = 'ruta-paso-mover';
      btnBajar.setAttribute('aria-label', t('rutas.paso_bajar'));
      btnBajar.textContent = '⬇️';
      btnBajar.disabled = indice === pasosElegidos.length - 1;
      btnBajar.addEventListener('click', () => {
        sounds.click();
        [pasosElegidos[indice + 1], pasosElegidos[indice]] = [pasosElegidos[indice], pasosElegidos[indice + 1]];
        pintarPasosElegidos();
      });

      const btnEditar = document.createElement('button');
      btnEditar.type = 'button';
      btnEditar.className = 'ruta-paso-editar';
      btnEditar.setAttribute('aria-label', t('rutas.paso_editar'));
      btnEditar.textContent = '✏️';
      btnEditar.disabled = !descriptorPaso;
      btnEditar.addEventListener('click', async () => {
        if (!descriptorPaso) return;
        sounds.click();
        const config = await abrirModalConfig({
          descriptor: descriptorPaso,
          valoresIniciales: paso.config,
          textoBoton: t('rutas.config_guardar')
        });
        if (!config) return;
        paso.config = config;
        pintarPasosElegidos();
      });

      const btnQuitar = document.createElement('button');
      btnQuitar.type = 'button';
      btnQuitar.className = 'ruta-paso-quitar';
      btnQuitar.setAttribute('aria-label', t('comunes.cerrar'));
      btnQuitar.textContent = '✕';
      btnQuitar.addEventListener('click', () => {
        sounds.click();
        pasosElegidos.splice(indice, 1);
        pintarPasosElegidos();
      });

      const botones = document.createElement('div');
      botones.className = 'ruta-paso-botones';
      botones.append(btnSubir, btnBajar, btnEditar, btnQuitar);

      fila.append(orden, icono, nombre, botones);
      listaPasos.appendChild(fila);
    });
  }

  const tituloElegir = document.createElement('h3');
  tituloElegir.textContent = t('rutas.elegir_titulo');
  raiz.appendChild(tituloElegir);

  agruparPorEstante(descriptores).forEach(({ estante, apps }) => {
    const seccionEstante = document.createElement('section');
    seccionEstante.className = 'estante';
    const tituloEstanteEl = document.createElement('h4');
    tituloEstanteEl.className = 'estante-titulo';
    tituloEstanteEl.textContent = nombreEstante(estante);

    const grid = document.createElement('div');
    grid.className = 'app-grid';

    apps.forEach((descriptor) => {
      const card = document.createElement('div');
      card.className = 'app-card ruta-juego-card';

      const icono = document.createElement('span');
      icono.className = 'app-icon';
      icono.setAttribute('aria-hidden', 'true');
      icono.textContent = descriptor.icono || '🎮';

      const nombre = document.createElement('span');
      nombre.textContent = nombreDescriptor(descriptor);

      const btnAnadir = document.createElement('button');
      btnAnadir.type = 'button';
      btnAnadir.className = 'btn btn-anadir-juego';
      btnAnadir.textContent = t('rutas.anadir_boton');
      // No se deshabilita nunca: una ruta puede repetir el mismo juego
      // varias veces, cada vez con su propia configuración.
      btnAnadir.addEventListener('click', async () => {
        sounds.click();
        const config = await abrirModalConfig({
          descriptor,
          valoresIniciales: valoresPorDefecto(descriptor.mecanica),
          textoBoton: t('rutas.config_anadir')
        });
        if (!config) return;
        pasosElegidos.push(rutas.crearPaso(descriptor.id, config));
        pintarPasosElegidos();
      });

      card.append(icono, nombre, btnAnadir);
      grid.appendChild(card);
    });

    seccionEstante.append(tituloEstanteEl, grid);
    raiz.appendChild(seccionEstante);
  });

  const errorRuta = document.createElement('p');
  errorRuta.className = 'pin-error';
  raiz.appendChild(errorRuta);

  const btnGuardar = document.createElement('button');
  btnGuardar.type = 'button';
  btnGuardar.className = 'btn btn-secondary';
  btnGuardar.textContent = editandoRutaId ? t('rutas.guardar_cambios') : t('rutas.guardar');
  btnGuardar.addEventListener('click', async () => {
    errorRuta.textContent = '';
    const nombre = inputNombre.value.trim();

    if (pasosElegidos.length >= rutas.MIN_PASOS) {
      const resumen = pasosElegidos
        .map((paso, indice) => {
          const descriptorPaso = descriptoresPorId.get(paso.appId);
          return `${indice + 1}. ${descriptorPaso ? nombreDescriptor(descriptorPaso) : t('rutas.paso_roto')}`;
        })
        .join('\n');
      // eslint-disable-next-line no-alert
      const confirma = window.confirm(t('rutas.confirmar_guardar', { n: pasosElegidos.length, resumen }));
      if (!confirma) return;
    }

    try {
      const datos = { nombre, pasos: pasosElegidos };
      if (editandoRutaId) {
        await rutas.actualizarRuta(editandoRutaId, datos);
      } else {
        await rutas.crearRuta(datos);
      }
      sounds.acierto();
      navigate('/rutas');
    } catch (err) {
      const clave = MENSAJES_ERROR_RUTA[err.message];
      errorRuta.textContent = clave ? t(clave, { n: rutas.MIN_PASOS }) : t('comunes.error_generico');
    }
  });
  raiz.appendChild(btnGuardar);

  pintarPasosElegidos();

  return () => {
    cancelado = true;
  };
}
