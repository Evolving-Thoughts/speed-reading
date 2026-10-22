import { tokenize, type Word } from "./reader";
export type ReaderState = {
  draft: string;
  words: Word[];
  view: "input" | "reader" | "text";
  index: number;
  selected: number | null;
  playing: boolean;
  complete: boolean;
  wpm: number;
};
export const initialState: ReaderState = {
  draft: "",
  words: [],
  view: "input",
  index: 0,
  selected: null,
  playing: false,
  complete: false,
  wpm: 300,
};
export type Action =
  | { type: "draft"; text: string }
  | { type: "load" }
  | { type: "toggle" }
  | { type: "tick" }
  | { type: "text" }
  | { type: "select"; index: number }
  | { type: "resume"; index: number }
  | { type: "finish" }
  | { type: "restart" }
  | { type: "pause" }
  | { type: "speed"; wpm: number };
export function reducer(state: ReaderState, action: Action): ReaderState {
  if (action.type === "draft") return { ...state, draft: action.text };
  if (action.type === "load") {
    const words = tokenize(state.draft);
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
    case "speed":
      return Number.isFinite(action.wpm)
        ? {
            ...state,
            wpm: Math.max(100, Math.min(1200, Math.round(action.wpm))),
          }
        : state;
    case "toggle":
      return state.view === "reader" && !state.complete
        ? { ...state, playing: !state.playing }
        : state;
    case "pause":
      return { ...state, playing: false };
    case "tick":
      if (!state.playing || state.view !== "reader") return state;
      return state.index < state.words.length - 1
        ? { ...state, index: state.index + 1 }
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
