
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import type { Messaging, MessagePayload } from 'firebase/messaging';

import { getNativePushToken } from './native-push';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
let messagingInstance: Messaging | null = null;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

async function initializeFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window !== 'undefined' && (await isSupported())) {
    if (!messagingInstance) {
      messagingInstance = getMessaging(app);
    }
    return messagingInstance;
  }
  console.log('[Firebase] Messaging is not supported in this browser or not in a window context.');
  return null;
}


export const requestNotificationPermissionAndGetToken = async (): Promise<string | null> => {
  try {
    const nativeToken = await getNativePushToken();
    if (nativeToken) {
      console.log('[Firebase] Using native push token');
      return nativeToken;
    }
  } catch (error) {
    console.warn('[Firebase] Native push token request failed, falling back to web FCM', error);
  }

  if (typeof window === 'undefined' || !(await isSupported())) {
    console.log('[Firebase] Messaging not supported or not in window context.');
    return null;
  }
  
  // Add a check to see if permission is already denied.
  if (Notification.permission === 'denied') {
    console.warn('[Firebase] Notification permission was previously denied. User must manually re-enable it in browser settings.');
    return null;
  }
    
  const messaging = await initializeFirebaseMessaging();
  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('[Firebase] Notification permission granted.');
      
      const vapidKeyToUse = process.env.NEXT_PUBLIC_VAPID_KEY;

      if (!vapidKeyToUse) {
        console.error('[Firebase] CRITICAL: VAPID key is missing. Cannot get FCM token. Ensure NEXT_PUBLIC_VAPID_KEY is in .env and the server was restarted.');
        return null;
      }

      let registration: ServiceWorkerRegistration | undefined;
      if ('serviceWorker' in navigator) {
        try {
          registration =
            (await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')) ||
            (await navigator.serviceWorker.register('/firebase-messaging-sw.js'));
        } catch (registrationError) {
          console.warn('[Firebase] Unable to register messaging service worker:', registrationError);
        }
      }

      const currentToken = await getToken(messaging, {
        vapidKey: vapidKeyToUse,
        serviceWorkerRegistration: registration,
      });

      if (currentToken) {
        console.log('[Firebase] FCM token retrieved successfully');
        return currentToken;
      } else {
        console.warn('[Firebase] No registration token available. This can happen if the VAPID key is incorrect/unregistered, or the sender ID is mismatched, or if Notification.requestPermission() was not granted prior. Check Firebase project settings and .env configuration.');
        return null;
      }
    } else {
      console.warn('[Firebase] Unable to get permission to notify. Permission status:', permission);
      return null;
    }
  } catch (error: unknown) {
    console.error('[Firebase] An error occurred while retrieving token: ', error);
    // Common errors here include:
    // - "messaging/invalid-vapid-key": The VAPID key is not valid or not recognized by FCM.
    // - "messaging/sw-reg-fail": Service worker registration failed.
    // - "messaging/permission-blocked" or "messaging/permission-default": Notification permission issues.
    return null;
  }
};

// Handle foreground messages
export const onForegroundMessage = (callback: (payload: MessagePayload) => void) => {
  if (messagingInstance) {
    onMessage(messagingInstance, (payload: MessagePayload) => {
      console.log('[Firebase] Message received in foreground: ', payload);
      callback(payload);
    });
  } else {
      initializeFirebaseMessaging().then(m => {
          if (m) {
            onMessage(m, (payload: MessagePayload) => {
                console.log('[Firebase] Message received in foreground (after init): ', payload);
                callback(payload);
            });
          }
      });
  }
};

export { app as firebaseApp, initializeFirebaseMessaging };
