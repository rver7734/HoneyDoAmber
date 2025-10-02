
"use client";

import { ReminderList } from '@/components/reminders/reminder-list';
import { useReminders } from '@/context/reminders-context';
import { CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function CompletedRemindersPage() {
  const { reminders, isLoading } = useReminders();
  const completedReminders = reminders.filter(r => r.completed);

  return (
    <div className="space-y-8">
       <Card className="bg-secondary/20 border-secondary/40 shadow-lg">
        <CardHeader className="flex flex-row items-center gap-4">
          <CheckCircle2 className="w-10 h-10 text-accent-foreground" />
          <div>
            <CardTitle className="font-headline text-3xl text-accent-foreground">Awesome Finishes!</CardTitle>
            <p className="text-muted-foreground">Amber is so proud of what you&apos;ve accomplished, Honey!</p>
          </div>
        </CardHeader>
      </Card>

      {isLoading ? (
         <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <ReminderList
          reminders={completedReminders}
          emptyStateTitle="No finishes yet, but that&apos;s okay!"
          emptyStateMessage="Amber believes in you! Every small step is progress."
          showAddButtonInEmptyState={false}
          emptyStateImageUrl="/honey-amber-completed.png"
          emptyStateImageAlt="Honey and Amber celebrating a completed task"
          emptyStateImageWidth={120}
          emptyStateImageHeight={120}
          emptyStateImageDataAiHint="Honey Amber celebration"
        />
      )}
    </div>
  );
}
