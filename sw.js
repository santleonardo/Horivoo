/**
 * sw.js — Service Worker da Horivoo
 *
 * Estratégias:
 * - Shell do app (HTML/CSS/JS) → Cache First (funciona offline)
 * - Chamadas ao Supabase API  → Network First com fallback para cache
 */

const CACHE_NAME    = 'horivoo-v4';
const RUNTIME_CACHE = 'horivoo-runtime-v4';

// Arquivos do app shell — cacheados no install
const APP_SHELL = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/config.js',
  '/js/api.js',
  '/js/auth.js',
  '/js/ui.js',
  '/js/teacher.js',
  '/js/student.js',
  '/js/pwa.js',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ================================================================
// INSTALL — pré-cacheia o app shell
// ================================================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
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
      .then(() => self.clients.claim())
  );
});

// ================================================================
// FETCH — intercepta requisições
// ================================================================
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Supabase API → Network First
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Google Fonts → Cache First
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(cacheFirst(event.request, RUNTIME_CACHE));
    return;
  }

  // App shell → Cache First
  event.respondWith(cacheFirst(event.request, CACHE_NAME));
});

// ================================================================
// ESTRATÉGIAS DE CACHE
// ================================================================

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
    return offlineFallback(request);
  }
}

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

async function offlineFallback(request) {
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    const cached = await caches.match('/index.html');
    if (cached) return cached;
  }

  if (url.hostname.includes('supabase.co')) {
    return new Response(
      JSON.stringify({ error: 'offline', message: 'Sem conexão.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response('Sem conexão', { status: 503 });
}

// ================================================================
// BACKGROUND SYNC
// ================================================================
self.addEventListener('sync', event => {
  if (event.tag === 'sync-bookings') {
    event.waitUntil(syncPendingBookings());
  }
});

async function syncPendingBookings() {
  console.log('[SW] Sincronizando agendamentos pendentes...');
}

// ================================================================
// PUSH NOTIFICATIONS
// ================================================================
self.addEventListener('push', event => {
  if (!event.data) return;

  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Horivoo', {
      body: data.body || 'Você tem uma nova notificação.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      tag: data.tag || 'horivoo',
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
