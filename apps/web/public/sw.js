const CACHE = 'commma-v1'

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.add('/')).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const { request } = e
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.pathname.startsWith('/v1/')) return
  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).catch(() => caches.match('/')))
    return
  }
  e.respondWith(caches.match(request).then(cached => cached ?? fetch(request)))
})

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {}
  e.waitUntil(
    self.registration.showNotification(data.title ?? 'commma', {
      body: data.body ?? '',
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      tag: 'streak-reminder',
      renotify: true,
      data: { url: data.url ?? '/' },
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data ? e.notification.data.url : '/'
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const open = cs.find(c => 'focus' in c)
      if (open) return open.focus()
      return clients.openWindow(url)
    })
  )
})
