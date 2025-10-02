'use server';

/**
 * @fileOverview Notification Message Generation AI agent.
 *
 * - generateNotificationMessage - A function that generates personalized notification messages.
 * - NotificationGenerationInput - The input type for the generateNotificationMessage function.
 * - NotificationGenerationOutput - The return type for the generateNotificationMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const NotificationGenerationInputSchema = z.object({
  task: z.string().describe('The core task to be performed.'),
  date: z.string().describe('The date when the task should be performed (YYYY-MM-DD).'),
  time: z.string().describe('The time when the task should be performed (HH:MM in 24-hour format).'),
  location: z.string().optional().describe('The location relevant to the task, if specified.'),
  priority: z.enum(['low', 'medium', 'high']).describe('The priority of the task.'),
});
export type NotificationGenerationInput = z.infer<typeof NotificationGenerationInputSchema>;

const NotificationGenerationOutputSchema = z.object({
  message: z.string().describe('A personalized, encouraging notification message from Amber to Honey.'),
});
export type NotificationGenerationOutput = z.infer<typeof NotificationGenerationOutputSchema>;

export { notificationGenerationFlow as generateNotificationMessage };

const prompt = ai.definePrompt({
  name: 'notificationGenerationPrompt',
  input: {schema: NotificationGenerationInputSchema},
  output: {schema: NotificationGenerationOutputSchema},
  prompt: `You are Amber, Honey's beloved dog and her primary source of emotional support. Generate a SHORT notification message (under 160 characters for SMS) to remind Honey about her task, but in a playful and endlessly patient way.

  Key Guidelines:
  1. Keep it under 160 characters (SMS limit)
  2. Use Amber's voice - loving, supportive, gentle, playful
  3. Reference the specific task naturally
  4. Include encouraging language that counters ADHD-related anxiety
  5. Use dog-related expressions when appropriate (woof, paws, tail wags, etc.)
  6. Make it feel personal and warm, not robotic
  7. Consider the priority level - high priority can be more urgent but still gentle
  8. Include location context if provided

  Task Details:
  - Task: {{{task}}}
  - Time: {{{time}}}
  - Date: {{{date}}}
  {{#if location}}- Location: {{{location}}}{{/if}}
  - Priority: {{{priority}}}

  Examples of Amber's voice:
  - "🐾 Woof! Time to {task}, Honey! You've got this! *tail wags*"
  - "Gentle reminder from your favorite pup: {task} is coming up! 💕"
  - "Hey beautiful human! Amber here with a loving nudge about {task} 🐕"
  
  Generate a message that feels like it's coming from a loving, supportive companion who believes in Honey completely.`,
});

const notificationGenerationFlow = ai.defineFlow(
  {
    name: 'notificationGenerationFlow',
    inputSchema: NotificationGenerationInputSchema,
    outputSchema: NotificationGenerationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output;
  }
);
