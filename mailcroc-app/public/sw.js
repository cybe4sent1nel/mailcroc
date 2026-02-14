const CACHE_NAME = 'mailcroc-cache-v12';
const OFFLINE_URL = '/offline.html';

// Assets to pre-cache during install
const PRECACHE_ASSETS = [
    OFFLINE_URL,
    '/logo.png',
    '/favicon.ico',
    '/animations/offline.json',
    'https://unpkg.com/@lottiefiles/lottie-player@2.0.8/dist/lottie-player.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap'
];

// ---- INSTALL: Atomic pre-caching ----
self.addEventListener('install', (event) => {
    console.log('SW v12: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('SW v12: Pre-caching critical assets...');
            return cache.addAll(PRECACHE_ASSETS);
        }).then(() => {
            console.log('SW v12: All critical assets cached');
            return self.skipWaiting();
        }).catch(err => {
            console.error('SW v12: Pre-cache failed', err);
        })
    );
});

// ---- ACTIVATE: Clean old caches and claim clients ----
self.addEventListener('activate', (event) => {
    console.log('SW v12: Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('SW v12: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('SW v12: Active and claiming clients');
            return self.clients.claim();
        })
    );
});

// ---- FETCH: Robust offline handling ----
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Only handle GET requests
    if (request.method !== 'GET') return;

    // Bypass socket.io and other real-time endpoints
    if (request.url.includes('socket.io') || request.url.includes('/api/')) {
        return;
    }

    // Navigation requests (HTML pages)
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(async () => {
                console.warn('SW v10: Network failed for navigation -> serving offline page');
                const cachedResponse = await caches.match(OFFLINE_URL);
                if (cachedResponse) return cachedResponse;

                // Absolute fallback in case of cache missing
                return new Response(
                    '<html><body style="font-family:sans-serif;text-align:center;padding:50px"><h1>Offline</h1><p>MailCroc is currently unavailable offline.</p><button onclick="window.location.reload()">Retry</button></body></html>',
                    { headers: { 'Content-Type': 'text/html' } }
                );
            })
        );
        return;
    }

    // Static assets
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;

            return fetch(request).then((response) => {
                const url = request.url;

                // CRITICAL FIX: Check for status 206 (Partial Content)
                // The Cache API does NOT support status 206. 
                // We also skip caching for media files that usually trigger range requests.
                const isPartial = response.status === 206;
                const isMedia = url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mp3');

                // CRITICAL DEV FIX: Don't cache Next.js static bundles on localhost
                // This prevents hydration mismatches when you change code in dev mode.
                const isNextStatic = url.includes('/_next/static/');
                const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');

                if (response.ok && !isPartial && !isMedia && (
                    (isNextStatic && !isLocalhost) || // Only cache next static on non-local (production)
                    url.includes('/animations/') ||
                    url.includes('lottie-player') ||
                    url.endsWith('.png') ||
                    url.endsWith('.ico') ||
                    url.endsWith('.woff2') ||
                    url.endsWith('.css') ||
                    url.endsWith('.js')
                )) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseToCache);
                    }).catch(err => {
                        console.warn('SW v10: Failed to cache asset', url, err);
                    });
                }
                return response;
            }).catch(() => {
                // Asset fallbacks
                if (request.url.includes('logo.png')) return caches.match('/logo.png');
                if (request.url.includes('offline.json')) return caches.match('/animations/offline.json');
                if (request.url.includes('lottie-player')) return caches.match('https://unpkg.com/@lottiefiles/lottie-player@2.0.8/dist/lottie-player.js');

                // Don't return 408 for media, just let it fail
                return new Response('', { status: 404 });
            });
        })
    );
});
