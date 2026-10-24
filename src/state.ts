import { articleSteps, type Article } from "./article";
import { tokenize, type Word } from "./reader";
export type ReaderState = {
  article: Article | null;
  draft: string;
  words: Word[];
  view: "input" | "reader" | "text";
  index: number;
  selected: number | null;
  playing: boolean;
  complete: boolean;
  wpm: number;
  fontScale: number;
  sentenceEndFactor: number;
};
export const initialState: ReaderState = {
  article: null,
  draft: "",
  words: [],
  view: "input",
  index: 0,
  selected: null,
  playing: false,
  complete: false,
  wpm: 300,
  fontScale: 1,
  sentenceEndFactor: 3,
};
export type Action =
  | { type: "draft"; text: string }
  | { type: "article"; article: Article }
  | { type: "continueImage" }
  | { type: "load" }
  | { type: "toggle" }
  | { type: "tick" }
  | { type: "text" }
  | { type: "select"; index: number }
  | { type: "resume"; index: number }
  | { type: "finish" }
  | { type: "restart" }
  | { type: "pause" }
  | { type: "speed"; wpm: number }
  | { type: "fontScale"; value: number }
  | { type: "sentenceEndFactor"; value: number };
export function reducer(state: ReaderState, action: Action): ReaderState {
  if (action.type === "draft")
    return { ...state, draft: action.text, article: null };
  if (action.type === "article") {
    const words = articleSteps(action.article);
    return words.length
      ? {
          ...state,
          article: action.article,
          draft: action.article.blocks
            .filter((b) => b.type === "text")
            .map((b) => b.text)
            .join("\n\n"),
          words,
          view: "reader",
          index: 0,
          selected: null,
          playing: false,
          complete: false,
        }
      : state;
  }
  if (action.type === "load") {
    const words = state.article
      ? articleSteps(state.article)
      : tokenize(state.draft);
    return words.length
      ? {
          ...state,
          words,
          view: "reader",
          index: 0,
          selected: null,
          playing: false,
          complete: false,
        }
      : state;
  }
  switch (action.type) {
    case "fontScale":
      return [0.8, 1, 1.25, 1.5].includes(action.value)
        ? { ...state, fontScale: action.value }
        : state;
    case "sentenceEndFactor":
      return [1, 2, 3, 4].includes(action.value)
        ? { ...state, sentenceEndFactor: action.value }
        : state;
    case "speed":
      return Number.isFinite(action.wpm)
        ? {
            ...state,
            wpm: Math.max(100, Math.min(1200, Math.round(action.wpm))),
          }
        : state;
    case "continueImage":
      if (
        state.view !== "reader" ||
        !state.words[state.index]?.image ||
        state.complete
      )
        return state;
      return state.index < state.words.length - 1
        ? {
            ...state,
            index: state.index + 1,
            playing: !state.words[state.index + 1].image,
          }
        : { ...state, playing: false, complete: true };
    case "toggle":
      return state.view === "reader" &&
        !state.complete &&
        !state.words[state.index]?.image
        ? { ...state, playing: !state.playing }
        : state;
    case "pause":
      return { ...state, playing: false };
    case "tick":
      if (!state.playing || state.view !== "reader") return state;
      return state.index < state.words.length - 1
        ? {
            ...state,
            index: state.index + 1,
            playing: !state.words[state.index + 1].image,
          }
        : { ...state, playing: false, complete: true };
    case "text":
      return state.words.length
        ? { ...state, view: "text", playing: false, selected: state.index }
        : state;
    case "select":
      return state.view === "text" && validIndex(state, action.index)
        ? { ...state, selected: action.index }
        : state;
    case "resume":
      return validIndex(state, action.index)
        ? {
            ...state,
            index: action.index,
            view: "reader",
            playing: false,
            complete: false,
            selected: null,
          }
        : state;
    case "finish":
      return { ...state, view: "input", playing: false, selected: null };
    case "restart":
      return state.words.length
        ? {
            ...state,
            view: "reader",
            index: 0,
            playing: false,
            complete: false,
            selected: null,
          }
        : state;
  }
}
function validIndex(state: ReaderState, index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < state.words.length;
}
