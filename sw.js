self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('abu-karma-v1').then((cache) => {
      return cache.addAll([
        './',
        './index.html',
        './style.css',
        './script.js'
      ]);
    })
  );
  // إضافة: تجعل النسخة الجديدة من التطبيق تحل محل القديمة فوراً
  self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});

// إضافة: تنظيف الـ Cache القديم عند تحديث الإصدار (عشان التعديلات تظهر)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== 'abu-karma-v1') {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
