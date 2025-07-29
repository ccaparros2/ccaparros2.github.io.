// Service Worker para Perlas Ocultas
const CACHE_NAME = 'perlas-ocultas-v1.0.0';
const STATIC_CACHE = 'static-v1.0.0';
const DYNAMIC_CACHE = 'dynamic-v1.0.0';

// Archivos para cachear inmediatamente
const STATIC_FILES = [
    '/',
    '/index.html',
    '/css/critical.css',
    '/css/styles.css',
    '/js/main.js',
    '/manifest.json',
    '/favicon.ico',
    '/favicon-32x32.png',
    '/favicon-16x16.png',
    '/apple-touch-icon.png',
    'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Raleway:wght@300;400;600&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Archivos que se cachean dinámicamente
const DYNAMIC_FILES = [
    'https://images.unsplash.com/',
    'https://fonts.gstatic.com/'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
    console.log('Service Worker: Instalando...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('Service Worker: Cacheando archivos estáticos');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('Service Worker: Instalación completada');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Service Worker: Error en instalación', error);
            })
    );
});

// Activación del Service Worker
self.addEventListener('activate', event => {
    console.log('Service Worker: Activando...');
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('Service Worker: Eliminando cache antigua:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activación completada');
                return self.clients.claim();
            })
    );
});

// Interceptar requests
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Solo manejar requests HTTP/HTTPS
    if (!request.url.startsWith('http')) return;

    // Estrategia Cache First para archivos estáticos
    if (STATIC_FILES.some(file => request.url.includes(file)) || 
        request.destination === 'style' || 
        request.destination === 'script' ||
        request.destination === 'font') {
        
        event.respondWith(
            caches.match(request)
                .then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    return fetch(request)
                        .then(response => {
                            if (response.status === 200) {
                                const responseClone = response.clone();
                                caches.open(STATIC_CACHE)
                                    .then(cache => cache.put(request, responseClone));
                            }
                            return response;
                        });
                })
                .catch(() => {
                    // Fallback para páginas HTML
                    if (request.destination === 'document') {
                        return caches.match('/index.html');
                    }
                })
        );
        return;
    }

    // Estrategia Network First para imágenes
    if (request.destination === 'image') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    if (response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(DYNAMIC_CACHE)
                            .then(cache => {
                                cache.put(request, responseClone);
                                // Limpiar cache dinámico si es muy grande
                                limitCacheSize(DYNAMIC_CACHE, 50);
                            });
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(request);
                })
        );
        return;
    }

    // Estrategia Network First para el resto
    event.respondWith(
        fetch(request)
            .then(response => {
                if (response.status === 200 && request.method === 'GET') {
                    const responseClone = response.clone();
                    caches.open(DYNAMIC_CACHE)
                        .then(cache => {
                            cache.put(request, responseClone);
                            limitCacheSize(DYNAMIC_CACHE, 30);
                        });
                }
                return response;
            })
            .catch(() => {
                return caches.match(request)
                    .then(cachedResponse => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // Fallback para páginas HTML
                        if (request.destination === 'document') {
                            return caches.match('/index.html');
                        }
                    });
            })
    );
});

// Función para limitar el tamaño del cache
function limitCacheSize(cacheName, maxItems) {
    caches.open(cacheName)
        .then(cache => {
            cache.keys()
                .then(keys => {
                    if (keys.length > maxItems) {
                        cache.delete(keys[0])
                            .then(() => limitCacheSize(cacheName, maxItems));
                    }
                });
        });
}

// Manejar mensajes del cliente
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_CACHE_SIZE') {
        Promise.all([
            caches.open(STATIC_CACHE).then(cache => cache.keys()),
            caches.open(DYNAMIC_CACHE).then(cache => cache.keys())
        ]).then(([staticKeys, dynamicKeys]) => {
            event.ports[0].postMessage({
                static: staticKeys.length,
                dynamic: dynamicKeys.length,
                total: staticKeys.length + dynamicKeys.length
            });
        });
    }
});

// Manejar actualizaciones en background
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(
            // Aquí se pueden manejar tareas en background
            console.log('Service Worker: Background sync ejecutado')
        );
    }
});

// Manejar notificaciones push (opcional)
self.addEventListener('push', event => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/favicon-32x32.png',
            badge: '/favicon-16x16.png',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: data.primaryKey
            },
            actions: [
                {
                    action: 'explore',
                    title: 'Ver más',
                    icon: '/favicon-16x16.png'
                },
                {
                    action: 'close',
                    title: 'Cerrar',
                    icon: '/favicon-16x16.png'
                }
            ]
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// Manejar clicks en notificaciones
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

console.log('Service Worker: Registrado correctamente');

