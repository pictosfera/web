// Pictosfera — service worker mínimo.
// Objetivo: que el portal (núcleo + apps + idiomas) funcione sin conexión
// después de la primera visita. Los pictogramas de ARASAAC y las fotos
// del usuario NO se cachean aquí: las fotos ya viven en IndexedDB y los
// pictogramas remotos dependen de tener internet la primera vez que se piden.

const CACHE_NAME = 'pictosfera-v1';

// Lista mínima para que la cáscara de la app arranque offline.
// No es necesario mantenerla perfecta: si falta un archivo, simplemente
// se pedirá a la red la primera vez.
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './core/css/tokens.css',
  './core/css/shell.css',
  './core/css/adult.css',
  './core/js/main.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => {/* si falla el precache, no bloquea la instalación */})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estrategia: "network first, cache fallback" para archivos del propio
// portal (mismo origen). Todo lo que vaya a otro dominio (ARASAAC, voces...)
// se deja pasar tal cual, sin interceptar.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
  );
});
