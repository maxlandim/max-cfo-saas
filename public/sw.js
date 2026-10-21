// Service worker do MAX CFO AI.
// Internet primeiro (sempre a versão mais nova); a cópia salva só entra quando o aparelho está offline.
const CACHE_NAME = 'max-cfo-ai-v4';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Rotas do servidor e serviços externos nunca vêm do cache
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copia = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copia));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
