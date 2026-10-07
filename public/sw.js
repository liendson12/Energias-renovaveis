// Service worker mínimo: permite instalar o app. Não guarda nada em cache
// (os dados financeiros têm de vir sempre do servidor).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
