"use server";

import type { SmartInputParsingOutput } from "@/ai/flows/smart-input-parsing";
import type { GenerateNotificationMessageOutput } from "@/ai/flows/playful-notification-generation";
import { parseSmartInput } from "@/ai/flows/smart-input-parsing";
import { generateNotificationMessage } from "@/ai/flows/playful-notification-generation";
import { DESIGN_DOCUMENT_PLACEHOLDER, CODING_DETAILS_PLACEHOLDER } from "@/lib/constants";
import { DEFAULT_AMBER_PERSONALITY_KEY, resolvePersonalityKey, type AmberPersonalityKey } from "@/lib/personalities";
import { addDays, addHours, addMinutes, format } from 'date-fns';

export interface SmartInputActionResult {
  success: boolean;
  data?: SmartInputParsingOutput;
  error?: string;
  fallback?: boolean;
  warning?: string;
}

export interface PlayfulNotificationActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

function buildFallbackMessage(
  task: string,
  personality: AmberPersonalityKey,
  definition?: ReturnType<typeof resolvePersonalityKey>
): string {
  const persona = definition ?? resolvePersonalityKey(personality);
  switch (persona.key) {
    case 'funny':
      return `🐾 Amber's dad-joke hour: ${task || 'that task'} is on deck—get going before she drops another groaner!`;
    case 'sarcastic':
      return `🐾 Yep, because obviously ${task || 'that thing'} will do itself. Amber says hop to it!`;
    case 'angry':
      return `🐾 GRRR! Amber is dramatically annoyed—${task || 'your task'} needs doing NOW or she’ll chew a slipper!`;
    case 'raging':
      return `🐾 🔥 Raging Amber ALERT: ${task || 'your task'}. MOVE THOSE PAWS NOW! 🔥`;
    default:
      return `🐾 Gentle reminder from Amber: ${task || 'your task'} is coming up! You've got this! 💕`;
  }
}

export async function parseSmartInputAction(
  naturalLanguageInput: string,
  userSetDefaultTime?: string,
  currentDate?: string,
  currentTime?: string,
  personality?: AmberPersonalityKey
): Promise<SmartInputActionResult> {
  const trimmedInput = naturalLanguageInput.trim();
  const chosenPersonality = personality ?? DEFAULT_AMBER_PERSONALITY_KEY;
  const resolvedPersonality = resolvePersonalityKey(chosenPersonality);

  try {
    const parsed = await parseSmartInput({
      naturalLanguageInput: trimmedInput,
      designDocument: DESIGN_DOCUMENT_PLACEHOLDER,
      codingDetails: CODING_DETAILS_PLACEHOLDER,
      userSetDefaultTime,
      currentDate: currentDate || new Date().toISOString().split("T")[0],
      currentTime: currentTime || new Date().toTimeString().split(" ")[0].substring(0, 5),
      personality: resolvedPersonality.key,
      personalityStyleHint: resolvedPersonality.promptStyle,
    });

    const cleanedNotes = parsed.notes
      ?.map(note => note.trim().replace(/^[-•\s]+/, ''))
      .filter(Boolean)
      .slice(0, 3);

    const normalized: SmartInputParsingOutput = {
      ...parsed,
      task: parsed.task.trim(),
      location: parsed.location?.trim() || undefined,
      notes: cleanedNotes,
      amberInsight: parsed.amberInsight?.trim() || undefined,
      priority: parsed.priority || 'medium',
      notificationMessage:
        parsed.notificationMessage?.trim() || buildFallbackMessage(parsed.task, chosenPersonality, resolvedPersonality),
      personality: parsed.personality || resolvedPersonality.key,
    };

    return {
      success: true,
      data: normalized,
    };
  } catch (error) {
    console.error("Error parsing smart input:", error);

    const fallbackDateTime = buildFallbackDateTime(trimmedInput, userSetDefaultTime, currentDate, currentTime);

    const fallbackNotes = trimmedInput ? [trimmedInput] : undefined;
    const fallback: SmartInputParsingOutput = {
      task: trimmedInput || 'Reminder',
      date: format(fallbackDateTime, 'yyyy-MM-dd'),
      time: format(fallbackDateTime, 'HH:mm'),
      location: undefined,
      notes: fallbackNotes,
      priority: 'medium',
      notificationMessage: buildFallbackMessage(trimmedInput || 'your task', chosenPersonality, resolvedPersonality),
      personality: resolvedPersonality.key,
    };

    return {
      success: true,
      data: fallback,
      fallback: true,
      warning: "Amber couldn't parse everything perfectly, so she used your defaults. Double-check the details before saving!",
    };
  }
}

function buildFallbackDateTime(
  input: string,
  defaultTime?: string,
  currentDate?: string,
  currentTime?: string
) {
  const now = new Date();

  let base = now;
  if (currentDate) {
    const [year, month, day] = currentDate.split('-').map(Number);
    base = new Date(year, (month ?? 1) - 1, day ?? now.getDate());
    if (currentTime) {
      const [hours, minutes] = currentTime.split(':').map(Number);
      base.setHours(hours ?? 0, minutes ?? 0, 0, 0);
    }
  }

  const lower = input.toLowerCase();
  let candidate = new Date(base.getTime());

  if (lower.includes('tomorrow')) {
    candidate = addDays(candidate, 1);
  } else if (lower.includes('today')) {
    candidate = new Date(base.getTime());
  }

  const dayMatch = lower.match(/in\s+(\d+)\s+day/);
  if (dayMatch) {
    candidate = addDays(candidate, Number(dayMatch[1]));
  }

  const hourMatch = lower.match(/in\s+(\d+)\s+hour/);
  if (hourMatch) {
    candidate = addHours(candidate, Number(hourMatch[1]));
  }

  const minuteMatch = lower.match(/in\s+(\d+)\s+minute/);
  if (minuteMatch) {
    candidate = addMinutes(candidate, Number(minuteMatch[1]));
  }

  const timeMatch = lower.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (timeMatch) {
    let hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2] ?? '0');
    const meridiem = timeMatch[3];

    if (meridiem === 'pm' && hours < 12) {
      hours += 12;
    }
    if (meridiem === 'am' && hours === 12) {
      hours = 0;
    }
    candidate.setHours(hours, minutes, 0, 0);
  } else if (/(afternoon)/.test(lower)) {
    candidate.setHours(15, 0, 0, 0);
  } else if (/(evening|tonight)/.test(lower)) {
    candidate.setHours(19, 0, 0, 0);
  } else if (/(morning)/.test(lower)) {
    candidate.setHours(9, 0, 0, 0);
  } else if (/(lunch)/.test(lower)) {
    candidate.setHours(12, 30, 0, 0);
  } else if (/(dinner|supper)/.test(lower)) {
    candidate.setHours(19, 0, 0, 0);
  } else if (defaultTime) {
    const [hours, minutes] = defaultTime.split(':').map(Number);
    candidate.setHours(hours ?? 9, minutes ?? 0, 0, 0);
  } else if (currentTime) {
    const [hours, minutes] = currentTime.split(':').map(Number);
    candidate.setHours(hours ?? 9, minutes ?? 0, 0, 0);
  } else {
    candidate.setHours(9, 0, 0, 0);
  }

  if (candidate.getTime() <= Date.now()) {
    candidate = addMinutes(candidate, 30);
    if (candidate.getTime() <= Date.now()) {
      candidate = addHours(candidate, 1);
    }
  }

  return candidate;
}

export async function generatePlayfulNotificationAction(
  task: string,
  time: string,
  personality?: AmberPersonalityKey
): Promise<PlayfulNotificationActionResult> {
  const chosenPersonality = personality ?? DEFAULT_AMBER_PERSONALITY_KEY;
  const resolvedPersonality = resolvePersonalityKey(chosenPersonality);
  try {
    const result: GenerateNotificationMessageOutput = await generateNotificationMessage({ task, time, personality: resolvedPersonality.key, styleHint: resolvedPersonality.promptStyle });
    return { success: true, message: result.message };
  } catch (error) {
    console.error("Error generating notification message:", error);
    const fallbackMessage = buildFallbackMessage(task || 'your task', chosenPersonality, resolvedPersonality);
    return {
      success: true,
      message: fallbackMessage,
    };
  }
}
