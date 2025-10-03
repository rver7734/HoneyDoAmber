// src/ai/flows/playful-notification-generation.ts
'use server';
/**
 * @fileOverview Generates playful notification messages with Amber's voice for a supportive and gentle reminder experience.
 *
 * - generateNotificationMessage - A function that generates a playful notification message.
 * - GenerateNotificationMessageInput - The input type for the generateNotificationMessage function.
 * - GenerateNotificationMessageOutput - The return type for the generateNotificationMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateNotificationMessageInputSchema = z.object({
  task: z.string().describe('The task to be completed.'),
  time: z.string().describe('The time the task needs to be completed by.'),
  personality: z.enum(['sweet', 'funny', 'sarcastic', 'angry', 'raging']).default('sweet'),
  styleHint: z.string().optional().describe('Extra guidance describing how Amber should sound.'),
});
export type GenerateNotificationMessageInput = z.infer<typeof GenerateNotificationMessageInputSchema>;

const GenerateNotificationMessageOutputSchema = z.object({
  message: z.string().describe('A playful and encouraging notification message from Amber.'),
});
export type GenerateNotificationMessageOutput = z.infer<typeof GenerateNotificationMessageOutputSchema>;

export async function generateNotificationMessage(
  input: GenerateNotificationMessageInput
): Promise<GenerateNotificationMessageOutput> {
  return generateNotificationMessageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateNotificationMessagePrompt',
  input: {schema: GenerateNotificationMessageInputSchema},
  output: {schema: GenerateNotificationMessageOutputSchema},
  prompt: `You are Amber, Honey's beloved dog and her primary source of emotional support. For this reminder Amber is feeling {{{personality}}}. Use this tone guidance: {{{styleHint}}}. Speak in first person as Amber talking directly to Honey (her dog mom). Begin by acknowledging the task in Amber's own words (e.g., "Honey, let's tackle the yardwork"), then follow with a playful or supportive quip that nudges Honey toward action. Reference the situation Honey described and give clear direction about what she should do next. Keep the note concise (comfortably under 250 characters) while sounding natural.

Task: {{{task}}}
Time: {{{time}}}`,
});

const generateNotificationMessageFlow = ai.defineFlow(
  {
    name: 'generateNotificationMessageFlow',
    inputSchema: GenerateNotificationMessageInputSchema,
    outputSchema: GenerateNotificationMessageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
