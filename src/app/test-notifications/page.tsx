"use client";

import { useEffect, useMemo, useState } from 'react';
import { requestNotificationPermissionAndGetToken, onForegroundMessage } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { useReminders } from '@/context/reminders-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generatePlayfulNotificationAction } from '@/app/actions';
import type { MessagePayload } from 'firebase/messaging';
import {
  requestNativeNotificationPermission,
  scheduleNativeTestNotification,
  listPendingNativeReminders,
  cancelAllNativeReminders,
  syncNativeReminders,
} from '@/lib/native-local-notifications';

export default function TestNotificationsPage() {
  const [permissionStatus, setPermissionStatus] = useState<string>('');
  const [fcmToken, setFcmToken] = useState<string>('');
  const [testResult, setTestResult] = useState<string>('');
  const [scheduledTask, setScheduledTask] = useState<string>('Test scheduled reminder');
  const [scheduledMinutes, setScheduledMinutes] = useState<string>('2');
  const { currentUser, isLoading } = useAuth();
  const [isNativeApp, setIsNativeApp] = useState(false);
  const { reminders, defaultPersonality } = useReminders();
  const [nativeSeconds, setNativeSeconds] = useState<string>('15');
  const [nativeLogs, setNativeLogs] = useState<string[]>([]);
  const [pendingNative, setPendingNative] = useState<unknown[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!cancelled) {
          setIsNativeApp(Capacitor.isNativePlatform());
        }
      } catch (error) {
        console.warn('Unable to detect native runtime in test notifications page', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const appendNativeLog = (message: string) => {
    const entry = `${new Date().toLocaleTimeString()} — ${message}`;
    setNativeLogs(prev => [entry, ...prev].slice(0, 40));
    console.log('[NativeTest]', message);
  };

  const pendingNativePretty = useMemo(() => {
    if (pendingNative.length === 0) return '[]';
    try {
      return JSON.stringify(pendingNative, null, 2);
    } catch {
      return String(pendingNative);
    }
  }, [pendingNative]);

  const checkPermissionStatus = () => {
    if (typeof window !== 'undefined') {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      if ('Notification' in window) {
        setPermissionStatus(`${Notification.permission} (iOS: ${isIOS}, Safari: ${isSafari})`);
      } else if (isIOS && isSafari) {
        setPermissionStatus('iOS Safari - Limited support. Try adding to home screen first.');
      } else {
        setPermissionStatus('Not supported in this browser');
      }
    } else {
      setPermissionStatus('Server-side rendering');
    }
  };

  const requestPermissionOnly = async () => {
    setTestResult('Requesting notification permission...');
    try {
      if (typeof window !== 'undefined') {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          setTestResult(`✅ Permission result: ${permission}`);
          setPermissionStatus(permission);
        } else if (isIOS && isSafari) {
          setTestResult(`❌ iOS Safari requires the app to be added to home screen first.
          
Steps for iOS Safari:
1. Tap the Share button (square with arrow)
2. Tap "Add to Home Screen"
3. Open the app from your home screen
4. Then try requesting notifications again`);
        } else {
          setTestResult('❌ Notifications not supported in this browser');
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setTestResult(`❌ Error requesting permission: ${message}`);
    }
  };

  const requestPermissionAndToken = async () => {
    setTestResult('Requesting permission and FCM token...');
    try {
      const token = await requestNotificationPermissionAndGetToken();
      if (token) {
        setFcmToken(token);
        setTestResult('✅ Permission granted and FCM token received!');
        
        // Set up foreground message listener
        onForegroundMessage((payload: MessagePayload) => {
          console.log('Foreground message received:', payload);
          setTestResult(`📱 Foreground notification received: ${payload.notification?.title || 'No title'}`);
        });
      } else {
        setTestResult('❌ Failed to get FCM token');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setTestResult(`❌ FCM Error: ${message}`);
    }
  };

  const requestNativePermission = async () => {
    appendNativeLog('Requesting native notification permission...');
    const granted = await requestNativeNotificationPermission();
    appendNativeLog(granted ? 'Native permission granted ✅' : 'Native permission denied ❌');
  };

  const scheduleNativeTest = async () => {
    const seconds = parseInt(nativeSeconds, 10);
    if (Number.isNaN(seconds) || seconds <= 0) {
      appendNativeLog('Seconds value must be greater than 0');
      return;
    }
    appendNativeLog(`Scheduling native test notification in ${seconds}s...`);
    const success = await scheduleNativeTestNotification(seconds, "Amber's native bark", `Test alert in ${seconds} seconds`, '/');
    appendNativeLog(success ? 'Schedule request sent ✅' : 'Schedule failed ❌');
  };

  const refreshNativeFromReminders = async () => {
    appendNativeLog(`Syncing ${reminders.length} reminders to native scheduler...`);
    try {
      await syncNativeReminders(reminders);
      appendNativeLog('Sync complete ✅');
    } catch (error: unknown) {
      appendNativeLog(`Sync failed ❌ ${(error as Error)?.message ?? error}`);
    }
  };

  const loadPendingNative = async () => {
    appendNativeLog('Loading pending native notifications...');
    const pending = await listPendingNativeReminders();
    setPendingNative(pending);
    appendNativeLog(`Found ${pending.length} pending entries`);
  };

  const clearNative = async () => {
    appendNativeLog('Clearing all native notifications...');
    await cancelAllNativeReminders();
    setPendingNative([]);
    appendNativeLog('All native notifications cleared');
  };

  const testLocalNotification = () => {
    if (Notification.permission === 'granted') {
      new Notification('Test Notification', {
        body: 'This is a test notification from your app!',
        icon: '/pawicon-192.png'
      });
      setTestResult('✅ Local notification sent!');
    } else {
      setTestResult('❌ Notification permission not granted');
    }
  };

  const testAILocalNotification = async () => {
    if (Notification.permission !== 'granted') {
      setTestResult('❌ Notification permission not granted');
      return;
    }

    setTestResult('Generating AI message for local notification...');
    
    try {
      const aiResult = await generatePlayfulNotificationAction(scheduledTask, 'now', defaultPersonality);
      if (aiResult.success) {
        new Notification('🐾 Amber\'s Reminder', {
          body: aiResult.message,
          icon: '/pawicon-192.png'
        });
        setTestResult(`✅ AI-powered local notification sent!\nMessage: "${aiResult.message}"`);
      } else {
        throw new Error(aiResult.error || 'Failed to generate AI message');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setTestResult(`❌ AI Notification Error: ${message}`);
    }
  };

  const sendTestPushNotification = async () => {
    if (!fcmToken) {
      setTestResult('❌ No FCM token available. Request permission first.');
      return;
    }

    setTestResult('Sending test push notification via Cloud Function...');
    
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const sendTestNotification = httpsCallable(functions, 'sendTestNotification');
      
      await sendTestNotification({
        fcmToken: fcmToken,
        title: 'Test Push Notification',
        body: 'This is a test push notification from your Cloud Function!',
        url: '/'
      });

      setTestResult('✅ Push notification sent successfully via Cloud Function!');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setTestResult(`❌ Error: ${message}`);
    }
  };

  const testScheduledLocalNotification = () => {
    if (Notification.permission !== 'granted') {
      setTestResult('❌ Notification permission not granted');
      return;
    }

    if (!scheduledTask || !scheduledMinutes) {
      setTestResult('❌ Please enter task and minutes for scheduled test.');
      return;
    }

    const minutes = parseInt(scheduledMinutes);
    const milliseconds = minutes * 60 * 1000;

    setTestResult(`Scheduling local notification for "${scheduledTask}" in ${minutes} minutes...`);
    
    setTimeout(() => {
      new Notification('🐾 Scheduled Reminder', {
        body: `Time for: ${scheduledTask}`,
        icon: '/pawicon-192.png'
      });
      setTestResult(prev => prev + `\n✅ Scheduled notification sent!`);
    }, milliseconds);

    setTestResult(prev => prev + `\n⏰ Notification will appear in ${minutes} minutes`);
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!currentUser) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Notification Testing</h1>
        <p className="text-red-600">❌ You need to be logged in to test notifications.</p>
        <p className="mt-2">
          <a href="/login" className="text-blue-600 underline">Go to login page</a>
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">Local Notifications Testing</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>User Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p>✅ Logged in as: {currentUser.email}</p>
          <p>User ID: {currentUser.uid}</p>
        </CardContent>
      </Card>

      {isNativeApp && (
        <Card>
          <CardHeader>
            <CardTitle>Native Debug Loop</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Button onClick={requestNativePermission}>Request Native Permission</Button>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    min="5"
                    value={nativeSeconds}
                    onChange={(e) => setNativeSeconds(e.target.value)}
                    className="w-24"
                  />
                  <Button onClick={scheduleNativeTest}>Schedule Test Bark</Button>
                </div>
                <Button variant="outline" onClick={refreshNativeFromReminders}>
                  Sync Current Reminders ➜ Native
                </Button>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={loadPendingNative}>
                    Inspect Pending
                  </Button>
                  <Button variant="destructive" onClick={clearNative}>
                    Clear Pending
                  </Button>
                </div>
              </div>
              <div>
                <Label>Pending Native Payload</Label>
                <pre className="bg-gray-100 p-3 rounded h-48 overflow-auto text-xs">{pendingNativePretty}</pre>
              </div>
            </div>
            <div>
              <Label>Native Log (newest first)</Label>
              <div className="bg-gray-900 text-gray-100 rounded p-3 h-40 overflow-auto text-xs space-y-1">
                {nativeLogs.length === 0 && <p className="text-gray-500">No native logs yet…</p>}
                {nativeLogs.map((entry, index) => (
                  <p key={index}>{entry}</p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isNativeApp && (
        <Card>
          <CardHeader>
            <CardTitle>Native Reminder Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              You&apos;re running inside the Android shell. Amber schedules reminders with native local notifications once you enable them in Settings ➜ <em>Enable Gentle Barks</em>. Add a reminder a few minutes out, background the app, and watch Amber bark on-device.
            </p>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Permission Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={checkPermissionStatus}>Check Permission Status</Button>
          {permissionStatus && (
            <p className="bg-gray-100 p-2 rounded">
              <strong>Status:</strong> {permissionStatus}
            </p>
          )}
        </CardContent>
      </Card>

      {!isNativeApp && (
        <Card>
          <CardHeader>
            <CardTitle>FCM Token</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={requestPermissionOnly}>Request Permission Only</Button>
              <Button onClick={requestPermissionAndToken}>Request Permission & FCM Token</Button>
            </div>
            {fcmToken && (
              <div className="bg-gray-100 p-4 rounded">
                <p><strong>FCM Token:</strong></p>
                <p className="text-sm break-all">{fcmToken}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Local Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={testLocalNotification}>Test Basic Local Notification</Button>
            <Button onClick={testAILocalNotification} disabled={!scheduledTask}>
              Test AI Local Notification
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            These buttons trigger immediate in-browser notifications. Native shells rely on the scheduling flow described above once notifications are enabled in Settings.
          </p>
        </CardContent>
      </Card>

      {!isNativeApp && (
        <Card>
          <CardHeader>
            <CardTitle>Push Notifications (FCM)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={sendTestPushNotification} disabled={!fcmToken}>
              Test Push Notification
            </Button>
            <p className="text-sm text-gray-600">
              This sends a notification through Firebase Cloud Messaging
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>⏰ Scheduled Local Notification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Task to Remind</Label>
              <Input
                type="text"
                placeholder="Test scheduled reminder"
                value={scheduledTask}
                onChange={(e) => setScheduledTask(e.target.value)}
              />
            </div>
            <div>
              <Label>Minutes from Now</Label>
              <Input
                type="number"
                placeholder="2"
                value={scheduledMinutes}
                onChange={(e) => setScheduledMinutes(e.target.value)}
                min="1"
                max="60"
              />
            </div>
          </div>
          <Button 
            onClick={testScheduledLocalNotification} 
            disabled={!scheduledTask || !scheduledMinutes}
            className="w-full"
          >
            ⏰ Schedule Local Notification
          </Button>
          <p className="text-sm text-gray-600">
            Creates a local notification that will appear after the specified time
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          {testResult && (
            <div className="bg-gray-100 p-4 rounded max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm">{testResult}</pre>
            </div>
          )}
          {!testResult && (
            <p className="text-gray-500 italic">Test results will appear here...</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment Check</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>VAPID Key:</strong> {process.env.NEXT_PUBLIC_VAPID_KEY ? '✅ Set' : '❌ Missing'}</p>
            <p><strong>Messaging Sender ID:</strong> {process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '❌ Missing'}</p>
            <p><strong>Service Worker:</strong> {typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? '✅ Supported' : '❌ Not supported'}</p>
            <p><strong>User Agent:</strong> {typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 50) + '...' : 'Unknown'}</p>
            <p><strong>Is iOS:</strong> {typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Is Safari:</strong> {typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent) ? '✅ Yes' : '❌ No'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
