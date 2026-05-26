/**
 * sw.js — Service Worker da AgendaPro
 *
 * Estratégias:
 * - Shell do app (HTML/CSS/JS) → Cache First (funciona offline)
 * - Chamadas ao Supabase API  → Network First com fallback para cache
 */

const CACHE_NAME    = 'agendapro-v1';
const RUNTIME_CACHE = 'agendapro-runtime-v1';

// Arquivos do app shell — cacheados no install
const APP_SHELL = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/config.js',
  '/js/api.js',
  '/js/ui.js',
  '/js/teacher.js',
  '/js/student.js',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // Fontes Google (cacheadas em runtime na primeira visita)
];

// ================================================================
// INSTALL — pré-cacheia o app shell
// ================================================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()) // ativa imediatamente
  );
});

// ================================================================
// ACTIVATE — limpa caches antigos
// ================================================================
self.addEventListener('activate', event => {
  const keepCaches = [CACHE_NAME, RUNTIME_CACHE];

  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => !keepCaches.includes(key))
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim()) // assume controle imediato
  );
});

// ================================================================
// FETCH — intercepta requisições
// ================================================================
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignora requisições não-GET e chrome-extension
  if (event.request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Supabase API → Network First (dados sempre frescos quando online)
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Google Fonts → Cache First (performance)
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(cacheFirst(event.request, RUNTIME_CACHE));
    return;
  }

  // App shell e assets → Cache First
  event.respondWith(cacheFirst(event.request, CACHE_NAME));
});

// ================================================================
// ESTRATÉGIAS DE CACHE
// ================================================================

/**
 * Cache First: serve do cache, busca na rede se não encontrar.
 * Ideal para assets estáticos.
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline e não está em cache
    return offlineFallback(request);
  }
}

/**
 * Network First: tenta a rede, cai no cache se offline.
 * Ideal para dados do Supabase.
 */
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return offlineFallback(request);
  }
}

/**
 * Fallback para quando está offline e não há cache.
 */
async function offlineFallback(request) {
  const url = new URL(request.url);

  // Para navegação, retorna o index.html cacheado
  if (request.mode === 'navigate') {
    const cached = await caches.match('/index.html');
    if (cached) return cached;
  }

  // Para API, retorna JSON de erro amigável
  if (url.hostname.includes('supabase.co')) {
    return new Response(
      JSON.stringify({ error: 'offline', message: 'Sem conexão. Dados podem estar desatualizados.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response('Sem conexão', { status: 503 });
}

// ================================================================
// BACKGROUND SYNC — sincroniza agendamentos feitos offline
// ================================================================
self.addEventListener('sync', event => {
  if (event.tag === 'sync-bookings') {
    event.waitUntil(syncPendingBookings());
  }
});

async function syncPendingBookings() {
  // Abre o IDB para buscar agendamentos pendentes
  // (implementação simplificada — expande conforme necessário)
  console.log('[SW] Sincronizando agendamentos pendentes...');
}

// ================================================================
// PUSH NOTIFICATIONS — estrutura pronta para futuro
// ================================================================
self.addEventListener('push', event => {
  if (!event.data) return;

  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'AgendaPro', {
      body: data.body || 'Você tem uma nova notificação.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      tag: data.tag || 'agendapro',
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
