
"use client";

import type { Reminder } from '@/types/reminder';
import type { AmberPersonalityKey } from '@/lib/personalities';
import { DEFAULT_AMBER_PERSONALITY_KEY } from '@/lib/personalities';
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
// Firebase related imports
import { requestNotificationPermissionAndGetToken, onForegroundMessage, initializeFirebaseMessaging, firebaseApp } from '@/lib/firebase';
import {
  scheduleNativeReminder,
  cancelNativeReminder,
  syncNativeReminders,
  cancelAllNativeReminders,
  requestNativeNotificationPermission,
  isNativeRuntime,
} from '@/lib/native-local-notifications';
import { getFunctions, httpsCallable, type Functions, type HttpsCallable } from 'firebase/functions';
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, type Firestore, Timestamp } from 'firebase/firestore';
import type { MessagePayload } from 'firebase/messaging';
import { useToast } from '@/hooks/use-toast'; // For showing foreground messages
import { useAuth } from './auth-context'; // Import useAuth
import { format } from 'date-fns'; // Import date-fns for formatting
import { computeNextOccurrence, formatDateTimeForReminder, normalizeRecurrence } from '@/lib/recurrence';

const DEFAULT_REMINDER_TIME_KEY = 'honeyDoDefaultReminderTime';
const NOTIFICATIONS_ENABLED_KEY = 'honeyDoNotificationsEnabled'; // This now controls FCM permission request
const FCM_TOKEN_KEY = 'honeyDoFCMToken';
const FALLBACK_DEFAULT_TIME = "09:00";
const DEFAULT_PERSONALITY_KEY = 'honeyDoDefaultPersonality';

interface RemindersContextType {
  reminders: Reminder[];
  getReminderById: (id: string) => Reminder | undefined;
  addReminder: (reminderData: Omit<Reminder, "id" | "completed">) => Promise<Reminder>;
  updateReminder: (id: string, updates: Partial<Omit<Reminder, "id">>) => Promise<Reminder | null>;
  deleteReminder: (id: string) => Promise<void>;
  toggleReminderCompletion: (id: string) => Promise<void>;
  isLoading: boolean;
  defaultReminderTime: string;
  setDefaultReminderTime: (time: string) => void;
  areNotificationsGloballyEnabled: boolean; // Controls if we attempt to get FCM token
  setAreNotificationsGloballyEnabled: (enabled: boolean) => void;
  fcmToken: string | null;
  defaultPersonality: AmberPersonalityKey;
  setDefaultPersonality: (personality: AmberPersonalityKey) => Promise<void>;
}

const RemindersContext = createContext<RemindersContextType | undefined>(undefined);

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

interface ScheduleNotificationRequest {
  reminder: Reminder;
  fcmToken?: string | null;
  userId: string;
}

interface RegisterFcmTokenRequest {
  fcmToken: string;
  userId: string;
}

interface DeleteReminderNotificationRequest {
  reminderId: string;
  userId: string;
}

interface ToggleReminderCompletionRequest {
  reminderId: string;
  userId: string;
  newCompletedStatus: boolean;
}

interface UnregisterFcmTokenRequest {
  userId: string;
  fcmToken: string;
}

export function RemindersProvider({ children }: { children: ReactNode }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [defaultReminderTime, setDefaultReminderTimeState] = useState<string>(FALLBACK_DEFAULT_TIME);
  const [areNotificationsGloballyEnabled, setAreNotificationsGloballyEnabledState] = useState<boolean>(true);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isNativeApp, setIsNativeApp] = useState<boolean>(false);
  const [defaultPersonality, setDefaultPersonalityState] = useState<AmberPersonalityKey>(DEFAULT_AMBER_PERSONALITY_KEY);
  const remindersRef = useRef<Reminder[]>([]);
  const { toast } = useToast();
  const { currentUser, isLoading: isAuthLoading } = useAuth(); // Get current user and auth loading state

  // Initialize Firebase Functions and Firestore instances in state
  const [functionsInstance, setFunctionsInstance] = useState<Functions | null>(null);
  const [dbInstance, setDbInstance] = useState<Firestore | null>(null);
  const [isFirebaseServicesLoading, setIsFirebaseServicesLoading] = useState(true);

  useEffect(() => {
    remindersRef.current = reminders;
  }, [reminders]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const storedPersonality = localStorage.getItem(DEFAULT_PERSONALITY_KEY) as AmberPersonalityKey | null;
      if (storedPersonality) {
        setDefaultPersonalityState(storedPersonality);
      }
      const storedDefaultTime = localStorage.getItem(DEFAULT_REMINDER_TIME_KEY);
      if (storedDefaultTime) {
        setDefaultReminderTimeState(storedDefaultTime);
      }
    } catch (error: unknown) {
      console.warn('Unable to load default preferences from localStorage', error);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const native = await isNativeRuntime();
        if (!cancelled) {
          setIsNativeApp(native);
        }
      } catch (error) {
        console.warn('Failed to determine native runtime', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!firebaseApp) {
      return;
    }
    setFunctionsInstance(getFunctions(firebaseApp));
    setDbInstance(getFirestore(firebaseApp));
    setIsFirebaseServicesLoading(false);
  }, []);

  useEffect(() => {
    if (!isNativeApp || !areNotificationsGloballyEnabled) {
      return;
    }
    syncNativeReminders(reminders).catch((error) => {
      console.error('Failed to sync native notifications', error);
    });
  }, [isNativeApp, areNotificationsGloballyEnabled, reminders]);

  const scheduleNotification = useCallback((data: ScheduleNotificationRequest) => {
    if (!functionsInstance) {
      console.warn("Functions instance not available for scheduleNotification.");
      return Promise.reject(new Error("Functions not ready"));
    }
    const callable: HttpsCallable<ScheduleNotificationRequest, unknown> = httpsCallable(functionsInstance, 'scheduleNotification');
    return callable(data);
  }, [functionsInstance]);

  const registerToken = useCallback((data: RegisterFcmTokenRequest) => {
    if (!functionsInstance) {
      console.warn("Functions instance not available for registerToken.");
      return Promise.reject(new Error("Functions not ready"));
    }
    const callable: HttpsCallable<RegisterFcmTokenRequest, unknown> = httpsCallable(functionsInstance, 'registerFcmToken');
    return callable(data);
  }, [functionsInstance]);

  const deleteReminderNotification = useCallback((data: DeleteReminderNotificationRequest) => {
    if (!functionsInstance) {
      console.warn("Functions instance not available for deleteReminderNotification.");
      return Promise.reject(new Error("Functions not ready"));
    }
    const callable: HttpsCallable<DeleteReminderNotificationRequest, unknown> = httpsCallable(functionsInstance, 'deleteReminderNotification');
    return callable(data);
  }, [functionsInstance]);

  const toggleReminderCompletionNotification = useCallback((data: ToggleReminderCompletionRequest) => {
    if (!functionsInstance) {
      console.warn("Functions instance not available for toggleReminderCompletionNotification.");
      return Promise.reject(new Error("Functions not ready"));
    }
    const callable: HttpsCallable<ToggleReminderCompletionRequest, unknown> = httpsCallable(functionsInstance, 'toggleReminderCompletionNotification');
    return callable(data);
  }, [functionsInstance]);

  const unregisterFcmToken = useCallback((data: UnregisterFcmTokenRequest) => {
    if (!functionsInstance) {
      console.warn("Functions instance not available for unregisterFcmToken.");
      return Promise.reject(new Error("Functions not ready"));
    }
    const callable: HttpsCallable<UnregisterFcmTokenRequest, unknown> = httpsCallable(functionsInstance, 'unregisterFcmToken');
    return callable(data);
  }, [functionsInstance]);

  // Effect to initialize Firebase messaging and handle foreground messages
  useEffect(() => {
    if (isNativeApp) {
      console.log('RemindersProvider: skipping Firebase messaging init on native runtime');
      return;
    }
    if (isFirebaseServicesLoading) return; // Wait for Firebase services to be ready

    initializeFirebaseMessaging().then(messaging => {
      if (messaging) {
        onForegroundMessage((payload: MessagePayload) => {
          // Show a toast for foreground messages
          toast({
            title: payload.notification?.title || "Amber's Update!",
            description: payload.notification?.body || "Something new from Amber!",
          });
        });
      }
    });
  }, [toast, isFirebaseServicesLoading, isNativeApp]);

  console.log('RemindersProvider runtime check:', {
    isNativeApp,
    isAuthLoading,
    currentUser: currentUser ? currentUser.uid : null,
    isFirebaseServicesLoading,
    areNotificationsGloballyEnabled
  });

  // Effect for handling notification permission and token based on user preference
  useEffect(() => {
    const manageFcmTokenOnLoad = async () => {
      if (isNativeApp) {
        console.log('manageFcmTokenOnLoad: native runtime detected, skipping FCM token handling');
        return;
      }
      console.log('manageFcmTokenOnLoad: Starting...');
      console.log('manageFcmTokenOnLoad: isAuthLoading', isAuthLoading, 'currentUser', currentUser, 'isFirebaseServicesLoading', isFirebaseServicesLoading, 'areNotificationsGloballyEnabled', areNotificationsGloballyEnabled);

      if (!isAuthLoading && currentUser && !isFirebaseServicesLoading && areNotificationsGloballyEnabled) {
        // Check if notification permission is already denied
        if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
          console.warn("manageFcmTokenOnLoad: Notification permission is denied. Cannot get FCM token.");
          setFcmToken(null);
          localStorage.removeItem(FCM_TOKEN_KEY);
          return; // Exit early if permission is denied
        }

        const storedToken = localStorage.getItem(FCM_TOKEN_KEY);
        console.log("manageFcmTokenOnLoad: storedToken", storedToken);

        if (storedToken) {
          setFcmToken(storedToken);
          // Re-register token with backend to ensure it's fresh
          if (registerToken) {
            try {
              console.log("manageFcmTokenOnLoad: Attempting to re-register stored token with backend.");
              await registerToken({ fcmToken: storedToken, userId: currentUser.uid });
              console.log("manageFcmTokenOnLoad: Stored FCM token re-registered with backend.");
            } catch (error: unknown) {
              console.error("manageFcmTokenOnLoad: Error re-registering stored FCM token:", error);
            }
          } else {
            console.warn("manageFcmTokenOnLoad: registerToken function not available.");
          }
        } else {
          // If no stored token, do NOT request permission here. Permission must be user-initiated.
          console.log("manageFcmTokenOnLoad: No stored FCM token. User must enable notifications via settings to get one.");
        }
      } else {
        console.log("manageFcmTokenOnLoad: Conditions not met for token management.");
      }
    };

    manageFcmTokenOnLoad();
  }, [isAuthLoading, currentUser, isFirebaseServicesLoading, areNotificationsGloballyEnabled, registerToken, isNativeApp]);


  // Initial load from localStorage and Firestore
  useEffect(() => {
    const loadReminders = async () => {
      if (!isAuthLoading && !isFirebaseServicesLoading) { // Only load reminders if auth and Firebase services are loaded
        if (!dbInstance) {
          console.warn("Firestore instance not ready when attempting to load reminders.");
          return;
        }
        if (currentUser) { // If user is logged in, fetch their reminders
          try {
            // Add timeout to prevent hanging on Firestore connection issues
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error("Firestore connection timeout")), 5000)
            );
            
            const firestorePromise = (async () => {
              const userRemindersCollection = collection(dbInstance, `users/${currentUser.uid}/reminders`);
              const querySnapshot = await getDocs(userRemindersCollection);
              return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data() as Omit<Reminder, 'id'>
              }));
            })();
            
            const firestoreReminders: Reminder[] = await Promise.race([firestorePromise, timeoutPromise]) as Reminder[];
            const remindersWithPersonality = firestoreReminders.map(reminder => ({
              ...reminder,
              personality: reminder.personality ?? DEFAULT_AMBER_PERSONALITY_KEY,
              recurrence: normalizeRecurrence(reminder.recurrence),
            }));
            setReminders(remindersWithPersonality);

            const storedDefaultTime = localStorage.getItem(DEFAULT_REMINDER_TIME_KEY);
            setDefaultReminderTimeState(storedDefaultTime || FALLBACK_DEFAULT_TIME);

            const storedDefaultPersonality = localStorage.getItem(DEFAULT_PERSONALITY_KEY) as AmberPersonalityKey | null;
            setDefaultPersonalityState(storedDefaultPersonality || DEFAULT_AMBER_PERSONALITY_KEY);

            const storedNotificationsEnabled = localStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
            setAreNotificationsGloballyEnabledState(storedNotificationsEnabled ? JSON.parse(storedNotificationsEnabled) : true);
            
            // FCM token is now managed by manageFcmTokenOnLoad useEffect
            // const storedFcmToken = localStorage.getItem(FCM_TOKEN_KEY);
            // if (storedFcmToken) setFcmToken(storedFcmToken);

          } catch (error: unknown) {
            console.error("Failed to load data from Firestore", error);
            const message = getErrorMessage(error);
            // Don't show error toast for timeout - just use localStorage fallback
            if (message !== "Firestore connection timeout") {
              toast({
                title: "Connection Issue",
                description: "Using offline mode. Some features may be limited.",
                variant: "destructive"
              });
            }
            setReminders([]);
            try {
              const fallbackTime = localStorage.getItem(DEFAULT_REMINDER_TIME_KEY);
              setDefaultReminderTimeState(fallbackTime || FALLBACK_DEFAULT_TIME);
              const fallbackPersonality = localStorage.getItem(DEFAULT_PERSONALITY_KEY) as AmberPersonalityKey | null;
              if (fallbackPersonality) {
                setDefaultPersonalityState(fallbackPersonality);
              }
            } catch (storageError) {
              console.warn('Unable to read defaults from localStorage after Firestore failure', storageError);
              setDefaultReminderTimeState(FALLBACK_DEFAULT_TIME);
              setDefaultPersonalityState(DEFAULT_AMBER_PERSONALITY_KEY);
            }
            setAreNotificationsGloballyEnabledState(true);
          }
        } else { // If no user is logged in, clear reminders
          setReminders([]);
        }
        setIsLoading(false);
      }
    };

    loadReminders();
  }, [isAuthLoading, currentUser, dbInstance, isFirebaseServicesLoading, toast]);


  const setDefaultReminderTime = useCallback((time: string) => {
    try {
      localStorage.setItem(DEFAULT_REMINDER_TIME_KEY, time);
      setDefaultReminderTimeState(time);
    } catch (error: unknown) {
      console.error("Failed to save default reminder time to localStorage", error);
    }
  }, []);

  const setDefaultPersonality = useCallback(async (personality: AmberPersonalityKey) => {
    try {
      localStorage.setItem(DEFAULT_PERSONALITY_KEY, personality);
      setDefaultPersonalityState(personality);
      const updatedReminders = remindersRef.current.map(reminder => ({
        ...reminder,
        personality,
      }));
      setReminders(updatedReminders);
      remindersRef.current = updatedReminders;

      if (dbInstance && currentUser) {
        try {
          const updates = updatedReminders.map(reminder => {
            const reminderRef = doc(dbInstance, `users/${currentUser.uid}/reminders`, reminder.id);
            return updateDoc(reminderRef, { personality });
          });
          await Promise.allSettled(updates);
        } catch (firestoreError) {
          console.warn('Unable to propagate default personality change to Firestore', firestoreError);
        }
      }
    } catch (error: unknown) {
      console.error("Failed to save default personality to localStorage", error);
    }
  }, [currentUser, dbInstance]);

  const setAreNotificationsGloballyEnabledCallback = useCallback(async (enabled: boolean) => {
    console.log("setAreNotificationsGloballyEnabledCallback: called with enabled=", enabled);
    try {
      localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, JSON.stringify(enabled));
      setAreNotificationsGloballyEnabledState(enabled);
      if (isNativeApp) {
        if (enabled) {
          const granted = await requestNativeNotificationPermission();
          if (!granted) {
            toast({ title: "Amber can't bark yet", description: "Notification permission was denied on the device.", variant: "destructive" });
            localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, JSON.stringify(false));
            setAreNotificationsGloballyEnabledState(false);
            return;
          }
          toast({ title: "Amber will nudge you natively", description: "Local notifications enabled on this device." });
          await syncNativeReminders(remindersRef.current).catch((error: unknown) => {
            console.error('Unable to sync native notifications after enabling', error);
          });
        } else {
          toast({ title: "Amber's native barks are off", description: "Local notifications disabled." });
          await cancelAllNativeReminders().catch((error: unknown) => {
            console.error('Unable to cancel native notifications', error);
          });
        }
        return;
      }

      if (enabled) {
        toast({ title: "Amber will try to send barks!", description: "Push notifications enabled (if permission granted)." });
        // Request permission and get token when user enables notifications
        console.log("setAreNotificationsGloballyEnabledCallback: Requesting notification permission and token...");
        const token = await requestNotificationPermissionAndGetToken();
        if (token) {
          setFcmToken(token);
          localStorage.setItem(FCM_TOKEN_KEY, token);
          console.log("setAreNotificationsGloballyEnabledCallback: FCM token obtained:", token);
          if (currentUser && registerToken) {
            try {
              console.log("setAreNotificationsGloballyEnabledCallback: Sending FCM token to backend.");
              await registerToken({ fcmToken: token, userId: currentUser.uid });
              console.log("setAreNotificationsGloballyEnabledCallback: FCM token sent to backend for registration.");
            } catch (error: unknown) {
              console.error("setAreNotificationsGloballyEnabledCallback: Error sending FCM token to backend:", error);
            }
          } else {
            console.warn("setAreNotificationsGloballyEnabledCallback: currentUser or registerToken not available.");
          }
        } else {
          console.warn("setAreNotificationsGloballyEnabledCallback: Could not get FCM token. Notifications may not work.");
        }
      } else {
        toast({ title: "Amber&apos;s barks are off.", description: "Push notifications disabled." });
        setFcmToken(null);
        localStorage.removeItem(FCM_TOKEN_KEY);
        // Unregister token from backend if user disables notifications
        if (currentUser && unregisterFcmToken && fcmToken) {
          try {
            await unregisterFcmToken({ userId: currentUser.uid, fcmToken: fcmToken });
            console.log("FCM token unregistered from backend.");
          } catch (error: unknown) {
            console.error("Error unregistering FCM token from backend:", error);
          }
        } else {
          console.warn("User not logged in, unregisterFcmToken function not available, or FCM token not present. Cannot unregister from backend.");
        }
      }
    } catch (error: unknown) {
      console.error("setAreNotificationsGloballyEnabledCallback: Failed to save notification preference to localStorage", error);
    }
  }, [toast, currentUser, registerToken, unregisterFcmToken, fcmToken, isNativeApp]);

  const getReminderById = useCallback((id: string) => {
    return reminders.find(r => r.id === id);
  }, [reminders]);

  const addReminderCallback = useCallback(async (reminderData: Omit<Reminder, "id" | "completed">) => {
    if (!currentUser || !dbInstance || !scheduleNotification) {
      console.warn("Cannot add reminder: User not logged in or Firebase services not ready.");
      toast({ title: "Error", description: "Please log in and ensure app is ready to add reminders.", variant: "destructive" });
      return Promise.reject(new Error("User not logged in or Firebase services not ready"));
    }
    const { details, personality, recurrence, ...reminderFields } = reminderData;
    const normalizedRecurrence = normalizeRecurrence(recurrence);

    const newReminder: Omit<Reminder, "id"> = {
      ...reminderFields,
      completed: false,
      details: details ?? null,
      priority: reminderData.priority || 'medium',
      personality: personality || defaultPersonality,
      recurrence: normalizedRecurrence,
    };

    try {
      const userRemindersCollection = collection(dbInstance, `users/${currentUser.uid}/reminders`);
      const docRef = await addDoc(userRemindersCollection, newReminder);
      const reminderWithId: Reminder = { ...newReminder, id: docRef.id };
      setReminders(prev => [...prev, reminderWithId]);

      // Show a toast notification for the new reminder
      const formattedDate = format(new Date(reminderWithId.date + 'T' + reminderWithId.time), "MMM d, yyyy");
      const formattedTime = format(new Date(reminderWithId.date + 'T' + reminderWithId.time), "h:mm a");
      toast({
        title: "Reminder Added!",
        description: `Amber will remind you to ${reminderWithId.task} on ${formattedDate} at ${formattedTime}.`,
      });

      if (isNativeApp && areNotificationsGloballyEnabled) {
        scheduleNativeReminder(reminderWithId).catch((error: unknown) => {
          console.error('Failed to schedule native reminder', error);
        });
      } else if (fcmToken) {
        // Call the Cloud Function to schedule the notification
        scheduleNotification({ reminder: reminderWithId, fcmToken, userId: currentUser.uid })
          .then((result) => {
            console.log("Cloud Function response:", result.data);
          })
          .catch((error: unknown) => {
            console.error("Error calling Cloud Function:", error);
          });
      } else {
        console.warn("Notification token not available. Cannot schedule notification via backend.");
      }
      return reminderWithId;
    } catch (error: unknown) {
      console.error("Error adding reminder to Firestore:", error);
      throw error;
    }
  }, [dbInstance, currentUser, fcmToken, scheduleNotification, toast, isNativeApp, areNotificationsGloballyEnabled, defaultPersonality]);

  const rescheduleRecurringReminder = useCallback(async (reminder: Reminder) => {
    if (!dbInstance || !currentUser || !reminder.recurrence) {
      return null;
    }

    const current = new Date(`${reminder.date}T${reminder.time}:00`);
    if (Number.isNaN(current.getTime())) {
      return null;
    }

    const next = computeNextOccurrence(current, reminder.recurrence);
    if (!next) {
      return null;
    }

    const { date, time } = formatDateTimeForReminder(next);
    const reminderRef = doc(dbInstance, `users/${currentUser.uid}/reminders`, reminder.id);

    try {
      await updateDoc(reminderRef, {
        date,
        time,
        completed: false,
        notificationSent: false,
        notificationSentAt: null,
        scheduledDateTime: Timestamp.fromDate(next),
      });

      const updatedReminder: Reminder = {
        ...reminder,
        date,
        time,
        completed: false,
      };

      setReminders(prev => prev.map(r => (r.id === reminder.id ? updatedReminder : r)));

      if (isNativeApp && areNotificationsGloballyEnabled) {
        scheduleNativeReminder(updatedReminder).catch((error: unknown) => {
          console.error('Failed to reschedule native reminder', error);
        });
      } else if (fcmToken) {
        scheduleNotification({ reminder: updatedReminder, fcmToken, userId: currentUser.uid })
          .catch((error: unknown) => {
            console.error('Error calling Cloud Function for recurrence reschedule:', error);
          });
      }

      toast({
        title: 'Repeated reminder scheduled',
        description: `Amber will nudge you again on ${format(next, "PPP 'at' p")}.`,
      });

      return updatedReminder;
    } catch (error) {
      console.error('Failed to reschedule recurring reminder', error);
      toast({
        title: 'Recurrence error',
        description: 'Amber could not schedule the next occurrence. Please double-check this reminder.',
        variant: 'destructive',
      });
      return null;
    }
  }, [dbInstance, currentUser, scheduleNotification, toast, isNativeApp, areNotificationsGloballyEnabled, fcmToken]);

  const updateReminderCallback = useCallback(async (id: string, updates: Partial<Omit<Reminder, "id">>) => {
    if (!currentUser || !dbInstance) {
      console.warn("Cannot update reminder: User not logged in or Firebase services not ready.");
      toast({ title: "Error", description: "Please log in and ensure app is ready to update reminders.", variant: "destructive" });
      return Promise.reject(new Error("User not logged in or Firebase services not ready"));
    }
    const reminderRef = doc(dbInstance, `users/${currentUser.uid}/reminders`, id);
    const preparedUpdates: Partial<Omit<Reminder, 'id'>> = { ...updates };
    if (preparedUpdates.recurrence !== undefined) {
      preparedUpdates.recurrence = normalizeRecurrence(preparedUpdates.recurrence) || null;
    }
    const filteredUpdates = Object.fromEntries(
      Object.entries(preparedUpdates).filter(([, value]) => value !== undefined)
    );

    let updatedReminder: Reminder | null = null; // Declare updatedReminder here

    try {
      await updateDoc(reminderRef, filteredUpdates);
      const updatedReminders = reminders.map(r => {
        if (r.id === id) {
          updatedReminder = { ...r, ...preparedUpdates } as Reminder; // Assign to the outer updatedReminder
          return updatedReminder;
        }
        return r;
      });
      setReminders(updatedReminders);
      // Update native or backend notifications
      if (updatedReminder) {
        if (isNativeApp && areNotificationsGloballyEnabled) {
          scheduleNativeReminder(updatedReminder).catch((error: unknown) => {
            console.error('Failed to reschedule native reminder', error);
          });
        } else if (fcmToken) {
          scheduleNotification({ reminder: updatedReminder, fcmToken, userId: currentUser.uid })
            .then((result) => {
              console.log("Cloud Function response for update:", result.data);
            })
            .catch((error: unknown) => {
              console.error("Error calling Cloud Function for update:", error);
            });
        } else {
          console.warn("Notification token not available or reminder not found. Cannot update notification via backend.");
        }
      }
      return updatedReminder; // Return the correctly assigned updatedReminder
    } catch (error: unknown) {
      console.error("Error updating reminder in Firestore:", error);
      throw error;
    }
  }, [reminders, dbInstance, currentUser, fcmToken, scheduleNotification, toast, isNativeApp, areNotificationsGloballyEnabled]);

  const deleteReminderCallback = useCallback(async (id: string) => {
    if (!currentUser || !dbInstance) {
      console.warn("Cannot delete reminder: User not logged in or Firebase services not ready.");
      toast({ title: "Error", description: "Please log in and ensure app is ready to delete reminders.", variant: "destructive" });
      return Promise.reject(new Error("No user logged in or Firebase services not ready"));
    }
    const reminderRef = doc(dbInstance, `users/${currentUser.uid}/reminders`, id);
    try {
      await deleteDoc(reminderRef);
      const updatedReminders = reminders.filter(r => r.id !== id);
      setReminders(updatedReminders);
      if (isNativeApp) {
        cancelNativeReminder(id).catch((error: unknown) => {
          console.error('Failed to cancel native reminder', error);
        });
      } else if (currentUser && deleteReminderNotification) {
        deleteReminderNotification({ reminderId: id, userId: currentUser.uid })
          .then((result) => {
            console.log("Cloud Function response for delete:", result.data);
          })
          .catch((error: unknown) => {
            console.error("Error calling Cloud Function for delete:", error);
          });
      } else {
        console.warn("User not logged in or Firebase services not ready. Cannot cancel notification via backend.");
      }
    } catch (error: unknown) {
      console.error("Error deleting reminder from Firestore:", error);
      throw error;
    }
  }, [reminders, dbInstance, currentUser, deleteReminderNotification, toast, isNativeApp]);

  const toggleReminderCompletionCallback = useCallback(async (id: string) => {
    if (!currentUser || !dbInstance) {
      console.warn("Cannot toggle reminder: User not logged in or Firebase services not ready.");
      toast({ title: "Error", description: "Please log in and ensure app is ready to toggle reminders.", variant: "destructive" });
      return Promise.reject(new Error("No user logged in or Firebase services not ready"));
    }
    const reminderRef = doc(dbInstance, `users/${currentUser.uid}/reminders`, id);
    const reminderToToggle = reminders.find(r => r.id === id);

    if (reminderToToggle) {
      const newCompletedStatus = !reminderToToggle.completed;

      if (newCompletedStatus && reminderToToggle.recurrence) {
        await rescheduleRecurringReminder(reminderToToggle);
        return;
      }

      try {
        await updateDoc(reminderRef, { completed: newCompletedStatus });
        const updatedReminders = reminders.map(r => {
          if (r.id === id) {
            return { ...r, completed: newCompletedStatus };
          }
          return r;
        });
        setReminders(updatedReminders);

        if (newCompletedStatus) {
          if (isNativeApp) {
            cancelNativeReminder(id).catch((error: unknown) => {
              console.error('Failed to cancel native reminder after completion', error);
            });
          } else if (currentUser && toggleReminderCompletionNotification) {
            toggleReminderCompletionNotification({ reminderId: id, userId: currentUser.uid, newCompletedStatus: true })
              .then((result) => {
                console.log("Cloud Function response for completion toggle:", result.data);
              })
              .catch((error: unknown) => {
                console.error("Error calling Cloud Function for completion toggle:", error);
              });
          } else {
            console.warn("User not logged in or Firebase services not ready. Cannot update notification via backend.");
          }
        } else {
          if (isNativeApp) {
            const reminderToReschedule = remindersRef.current.find((reminder) => reminder.id === id);
            if (reminderToReschedule) {
              scheduleNativeReminder(reminderToReschedule).catch((error: unknown) => {
                console.error('Failed to reschedule native reminder after toggle', error);
              });
            }
          } else if (currentUser && toggleReminderCompletionNotification) {
            toggleReminderCompletionNotification({ reminderId: id, userId: currentUser.uid, newCompletedStatus: false })
              .then((result) => {
                console.log("Cloud Function response for completion toggle:", result.data);
              })
              .catch((error: unknown) => {
                console.error("Error calling Cloud Function for completion toggle:", error);
              });
          } else {
            console.warn("User not logged in or Firebase services not ready. Cannot update notification via backend.");
          }
        }
      } catch (error: unknown) {
        console.error("Error toggling reminder completion in Firestore:", error);
        throw error;
      }
    }
  }, [reminders, dbInstance, currentUser, toggleReminderCompletionNotification, toast, isNativeApp, rescheduleRecurringReminder]);
  
  const sortedReminders = React.useMemo(() => {
    return [...reminders].sort((a, b) => {
      const dateA = new Date(a.date + 'T' + a.time);
      const dateB = new Date(b.date + 'T' + b.time);
      if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      return dateA.getTime() - dateB.getTime();
    });
  }, [reminders]);


  return (
    <RemindersContext.Provider value={{ 
      reminders: sortedReminders, 
      getReminderById,
      addReminder: addReminderCallback, 
      updateReminder: updateReminderCallback, 
      deleteReminder: deleteReminderCallback, 
      toggleReminderCompletion: toggleReminderCompletionCallback,
      isLoading: isLoading || isAuthLoading || isFirebaseServicesLoading, // Combine all loading states
      defaultReminderTime,
      setDefaultReminderTime,
      areNotificationsGloballyEnabled,
      setAreNotificationsGloballyEnabled: setAreNotificationsGloballyEnabledCallback,
      fcmToken,
      defaultPersonality,
      setDefaultPersonality,
    }}>
      {children}
    </RemindersContext.Provider>
  );
}


export function useReminders() {
  const context = useContext(RemindersContext);
  if (context === undefined) {
    throw new Error('useReminders must be used within a RemindersProvider');
  }
  return context;
}
