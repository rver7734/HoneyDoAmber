
export const DESIGN_DOCUMENT_PLACEHOLDER =
  "App: HoneyDo by Amber.\n" +
  "User: Honey (creative, ADHD). \n" +
  "Voice: Amber (dog, supportive, playful, gentle, patient, unconditional support). \n" +
  "Goal: Gentle reminders, reduce cognitive load, non-judgmental, safe space. \n" +
  "Features: Smart input (natural language to task, date, time, location, priority, notes), positive reinforcement ('Awesome Finishes' for completed tasks). \n" +
  "UI: Colors - Primary: Soft Peach (#FFDAB9), Background: Light Beige (#F5F5DC), Accent: Pale Lavender (#E6E6FA). Font: Nunito. Icons: Playful, hand-drawn style. Layout: Clean, spacious, calming.\n" +
  "Core Mission: Supportive companion, nurturing, encouraging tool for task management without pressure or anxiety.\n" +
  "ADHD-Friendly: Amber's voice counters RSD. Smart input reduces cognitive load. Positive language. Gentle UI.\n";

export const CODING_DETAILS_PLACEHOLDER =
  "Data Model: Reminder { id: string (uuid), task: string (what), date: string (YYYY-MM-DD) (when), time: string (HH:MM in 24-hour format) (when), completed: boolean, location?: string (where), details?: string | null (notes/extra context), priority?: 'low' | 'medium' | 'high' }.\n" +
  "Smart Input Parsing: AI parses natural language to the Reminder data model. Identify What (task), When (date, time), Where (location when obvious). Capture supporting bullet notes.\n" +
  "Date/Time: If date is not specified, use today's date. If time is not specified, the AI can accept a user-set default time input; otherwise, it defaults to 09:00. Output Dates as YYYY-MM-DD, Times as HH:MM.\n" +
  "Location: Extract when clearly mentioned; otherwise leave empty.\n" +
  "Priority Inference: Infer priority ('low', 'medium', 'high'). If language suggests urgency (e.g., 'ASAP', 'important'), set to 'high'. If casual/flexible (e.g., 'sometime', 'maybe'), set to 'low'. Otherwise, or if unclear, default to 'medium'.\n" +
  "Notifications: Messages should be playful and encouraging, in Amber's voice.\n";
