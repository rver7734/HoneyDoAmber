import type { AmberPersonalityKey } from '@/lib/personalities';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'weekdays';

export interface RecurrenceSettings {
  frequency: RecurrenceFrequency;
  daysOfWeek?: number[]; // 0 (Sunday) - 6 (Saturday)
}

export interface Reminder {
  id: string;
  task: string;
  details?: string | null;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  completed: boolean;
  location?: string | null;
  priority?: 'low' | 'medium' | 'high';
  notificationMessage?: string | null; // AI-generated message for MMS
  personality?: AmberPersonalityKey; // Amber's voice for this reminder
  recurrence?: RecurrenceSettings | null;
}
