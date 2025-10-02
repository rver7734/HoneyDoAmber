// public/firebase-messaging-sw.js
// Firebase service worker used for background push notifications.

importScripts('https://www.gstatic.com/firebasejs/10.12.3/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.3/firebase-messaging-compat.js');

const CONFIG_CACHE_KEY = '__FIREBASE_CONFIG_CACHE__';
let messagingInstancePromise = null;

const fetchFirebaseConfig = async () => {
  // Try Firebase Hosting helper first (only available in production hosting).
  try {
    importScripts('/__/firebase/init.js?useEmulator=false');
    if (firebase.apps.length) {
      return firebase.app().options;
    }
  } catch (error) {
    console.warn('[SW] Firebase init script unavailable, falling back to API config fetch.', error);
  }

  if (self[CONFIG_CACHE_KEY]) {
    return self[CONFIG_CACHE_KEY];
  }

  try {
    const response = await fetch('/api/firebase-config', { cache: 'no-store' });
    if (!response.ok) {
      console.error('[SW] Failed to fetch Firebase config:', response.status, response.statusText);
      return null;
    }
    const config = await response.json();
    self[CONFIG_CACHE_KEY] = config;
    return config;
  } catch (error) {
    console.error('[SW] Error fetching Firebase config:', error);
    return null;
  }
};

const ensureMessaging = async () => {
  if (messagingInstancePromise) {
    return messagingInstancePromise;
  }

  messagingInstancePromise = (async () => {
    const config = await fetchFirebaseConfig();
    if (!config) {
      throw new Error('Firebase configuration is unavailable.');
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(config);
      console.log('[SW] Firebase app initialized in service worker.');
    }

    return firebase.messaging();
  })();

  return messagingInstancePromise;
};

const showNotification = (payload) => {
  const title = payload?.notification?.title || 'Amber has a new message for you!';
  const body = payload?.notification?.body || 'Check your reminders, Honey!';
  const icon = payload?.notification?.icon || payload?.data?.icon || '/pawicon-192.png';
  const url = payload?.fcmOptions?.link || payload?.data?.url || '/';

  const options = {
    body,
    icon,
    data: { url },
  };

  console.log('[SW] Displaying notification', { title, options });
  return self.registration.showNotification(title, options);
};

ensureMessaging()
  .then((messaging) => {
    messaging.onBackgroundMessage((payload) => {
      console.log('[SW] Received background message:', payload);

      if (!payload || (!payload.notification && !payload.data)) {
        console.warn('[SW] Payload missing notification/data fields.');
        return;
      }

      showNotification(payload).catch((error) => {
        console.error('[SW] Failed to display notification:', error);
      });
    });
  })
  .catch((error) => {
    console.error('[SW] Unable to initialise Firebase messaging:', error);
  });

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';
  console.log('[SW] Notification click received, opening:', targetUrl);

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          const url = new URL(client.url);
          if (url.pathname === new URL(targetUrl, self.location.origin).pathname && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
        return null;
      })
      .catch((error) => {
        console.error('[SW] Error during notification click handling:', error);
      })
  );
});

self.addEventListener('install', (event) => {
  console.log('[SW] Service worker installing.');
  event.waitUntil(
    ensureMessaging().catch((error) => {
      console.error('[SW] Firebase initialisation during install failed:', error);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service worker activating.');
  event.waitUntil(clients.claim());
});
