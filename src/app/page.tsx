
"use client";

import dynamic from 'next/dynamic';

// Lazy load the SmartInputBar to reduce initial bundle size
const SmartInputBar = dynamic(() => import('@/components/reminders/smart-input-bar').then(mod => ({ default: mod.SmartInputBar })), {
  loading: () => <div className="h-16 bg-primary/20 rounded-lg animate-pulse" />,
  ssr: false
});
import { ReminderList } from '@/components/reminders/reminder-list';
import { useReminders } from '@/context/reminders-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';

export default function UpcomingRemindersPage() {
  const { reminders, isLoading } = useReminders();
  const upcomingReminders = reminders.filter(r => !r.completed);

  return (
    <div className="space-y-8">
      <Card className="bg-primary/10 border-primary/30 shadow-lg">
        <CardHeader className="flex flex-row items-center gap-4">
          <Image
            src="/pawicon.png"
            alt="Paw icon"
            width={40}
            height={40}
            priority
            data-ai-hint="paw icon"
          />
          <div>
            <CardTitle className="font-headline text-3xl text-primary-foreground">Hello Honey!</CardTitle>
            <p className="text-muted-foreground">Amber&apos;s here to help you with your day. What&apos;s on your mind?</p>
          </div>
        </CardHeader>
        <CardContent>
          <SmartInputBar />
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <ReminderList
          reminders={upcomingReminders}
          title="Amber&apos;s Gentle Reminders for You:"
          emptyStateTitle="All clear for now!"
          emptyStateMessage="No upcoming reminders. Amber says it&apos;s a perfect time to add something new or just relax!"
          emptyStateImageUrl="/honey-amber-upcoming-empty.png"
          emptyStateImageAlt="Honey and Amber relaxing"
          emptyStateImageWidth={120}
          emptyStateImageHeight={120}
          emptyStateImageDataAiHint="Honey Amber relaxing"
        />
      )}
    </div>
  );
}
