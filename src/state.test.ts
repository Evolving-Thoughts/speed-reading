import { expect, it } from "vitest";
import { initialState, reducer } from "./state";
it("loads a nonempty text paused at the first word", () => {
  const input = reducer(initialState, { type: "draft", text: "Hallo Welt!" });
  const session = reducer(input, { type: "load" });
  expect(session.view).toBe("reader");
  expect(session.words.map((w) => w.text)).toEqual(["Hallo", "Welt!"]);
  expect(session.index).toBe(0);
  expect(session.playing).toBe(false);
});
const loaded = () =>
  reducer({ ...initialState, draft: "Eins zwei Ende!" }, { type: "load" });
it("pauses at the current position when switching to normal text", () => {
  let s = reducer(loaded(), { type: "toggle" });
  s = reducer(s, { type: "tick" });
  s = reducer(s, { type: "text" });
  expect([s.view, s.index, s.playing, s.selected]).toEqual([
    "text",
    1,
    false,
    1,
  ]);
  s = reducer(s, { type: "resume", index: 2 });
  expect([s.view, s.index, s.playing, s.complete]).toEqual([
    "reader",
    2,
    false,
    false,
  ]);
});
it("completes only after the last word duration and restarts paused", () => {
  let s = reducer(loaded(), { type: "toggle" });
  s = reducer(reducer(s, { type: "tick" }), { type: "tick" });
  expect([s.index, s.complete, s.playing]).toEqual([2, false, true]);
  s = reducer(s, { type: "tick" });
  expect([s.index, s.complete, s.playing]).toEqual([2, true, false]);
  s = reducer(s, { type: "restart" });
  expect([s.index, s.complete, s.playing]).toEqual([0, false, false]);
});
it("can end early without losing the text or speed", () => {
  let s = reducer(loaded(), { type: "speed", wpm: 600 });
  s = reducer(reducer(s, { type: "toggle" }), { type: "finish" });
  expect([s.view, s.playing, s.draft, s.wpm]).toEqual([
    "input",
    false,
    "Eins zwei Ende!",
    600,
  ]);
});
it("ignores invalid resumes, empty loads and paused ticks", () => {
  expect(reducer(initialState, { type: "load" })).toEqual(initialState);
  expect(reducer(loaded(), { type: "tick" })).toEqual(loaded());
  expect(reducer(loaded(), { type: "resume", index: -1 })).toEqual(loaded());
});

it("defaults to normal font size and triple sentence duration", () => {
  expect(initialState.fontScale).toBe(1);
  expect(initialState.sentenceEndFactor).toBe(3);
});
it("keeps reading preferences across exit, load and restart within the session", () => {
  let s = reducer(loaded(), { type: "fontScale", value: 1.25 });
  s = reducer(s, { type: "sentenceEndFactor", value: 2 });
  s = reducer(s, { type: "finish" });
  s = reducer(s, { type: "load" });
  s = reducer(s, { type: "restart" });
  expect([s.fontScale, s.sentenceEndFactor]).toEqual([1.25, 2]);
});
it("rejects unsupported reading preference values", () => {
  expect(reducer(initialState, { type: "fontScale", value: NaN })).toEqual(
    initialState,
  );
  expect(
    reducer(initialState, { type: "sentenceEndFactor", value: 7 }),
  ).toEqual(initialState);
});
it("pauses at an article image until explicit continuation, including consecutive and final images", () => {
  const image = {
    type: "image" as const,
    src: "/api/image?token=fixture",
    alt: "Bild",
    caption: "",
  };
  let s = reducer(initialState, {
    type: "article",
    article: {
      title: "Artikel",
      sourceUrl: "https://example.com",
      blocks: [
        { type: "text", text: "Anfang" },
        image,
        image,
        { type: "text", text: "Ende" },
        image,
      ],
    },
  });
  s = reducer(s, { type: "toggle" });
  s = reducer(s, { type: "tick" });
  expect([s.index, s.playing, s.complete]).toEqual([1, false, false]);
  expect(reducer(s, { type: "toggle" }).playing).toBe(false);
  s = reducer(s, { type: "continueImage" });
  expect([s.index, s.playing]).toEqual([2, false]);
  s = reducer(s, { type: "continueImage" });
  expect([s.index, s.playing]).toEqual([3, true]);
  s = reducer(s, { type: "tick" });
  expect([s.index, s.playing]).toEqual([4, false]);
  s = reducer(s, { type: "continueImage" });
  expect(s.complete).toBe(true);
  s = reducer(s, { type: "restart" });
  expect([s.index, s.playing]).toEqual([0, false]);
  s = reducer(s, { type: "finish" });
  s = reducer(s, { type: "load" });
  expect(s.words.filter((w) => w.image)).toHaveLength(3);
  s = reducer(s, { type: "draft", text: "Neuer Text" });
  s = reducer(s, { type: "load" });
  expect(s.words.map((w) => w.text)).toEqual(["Neuer", "Text"]);
});
