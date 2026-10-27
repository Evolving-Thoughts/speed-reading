import { articleSteps, type Article, type ArticleImage } from "./article";
import { tokenize, type Step, type WordStep } from "./reader";
import { SPEED, clampWpm, isFontScale, isSentencePause } from "./settings";

export type ReaderState = {
  article: Article | null;
  draft: string;
  steps: Step[];
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
  steps: [],
  view: "input",
  index: 0,
  selected: null,
  playing: false,
  complete: false,
  wpm: SPEED.initial,
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

/** Opens the reader paused at `index`; empty step lists leave the state unchanged. */
function openReader(
  state: ReaderState,
  steps = state.steps,
  index = 0,
): ReaderState {
  if (!steps.length) return state;
  return {
    ...state,
    steps,
    index,
    view: "reader",
    selected: null,
    playing: false,
    complete: false,
  };
}

/** Moves to the next step; playback continues on words and stops at images and the end. */
function advance(state: ReaderState): ReaderState {
  const next = state.index + 1;
  if (next >= state.steps.length)
    return { ...state, playing: false, complete: true };
  return { ...state, index: next, playing: state.steps[next].kind === "word" };
}

const isImageStep = (state: ReaderState) =>
  state.steps[state.index]?.kind === "image";

const validIndex = (state: ReaderState, index: number) =>
  Number.isInteger(index) && index >= 0 && index < state.steps.length;

const articleText = (article: Article) =>
  article.blocks
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("\n\n");

export function reducer(state: ReaderState, action: Action): ReaderState {
  switch (action.type) {
    case "draft":
      return { ...state, draft: action.text, article: null };
    case "article": {
      const opened = openReader(state, articleSteps(action.article));
      return opened === state
        ? state
        : {
            ...opened,
            article: action.article,
            draft: articleText(action.article),
          };
    }
    case "load":
      return openReader(
        state,
        state.article ? articleSteps(state.article) : tokenize(state.draft),
      );
    case "restart":
      return openReader(state);
    case "resume":
      return validIndex(state, action.index)
        ? openReader(state, state.steps, action.index)
        : state;
    case "fontScale":
      return isFontScale(action.value)
        ? { ...state, fontScale: action.value }
        : state;
    case "sentenceEndFactor":
      return isSentencePause(action.value)
        ? { ...state, sentenceEndFactor: action.value }
        : state;
    case "speed":
      return Number.isFinite(action.wpm)
        ? { ...state, wpm: clampWpm(action.wpm) }
        : state;
    case "toggle":
      return state.view === "reader" && !state.complete && !isImageStep(state)
        ? { ...state, playing: !state.playing }
        : state;
    case "tick":
      return state.playing && state.view === "reader" ? advance(state) : state;
    case "continueImage":
      return state.view === "reader" && isImageStep(state) && !state.complete
        ? advance(state)
        : state;
    case "pause":
      return { ...state, playing: false };
    case "text":
      return state.steps.length
        ? { ...state, view: "text", playing: false, selected: state.index }
        : state;
    case "select":
      return state.view === "text" && validIndex(state, action.index)
        ? { ...state, selected: action.index }
        : state;
    case "finish":
      return { ...state, view: "input", playing: false, selected: null };
  }
}

export type ReaderView = {
  word: WordStep | null;
  image: ArticleImage | null;
  status: "Text beendet" | "Bildpause" | "Läuft" | "Pausiert";
  /** Rounded percentage of steps reached, including the current one. */
  progress: number;
};

/** Everything the screens display about the current position, derived in one place. */
export function readerView(state: ReaderState): ReaderView {
  const step = state.steps[state.index];
  const image = step?.kind === "image" ? step.image : null;
  return {
    word: step?.kind === "word" ? step : null,
    image,
    status: state.complete
      ? "Text beendet"
      : image
        ? "Bildpause"
        : state.playing
          ? "Läuft"
          : "Pausiert",
    progress: state.steps.length
      ? Math.round(((state.index + 1) / state.steps.length) * 100)
      : 0,
  };
}
