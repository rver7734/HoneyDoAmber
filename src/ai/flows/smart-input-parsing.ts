'use server';

/**
 * @fileOverview Smart Input Parsing AI agent.
 *
 * - parseSmartInput - A function that handles the smart input parsing process.
 * - SmartInputParsingInput - The input type for the parseSmartInput function.
 * - SmartInputParsingOutput - The return type for the parseSmartInput function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const personalityEnum = z.enum(['sweet', 'funny', 'sarcastic', 'angry', 'raging']);

const SmartInputParsingInputSchema = z.object({
  naturalLanguageInput: z
    .string()
    .describe(
      'A natural language input describing a reminder, including the task, date, time, location, tone, and indicators of priority.'
    ),
  designDocument: z.string().describe('The design document for the Honey & Amber Planner app.'),
  codingDetails: z.string().describe('The coding details for the Honey & Amber Planner app.'),
  userSetDefaultTime: z.string().optional().describe("The user's preferred default time (HH:MM) if no time is specified in the input. Fallback to 09:00 if this is not provided."),
  currentDate: z.string().describe('The current date in YYYY-MM-DD format. Use this to resolve relative dates like "tomorrow", "next Monday", etc.'),
  currentTime: z.string().describe('The current time in HH:MM (24-hour) format. Use this to resolve relative times like "in 5 minutes", "end of day", etc.'),
  personality: personalityEnum.describe('Amber personality to adopt for the notification message.'),
  personalityStyleHint: z.string().describe('Short guidance on how this personality should sound.'),
});
export type SmartInputParsingInput = z.infer<typeof SmartInputParsingInputSchema>;

const SmartInputParsingOutputSchema = z.object({
  task: z.string().describe('A short, action-focused title for the reminder (what).'),
  date: z.string().describe('The date when the task should be performed (YYYY-MM-DD).'),
  time: z.string().describe('The time when the task should be performed (HH:MM in 24-hour format).'),
  location: z.string().optional().describe('Where the task happens, if clearly mentioned.'),
  notes: z.array(z.string()).optional().describe('Concise bullet notes with key details, each under 80 characters.'),
  amberInsight: z.string().optional().describe('An optional playful extra thought from Amber (one sentence).'),
  priority: z.enum(['low', 'medium', 'high']).optional().describe("The inferred priority of the task. Defaults to 'medium' if not clearly indicated."),
  notificationMessage: z.string().describe('A personalized, encouraging notification message from Amber to Honey for this reminder.'),
  personality: personalityEnum.describe('The Amber personality actually used for this message.'),
});
export type SmartInputParsingOutput = z.infer<typeof SmartInputParsingOutputSchema>;

export { smartInputParsingFlow as parseSmartInput };

const prompt = ai.definePrompt({
  name: 'smartInputParsingPrompt',
  input: {schema: SmartInputParsingInputSchema},
  output: {schema: SmartInputParsingOutputSchema},
  prompt: `You are an AI assistant that parses natural language input into structured data for a reminder application. Your mission: surface the essentials Amber needs—clear title, accurate schedule, optional place, bite-sized notes—and craft Amber's encouraging bark.

  Instructions:
  1. Understand the natural language input and extract the core task, date, time, and key context.
  2. Dates must be YYYY-MM-DD. Resolve phrases like "tomorrow", "in 3 days", "next Monday" relative to \`currentDate\` ({{{currentDate}}}). Do not jump more than one month ahead; if unclear, default to today.
  3. Times must be HH:MM (24-hour). Resolve phrases like "in 2 hours", "this afternoon", "before dinner" relative to \`currentTime\` ({{{currentTime}}}). Choose the earliest sensible time after now. If the user gives no explicit or implicit time, fall back to the user's default ({{#if userSetDefaultTime}}{{{userSetDefaultTime}}}{{else}}09:00{{/if}}).
  4. Produce a short, action-focused title (≤ 60 characters) Honey will recognize instantly.
  5. Location is optional; only populate when clearly stated.
  6. Create up to 3 concise bullet notes (≤ 80 characters each) capturing sub-tasks, materials, or context. Use sentence fragments; no leading numbers needed.
  7. Optionally add one short Amber insight (≤ 120 characters) that feels like a playful, relevant nudge or non-sequitur.
  8. Infer priority ('low', 'medium', 'high'). Urgent/critical language → high. Casual/flexible → low. Otherwise medium.
  9. Amber's mood right now is {{{personality}}}. Shape the notification message to match this style using this guidance: {{{personalityStyleHint}}}. Keep it ≤ 160 characters, still encouraging Honey.
  10. Use the design & coding details to stay on tone. Output must match the schema exactly.

  Here is the natural language input:
  {{{naturalLanguageInput}}}

  Here is the design document:
  {{{designDocument}}}

  Here are the coding details:
  {{{codingDetails}}}`,
});

const smartInputParsingFlow = ai.defineFlow(
  {
    name: 'smartInputParsingFlow',
    inputSchema: SmartInputParsingInputSchema,
    outputSchema: SmartInputParsingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return {
        ...output,
        priority: output?.priority || 'medium', // Ensure priority has a default if AI doesn't provide it
        notificationMessage: output?.notificationMessage || `🐾 Gentle reminder from Amber: ${output?.task || 'your task'} is coming up! You've got this! 💕`,
        personality: output?.personality || input.personality,
    };
  }
);
