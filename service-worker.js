/* ============================================================
   SERVICE WORKER - FinApp
   Responsável pelo cache dos arquivos e funcionamento offline
============================================================ */

const CACHE_NAME  = 'finapp-v1';
const CACHE_URLS  = [
  './',
  './index.html',
  './manifest.json',
  // Fontes do Google Fonts (cacheadas na primeira visita)
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap'
];

/* ---- Instalação: faz o cache dos arquivos principais ---- */
self.addEventListener('install', event => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Arquivos em cache');
      return cache.addAll(CACHE_URLS);
    })
  );
  // Força o SW a assumir imediatamente sem esperar fechar abas
  self.skipWaiting();
});

/* ---- Ativação: remove caches antigos ---- */
self.addEventListener('activate', event => {
  console.log('[SW] Ativando...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => {
            console.log('[SW] Removendo cache antigo:', k);
            return caches.delete(k);
          })
      )
    )
  );
  // Assume controle de todas as abas abertas
  self.clients.claim();
});

/* ---- Fetch: estratégia Cache First com fallback para rede ---- */
self.addEventListener('fetch', event => {
  // Ignora requisições que não sejam GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Retorna do cache imediatamente (offline funciona aqui)
        return cached;
      }

      // Se não está em cache, busca na rede e armazena para uso futuro
      return fetch(event.request)
        .then(response => {
          // Só cacheia respostas válidas
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fallback offline: se for navegação, retorna o index.html cacheado
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
