"use client";

// Using `searchParams` which makes this a dynamic page, rendered on demand.
import { ReminderForm } from '@/components/reminders/reminder-form';
import type { Reminder } from '@/types/reminder';
import React from 'react'; // Import React

export default function AddEditReminderPage({ searchParams }: { searchParams?: { 
  id?: string; 
  task?: string; 
  date?: string; 
  time?: string; 
  location?: string; 
  priority?: Reminder['priority'];
} }) {
  const unwrappedSearchParams = React.use(searchParams || {}); // Unwrap searchParams
  const reminderId = unwrappedSearchParams.id;

  return (
    <div className="container mx-auto py-8">
      <ReminderForm reminderId={reminderId} />
    </div>
  );
}
