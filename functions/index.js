const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const formatDate = (date) => date.toISOString().slice(0, 10);
const formatTime = (date) => date.toISOString().slice(11, 16);

const normalizeRecurrence = (settings) => {
  if (!settings) {
    return null;
  }
  const frequency = settings.frequency;
  if (frequency === 'daily' || frequency === 'weekdays') {
    return { frequency };
  }
  if (frequency === 'weekly') {
    const days = Array.from(new Set((settings.daysOfWeek || []).filter((day) => day >= 0 && day <= 6))).sort();
    if (!days.length) {
      return null;
    }
    return { frequency, daysOfWeek: days };
  }
  return null;
};

const computeNextOccurrence = (current, recurrence) => {
  if (!recurrence) {
    return null;
  }
  const base = new Date(current.getTime());
  base.setSeconds(0, 0);

  switch (recurrence.frequency) {
    case 'daily': {
      const next = new Date(base.getTime());
      next.setDate(next.getDate() + 1);
      return next;
    }
    case 'weekdays': {
      const next = new Date(base.getTime());
      do {
        next.setDate(next.getDate() + 1);
      } while ([0, 6].includes(next.getDay()));
      return next;
    }
    case 'weekly': {
      const days = (recurrence.daysOfWeek || []).filter((day) => day >= 0 && day <= 6).sort();
      if (!days.length) {
        return null;
      }
      for (let offset = 1; offset <= 7; offset += 1) {
        const candidate = new Date(base.getTime());
        candidate.setDate(candidate.getDate() + offset);
        if (days.includes(candidate.getDay())) {
          return candidate;
        }
      }
      const next = new Date(base.getTime());
      next.setDate(next.getDate() + 7);
      return next;
    }
    default:
      return null;
  }
};

exports.scheduleNotification = functions.https.onCall(async (data, context) => {
  const { reminder, fcmToken, userId } = data.data || data;

  if (!reminder || !userId || !reminder.id) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with 'reminder', 'reminder.id', and 'userId' data."
    );
  }

  try {
    const db = admin.firestore();
    const userRef = db.collection("users").doc(userId);
    const reminderRef = userRef.collection("reminders").doc(reminder.id);

    const normalizedRecurrence = normalizeRecurrence(reminder.recurrence);

    let scheduledDateTime = null;
    if (reminder.date && reminder.time) {
      scheduledDateTime = new Date(`${reminder.date}T${reminder.time}:00`);
    } else if (reminder.date) {
      scheduledDateTime = new Date(`${reminder.date}T00:00:00`);
    }

    const reminderPayload = {
      ...reminder,
      recurrence: normalizedRecurrence,
      scheduledDateTime: scheduledDateTime ? admin.firestore.Timestamp.fromDate(scheduledDateTime) : null,
      notificationSent: false,
      notificationSentAt: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (!reminder.createdAt) {
      reminderPayload.createdAt = admin.firestore.FieldValue.serverTimestamp();
    }

    await reminderRef.set(reminderPayload, { merge: true });

    if (fcmToken) {
      await userRef.set({
        fcmTokens: admin.firestore.FieldValue.arrayUnion(fcmToken),
        lastTokenUpdate: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    functions.logger.info("Reminder saved to Firestore for user:", userId, reminder.id);

    return { success: true, message: "Reminder saved and notification scheduling initiated." };
  } catch (error) {
    functions.logger.error("Error saving reminder to Firestore:", error);
    throw new functions.https.HttpsError("unknown", "Failed to save reminder.", error);
  }
});

const {onSchedule} = require("firebase-functions/v2/scheduler");

exports.sendScheduledNotifications = onSchedule('every 1 minutes', async (context) => {
  functions.logger.info("Running sendScheduledNotifications...");

  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();
  const windowEnd = admin.firestore.Timestamp.fromMillis(now.toMillis() + 60000);

  try {
    // Get all users
    const usersSnapshot = await db.collection("users").get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      functions.logger.info(`Checking reminders for user: ${userId}`);

      // Get reminders that are due (between now and one minute from now)
      const remindersSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("reminders")
        .where("scheduledDateTime", ">=", now)
        .where("scheduledDateTime", "<=", windowEnd)
        .where("notificationSent", "==", false)
        .where("completed", "==", false)
        .get();

      functions.logger.info(`Found ${remindersSnapshot.size} due reminders for user ${userId}`);

      for (const reminderDoc of remindersSnapshot.docs) {
        const reminder = reminderDoc.data();
        reminder.recurrence = normalizeRecurrence(reminder.recurrence);
        functions.logger.info(`Processing reminder: ${reminder.task} for user: ${userId}`);

        try {
          // Send FCM notification
          const sendResult = await sendFCMNotification(userId, reminder);

          if (sendResult && sendResult.successCount > 0) {
            const recurrence = normalizeRecurrence(reminder.recurrence);
            if (recurrence) {
              const baseDate = reminder.scheduledDateTime?.toDate
                ? reminder.scheduledDateTime.toDate()
                : new Date(`${reminder.date}T${reminder.time || '09:00'}:00`);
              const next = computeNextOccurrence(baseDate, recurrence);
              if (next) {
                await reminderDoc.ref.update({
                  date: formatDate(next),
                  time: formatTime(next),
                  completed: false,
                  notificationSent: false,
                  notificationSentAt: null,
                  scheduledDateTime: admin.firestore.Timestamp.fromDate(next),
                  recurrence,
                });
                functions.logger.info(`Recurring reminder rescheduled for ${formatDate(next)} ${formatTime(next)}`);
                continue;
              }
            }

            await reminderDoc.ref.update({
              notificationSent: true,
              notificationSentAt: admin.firestore.FieldValue.serverTimestamp()
            });
            functions.logger.info(`Notification sent for reminder: ${reminder.task}`);
          } else {
            await reminderDoc.ref.update({
              notificationLastAttemptAt: admin.firestore.FieldValue.serverTimestamp()
            });
            functions.logger.warn(`No notifications were delivered for reminder ${reminder.task}. Will retry on next schedule window.`);
          }
        } catch (error) {
          functions.logger.error(`Error sending notification for reminder ${reminder.task}:`, error);
        }
      }
    }
  } catch (error) {
    functions.logger.error("Error in sendScheduledNotifications:", error);
  }
});

// Base URL used for deep links inside notifications.
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://ambers-affirmations.web.app';

// Helper function to send FCM notifications
async function sendFCMNotification(userId, reminder) {
  try {
    const db = admin.firestore();
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    const tokens = Array.isArray(userData?.fcmTokens)
      ? userData.fcmTokens.filter((token) => typeof token === 'string' && token.trim())
      : [];

    if (tokens.length === 0) {
      functions.logger.warn(`No FCM tokens found for user: ${userId}`);
      return null;
    }

    const title = "🐾 Amber's Reminder";
    const body = reminder.notificationMessage || `Gentle reminder: ${reminder.task}`;
    const icon = reminder.notificationIcon || '/pawicon-192.png';
    const deepLink = reminder.notificationUrl || `${APP_BASE_URL}/?reminderId=${reminder.id || ''}`;
    const notificationRoute = `/bark/${reminder.id || ''}`;

    const payloadData = {
      reminderId: reminder.id || '',
      task: reminder.task || '',
      url: deepLink,
      route: notificationRoute,
      type: 'reminder'
    };

    const webpushNotification = {
      title,
      body,
      icon,
      vibrate: [150, 50, 150],
      data: { url: deepLink },
    };

    const apnsPayload = {
      aps: {
        alert: {
          title,
          body,
        },
        sound: 'default',
        'content-available': 1,
      },
      ...payloadData,
    };

    const apnsOptions = {};

    let totalSuccess = 0;
    let totalFailure = 0;
    const invalidTokens = [];

    const chunkSize = 500;
    for (let i = 0; i < tokens.length; i += chunkSize) {
      const tokenChunk = tokens.slice(i, i + chunkSize);
      const androidNotification = {
        title,
        body,
        sound: 'default',
      };

      const message = {
        tokens: tokenChunk,
        notification: {
          title,
          body,
        },
        data: payloadData,
        webpush: {
          headers: {
            TTL: '3600',
          },
          notification: webpushNotification,
          fcmOptions: {
            link: deepLink,
          },
        },
        android: {
          priority: 'high',
          notification: androidNotification,
          data: payloadData,
        },
        apns: {
          payload: apnsPayload,
          fcmOptions: apnsOptions,
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      totalSuccess += response.successCount;
      totalFailure += response.failureCount;

      response.responses.forEach((res, index) => {
        if (!res.success) {
          const code = res.error?.code;
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/mismatched-credential'
          ) {
            invalidTokens.push(tokenChunk[index]);
          }
        }
      });
    }

    if (invalidTokens.length > 0) {
      await userRef.set({
        fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens),
        lastTokenUpdate: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      functions.logger.info(`Removed ${invalidTokens.length} invalid FCM tokens for user ${userId}`);
    }

    functions.logger.info(`FCM notification result for user ${userId}. Success: ${totalSuccess}, Failure: ${totalFailure}`);

    return { successCount: totalSuccess, failureCount: totalFailure };
  } catch (error) {
    functions.logger.error("Error sending FCM notification:", error);
    throw error;
  }
}

exports.registerFcmToken = functions.https.onCall(async (data, context) => {
  const { fcmToken, userId } = data.data || data;

  if (!fcmToken || !userId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with 'fcmToken' and 'userId' data."
    );
  }

  try {
    const db = admin.firestore();
    const userRef = db.collection("users").doc(userId);

    // Ensure user document exists and store/update FCM token list
    await userRef.set({
      fcmTokens: admin.firestore.FieldValue.arrayUnion(fcmToken),
      lastTokenUpdate: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    functions.logger.info(`FCM token registered for user: ${userId}`);
    return { success: true, message: "FCM token registered successfully." };
  } catch (error) {
    functions.logger.error("Error registering FCM token:", error);
    throw new functions.https.HttpsError("unknown", "Failed to register FCM token.", error);
  }
});

exports.unregisterFcmToken = functions.https.onCall(async (data, context) => {
  const { fcmToken, userId } = data.data || data;

  if (!fcmToken || !userId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with 'fcmToken' and 'userId' data."
    );
  }

  try {
    const db = admin.firestore();
    const userRef = db.collection("users").doc(userId);

    await userRef.set({
      fcmTokens: admin.firestore.FieldValue.arrayRemove(fcmToken),
      lastTokenUpdate: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    functions.logger.info(`FCM token unregistered for user: ${userId}`);
    return { success: true, message: "FCM token unregistered successfully." };
  } catch (error) {
    functions.logger.error("Error unregistering FCM token:", error);
    throw new functions.https.HttpsError("unknown", "Failed to unregister FCM token.", error);
  }
});

exports.sendTestNotification = functions.https.onCall(async (data, context) => {
  const { fcmToken, title, body, url } = data.data || data;

  if (!fcmToken) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with 'fcmToken' data."
    );
  }

  try {
    const deepLink = url || `${APP_BASE_URL}/`;
    const icon = '/pawicon-192.png';
    const message = {
      notification: {
        title: title || "Test Notification",
        body: body || "This is a test notification from HoneyDo by Amber",
      },
      data: {
        url: deepLink,
        type: 'test'
      },
      token: fcmToken,
      webpush: {
        headers: {
          TTL: '300',
        },
        notification: {
          title: title || "Test Notification",
          body: body || "This is a test notification from HoneyDo by Amber",
          icon,
          vibrate: [150, 50, 150],
          data: { url: deepLink },
        },
        fcmOptions: {
          link: deepLink,
        },
      },
      android: {
        priority: 'high',
        notification: {
          title: title || "Test Notification",
          body: body || "This is a test notification from HoneyDo by Amber",
          sound: 'default',
        },
        data: {
          url: deepLink,
          type: 'test',
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: title || "Test Notification",
              body: body || "This is a test notification from HoneyDo by Amber",
            },
            sound: 'default',
            'content-available': 1,
          },
          url: deepLink,
          type: 'test',
        },
      },
    };

    const response = await admin.messaging().send(message);
    functions.logger.info(`Test notification sent. Message ID: ${response}`);

    return { 
      success: true, 
      message: "Test notification sent successfully.",
      messageId: response
    };
  } catch (error) {
    functions.logger.error("Error sending test notification:", error);
    throw new functions.https.HttpsError("unknown", "Failed to send test notification.", error);
  }
});

exports.generatePlayfulNotification = functions.https.onCall(async (data, context) => {
  const { task, time } = data.data || data;

  if (!task) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with 'task' data."
    );
  }

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `You are Amber, Honey's beloved dog and her primary source of emotional support. Generate a SHORT notification message (under 160 characters) to remind Honey about her task, but in a playful and endlessly patient way.

Task: ${task}
Time: ${time || 'now'}

Keep it brief, loving, and encouraging - this is going as a notification! Make it sound like a caring dog who wants to help but never pressures.`;

    const result = await model.generateContent([prompt]);
    const aiMessage = result.response.text().trim();
    
    functions.logger.info('Generated AI message:', aiMessage);

    return {
      success: true,
      message: aiMessage
    };
  } catch (error) {
    functions.logger.error('Error generating AI message:', error);
    return {
      success: false,
      error: error.message,
      message: `Gentle reminder: ${task} is coming up! You've got this! 💕`
    };
  }
});
