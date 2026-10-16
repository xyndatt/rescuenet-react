// Shows push alerts while RescueNet is in the background. Firebase settings arrive in the query string
// (see src/push.js) because a service worker cannot read Vite's .env values.
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');
const q = new URL(self.location).searchParams;
firebase.initializeApp({ apiKey: q.get('apiKey'), projectId: q.get('projectId'), messagingSenderId: q.get('senderId'), appId: q.get('appId') });
const messaging = firebase.messaging();
messaging.onBackgroundMessage(p => {
  const n = p.notification || {};
  self.registration.showNotification(n.title || 'RescueNet', { body: n.body || '', icon: '/favicon.ico', tag: (p.data && p.data.reportId) || 'rescuenet' });
});
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(clients.matchAll({ type: 'window' }).then(l => l.length ? l[0].focus() : clients.openWindow('/'))); });
