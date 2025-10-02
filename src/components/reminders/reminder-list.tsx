import type { Reminder } from '@/types/reminder';
import { ReminderListItem } from './reminder-list-item';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

interface ReminderListProps {
  reminders: Reminder[];
  title?: string;
  emptyStateTitle?: string;
  emptyStateMessage?: string;
  showAddButtonInEmptyState?: boolean;
  emptyStateImageUrl?: string;
  emptyStateImageAlt?: string;
  emptyStateImageWidth?: number;
  emptyStateImageHeight?: number;
  emptyStateImageDataAiHint?: string;
}

export function ReminderList({ 
  reminders, 
  title, 
  emptyStateTitle, 
  emptyStateMessage,
  showAddButtonInEmptyState = true,
  emptyStateImageUrl,
  emptyStateImageAlt,
  emptyStateImageWidth,
  emptyStateImageHeight,
  emptyStateImageDataAiHint,
}: ReminderListProps) {
  if (reminders.length === 0) {
    return (
      <EmptyState 
        title={emptyStateTitle} 
        message={emptyStateMessage}
        action={showAddButtonInEmptyState ? (
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/add">
              <PlusCircle className="mr-2 h-4 w-4" /> Add First Reminder
            </Link>
          </Button>
        ) : undefined}
        imageUrl={emptyStateImageUrl}
        imageAlt={emptyStateImageAlt}
        imageWidth={emptyStateImageWidth}
        imageHeight={emptyStateImageHeight}
        imageDataAiHint={emptyStateImageDataAiHint}
      />
    );
  }

  return (
    <div>
      {title && <h2 className="text-2xl font-headline font-semibold mb-4 text-foreground/90">{title}</h2>}
      <div className="flex flex-wrap gap-6">
        {reminders.map((reminder) => (
          <ReminderListItem key={reminder.id} reminder={reminder} />
        ))}
      </div>
    </div>
  );
}
