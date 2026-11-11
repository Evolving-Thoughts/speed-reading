import { useEffect, useReducer, type CSSProperties } from "react";
import { AppHeader } from "../src/AppHeader";
import type { Article } from "../src/article";
import { ImageReferrerPolicy } from "../src/ArticleImage";
import { ReaderScreen } from "../src/screens/ReaderScreen";
import { TextScreen } from "../src/screens/TextScreen";
import { initialState, reducer, type ReaderState } from "../src/state";
import { usePlayback } from "../src/usePlayback";
import type { Extraction } from "./extract";

export type Settings = Pick<
  ReaderState,
  "wpm" | "fontScale" | "sentenceEndFactor"
>;

const SOURCE_LABELS: Record<
  Extract<Extraction, { ok: true }>["source"],
  string
> = {
  selection: "Markierter Text",
  article: "Artikel dieser Seite",
  page: "Sichtbarer Text dieser Seite",
};

type Props = {
  article: Article;
  source: keyof typeof SOURCE_LABELS;
  settings: Partial<Settings>;
  onSettings: (settings: Settings) => void;
  onClose: () => void;
};

/** The web app's reading session, opened directly on an article taken from the page. */
export function Overlay({
  article,
  source,
  settings,
  onSettings,
  onClose,
}: Props) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    // Stored values pass through the reducer, so out-of-range ones are ignored.
    let state = initialState;
    if (settings.wpm !== undefined)
      state = reducer(state, { type: "speed", wpm: settings.wpm });
    if (settings.fontScale !== undefined)
      state = reducer(state, { type: "fontScale", value: settings.fontScale });
    if (settings.sentenceEndFactor !== undefined)
      state = reducer(state, {
        type: "sentenceEndFactor",
        value: settings.sentenceEndFactor,
      });
    return reducer(state, { type: "article", article });
  });
  usePlayback(state, dispatch);

  const { wpm, fontScale, sentenceEndFactor } = state;
  useEffect(() => {
    onSettings({ wpm, fontScale, sentenceEndFactor });
  }, [wpm, fontScale, sentenceEndFactor, onSettings]);

  const Screen = state.view === "text" ? TextScreen : ReaderScreen;
  return (
    <ImageReferrerPolicy.Provider value={undefined}>
      <div
        className={`app-shell${state.view === "reader" ? " reader-session" : ""}`}
        style={{ "--reading-scale": state.fontScale } as CSSProperties}
      >
        <AppHeader
          brand={
            <div className="overlay-brand">
              <span className="brand">
                speed <span>/</span> reading
              </span>
              {article.title && (
                <span className="overlay-title" title={article.title}>
                  {article.title}
                </span>
              )}
            </div>
          }
          finish={{ label: "Schließen", onClick: onClose }}
        />
        <main>
          <Screen state={state} dispatch={dispatch} />
        </main>
        <footer className="app-footer">
          <span>{SOURCE_LABELS[source]}</span>
          <span>
            <span className="keyboard-tip">Esc schließt · </span>Ohne Tracking
          </span>
        </footer>
      </div>
    </ImageReferrerPolicy.Provider>
  );
}
