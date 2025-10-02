
"use client";

import type { Reminder } from '@/types/reminder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit3, Trash2, Bell, Loader2, MapPin, CalendarDays, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTransition, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useReminders } from '@/context/reminders-context';
import { generatePlayfulNotificationAction } from '@/app/actions';
import {
  isNativeRuntime,
  requestNativeNotificationPermission,
  scheduleNativeTestNotification,
} from '@/lib/native-local-notifications';
import { format } from 'date-fns';
import { computeUpcomingOccurrences } from '@/lib/recurrence';

interface ReminderListItemProps {
  reminder: Reminder;
}

export function ReminderListItem({ reminder }: ReminderListItemProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { toggleReminderCompletion, deleteReminder, defaultPersonality } = useReminders();
  
  const [isToggling, startToggleTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isNotifying, startNotifyTransition] = useTransition();

  const handleToggleComplete = () => {
    startToggleTransition(() => {
      try {
        toggleReminderCompletion(reminder.id);
        toast({
          title: !reminder.completed ? "Marked as Pawsome!" : "Back to the list!",
          description: `"${reminder.task}" is now ${!reminder.completed ? 'finished' : 'upcoming'}.`,
        });
      } catch (error: unknown) {
        console.error('Error toggling reminder status:', error);
        toast({ title: "Woops!", description: "Could not update reminder status.", variant: "destructive" });
      }
    });
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this reminder? Amber might miss it!")) {
      startDeleteTransition(() => {
        try {
          deleteReminder(reminder.id);
          toast({ title: "Poof!", description: `"${reminder.task}" has been deleted.` });
        } catch (error: unknown) {
          console.error('Error deleting reminder:', error);
          toast({ title: "Oh dear!", description: "Could not delete reminder.", variant: "destructive" });
        }
      });
    }
  };
  
  const handleNotifyTest = () => {
    startNotifyTransition(async () => {
      try {
        if (await isNativeRuntime()) {
          const granted = await requestNativeNotificationPermission();
          if (!granted) {
            toast({
              title: 'Permission Needed',
              description: 'Amber needs notification permission on this device to bark.',
              variant: 'destructive',
            });
            return;
          }

          const aiResult = await generatePlayfulNotificationAction(reminder.task, reminder.time, reminder.personality || defaultPersonality);
          if (!aiResult.success) {
            toast({
              title: 'Hmm...',
              description: aiResult.error || "Amber couldn't think of a message right now.",
              variant: 'destructive',
            });
            return;
          }

          const scheduled = await scheduleNativeTestNotification(5, "Amber's native bark", aiResult.message, `/bark/${reminder.id}`);
          if (!scheduled) {
            toast({
              title: 'Test Bark Failed',
              description: 'Amber could not schedule the native notification.',
              variant: 'destructive',
            });
            return;
          }

          toast({
            title: '🐾 Native Test Bark Scheduled',
            description: `Amber will bark in a few seconds: "${aiResult.message}"`,
          });
          return;
        }

        // Browser fallback
        if (!('Notification' in window)) {
          toast({
            title: 'Notifications Not Supported',
            description: "Your browser doesn't support notifications.",
            variant: 'destructive',
          });
          return;
        }

        if (Notification.permission !== 'granted') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            toast({
              title: 'Permission Denied',
              description: 'Please allow notifications to test the bark feature.',
              variant: 'destructive',
            });
            return;
          }
        }

        const aiResult = await generatePlayfulNotificationAction(reminder.task, reminder.time, reminder.personality || defaultPersonality);
        if (!aiResult.success) {
          toast({
            title: 'Hmm...',
            description: aiResult.error || "Amber couldn't think of a message right now.",
            variant: 'destructive',
          });
          return;
        }

        new Notification("🐾 Amber's Test Bark", {
          body: aiResult.message,
          icon: '/pawicon-192.png',
        });

        toast({
          title: '🐾 Test Bark Sent!',
          description: `Amber sent a local notification: "${aiResult.message}"`,
        });
      } catch (error: unknown) {
        console.error('Test bark error:', error);
        const message = error instanceof Error ? error.message : "Couldn&apos;t send test bark.";
        toast({ 
          title: "Test Bark Failed", 
          description: message, 
          variant: "destructive" 
        });
      }
    });
  };

  const dateStringForFormatting = reminder.date + 'T' + reminder.time;
  const formattedDate = format(new Date(dateStringForFormatting), "EEE, MMM d, yyyy");
  const formattedTime = format(new Date(dateStringForFormatting), "h:mm a");
  const detailLines = reminder.details
    ?.split('\n')
    .map(line => line.trim().replace(/^[-•\s]+/, ''))
    .filter(Boolean);

  const isProcessing = isToggling || isDeleting || isNotifying;

  const priorityText = reminder.priority ? reminder.priority.charAt(0).toUpperCase() + reminder.priority.slice(1) : 'Medium';

  const recurrenceDescription = useMemo(() => {
    if (!reminder.recurrence) {
      return null;
    }
    const base = new Date(`${reminder.date}T${reminder.time || '09:00'}:00`);
    if (Number.isNaN(base.getTime())) {
      return null;
    }
    const occurrences = computeUpcomingOccurrences(base, reminder.recurrence, 7, 4);
    const formattedOccurrences = occurrences.map((occurrence) =>
      format(occurrence, "EEE, MMM d 'at' p")
    );
    if (!formattedOccurrences.length) {
      return null;
    }
    return formattedOccurrences;
  }, [reminder.recurrence, reminder.date, reminder.time]);

  const getPriorityVisuals = () => {
    switch (reminder.priority) {
      case 'high':
        return {
          imageUrl: '/priority-high.png',
          bgColor: 'bg-red-50 border-red-200',
          iconColor: 'text-red-500',
          accentColor: 'border-l-red-500'
        };
      case 'low':
        return {
          imageUrl: '/priority-low.png',
          bgColor: 'bg-green-50 border-green-200',
          iconColor: 'text-green-500',
          accentColor: 'border-l-green-500'
        };
      default: // medium
        return {
          imageUrl: '/priority-medium.png',
          bgColor: 'bg-yellow-50 border-yellow-200',
          iconColor: 'text-yellow-500',
          accentColor: 'border-l-yellow-500'
        };
    }
  };

  const priorityVisuals = getPriorityVisuals();

  return (
    <Card
      className={`mb-3 shadow-lg transition-all duration-300 border-l-4 w-full max-w-[540px] ${reminder.completed ? `${priorityVisuals.bgColor} opacity-70 ${priorityVisuals.accentColor}` : `${priorityVisuals.bgColor} hover:shadow-xl ${priorityVisuals.accentColor}`}`}
      data-testid="reminder-card"
      data-reminder-id={reminder.id}
    >
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded-md ${priorityVisuals.bgColor} border ${reminder.completed ? 'opacity-70' : ''}`}>
              <Image 
                src={priorityVisuals.imageUrl}
                alt={`${priorityText} priority`}
                width={20}
                height={20}
                className="w-5 h-5"
              />
            </div>
            <CardTitle className={`font-headline text-lg leading-tight ${reminder.completed ? 'line-through text-muted-foreground' : 'text-primary-foreground'}`}>
              {reminder.task}
            </CardTitle>
          </div>
          <div className={`px-1.5 py-0.5 rounded text-xs font-medium ${priorityVisuals.bgColor} ${priorityVisuals.iconColor} border ${reminder.completed ? 'opacity-70' : ''}`}>
            {priorityText}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-2 space-y-2">
        {detailLines?.length ? (
          <ul className={`text-sm leading-relaxed space-y-1 ${reminder.completed ? 'text-muted-foreground line-through' : 'text-foreground/90'}`} data-testid="reminder-details-list">
            {detailLines.map((line, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-primary/70" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="space-y-1">
          <div className="flex items-center text-sm text-foreground/80">
            <CalendarDays className="w-4 h-4 mr-2 text-primary/70" />
            <p className={`${reminder.completed ? 'line-through text-muted-foreground' : ''}`}>
              {formattedDate} at {formattedTime}
            </p>
          </div>
          {reminder.location && (
            <div className="flex items-center text-sm text-foreground/80">
              <MapPin className="w-4 h-4 mr-2 text-primary/70" />
              <p className={`${reminder.completed ? 'line-through text-muted-foreground' : ''}`}>
                {reminder.location}
              </p>
            </div>
          )}
          {recurrenceDescription && recurrenceDescription.length ? (
            <div className="text-sm text-foreground/80 space-y-1">
              <div className="flex items-center gap-2 text-primary/70">
                <RefreshCw className="w-4 h-4" />
                <span>Repeats next:</span>
              </div>
              <ul className="pl-6 list-disc space-y-0.5">
                {recurrenceDescription.map((entry, index) => (
                  <li key={index}>{entry}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

      </CardContent>
      <CardFooter className="px-3 py-2 bg-secondary/30 border-t flex flex-wrap justify-end gap-1">
        {!reminder.completed && (
          <>
            <Button variant="ghost" size="sm" onClick={handleNotifyTest} disabled={isProcessing} aria-label="Test Notification">
              {isNotifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4 mr-1" />} Test Bark
            </Button>
            <Button
              variant="outline"
              size="sm"
              data-testid="reminder-edit-button"
              onClick={() => {
                const params = new URLSearchParams({ id: reminder.id });
                if (reminder.task) params.set('task', reminder.task);
                if (reminder.date) params.set('date', reminder.date);
                if (reminder.time) params.set('time', reminder.time);
                if (reminder.location) params.set('location', reminder.location);
                if (reminder.priority) params.set('priority', reminder.priority);
                router.push(`/add?${params.toString()}`);
            }}
              disabled={isProcessing}
              aria-label="Edit Reminder"
            >
              <Edit3 className="h-4 w-4 mr-1" /> Edit
            </Button>
            <Button
              variant="default"
              size="sm"
              data-testid="reminder-complete-button"
              onClick={handleToggleComplete}
              disabled={isProcessing}
              aria-label="Mark as Complete"
            >
              Mark Complete
            </Button>
          </>
        )}
         <Button
          variant={reminder.completed ? "outline" : "destructive"}
          size="sm"
          onClick={handleDelete}
          disabled={isProcessing}
          aria-label="Delete Reminder"
          data-testid="reminder-delete-button"
        >
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />} Delete
        </Button>
        {reminder.completed && (
           <Button variant="outline" size="sm" onClick={handleToggleComplete} disabled={isProcessing} aria-label="Undo Finish">
            Undo Finish
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
