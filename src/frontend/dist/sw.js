self.addEventListener('push', function(event) {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Earthquake Alert', {
      body: data.body || '',
      icon: data.icon || '/assets/generated/eq-logo.dim_512x512.png',
      tag: data.tag,
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
