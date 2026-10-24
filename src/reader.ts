export type Word = {
  text: string;
  leading: string;
  anchor: number;
  sentenceEnd: boolean;
};
const standalonePunctuation = /^\p{P}+$/u;
const abbreviations = new Set([
  "z.b.",
  "bzw.",
  "dr.",
  "prof.",
  "usw.",
  "u.a.",
  "ca.",
  "nr.",
  "d.h.",
]);
function endsSentence(text: string): boolean {
  const bare = text.replace(/["'“”’»\)\]\}]+$/u, "");
  return /[.!?…]$/u.test(bare) && !abbreviations.has(bare.toLowerCase());
}
export function tokenize(text: string): Word[] {
  text = text.normalize("NFC");
  const words: Word[] = [];
  let end = 0;
  for (const match of text.matchAll(/\S+/gu)) {
    const value = match[0];
    if (standalonePunctuation.test(value) && words.length) {
      const previous = words[words.length - 1];
      previous.text += value;
      previous.sentenceEnd = endsSentence(previous.text);
    } else {
      words.push({
        text: value,
        leading: text.slice(end, match.index),
        anchor: 0,
        sentenceEnd: endsSentence(value),
      });
    }
    end = match.index + value.length;
  }
  return words.map((w) => ({ ...w, anchor: anchorIndex(w.text) }));
}

const segmenter = new Intl.Segmenter("de", { granularity: "grapheme" });
export function characters(text: string): string[] {
  return [...segmenter.segment(text)].map((s) => s.segment);
}
export function anchorIndex(text: string): number {
  const chars = characters(text);
  const n = chars.length;
  let index = n <= 1 ? 0 : n <= 5 ? 1 : n <= 9 ? 2 : n <= 13 ? 3 : 4;
  // Prefer a letter/digit over an opening quote or punctuation at the chosen slot.
  if (!/[\p{L}\p{N}]/u.test(chars[index] ?? "")) {
    const letter = chars.findIndex((c) => /[\p{L}\p{N}]/u.test(c));
    if (letter >= 0) index = letter;
  }
  return index;
}
export function wordDuration(
  word: Word,
  wpm: number,
  sentenceEndFactor = 3,
): number {
  return (
    (60000 / Math.max(100, Math.min(1200, wpm))) *
    (word.sentenceEnd ? sentenceEndFactor : 1)
  );
}

/** Count reading steps without normalization, grapheme segmentation or word objects. */
export function countWords(text: string): number {
  let count = 0;
  for (const match of text.matchAll(/\S+/gu)) {
    if (count === 0 || !standalonePunctuation.test(match[0])) count += 1;
  }
  return count;
}
