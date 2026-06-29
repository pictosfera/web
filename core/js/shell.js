// Pictosfera — núcleo: shell de navegación.
//
// Navegación idéntica en todas las apps: Inicio, Juegos, Pictogramas,
// Ajustes. "Pictogramas" y "Ajustes" son tareas del adulto y, si hay
// PIN configurado, lo piden antes de entrar (decisión tomada con el
// autor: visibles siempre, con PIN al tocarlas).

import { t, onLanguageChange } from './i18n.js';
import { navigate, getCurrentPath } from './router.js';
import { hasPin, requestPinChallenge } from './pin.js';
import { unlock as unlockAudio } from './sounds.js';

const NAV_ITEMS = [
  { route: '/inicio', icon: '🏠', labelKey: 'nav.inicio', adult: false },
  { route: '/juegos', icon: '🎮', labelKey: 'nav.juegos', adult: false },
  { route: '/pictogramas', icon: '🖼️', labelKey: 'nav.pictogramas', adult: true },
  { route: '/rutas', icon: '🧭', labelKey: 'nav.rutas', adult: true },
  { route: '/ajustes', icon: '⚙️', labelKey: 'nav.ajustes', adult: true }
];

function isActive(route) {
  const current = getCurrentPath();
  return current === route || current.startsWith(`${route}/`);
}

function buildButton(item) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `nav-btn${item.adult ? ' nav-btn-adult' : ''}`;
  btn.dataset.route = item.route;
  if (isActive(item.route)) btn.setAttribute('aria-current', 'page');

  const icon = document.createElement('span');
  icon.className = 'nav-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = item.icon;

  const label = document.createElement('span');
  label.className = 'nav-label';
  label.textContent = t(item.labelKey);

  btn.append(icon, label);

  if (item.adult && hasPin()) {
    const lock = document.createElement('span');
    lock.className = 'nav-lock';
    lock.setAttribute('aria-hidden', 'true');
    lock.textContent = '🔒';
    btn.appendChild(lock);
  }

  btn.addEventListener('click', async () => {
    unlockAudio();
    if (item.adult && hasPin()) {
      const ok = await requestPinChallenge();
      if (!ok) return;
    }
    navigate(item.route);
  });

  return btn;
}

function paint() {
  const tabbar = document.getElementById('tabbar');
  const sidebar = document.getElementById('sidebar');
  if (!tabbar || !sidebar) return;
  tabbar.innerHTML = '';
  sidebar.innerHTML = '';
  NAV_ITEMS.forEach((item) => {
    tabbar.appendChild(buildButton(item));
    sidebar.appendChild(buildButton(item));
  });
}

export function initShell() {
  paint();
  window.addEventListener('hashchange', paint);
  onLanguageChange(paint);
}
