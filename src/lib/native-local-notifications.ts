import type { Reminder } from '@/types/reminder';

let cachedIsNative: boolean | null = null;
let channelInitialized = false;
let nativeChannelId: string | null = null;
let cachedPermissionStatus: 'granted' | 'denied' | 'prompt' | null = null;
let permissionInFlight: Promise<boolean> | null = null;
const APP_CHANNEL_ID = 'amber_barks_v2';

type LocalNotificationPlugin = Awaited<ReturnType<typeof import('@capacitor/local-notifications')>>['LocalNotifications'];

let pluginInstance: LocalNotificationPlugin | null = null;

const notificationIdFromReminderId = (reminderId: string): number => {
  let hash = 0;
  for (let i = 0; i < reminderId.length; i += 1) {
    // Basic DJB2 hash
    hash = (hash << 5) - hash + reminderId.charCodeAt(i);
    hash |= 0; // force 32-bit
  }
  hash = Math.abs(hash) % 2000000000;
  if (hash === 0) {
    return 1;
  }
  return hash;
};

const getCapacitor = async () => {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor;
  } catch (error) {
    console.warn('[NativeNotifications] Failed to load Capacitor core', error);
    return null;
  }
};

const getLocalNotifications = async (): Promise<{ plugin: LocalNotificationPlugin | null }> => {
  if (pluginInstance) {
    return { plugin: pluginInstance };
  }
  try {
    const localNotificationsModule = await import('@capacitor/local-notifications');
    pluginInstance = localNotificationsModule.LocalNotifications;
    return { plugin: pluginInstance };
  } catch (error) {
    console.warn('[NativeNotifications] Failed to load @capacitor/local-notifications', error);
    return { plugin: null };
  }
};

export const isNativeRuntime = async (): Promise<boolean> => {
  if (cachedIsNative !== null) {
    return cachedIsNative;
  }
  const Capacitor = await getCapacitor();
  if (!Capacitor) {
    cachedIsNative = false;
    return cachedIsNative;
  }
  cachedIsNative = typeof Capacitor.isNativePlatform === 'function' ? Capacitor.isNativePlatform() : false;
  return cachedIsNative;
};

const ensurePermission = async (): Promise<boolean> => {
  if (cachedPermissionStatus === 'granted') {
    return true;
  }
  if (permissionInFlight) {
    return permissionInFlight;
  }

  permissionInFlight = (async () => {
    const { plugin: LocalNotifications } = await getLocalNotifications();
    if (!LocalNotifications) {
      console.warn('[NativeNotifications] LocalNotifications plugin unavailable, cannot check permission');
      cachedPermissionStatus = 'denied';
      return false;
    }

    const status = await LocalNotifications.checkPermissions();
    if (status.display === 'granted') {
      cachedPermissionStatus = 'granted';
      await ensureChannel();
      return true;
    }

    const requestResult = await LocalNotifications.requestPermissions();
    cachedPermissionStatus = requestResult.display;
    if (cachedPermissionStatus === 'granted') {
      await ensureChannel();
      return true;
    }
    return false;
  })();

  try {
    return await permissionInFlight;
  } finally {
    permissionInFlight = null;
  }
};

export const requestNativeNotificationPermission = async (): Promise<boolean> => {
  if (!(await isNativeRuntime())) {
    return false;
  }
  return ensurePermission();
};

const ensureChannel = async (): Promise<void> => {
  if (channelInitialized) {
    return;
  }
  const Capacitor = await getCapacitor();
  if (!Capacitor || Capacitor.getPlatform?.() !== 'android') {
    channelInitialized = true;
    return;
  }
  try {
    const { plugin: LocalNotifications } = await getLocalNotifications();
    if (!LocalNotifications) {
      console.warn('[NativeNotifications] LocalNotifications plugin unavailable, skipping channel creation');
      nativeChannelId = null;
      channelInitialized = true;
      return;
    }

    if (!LocalNotifications.createChannel || !LocalNotifications.listChannels) {
      console.warn('[NativeNotifications] createChannel/listChannels not implemented; using default notification channel');
      nativeChannelId = null;
      channelInitialized = true;
      return;
    }

    const existingChannels = await LocalNotifications.listChannels();

    // Clear out legacy channels that referenced missing sound assets
    const legacyChannelIds = ['amber_reminders'];
    await Promise.all(
      legacyChannelIds.map(async legacyId => {
        const exists = existingChannels.channels?.some(channel => channel.id === legacyId);
        if (exists) {
          console.log('[NativeNotifications] Removing legacy channel', legacyId);
          await LocalNotifications.deleteChannel?.({ id: legacyId });
        }
      })
    );

    const refreshedChannels = await LocalNotifications.listChannels();
    const targetChannel = refreshedChannels.channels?.find(channel => channel.id === APP_CHANNEL_ID);

    if (!targetChannel) {
      await LocalNotifications.createChannel({
        id: APP_CHANNEL_ID,
        name: 'Amber Barks',
        description: 'Amber\'s gentle barks when tasks are due',
        importance: 'high',
        visibility: 'public',
        vibration: true,
        sound: undefined,
      });
      nativeChannelId = APP_CHANNEL_ID;
      channelInitialized = true;
      console.log('[NativeNotifications] Created channel', APP_CHANNEL_ID);
      return;
    }

    nativeChannelId = targetChannel.id;
    if (targetChannel.importance !== 'high') {
      console.warn('[NativeNotifications] Existing channel importance is not high; consider updating it in system settings.', targetChannel);
    }
    channelInitialized = true;
    console.log('[NativeNotifications] Reusing existing channel', targetChannel);
  } catch (error) {
    console.error('[NativeNotifications] Failed to ensure Android notification channel', error);
    nativeChannelId = null;
  }
};

const buildNotificationPayload = (reminder: Reminder) => {
  const title = "Amber's gentle nudge";
  const body = reminder.notificationMessage?.trim()
    || `Hey honey, it's time for ${reminder.task}`;

  return { title, body };
};

const reminderFireDate = (reminder: Reminder): Date | null => {
  if (!reminder.date) {
    return null;
  }
  const iso = reminder.time ? `${reminder.date}T${reminder.time}:00` : `${reminder.date}T09:00:00`;
  const scheduledAt = new Date(iso);
  if (Number.isNaN(scheduledAt.getTime())) {
    return null;
  }
  return scheduledAt;
};

export const scheduleNativeReminder = async (reminder: Reminder): Promise<boolean> => {
  if (!(await isNativeRuntime())) {
    return false;
  }
  const fireDate = reminderFireDate(reminder);
  if (!fireDate || fireDate.getTime() <= Date.now()) {
    console.warn('[NativeNotifications] Skipping reminder because fire date invalid or in past', { reminderId: reminder.id, fireDate: fireDate?.toISOString?.() });
    return false;
  }
  if (!(await ensurePermission())) {
    console.warn('[NativeNotifications] Permission not granted when trying to schedule reminder', { reminderId: reminder.id });
    return false;
  }

  await ensureChannel();

  const { plugin: LocalNotifications } = await getLocalNotifications();
  if (!LocalNotifications) {
    console.warn('[NativeNotifications] LocalNotifications plugin unavailable, cannot schedule reminder');
    return false;
  }
  const id = notificationIdFromReminderId(reminder.id);

  // Cancel any pending notifications with the same id before re-scheduling
  try {
    await LocalNotifications.cancel?.({ notifications: [{ id }] });
  } catch (error) {
    console.warn('[NativeNotifications] Failed cancelling existing reminder before scheduling', { id, error });
  }

  const { title, body } = buildNotificationPayload(reminder);

  try {
    await LocalNotifications.schedule?.({
      notifications: [
        {
          id,
          title,
          body,
          schedule: { at: fireDate, allowWhileIdle: true },
          channelId: nativeChannelId ?? APP_CHANNEL_ID,
          extra: {
            reminderId: reminder.id,
            route: `/bark/${reminder.id}`,
            priority: reminder.priority ?? 'medium',
          },
        },
      ],
    });
    console.log('[NativeNotifications] Scheduled reminder', { id, title, fireDate: fireDate.toISOString() });
    return true;
  } catch (error) {
    console.error('[NativeNotifications] Failed to schedule reminder', { id, error });
    return false;
  }
};

export const cancelNativeReminder = async (reminderId: string): Promise<boolean> => {
  if (!(await isNativeRuntime())) {
    return false;
  }
  await ensureChannel();

  const { plugin: LocalNotifications } = await getLocalNotifications();
  if (!LocalNotifications) {
    console.warn('[NativeNotifications] LocalNotifications plugin unavailable, cannot cancel reminder');
    return false;
  }
  const id = notificationIdFromReminderId(reminderId);
  await LocalNotifications.cancel?.({ notifications: [{ id }] });
  console.log('[NativeNotifications] Cancelled reminder', { id });
  return true;
};

export const syncNativeReminders = async (reminders: Reminder[]): Promise<void> => {
  if (!(await isNativeRuntime())) {
    return;
  }
  if (!(await ensurePermission())) {
    console.warn('[NativeNotifications] Permission not granted during sync, skipping');
    return;
  }

  const { plugin: LocalNotifications } = await getLocalNotifications();
  if (!LocalNotifications) {
    console.warn('[NativeNotifications] LocalNotifications plugin unavailable during sync');
    return;
  }
  const pending = await LocalNotifications.getPending?.();
  const pendingNotifications = pending?.notifications ?? [];
  const pendingIds = new Set(pendingNotifications.map(notification => notification.id));
  
  const upcoming = reminders.filter((reminder) => {
    if (reminder.completed) {
      return false;
    }
    const fireDate = reminderFireDate(reminder);
    if (!fireDate) {
      return false;
    }
    return fireDate.getTime() > Date.now();
  });

  const expectedIds = new Set<number>();
  for (const reminder of upcoming) {
    const id = notificationIdFromReminderId(reminder.id);
    expectedIds.add(id);
    if (!pendingIds.has(id)) {
      await scheduleNativeReminder(reminder);
    }
  }

  const notificationsToCancel = [...pendingIds].filter((id) => !expectedIds.has(id));
  if (notificationsToCancel.length > 0) {
    try {
      await LocalNotifications.cancel?.({ notifications: notificationsToCancel.map((id) => ({ id })) });
      console.log('[NativeNotifications] Cancelled stale reminders', { ids: notificationsToCancel });
    } catch (error) {
      console.error('[NativeNotifications] Failed cancelling stale reminders', { notificationsToCancel, error });
    }
  }
};

export const cancelAllNativeReminders = async (): Promise<void> => {
  if (!(await isNativeRuntime())) {
    return;
  }
  await ensureChannel();
  const { plugin: LocalNotifications } = await getLocalNotifications();
  if (!LocalNotifications) {
    console.warn('[NativeNotifications] LocalNotifications plugin unavailable, cannot cancel all');
    return;
  }
  await LocalNotifications.cancelAll?.();
  console.log('[NativeNotifications] Cancelled all reminders');
};

export const listPendingNativeReminders = async () => {
  if (!(await isNativeRuntime())) {
    return [];
  }
  await ensurePermission();
  const { plugin: LocalNotifications } = await getLocalNotifications();
  if (!LocalNotifications) {
    console.warn('[NativeNotifications] LocalNotifications plugin unavailable, pending list empty');
    return [];
  }
  const pending = await LocalNotifications.getPending?.();
  if (!pending) {
    console.warn('[NativeNotifications] getPending not available');
    return [];
  }
  console.log('[NativeNotifications] Pending reminders payload', pending);
  return pending.notifications ?? [];
};

export const scheduleNativeTestNotification = async (
  secondsFromNow: number,
  title?: string,
  body?: string,
  route?: string
) => {
  if (!(await isNativeRuntime())) {
    return false;
  }
  if (!(await ensurePermission())) {
    console.warn('[NativeNotifications] Permission not granted for native test notification');
    return false;
  }

  const { plugin: LocalNotifications } = await getLocalNotifications();
  if (!LocalNotifications) {
    console.warn('[NativeNotifications] LocalNotifications plugin unavailable, cannot schedule test');
    return false;
  }
  await ensureChannel();
  const id = notificationIdFromReminderId(`test-${Date.now()}-${Math.random()}`);
  const fireDate = new Date(Date.now() + secondsFromNow * 1000);
  try {
    await LocalNotifications.schedule?.({
      notifications: [{
        id,
        title: title || "Amber's quick bark",
        body: body || `Test alert in ${secondsFromNow} seconds`,
        schedule: { at: fireDate, allowWhileIdle: true },
        channelId: nativeChannelId ?? APP_CHANNEL_ID,
        extra: { scenario: 'test-loop', secondsFromNow, route },
      }],
    });
    console.log('[NativeNotifications] Scheduled native test notification', { id, fireDate: fireDate.toISOString() });
    return true;
  } catch (error) {
    console.error('[NativeNotifications] Failed to schedule native test notification', { secondsFromNow, error });
    return false;
  }
};

type NotificationAction = {
  notification?: {
    title?: string;
    body?: string;
    extra?: Record<string, unknown>;
    data?: Record<string, unknown>;
  };
};

type ActionCallback = (
  payload: { title?: string; body?: string; extra?: Record<string, unknown> },
  rawEvent: NotificationAction
) => void;

export const addNativeNotificationListener = async (callback: ActionCallback) => {
  if (!(await isNativeRuntime())) {
    return async () => {};
  }

  const { plugin: LocalNotifications } = await getLocalNotifications();
  if (!LocalNotifications?.addListener) {
    console.warn('[NativeNotifications] addListener not available on this platform');
    return async () => {};
  }

  const handle = await LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
    const payload = {
      title: event?.notification?.title,
      body: event?.notification?.body,
      extra: event?.notification?.extra ?? event?.notification?.data ?? {},
    };
    callback(payload, event as NotificationAction);
  });

  return async () => {
    await handle.remove();
  };
};

export const removeNativeNotificationListeners = async () => {
  if (!(await isNativeRuntime())) {
    return;
  }
  const { plugin: LocalNotifications } = await getLocalNotifications();
  if (!LocalNotifications?.removeAllListeners) {
    return;
  }
  await LocalNotifications.removeAllListeners();
};
