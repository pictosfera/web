// Pictosfera — núcleo: pie de página (créditos y licencias).
//
// Vive en #app-footer, fuera de #view (ver index.html), así que se ve
// siempre en la parte inferior de TODAS las secciones del portal sin
// que cada vista tenga que añadirlo por su cuenta. Se repinta al
// cambiar de idioma, igual que el shell de navegación (shell.js).

import { t, onLanguageChange } from './i18n.js';

const LICENCIA_URL = 'https://creativecommons.org/licenses/by/4.0/deed.es';
const ARASAAC_URL = 'https://arasaac.org';

function buildLinea(textKey, linkKey, href) {
  const p = document.createElement('p');
  p.className = 'app-footer-linea';
  p.append(document.createTextNode(`${t(textKey)} `));

  const link = document.createElement('a');
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = t(linkKey);
  p.appendChild(link);

  return p;
}

function paint() {
  const footer = document.getElementById('app-footer');
  if (!footer) return;
  footer.innerHTML = '';

  const autor = document.createElement('p');
  autor.className = 'app-footer-linea';
  autor.textContent = t('footer.autor');
  footer.appendChild(autor);

  footer.appendChild(buildLinea('footer.licencia', 'footer.licencia_enlace', LICENCIA_URL));
  footer.appendChild(buildLinea('footer.arasaac', 'footer.arasaac_enlace', ARASAAC_URL));
}

export function initFooter() {
  paint();
  onLanguageChange(paint);
}
