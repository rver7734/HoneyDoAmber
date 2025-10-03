"use client";

// Using `searchParams` which makes this a dynamic page, rendered on demand.
import { ReminderForm } from '@/components/reminders/reminder-form';
import type { Reminder } from '@/types/reminder';
import Image from 'next/image';
import React from 'react';

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
    <div className="relative overflow-hidden bg-amber-50">
      <div className="absolute inset-0 flex items-start justify-center opacity-10 pointer-events-none">
        <Image
          src="/HoneyDoByAmberLogo.png"
          alt="Amber and Honey illustration"
          width={720}
          height={720}
          className="max-w-[480px] w-full h-auto"
          priority
        />
      </div>
      <div className="container relative mx-auto px-4 py-8">
        <ReminderForm reminderId={reminderId} />
      </div>
    </div>
  );
}
