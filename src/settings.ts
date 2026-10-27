/** Single source for the reading preferences: limits, options and labels. */
export const SPEED = { min: 100, max: 1200, initial: 300 } as const;

export const FONT_SCALES = [
  { value: 0.8, label: "Klein" },
  { value: 1, label: "Normal" },
  { value: 1.25, label: "Groß" },
  { value: 1.5, label: "Sehr groß" },
] as const;

/** Factor of the whole word duration for words that end a sentence. */
export const SENTENCE_PAUSES = [
  { value: 1, label: "Aus" },
  { value: 2, label: "Kurz" },
  { value: 3, label: "Normal" },
  { value: 4, label: "Lang" },
] as const;

export const clampWpm = (wpm: number) =>
  Math.max(SPEED.min, Math.min(SPEED.max, Math.round(wpm)));

export const isFontScale = (value: number) =>
  FONT_SCALES.some((option) => option.value === value);

export const isSentencePause = (value: number) =>
  SENTENCE_PAUSES.some((option) => option.value === value);
