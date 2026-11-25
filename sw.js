// Service worker : réception des fichiers partagés et cache de l'interface
const VERSION = 'ndf-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.pathname.endsWith('/partage')) {
    event.respondWith(
      (async () => {
        const form = await event.request.formData();
        const cache = await caches.open('ndf-partage');
        let i = 0;
        for (const f of form.getAll('fichiers')) {
          if (!(f instanceof File)) continue;
          await cache.put(
            `partage-${Date.now()}-${i++}`,
            new Response(f, { headers: { 'Content-Type': f.type, 'X-Nom': encodeURIComponent(f.name) } })
          );
        }
        return Response.redirect(new URL('./?partage=1', self.registration.scope).href, 303);
      })()
    );
    return;
  }
  // Interface : réseau d'abord, cache en secours (même origine, GET uniquement)
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(VERSION);
      try {
        const res = await fetch(event.request);
        if (res.ok) cache.put(event.request, res.clone());
        return res;
      } catch {
        return (await cache.match(event.request)) || (await cache.match(new URL('./', self.registration.scope).href)) || Response.error();
      }
    })()
  );
});
