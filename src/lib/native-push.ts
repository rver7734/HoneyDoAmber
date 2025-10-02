import type { PluginListenerHandle } from '@capacitor/core';
import type { Token } from '@capacitor/push-notifications';

let cachedToken: string | null = null;
let isRegistering = false;

export const getNativePushToken = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;

  const { Capacitor } = await import('@capacitor/core');
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  if (cachedToken) {
    return cachedToken;
  }

  if (isRegistering) {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (cachedToken) {
          clearInterval(interval);
          resolve(cachedToken);
        }
      }, 250);
      setTimeout(() => {
        clearInterval(interval);
        resolve(cachedToken);
      }, 10000);
    });
  }

  isRegistering = true;

  const { PushNotifications } = await import('@capacitor/push-notifications');

  const permStatus = await PushNotifications.checkPermissions();
  if (permStatus.receive !== 'granted') {
    const requestResult = await PushNotifications.requestPermissions();
    if (requestResult.receive !== 'granted') {
      isRegistering = false;
      return null;
    }
  }

  return new Promise(async (resolve, reject) => {
    const listenerHandles: PluginListenerHandle[] = [];

    const cleanup = async () => {
      await Promise.all(listenerHandles.map((handle) => handle.remove()));
      isRegistering = false;
    };

    PushNotifications.addListener('registration', async (token: Token) => {
      cachedToken = token.value;
      resolve(token.value);
      await cleanup();
    }).then(handle => listenerHandles.push(handle));

    PushNotifications.addListener('registrationError', async (error) => {
      console.error('[NativePush] Registration error', error);
      reject(error);
      await cleanup();
    }).then(handle => listenerHandles.push(handle));

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[NativePush] Notification received in foreground', notification);
    }).then(handle => listenerHandles.push(handle));

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('[NativePush] Notification action performed', notification);
    }).then(handle => listenerHandles.push(handle));

    try {
      await PushNotifications.register();
    } catch (error) {
      await cleanup();
      reject(error);
    }
  });
};
