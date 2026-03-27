/**
 * Service Worker - إدارة التخزين المؤقت والعمل بدون اتصال
 */

const CACHE_NAME = 'awail-erp-v1.0.0';
const OFFLINE_URL = '/offline';

// الملفات المهمة للتخزين المؤقت
const CORE_CACHE_FILES = [
    '/',
    '/static/css/style.css',
    '/static/css/branding.css',
    '/static/js/main.js',
    '/static/js/pwa-installer.js',
    '/static/images/logo.svg',
    '/static/images/awail-logo.svg',
    '/offline'
];

// الملفات الثابتة للتخزين المؤقت
const STATIC_CACHE_FILES = [
    '/static/css/bootstrap.min.css',
    '/static/js/bootstrap.min.js',
    '/static/js/jquery.min.js',
    '/static/js/chart.js',
    '/static/fonts/fontawesome-webfont.woff2'
];

// تثبيت Service Worker
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        Promise.all([
            // تخزين الملفات الأساسية
            caches.open(CACHE_NAME).then((cache) => {
                console.log('Service Worker: Caching core files');
                return cache.addAll(CORE_CACHE_FILES);
            }),
            
            // تخزين الملفات الثابتة
            caches.open(CACHE_NAME + '-static').then((cache) => {
                console.log('Service Worker: Caching static files');
                return cache.addAll(STATIC_CACHE_FILES);
            })
        ]).then(() => {
            console.log('Service Worker: Installation complete');
            // فرض التفعيل الفوري
            return self.skipWaiting();
        })
    );
});

// تفعيل Service Worker
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        Promise.all([
            // حذف التخزين المؤقت القديم
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME && cacheName !== CACHE_NAME + '-static') {
                            console.log('Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            
            // السيطرة على جميع العملاء
            self.clients.claim()
        ]).then(() => {
            console.log('Service Worker: Activation complete');
        })
    );
});

// اعتراض طلبات الشبكة
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // تجاهل طلبات غير HTTP/HTTPS
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    // استراتيجية التخزين المؤقت
    if (request.method === 'GET') {
        event.respondWith(handleGetRequest(request));
    } else {
        // للطلبات غير GET، محاولة الشبكة أولاً
        event.respondWith(
            fetch(request).catch(() => {
                return new Response(
                    JSON.stringify({ 
                        error: 'لا يوجد اتصال بالإنترنت',
                        offline: true 
                    }),
                    { 
                        status: 503,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
            })
        );
    }
});

// معالجة طلبات GET
async function handleGetRequest(request) {
    const url = new URL(request.url);
    
    try {
        // للصفحات الرئيسية: Network First
        if (isNavigationRequest(request)) {
            return await networkFirstStrategy(request);
        }
        
        // للملفات الثابتة: Cache First
        if (isStaticAsset(url.pathname)) {
            return await cacheFirstStrategy(request);
        }
        
        // للـ API: Network First مع Fallback
        if (url.pathname.startsWith('/api/')) {
            return await networkFirstWithFallback(request);
        }
        
        // للباقي: Stale While Revalidate
        return await staleWhileRevalidateStrategy(request);
        
    } catch (error) {
        console.error('Service Worker: Fetch error:', error);
        return await getOfflineResponse(request);
    }
}

// استراتيجية Network First
async function networkFirstStrategy(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // تخزين الاستجابة في التخزين المؤقت
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // في حالة فشل الشبكة، البحث في التخزين المؤقت
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // إرجاع صفحة عدم الاتصال
        return await getOfflineResponse(request);
    }
}

// استراتيجية Cache First
async function cacheFirstStrategy(request) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME + '-static');
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        return new Response('الملف غير متوفر', { status: 404 });
    }
}

// استراتيجية Network First مع Fallback للـ API
async function networkFirstWithFallback(request) {
    try {
        const networkResponse = await fetch(request);
        
        // تخزين الاستجابات الناجحة للـ API
        if (networkResponse.ok && request.method === 'GET') {
            const cache = await caches.open(CACHE_NAME + '-api');
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // البحث في التخزين المؤقت للـ API
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            // إضافة header للإشارة أن البيانات من التخزين المؤقت
            const response = cachedResponse.clone();
            response.headers.set('X-Served-By', 'sw-cache');
            return response;
        }
        
        // إرجاع استجابة خطأ
        return new Response(
            JSON.stringify({
                error: 'لا يوجد اتصال بالإنترنت',
                message: 'البيانات غير متوفرة حالياً',
                offline: true
            }),
            {
                status: 503,
                headers: { 'Content-Type': 'application/json; charset=utf-8' }
            }
        );
    }
}

// استراتيجية Stale While Revalidate
async function staleWhileRevalidateStrategy(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    // تحديث التخزين المؤقت في الخلفية
    const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(() => cachedResponse);
    
    // إرجاع المحتوى المخزن فوراً إن وُجد، وإلا انتظار الشبكة
    return cachedResponse || fetchPromise;
}

// الحصول على استجابة عدم الاتصال
async function getOfflineResponse(request) {
    if (isNavigationRequest(request)) {
        const offlineResponse = await caches.match(OFFLINE_URL);
        if (offlineResponse) {
            return offlineResponse;
        }
        
        // صفحة عدم اتصال بسيطة
        return new Response(`
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>لا يوجد اتصال - مراكز الأوائل</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                           text-align: center; padding: 50px; background: #f5f5f5; }
                    .offline-container { max-width: 500px; margin: 0 auto; 
                                       background: white; padding: 40px; border-radius: 10px; 
                                       box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .offline-icon { font-size: 4em; color: #ff6b6b; margin-bottom: 20px; }
                    h1 { color: #333; margin-bottom: 20px; }
                    p { color: #666; line-height: 1.6; margin-bottom: 30px; }
                    .retry-btn { background: #007bff; color: white; padding: 12px 24px; 
                               border: none; border-radius: 5px; cursor: pointer; 
                               font-size: 16px; }
                    .retry-btn:hover { background: #0056b3; }
                </style>
            </head>
            <body>
                <div class="offline-container">
                    <div class="offline-icon">📡</div>
                    <h1>لا يوجد اتصال بالإنترنت</h1>
                    <p>عذراً، لا يمكن الوصول إلى الصفحة المطلوبة حالياً. 
                       تأكد من اتصالك بالإنترنت وحاول مرة أخرى.</p>
                    <button class="retry-btn" onclick="location.reload()">
                        إعادة المحاولة
                    </button>
                </div>
            </body>
            </html>
        `, {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
    }
    
    return new Response('المحتوى غير متوفر بدون اتصال', { status: 503 });
}

// فحص إذا كان الطلب للتنقل
function isNavigationRequest(request) {
    return request.mode === 'navigate' || 
           (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

// فحص إذا كان الملف ثابت
function isStaticAsset(pathname) {
    const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', 
                             '.woff', '.woff2', '.ttf', '.eot', '.ico'];
    return staticExtensions.some(ext => pathname.endsWith(ext));
}

// معالجة رسائل من العميل
self.addEventListener('message', (event) => {
    const { type, payload } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'GET_CACHE_SIZE':
            getCacheSize().then(size => {
                event.ports[0].postMessage({ size });
            });
            break;
            
        case 'CLEAR_CACHE':
            clearCache().then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;
            
        case 'SYNC_DATA':
            // مزامنة البيانات في الخلفية
            handleBackgroundSync(payload);
            break;
    }
});

// حساب حجم التخزين المؤقت
async function getCacheSize() {
    const cacheNames = await caches.keys();
    let totalSize = 0;
    
    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
                const blob = await response.blob();
                totalSize += blob.size;
            }
        }
    }
    
    return totalSize;
}

// مسح التخزين المؤقت
async function clearCache() {
    const cacheNames = await caches.keys();
    return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
    );
}

// مزامنة البيانات في الخلفية
async function handleBackgroundSync(data) {
    try {
        // محاولة إرسال البيانات المؤجلة
        const response = await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            console.log('Background sync successful');
        }
    } catch (error) {
        console.error('Background sync failed:', error);
        // إعادة جدولة المزامنة
        setTimeout(() => handleBackgroundSync(data), 30000);
    }
}

console.log('Service Worker: Loaded successfully');
