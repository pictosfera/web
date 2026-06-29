// Pictosfera — núcleo: PIN parental.
//
// Aviso honesto (ver definición del proyecto): el PIN es un pestillo
// para que un niño pequeño no entre por error en la zona del adulto.
// NO es seguridad real: se guarda en claro en este mismo dispositivo
// y cualquier persona con acceso al navegador podría inspeccionarlo.

import { t } from './i18n.js';
import * as sounds from './sounds.js';

const STORAGE_KEY = 'pictosfera.pin';

export function hasPin() {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY));
  } catch {
    return false;
  }
}

export function setPin(pin) {
  if (!/^\d{4}$/.test(pin)) throw new Error('invalid-pin');
  localStorage.setItem(STORAGE_KEY, pin);
}

/** Valor en crudo del PIN guardado (o null). Lo usa backup.js para
 *  incluirlo en la copia de seguridad; no lo uses para nada más. */
export function getRaw() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function removePin() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

export function verifyPin(input) {
  try {
    return localStorage.getItem(STORAGE_KEY) === input;
  } catch {
    return false;
  }
}

function modalRoot() {
  return document.getElementById('modal-root');
}

/**
 * Muestra el teclado numérico y resuelve `true` si el PIN es correcto
 * (o si no hay PIN configurado: en ese caso deja pasar directamente).
 * Resuelve `false` si el usuario cancela.
 */
export function requestPinChallenge() {
  if (!hasPin()) return Promise.resolve(true);

  return new Promise((resolve) => {
    let entrada = '';
    const root = modalRoot();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const box = document.createElement('div');
    box.className = 'modal-box';

    const titulo = document.createElement('h2');
    titulo.textContent = t('pin.titulo');

    const subtitulo = document.createElement('p');
    subtitulo.textContent = t('pin.subtitulo');

    const dots = document.createElement('div');
    dots.className = 'pin-dots';
    for (let i = 0; i < 4; i++) {
      const dot = document.createElement('span');
      dot.className = 'pin-dot';
      dots.appendChild(dot);
    }

    const error = document.createElement('p');
    error.className = 'pin-error';

    const pad = document.createElement('div');
    pad.className = 'pin-pad';

    function pintarDots() {
      Array.from(dots.children).forEach((dot, i) => {
        dot.classList.toggle('lleno', i < entrada.length);
      });
    }

    function cerrar(resultado) {
      overlay.remove();
      resolve(resultado);
    }

    function comprobar() {
      if (entrada.length !== 4) return;
      if (verifyPin(entrada)) {
        sounds.acierto();
        cerrar(true);
      } else {
        sounds.fallo();
        error.textContent = t('pin.error');
        entrada = '';
        pintarDots();
      }
    }

    function pulsar(digito) {
      sounds.click();
      if (entrada.length >= 4) return;
      entrada += digito;
      error.textContent = '';
      pintarDots();
      if (entrada.length === 4) comprobar();
    }

    for (let n = 1; n <= 9; n++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = String(n);
      btn.addEventListener('click', () => pulsar(String(n)));
      pad.appendChild(btn);
    }
    const btnCancelar = document.createElement('button');
    btnCancelar.type = 'button';
    btnCancelar.textContent = t('pin.cancelar');
    btnCancelar.addEventListener('click', () => cerrar(false));
    pad.appendChild(btnCancelar);

    const btn0 = document.createElement('button');
    btn0.type = 'button';
    btn0.textContent = '0';
    btn0.addEventListener('click', () => pulsar('0'));
    pad.appendChild(btn0);

    const btnBorrar = document.createElement('button');
    btnBorrar.type = 'button';
    btnBorrar.textContent = t('pin.borrar');
    btnBorrar.addEventListener('click', () => {
      sounds.click();
      entrada = entrada.slice(0, -1);
      error.textContent = '';
      pintarDots();
    });
    pad.appendChild(btnBorrar);

    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) cerrar(false);
    });

    box.append(titulo, subtitulo, dots, error, pad);
    overlay.appendChild(box);
    root.appendChild(overlay);
  });
}
