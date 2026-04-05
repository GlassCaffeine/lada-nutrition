// Service Worker для PWA - оффлайн режим

const CACHE_NAME = 'lada-nutrition-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/main.js',
    '/pwa/manifest.json',
    '/assets/icons/icon-192x192.png',
    '/assets/icons/icon-512x512.png'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
    console.log('[SW] Установка Service Worker');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Кэширование статических ресурсов');
                return cache.addAll(STATIC_ASSETS);
            })
            .catch((error) => {
                console.error('[SW] Ошибка кэширования:', error);
            })
    );
    self.skipWaiting();
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
    console.log('[SW] Активация Service Worker');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Если есть в кэше - возвращаем из кэша
                if (response) {
                    return response;
                }

                // Иначе делаем запрос к сети
                return fetch(event.request)
                    .then((response) => {
                        // Не кэшируем ошибки и не-GET запросы
                        if (!response || response.status !== 200 || event.request.method !== 'GET') {
                            return response;
                        }

                        // Клонируем ответ для кэширования
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // Если нет сети и нет в кэше - показываем оффлайн страницу
                        if (event.request.destination === 'document') {
                            return caches.match('/index.html');
                        }
                    });
            })
    );
});

// Фоновая синхронизация
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        console.log('[SW] Фоновая синхронизация данных');
        event.waitUntil(syncData());
    }
});

async function syncData() {
    // TODO: Синхронизация оффлайн-данных с Supabase
    console.log('[SW] Синхронизация завершена');
}

// Push уведомления
self.addEventListener('push', (event) => {
    const data = event.data.json();
    const options = {
        body: data.body,
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/icon-192x192.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Клик по уведомлению
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
