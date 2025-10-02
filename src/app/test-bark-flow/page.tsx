"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';
import { generatePlayfulNotificationAction } from '@/app/actions';
import { useReminders } from '@/context/reminders-context';
import {
  isNativeRuntime,
  requestNativeNotificationPermission,
  scheduleNativeTestNotification,
} from '@/lib/native-local-notifications';

const getErrorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export default function TestBarkFlowPage() {
  const [task, setTask] = useState('Take a walk with Amber');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { currentUser } = useAuth();
  const { defaultPersonality } = useReminders();

  const testCompleteFlow = async () => {
    if (!currentUser) {
      setResult('❌ Please log in first');
      return;
    }

    setIsLoading(true);
    const native = await isNativeRuntime();
    setResult(native ? '🐾 Starting native notification test flow...\n' : 'Starting web notification test flow...\n');

    try {
      if (native) {
        setResult(prev => prev + '🔔 Checking device permission...\n');
        const granted = await requestNativeNotificationPermission();
        if (!granted) {
          throw new Error('Notification permission denied on device');
        }
        setResult(prev => prev + '✅ Device permission granted\n');

        setResult(prev => prev + '🤖 Generating AI message...\n');
        const aiResult = await generatePlayfulNotificationAction(task, 'now', defaultPersonality);
        if (!aiResult.success) {
          throw new Error(aiResult.error || 'Failed to generate AI message');
        }
        setResult(prev => prev + `✅ AI message generated: "${aiResult.message}"\n`);

        setResult(prev => prev + '🐾 Scheduling native notification (fires in ~3s)...\n');
        const scheduled = await scheduleNativeTestNotification(3, "Amber's native bark", aiResult.message, '/');
        if (!scheduled) {
          throw new Error('Failed to schedule native notification');
        }
        setResult(prev => prev + '🎉 Amber will bark in a few seconds!\n');
        return;
      }

      // Browser fallback
      setResult(prev => prev + '🔔 Step 1: Checking notification support...\n');
      if (!('Notification' in window)) {
        throw new Error('Notifications not supported in this browser');
      }
      setResult(prev => prev + '✅ Notifications are supported\n');

      setResult(prev => prev + '🔔 Step 2: Checking notification permission...\n');
      if (Notification.permission !== 'granted') {
        setResult(prev => prev + '   Requesting notification permission...\n');
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          throw new Error('Notification permission denied');
        }
      }
      setResult(prev => prev + '✅ Notification permission granted\n');

      setResult(prev => prev + '🤖 Step 3: Generating AI message...\n');
      setResult(prev => prev + `   Task: "${task}"\n`);
        const aiResult = await generatePlayfulNotificationAction(task, 'now', defaultPersonality);
      if (!aiResult.success) {
        throw new Error(aiResult.error || 'Failed to generate AI message');
      }
      setResult(prev => prev + `✅ AI message generated: "${aiResult.message}"\n`);

      setResult(prev => prev + '🐾 Step 4: Sending local notification...\n');
      new Notification("🐾 Amber's Test Bark", {
        body: aiResult.message,
        icon: '/pawicon-192.png',
      });
      setResult(prev => prev + '✅ Local notification sent successfully!\n');
      setResult(prev => prev + '🎉 Check your browser for the notification!\n');

    } catch (error: unknown) {
      setResult(prev => prev + `❌ Error: ${getErrorMessage(error)}\n`);
    } finally {
      setIsLoading(false);
    }
  };

  const testScheduledNotification = async () => {
    if (!currentUser) {
      setResult('❌ Please log in first');
      return;
    }

    setIsLoading(true);
    const native = await isNativeRuntime();
    setResult(native ? '⏰ Testing native scheduled notification (5s)...\n' : 'Testing scheduled local notification...\n');

    try {
      if (native) {
        setResult(prev => prev + '🔔 Checking device permission...\n');
        const granted = await requestNativeNotificationPermission();
        if (!granted) {
          throw new Error('Notification permission denied on device');
        }

        const aiResult = await generatePlayfulNotificationAction(task, 'in 5 seconds', defaultPersonality);
        if (!aiResult.success) {
          throw new Error(aiResult.error || 'Failed to generate AI message');
        }
        setResult(prev => prev + `✅ AI message generated: "${aiResult.message}"\n`);
        setResult(prev => prev + '⏰ Scheduling native notification for 5 seconds from now...\n');

        const scheduled = await scheduleNativeTestNotification(5, "Amber's native bark", aiResult.message, '/');
        if (!scheduled) {
          throw new Error('Failed to schedule native notification');
        }

        setResult(prev => prev + '🎉 Amber will bark in 5 seconds!\n');
        return;
      }

      if (!('Notification' in window)) {
        throw new Error('Notifications not supported in this browser');
      }

      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          throw new Error('Notification permission denied');
        }
      }

      const aiResult = await generatePlayfulNotificationAction(task, 'in 5 seconds', defaultPersonality);
      if (!aiResult.success) {
        throw new Error(aiResult.error || 'Failed to generate AI message');
      }

      setResult(prev => prev + `✅ AI message generated: "${aiResult.message}"\n`);
      setResult(prev => prev + '⏰ Scheduling notification for 5 seconds from now...\n');

      setTimeout(() => {
        new Notification('🐾 Scheduled Reminder', {
          body: aiResult.message,
          icon: '/pawicon-192.png',
        });
        setResult(prev => prev + '✅ Scheduled notification sent!\n');
      }, 5000);

      setResult(prev => prev + '🎉 Notification will appear in 5 seconds!\n');

    } catch (error: unknown) {
      setResult(prev => prev + `❌ Error: ${getErrorMessage(error)}\n`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Local Notification Test Flow</h1>
        <p className="text-red-600">❌ You need to be logged in to test notifications.</p>
        <p className="mt-2">
          <a href="/login" className="text-blue-600 underline">Go to login page</a>
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">Local Notification Test Flow</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>User Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p>✅ Logged in as: {currentUser.email}</p>
          <p>User ID: {currentUser.uid}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Task to Test</Label>
            <Input
              type="text"
              placeholder="Take a walk with Amber"
              value={task}
              onChange={(e) => setTask(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={testCompleteFlow} 
              disabled={isLoading || !task}
              className="flex-1"
            >
              {isLoading ? 'Testing...' : '🐾 Test Complete Flow'}
            </Button>
            <Button 
              onClick={testScheduledNotification} 
              disabled={isLoading || !task}
              variant="outline"
              className="flex-1"
            >
              {isLoading ? 'Testing...' : '⏰ Test Scheduled (5s)'}
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            Tests the complete flow: AI message generation → Local notification delivery
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          {result && (
            <div className="bg-gray-100 p-4 rounded max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm">{result}</pre>
            </div>
          )}
          {!result && (
            <p className="text-gray-500 italic">Test results will appear here...</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What This Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <h4 className="font-semibold">Complete Flow Test:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Browser notification support detection</li>
              <li>Permission request handling</li>
              <li>AI message generation with Gemini</li>
              <li>Local notification delivery</li>
            </ul>
            
            <h4 className="font-semibold mt-4">Scheduled Test:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>JavaScript setTimeout functionality</li>
              <li>Delayed notification delivery</li>
              <li>AI message generation for scheduled reminders</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
