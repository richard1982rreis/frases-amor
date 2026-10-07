/* Amor Sem Fronteiras - service worker
   Troque a VERSION sempre que alterar o index.html, para o celular baixar a versão nova. */
const VERSION = "asf-v1";
const SHELL = new URL("index.html", self.location).href;
const CORE = [
  "./", "index.html", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("asf-") && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!sameOrigin && !isFont) return;

  // Abrir o app: responde na hora com a cópia guardada e atualiza em segundo plano.
  if (req.mode === "navigate") {
    event.respondWith(
      caches.match(SHELL).then((hit) => {
        const refresh = fetch(SHELL).then((res) => {
          if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(SHELL, copy)); }
          return res;
        }).catch(() => hit || Response.error());
        return hit || refresh;
      })
    );
    return;
  }

  // Demais arquivos e fontes: usa o guardado e renova em segundo plano.
  event.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => hit || Response.error());
      return hit || net;
    })
  );
});
