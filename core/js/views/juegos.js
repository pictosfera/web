// Pictosfera — vista "Juegos".
//
// Pinta los estantes y, dentro de cada uno, las apps disponibles según
// data/apps.json. Tocar una app lleva a /juegos/:id, que es quien
// realmente carga su código (aquí solo se pintan las tarjetas).
//
// Incluye también el interruptor de "acceso libre" (protegido por
// PIN, ver core/js/rutas.js): si el adulto lo desactiva, el niño puede
// seguir entrando aquí, pero todos los juegos se ven en gris y tocar
// cualquiera le lleva a Inicio en vez de abrirlo. Pensado para cuando
// el adulto quiere que el niño solo juegue a través de las rutas
// guiadas.

import { t } from '../i18n.js';
import { navigate } from '../router.js';
import { getAppsGroupedByEstante, nombreDescriptor } from '../appLoader.js';
import { hasPin, requestPinChallenge } from '../pin.js';
import * as rutas from '../rutas.js';
import * as sounds from '../sounds.js';

function nombreEstante(estante) {
  const clave = `estantes.${estante}`;
  const traducido = t(clave);
  return traducido === clave ? estante : traducido;
}

export async function render() {
  const view = document.getElementById('view');
  view.innerHTML = '';
  let cancelado = false;

  const raiz = document.createElement('div');
  const titulo = document.createElement('h1');
  titulo.textContent = t('juegos.titulo');
  raiz.appendChild(titulo);

  // --- interruptor de acceso libre (protegido por PIN) ---
  const campoInterruptor = document.createElement('div');
  campoInterruptor.className = 'campo campo-checkbox juegos-interruptor';
  const checkAcceso = document.createElement('input');
  checkAcceso.type = 'checkbox';
  checkAcceso.id = 'juegos-acceso-libre';
  checkAcceso.checked = rutas.getAccesoLibreJuegos();
  const labelAcceso = document.createElement('label');
  labelAcceso.htmlFor = checkAcceso.id;
  labelAcceso.textContent = t('juegos.interruptor_titulo');
  campoInterruptor.append(checkAcceso, labelAcceso);
  if (hasPin()) {
    const lock = document.createElement('span');
    lock.className = 'nav-lock';
    lock.setAttribute('aria-hidden', 'true');
    lock.textContent = '🔒';
    campoInterruptor.appendChild(lock);
  }
  const ayudaInterruptor = document.createElement('p');
  ayudaInterruptor.className = 'ayuda';
  ayudaInterruptor.textContent = t('juegos.interruptor_ayuda');
  raiz.append(campoInterruptor, ayudaInterruptor);

  checkAcceso.addEventListener('change', async () => {
    const nuevoValor = checkAcceso.checked;
    checkAcceso.checked = !nuevoValor; // revertir hasta confirmar el PIN
    if (hasPin()) {
      const ok = await requestPinChallenge();
      if (cancelado || !ok) return;
    }
    sounds.click();
    rutas.setAccesoLibreJuegos(nuevoValor);
    checkAcceso.checked = nuevoValor;
    pintarGrupos();
  });

  const estado = document.createElement('p');
  estado.className = 'vacio';
  estado.textContent = t('juegos.cargando');
  raiz.appendChild(estado);

  const contenedorEstantes = document.createElement('div');
  raiz.appendChild(contenedorEstantes);
  view.appendChild(raiz);

  let grupos = [];
  try {
    grupos = await getAppsGroupedByEstante();
  } catch (err) {
    if (cancelado) return undefined;
    estado.textContent = t('core.error_cargar_apps');
    return () => { cancelado = true; };
  }
  if (cancelado) return undefined;

  estado.remove();

  function pintarGrupos() {
    contenedorEstantes.innerHTML = '';
    const accesoLibre = rutas.getAccesoLibreJuegos();

    if (!grupos.length) {
      const vacio = document.createElement('p');
      vacio.className = 'vacio';
      vacio.textContent = t('juegos.vacio');
      contenedorEstantes.appendChild(vacio);
      return;
    }

    grupos.forEach(({ estante, apps }) => {
      const seccion = document.createElement('section');
      seccion.className = 'estante';

      const tituloEstante = document.createElement('h2');
      tituloEstante.className = 'estante-titulo';
      tituloEstante.textContent = nombreEstante(estante);

      const grid = document.createElement('div');
      grid.className = 'app-grid';

      apps.forEach((app) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = accesoLibre ? 'app-card' : 'app-card app-card-bloqueado';
        if (!accesoLibre) card.setAttribute('aria-label', `${nombreDescriptor(app)} (${t('juegos.interruptor_bloqueado')})`);

        const icono = document.createElement('span');
        icono.className = 'app-icon';
        icono.setAttribute('aria-hidden', 'true');
        icono.textContent = app.icono || '🎮';

        const nombre = document.createElement('span');
        nombre.textContent = nombreDescriptor(app);

        card.append(icono, nombre);
        card.addEventListener('click', () => {
          sounds.click();
          if (accesoLibre) navigate(`/juegos/${app.id}`);
          else navigate('/inicio');
        });
        grid.appendChild(card);
      });

      seccion.append(tituloEstante, grid);
      contenedorEstantes.appendChild(seccion);
    });
  }

  pintarGrupos();

  return () => {
    cancelado = true;
  };
}
