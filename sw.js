/* Service worker da SI: deixa o app instalável e abrir mesmo sem internet (mostra a última versão vista).
   Regra de ouro: SEMPRE tenta a internet primeiro, então atualizações do site chegam na hora e nada fica velho.
   Só mexe em arquivos do próprio site (GET). Banco (Supabase), ajudante local e fontes passam direto, sem cache. */
const CACHE = 'si-jhc-app-v1';

self.addEventListener('install', e => { self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin) return;   // só arquivos do próprio site
  e.respondWith((async () => {
    try {
      const nova = await fetch(r);
      if (nova.ok) { const c = await caches.open(CACHE); c.put(r, nova.clone()); }
      return nova;
    } catch {
      const guardada = await caches.match(r, { ignoreSearch: r.mode === 'navigate' }) || (r.mode === 'navigate' ? await caches.match('./') : null);
      return guardada || new Response('Sem internet e sem cópia guardada.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});
