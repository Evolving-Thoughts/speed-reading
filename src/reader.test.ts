import { describe, expect, it } from "vitest";
import { tokenize } from "./reader";
describe("text preparation", () => {
  it("keeps sentence punctuation attached and preserves paragraph breaks", () => {
    const words = tokenize("Hallo , Welt!\n\nNoch ein Satz.");
    expect(words.map((w) => w.text)).toEqual([
      "Hallo,",
      "Welt!",
      "Noch",
      "ein",
      "Satz.",
    ]);
    expect(words[2].leading).toBe("\n\n");
    expect(words.map((w) => w.sentenceEnd)).toEqual([
      false,
      true,
      false,
      false,
      true,
    ]);
  });
});
describe("anchor selection", () => {
  it.each([
    ["a", 0],
    ["is", 1],
    ["which", 1],
    ["second", 2],
    ["recognised", 3],
    ["understanding.", 4],
  ])("anchors %s at character %i", (text, index) => {
    expect(tokenize(text)[0].anchor).toBe(index);
  });
  it("does not treat common abbreviations as sentence ends", () => {
    expect(
      tokenize("Dr. Müller sagt: „Hallo!“").map((w) => w.sentenceEnd),
    ).toEqual([false, false, false, true]);
  });
  it("handles blank text and combining characters", () => {
    expect(tokenize(" \n ")).toEqual([]);
    expect(tokenize("Cafe\u0301\nweiter")[1].leading).toBe("\n");
  });
});
import { wordDuration } from "./reader";
it("shows sentence ends three times as long, keeping commas at base duration", () => {
  const words = tokenize("Hallo, Welt!");
  expect(wordDuration(words[0], 300)).toBe(200);
  expect(wordDuration(words[1], 300)).toBe(600);
});
