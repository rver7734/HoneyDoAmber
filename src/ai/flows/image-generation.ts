"use server";

/**
 * @fileOverview Image Generation types for reminder notifications.
 *
 * Runtime generation now lives in Firebase Functions. These interfaces capture
 * the expected input/output shapes so server actions can share type safety.
 */

export interface ImageGenerationInput {
  task: string;
  location?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface ImageGenerationOutput {
  imagePrompt: string;
  imageUrl: string;
}

// The actual implementation is handled by the Firebase Function `generateReminderImage`.
