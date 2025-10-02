"use client";

import { useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useReminders } from '@/context/reminders-context';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarClock, MapPin, ArrowLeft, BellRing } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const priorityMeta: Record<string, { label: string; tone: string; badgeVariant: 'default' | 'secondary' | 'outline' }>
  = {
    high: { label: 'High Priority', tone: 'text-red-500', badgeVariant: 'default' },
    medium: { label: 'Medium Priority', tone: 'text-amber-500', badgeVariant: 'secondary' },
    low: { label: 'Low Priority', tone: 'text-green-500', badgeVariant: 'outline' },
  };

export default function BarkDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getReminderById, toggleReminderCompletion, updateReminder } = useReminders();

  const reminder = useMemo(() => getReminderById(params.id), [params.id, getReminderById]);

  useEffect(() => {
    if (!reminder) {
      toast({
        title: "Amber couldn't fetch that reminder",
        description: 'Maybe it was marked complete or deleted?'
      });
    }
  }, [reminder]);

  if (!reminder) {
    return (
      <div className="p-8 space-y-6">
        <Button variant="ghost" onClick={() => router.back()} className="inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>No Reminder Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">The reminder associated with this notification is missing.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const meta = priorityMeta[reminder.priority ?? 'medium'];
  const scheduledDate = new Date(`${reminder.date}T${reminder.time}`);
  const formattedDate = isNaN(scheduledDate.getTime()) ? 'No schedule' : format(scheduledDate, "PPP 'at' p");
  const detailLines = reminder.details
    ?.split('\n')
    .map(line => line.trim().replace(/^[-•\s]+/, ''))
    .filter(Boolean);

  const handleMarkComplete = async () => {
    try {
      await toggleReminderCompletion(reminder.id);
      toast({
        title: "Marked complete!",
        description: `Amber's proud of you for finishing "${reminder.task}"`
      });
      router.push('/completed');
    } catch (error) {
      console.error('Failed to toggle reminder', error);
      toast({ title: 'Whoops!', description: 'Could not update the reminder status.', variant: 'destructive' });
    }
  };

  const handleSnooze = async (minutes: number) => {
    const next = new Date(Date.now() + minutes * 60_000);
    try {
      await updateReminder(reminder.id, {
        date: format(next, 'yyyy-MM-dd'),
        time: format(next, 'HH:mm'),
      });
      toast({
        title: 'Snoozed',
        description: `Amber will remind you again in ${minutes} minutes.`
      });
      router.push('/');
    } catch (error) {
      console.error('Failed to snooze reminder', error);
      toast({ title: 'Snooze failed', description: 'Could not reschedule the reminder.', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Badge variant={meta.badgeVariant} className="text-sm">
          {meta.label}
        </Badge>
      </div>

      <Card className="shadow-lg border border-primary/10">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <BellRing className="h-5 w-5" />
            <span className="font-medium">Amber’s Gentle Bark</span>
          </div>
          <CardTitle className="text-3xl font-headline text-primary-foreground">
            {reminder.task}
          </CardTitle>
          <p className="text-muted-foreground">{reminder.notificationMessage ?? 'Amber will keep cheering you on!'}</p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <CalendarClock className={`h-4 w-4 ${meta.tone}`} />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Scheduled for</p>
              <p className="text-lg">{formattedDate}</p>
            </div>
          </div>

          {reminder.location && (
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Location</p>
                <p>{reminder.location}</p>
              </div>
            </div>
          )}


          {detailLines?.length ? (
            <div className="space-y-2">
              <Separator />
              <p className="text-sm font-medium text-muted-foreground">Details</p>
              <ul className="space-y-2 text-base leading-relaxed">
                {detailLines.map((line, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-primary/70" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>

        <CardFooter className="flex flex-wrap gap-3 justify-between">
          <div className="space-x-2">
            <Button onClick={handleMarkComplete} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Mark Complete
            </Button>
            <Button variant="outline" onClick={() => handleSnooze(10)}>
              Snooze 10m
            </Button>
            <Button variant="outline" onClick={() => handleSnooze(30)}>
              Snooze 30m
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Reminder ID: <span className="font-mono">{reminder.id}</span>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
