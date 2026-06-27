/**
 * Service Worker — Al-Awael Mobile PWA
 * Offline caching with network-first API strategy
 */
const CACHE_NAME = 'alawael-v1';
const STATIC_ASSETS = [
  '/',
  '/mobile',
  '/index.html',
  '/manifest.json',
  '/alawael-logo.svg',
  // MUI fonts + core chunks will be cached on first visit via runtime caching
];

const API_CACHE_NAME = 'alawael-api-v1';
const OFFLINE_PAGE = '/index.html';

/* ─── Install ─────────────────────────────────────────────────────── */
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Some assets may be missing in dev — silently continue
      });
    })
  );
});

/* ─── Activate ────────────────────────────────────────────────────── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME && key !== API_CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ─── Fetch ─────────────────────────────────────────────────────────── */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // 1. API calls — Network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 2. Static assets — Cache first, fallback to network
  event.respondWith(cacheFirst(request));
});

/* ─── Strategies ──────────────────────────────────────────────────── */

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Return a generic offline JSON for API calls
    return new Response(
      JSON.stringify({
        error: 'offline',
        message: 'لا يوجد اتصال بالإنترنت',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    // For navigation requests, fallback to offline page
    if (request.mode === 'navigate') {
      const fallback = await caches.match(OFFLINE_PAGE);
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/* ─── Push notifications (placeholder) ────────────────────────────── */
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Al-Awael', {
      body: data.body ?? 'لديك إشعار جديد',
      icon: '/icon-192.png',
      badge: '/icon-96.png',
      tag: data.tag ?? 'default',
      requireInteraction: false,
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/mobile';
  event.waitUntil(self.clients.openWindow(url));
});
