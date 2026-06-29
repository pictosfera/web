// Pictosfera — núcleo: enrutado interno de la SPA.
//
// Todo el enrutado es por "almohadilla" (#), tal y como pide la
// definición del proyecto: no depende del servidor (no hay servidor),
// funciona igual en GitHub Pages que en un dominio propio.

const routes = [];
let notFoundHandler = (() => {});
let currentCleanup = null;

function parsePath() {
  const raw = window.location.hash.replace(/^#/, '') || '/inicio';
  const [path, queryString] = raw.split('?');
  const query = Object.fromEntries(new URLSearchParams(queryString || ''));
  return { path: path.startsWith('/') ? path : `/${path}`, query };
}

function matchRoute(path) {
  for (const route of routes) {
    const params = {};
    const routeParts = route.pattern.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);
    if (routeParts.length !== pathParts.length) continue;
    let ok = true;
    routeParts.forEach((part, i) => {
      if (part.startsWith(':')) {
        params[part.slice(1)] = decodeURIComponent(pathParts[i]);
      } else if (part !== pathParts[i]) {
        ok = false;
      }
    });
    if (ok) return { route, params };
  }
  return null;
}

/** Registra una ruta, p.ej. registerRoute('/juegos/:id', handler). */
export function registerRoute(pattern, handler) {
  routes.push({ pattern, handler });
}

export function setNotFoundHandler(handler) {
  notFoundHandler = handler;
}

export function navigate(path) {
  if (window.location.hash.replace(/^#/, '') === path) {
    // Forzar re-render aunque la ruta sea "igual" (p.ej. recargar Juegos).
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return;
  }
  window.location.hash = path;
}

async function render() {
  const { path, query } = parsePath();
  const match = matchRoute(path);

  if (typeof currentCleanup === 'function') {
    try { currentCleanup(); } catch (err) { console.warn('[router] Error al desmontar la vista anterior:', err); }
    currentCleanup = null;
  }

  if (!match) {
    currentCleanup = await notFoundHandler({ path, query }) || null;
    return;
  }
  currentCleanup = await match.route.handler({ ...match.params }, query) || null;
}

export function startRouter() {
  window.addEventListener('hashchange', render);
  render();
}

export function getCurrentPath() {
  return parsePath().path;
}
