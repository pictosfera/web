// Pictosfera — núcleo: puerta de entrada.
//
// Pantalla previa a todo lo demás, incluso al paseo de bienvenida
// (ver welcome.js): un único botón "Empezar" cuyo objetivo real es
// captar el primer toque para poder pedir pantalla completa (ver
// fullscreen.js — pedirla SIN un toque real del usuario no funciona
// en ningún navegador).
//
// A diferencia del paseo de bienvenida, esta puerta se muestra SIEMPRE
// al abrir el portal, no solo la primera vez: la pantalla completa no
// se recuerda entre visitas, así que hay que volver a pedirla cada vez.

import { t } from './i18n.js';
import { activarPantallaCompleta, vigilarPantallaCompleta } from './fullscreen.js';

const LOGO_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%233D8BD4'/%3E%3Ccircle cx='50' cy='40' r='18' fill='white'/%3E%3Crect x='25' y='62' width='50' height='28' rx='10' fill='white'/%3E%3C/svg%3E";

/**
 * Muestra la puerta y llama a "continuar" en cuanto se toca
 * "Empezar". Si no hay sitio donde montarla (modal-root no existe),
 * se llama a "continuar" directamente para no bloquear el portal.
 */
export function mostrarPuerta(continuar) {
  const root = document.getElementById('modal-root');
  if (!root) {
    continuar();
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'puerta-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', t('puerta.titulo'));

  const box = document.createElement('div');
  box.className = 'puerta-box';

  const logo = document.createElement('img');
  logo.className = 'puerta-logo';
  logo.alt = '';
  logo.setAttribute('aria-hidden', 'true');
  logo.src = LOGO_SVG;

  const titulo = document.createElement('h2');
  titulo.textContent = t('puerta.titulo');

  const texto = document.createElement('p');
  texto.textContent = t('puerta.texto');

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn puerta-btn';
  btn.textContent = t('bienvenida.empezar');

  btn.addEventListener('click', () => {
    activarPantallaCompleta();
    vigilarPantallaCompleta();
    overlay.remove();
    continuar();
  });

  box.append(logo, titulo, texto, btn);
  overlay.appendChild(box);
  root.appendChild(overlay);
  btn.focus();
}
