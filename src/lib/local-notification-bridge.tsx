"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isNativeRuntime, addNativeNotificationListener } from '@/lib/native-local-notifications';

export function NativeNotificationBridge() {
  const router = useRouter();

  useEffect(() => {
    let removeListener: (() => Promise<void>) | null = null;
    let removePush: (() => Promise<void>) | null = null;

    (async () => {
      if (!(await isNativeRuntime())) {
        return;
      }

      removeListener = await addNativeNotificationListener((payload, rawEvent) => {
        console.log('[NativeNotificationBridge] local action payload', payload, rawEvent);
        const data = rawEvent?.notification?.data as Record<string, unknown> | undefined;
        const extra = rawEvent?.notification?.extra as Record<string, unknown> | undefined;
        const route = (extra?.route as string)
          || (data?.route as string)
          || (extra?.url as string)
          || (data?.url as string)
          || (extra?.reminderId ? `/bark/${extra.reminderId}` : undefined)
          || (data?.reminderId ? `/bark/${data.reminderId}` : undefined);
        if (route) {
          router.push(route);
        }
      });

      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const handle = await PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
          console.log('[NativeNotificationBridge] push action payload', event.notification);
          const data = event.notification?.data as Record<string, unknown> | undefined;
          const route = (data?.route as string)
            || (data?.url as string)
            || (data?.reminderId ? `/bark/${data.reminderId}` : undefined);
          if (route) {
            router.push(route);
          }
        });
        removePush = async () => {
          await handle.remove();
        };
      } catch (error) {
        console.warn('[NativeNotificationBridge] Push notification listener unavailable', error);
      }
    })();

    return () => {
      if (removeListener) {
        removeListener().catch(() => {
          /* noop */
        });
      }
      if (removePush) {
        removePush().catch(() => {
          /* noop */
        });
      }
    };
  }, [router]);

  return null;
}
