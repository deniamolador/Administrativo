// Nome do cache
const CACHE_NAME = 'painel-admin-v1.0.0';

// Arquivos para cachear na instalação
const urlsToCache = [
  '/',
  './index.html',
  './folgas.html',
  './agendamentos.html',
  './registros.html',
  './financeiro.html',
  './favicon.png',
  // Adicione outros arquivos HTML que você tenha
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalando...');
  
  // Realiza o cache dos recursos essenciais
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cacheando arquivos');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Instalação concluída');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Erro na instalação', error);
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Ativando...');
  
  // Remove caches antigos
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Removendo cache antigo', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Ativação concluída');
      // Toma controle de todas as abas abertas
      return self.clients.claim();
    })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  // Ignora requisições não GET
  if (event.request.method !== 'GET') return;

  // Para requisições do Firebase, usa estratégia Network First
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('googleapis')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Se a requisição foi bem-sucedida, atualiza o cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
          return response;
        })
        .catch(() => {
          // Se offline, tenta buscar do cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // Para outros recursos, usa estratégia Cache First
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Retorna do cache se disponível
        if (cachedResponse) {
          return cachedResponse;
        }

        // Se não está no cache, busca da rede
        return fetch(event.request)
          .then((response) => {
            // Verifica se a resposta é válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clona a resposta para adicionar ao cache
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Fallback para páginas HTML
            if (event.request.destination === 'document') {
              return caches.match('/');
            }
            // Pode adicionar fallbacks específicos aqui se necessário
          });
      })
  );
});

// Mensagens do Service Worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Sincronização em background (quando online novamente)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Sincronização em background');
    // Aqui você pode implementar lógica para sincronizar dados
    // quando a conexão for restabelecida
  }
});