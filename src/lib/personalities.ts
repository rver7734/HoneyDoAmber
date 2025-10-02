export type AmberPersonalityKey =
  | 'sweet'
  | 'funny'
  | 'sarcastic'
  | 'angry'
  | 'raging'
  | 'random';

export interface AmberPersonalityDefinition {
  key: AmberPersonalityKey;
  label: string;
  description: string;
  promptStyle: string;
}

const CORE_PERSONALITIES: AmberPersonalityDefinition[] = [
  {
    key: 'sweet',
    label: 'Sweet',
    description: 'Amber stays her gentle, encouraging self—warm tail wags and soft nudges.',
    promptStyle: 'Keep the tone gentle, nurturing, endlessly patient, and soothing. Use affectionate dog imagery like tail wags and soft paws.',
  },
  {
    key: 'funny',
    label: 'Funny',
    description: 'Amber turns into a stand-up pup—expect puns, playful roasts, and goofy bark-laughs.',
    promptStyle: 'Serve the reminder with a corny dad joke or ridiculous pun (not always dog-themed), embrace playful roast energy, and keep the encouragement upbeat beneath the silliness.',
  },
  {
    key: 'sarcastic',
    label: 'Sarcastic',
    description: 'Amber adds gentle sarcasm and dry wit without becoming cruel or dismissive.',
    promptStyle: 'Add a layer of light, loving sarcasm—think eye-rolling best friend. Keep it playful, never mean-spirited.',
  },
  {
    key: 'angry',
    label: 'Annoyed',
    description: 'Amber is mock-furious—dramatic huffs, ALL CAPS barks, and exaggerated theatrics.',
    promptStyle: 'Crank up the comedic outrage: use capitalized words, growly sound effects, and over-the-top threats to fetch the task done, while showing it’s all playful love underneath.',
  },
  {
    key: 'raging',
    label: 'Raging',
    description: 'Over-the-top “angry coach” energy: dramatic barks, lots of fire, but secretly supportive.',
    promptStyle: 'Dial the drama to eleven: over-the-top bark-sergeant energy with capital letters and emphasis, yet still encouraging.',
  },
];

export const AMBER_PERSONALITIES: Record<string, AmberPersonalityDefinition> = CORE_PERSONALITIES.reduce(
  (acc, personality) => {
    acc[personality.key] = personality;
    return acc;
  },
  {} as Record<string, AmberPersonalityDefinition>
);

export const AMBER_PERSONALITY_OPTIONS: AmberPersonalityDefinition[] = [
  ...CORE_PERSONALITIES,
  {
    key: 'random',
    label: 'Random',
    description: 'Amber surprises you with a different personality each time.',
    promptStyle: 'Pick one of the established Amber personalities at random and follow that tone fully.',
  },
];

export const DEFAULT_AMBER_PERSONALITY_KEY: AmberPersonalityKey = 'sweet';

const NON_RANDOM_KEYS = CORE_PERSONALITIES.map(personality => personality.key);

export function resolvePersonalityKey(personality: AmberPersonalityKey): AmberPersonalityDefinition {
  if (personality === 'random') {
    const index = Math.floor(Math.random() * NON_RANDOM_KEYS.length);
    const key = NON_RANDOM_KEYS[index];
    return AMBER_PERSONALITIES[key];
  }
  return AMBER_PERSONALITIES[personality] ?? AMBER_PERSONALITIES[DEFAULT_AMBER_PERSONALITY_KEY];
}

export function getPersonalityDefinition(personality: AmberPersonalityKey): AmberPersonalityDefinition {
  if (personality === 'random') {
    return AMBER_PERSONALITY_OPTIONS.find(option => option.key === 'random')!;
  }
  return AMBER_PERSONALITIES[personality] ?? AMBER_PERSONALITIES[DEFAULT_AMBER_PERSONALITY_KEY];
}
