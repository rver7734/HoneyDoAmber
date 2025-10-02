import { format } from 'date-fns';
import type { RecurrenceSettings } from '@/types/reminder';

export const computeNextOccurrence = (currentDate: Date, recurrence?: RecurrenceSettings | null): Date | null => {
  if (!recurrence) {
    return null;
  }

  const base = new Date(currentDate.getTime());
  base.setSeconds(0, 0);

  switch (recurrence.frequency) {
    case 'daily': {
      const next = new Date(base.getTime());
      next.setDate(next.getDate() + 1);
      return next;
    }
    case 'weekdays': {
      const next = new Date(base.getTime());
      do {
        next.setDate(next.getDate() + 1);
      } while ([0, 6].includes(next.getDay()));
      return next;
    }
    case 'weekly': {
      const days = (recurrence.daysOfWeek || []).filter(day => day >= 0 && day <= 6).sort();
      if (!days.length) {
        return null;
      }
      for (let i = 1; i <= 7; i += 1) {
        const candidate = new Date(base.getTime());
        candidate.setDate(candidate.getDate() + i);
        const day = candidate.getDay();
        if (days.includes(day)) {
          return candidate;
        }
      }
      const next = new Date(base.getTime());
      next.setDate(next.getDate() + 7);
      return next;
    }
    default:
      return null;
  }
};

export const formatDateTimeForReminder = (date: Date): { date: string; time: string } => ({
  date: format(date, 'yyyy-MM-dd'),
  time: format(date, 'HH:mm'),
});

export const normalizeRecurrence = (settings?: RecurrenceSettings | null): RecurrenceSettings | null => {
  if (!settings) {
    return null;
  }

  if (settings.frequency === 'weekly') {
    const deduped = Array.from(new Set((settings.daysOfWeek || []).filter(day => day >= 0 && day <= 6))).sort();
    if (!deduped.length) {
      return null;
    }
    return { frequency: 'weekly', daysOfWeek: deduped };
  }

  if (settings.frequency === 'weekdays') {
    return { frequency: 'weekdays' };
  }

  if (settings.frequency === 'daily') {
    return { frequency: 'daily' };
  }

  return null;
};

export const computeUpcomingOccurrences = (
  start: Date,
  recurrence: RecurrenceSettings,
  horizonDays = 7,
  maxOccurrences = 4
): Date[] => {
  if (!recurrence) {
    return [];
  }

  const occurrences: Date[] = [];
  const horizon = new Date(start.getTime());
  horizon.setDate(horizon.getDate() + horizonDays);

  let current = new Date(start.getTime());
  if (!Number.isNaN(current.getTime())) {
    occurrences.push(current);
  }

  while (occurrences.length < maxOccurrences) {
    const next = computeNextOccurrence(current, recurrence);
    if (!next) {
      break;
    }
    if (next.getTime() > horizon.getTime()) {
      break;
    }
    occurrences.push(next);
    current = next;
  }

  return occurrences;
};
