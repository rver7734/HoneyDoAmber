import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const googleApiKey =
  process.env.GENKIT_GOOGLEAI_API_KEY ||
  process.env.GOOGLE_AI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  '';

export const ai = genkit({
  plugins: [googleAI({ apiKey: googleApiKey })],
  model: 'googleai/gemini-2.0-flash',
});
