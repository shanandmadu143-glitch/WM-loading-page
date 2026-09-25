const CACHE_NAME = 'html-codes-offline-v3';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json'
];

// Install Event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => self.skipWaiting())
    );
});

// Activate Event (Clears old caches)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event (Advanced Cache First Strategy for Offline Support)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // 1. Cache එකේ ඇත්නම් එය ලබාදෙන්න (Local Files & Fonts)
            if (cachedResponse) {
                return cachedResponse;
            }
            // 2. Cache එකේ නැත්නම් Internet එකෙන් ගන්න
            return fetch(event.request).then((response) => {
                // Google Fonts වැනි External Links Dynamic ලෙස Cache කිරීම!
                if (event.request.url.includes('fonts.googleapis.com') || 
                    event.request.url.includes('fonts.gstatic.com')) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            }).catch(() => {
                // සම්පූර්ණයෙන්ම Offline නම් සහ Navigate කරයි නම් index.html ලබාදෙන්න
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
