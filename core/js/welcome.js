// Pictosfera — núcleo: paseo de bienvenida.
//
// Se muestra una sola vez, la primera vez que se abre el portal en
// este dispositivo: qué es Pictosfera, dónde se guarda el material y
// que conviene hacer copias de seguridad. No bloquea nada más: el
// adulto puede cerrarlo en cualquier momento avanzando hasta el final.

import { t } from './i18n.js';
import * as sounds from './sounds.js';

const CLAVE = 'pictosfera.bienvenidaVista';

const TARJETAS = [
  { titulo: 'bienvenida.titulo_1', texto: 'bienvenida.texto_1' },
  { titulo: 'bienvenida.titulo_2', texto: 'bienvenida.texto_2' },
  { titulo: 'bienvenida.titulo_3', texto: 'bienvenida.texto_3' }
];

function yaVista() {
  try {
    return localStorage.getItem(CLAVE) === '1';
  } catch {
    return true;
  }
}

function marcarVista() {
  try {
    localStorage.setItem(CLAVE, '1');
  } catch {
    /* ignore */
  }
}

function mostrar() {
  const root = document.getElementById('modal-root');
  if (!root) return;
  let paso = 0;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const box = document.createElement('div');
  box.className = 'modal-box';

  const titulo = document.createElement('h2');
  const texto = document.createElement('p');

  const puntos = document.createElement('div');
  puntos.className = 'pin-dots';
  TARJETAS.forEach(() => {
    const punto = document.createElement('span');
    punto.className = 'pin-dot';
    puntos.appendChild(punto);
  });

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn';

  const btnSaltar = document.createElement('button');
  btnSaltar.type = 'button';
  btnSaltar.className = 'btn btn-ghost';
  btnSaltar.textContent = t('comunes.cerrar');
  btnSaltar.addEventListener('click', cerrar);

  function pintar() {
    titulo.textContent = t(TARJETAS[paso].titulo);
    texto.textContent = t(TARJETAS[paso].texto);
    Array.from(puntos.children).forEach((punto, i) => punto.classList.toggle('lleno', i === paso));
    btn.textContent = paso === TARJETAS.length - 1 ? t('bienvenida.empezar') : t('comunes.aceptar');
  }

  function cerrar() {
    marcarVista();
    overlay.remove();
  }

  btn.addEventListener('click', () => {
    sounds.click();
    if (paso < TARJETAS.length - 1) {
      paso += 1;
      pintar();
    } else {
      cerrar();
    }
  });

  pintar();
  box.append(titulo, texto, puntos, btn, btnSaltar);
  overlay.appendChild(box);
  root.appendChild(overlay);
}

/** Se llama una vez al arrancar el portal; no hace nada si ya se vio antes. */
export function maybeShowWelcome() {
  if (yaVista()) return;
  mostrar();
}
