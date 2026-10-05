// App instalável: este "service worker" só cuida de quando a internet cai.
// Tudo continua vindo do servidor (preço e estoque mudam a toda hora); sem
// conexão, as páginas mostram /sem-internet em vez da tela de erro do navegador.
const CACHE = "salty-app-v1";
const SEM_INTERNET = "/sem-internet";

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(SEM_INTERNET, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  if (evento.request.mode !== "navigate") return;
  evento.respondWith(fetch(evento.request).catch(() => caches.match(SEM_INTERNET)));
});
