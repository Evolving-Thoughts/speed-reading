import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  type CSSProperties,
} from "react";
import { initialState, reducer } from "./state";
import { ReaderWord } from "./ReaderWord";
import { NormalText } from "./NormalText";
import { ReadingSettings } from "./ReadingSettings";
import { useFullscreen } from "./useFullscreen";
import { usePlayback } from "./usePlayback";
import { ArticleImport } from "./ArticleImport";
import { ArticleImage } from "./ArticleImage";
import { countWords } from "./reader";

import { exampleText, exampleSources } from "./example";

// The link import needs the local Node.js service; static hosts (GitHub Pages) build without it.
const articleImportEnabled = import.meta.env.VITE_ARTICLE_IMPORT !== "false";

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const fullscreen = useFullscreen();
  const currentWord = useRef<HTMLButtonElement>(null);
  const mainHeading = useRef<HTMLHeadingElement>(null);
  usePlayback(state, dispatch);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden) dispatch({ type: "pause" });
    };
    const keyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        event.code !== "Space" ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      if (
        target.closest(
          'input,textarea,button,select,a,[contenteditable="true"]',
        )
      )
        return;
      if (state.view === "reader" && !state.complete) {
        event.preventDefault();
        dispatch({ type: "toggle" });
      }
    };
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("keydown", keyboard);
    };
  }, [state.view, state.complete]);
  useLayoutEffect(() => {
    mainHeading.current?.focus({ preventScroll: true });
    if (state.view !== "text") window.scrollTo({ top: 0, behavior: "instant" });
    if (state.view === "text")
      currentWord.current?.scrollIntoView({
        block: "center",
        behavior: "instant",
      });
  }, [state.view]);
  const words = state.words;
  const draftCount = useMemo(() => countWords(state.draft), [state.draft]);
  const count = state.view === "input" ? draftCount : words.length;
  const progress = words.length
    ? Math.round(((state.index + 1) / words.length) * 100)
    : 0;
  const image = words[state.index]?.image;
  const status = state.complete
    ? "Text beendet"
    : image
      ? "Bildpause"
      : state.playing
        ? "Läuft"
        : "Pausiert";
  const speedControl = (
    <ReadingSettings
      wpm={state.wpm}
      fontScale={state.fontScale}
      sentenceEndFactor={state.sentenceEndFactor}
      dispatch={dispatch}
    />
  );
  return (
    <div
      className={`app-shell${state.view === "reader" ? " reader-session" : ""}`}
      style={{ "--reading-scale": state.fontScale } as CSSProperties}
    >
      <header className="app-header">
        <div className="header-main">
          <a
            className="brand"
            href="#main"
            aria-label="Speed Reading – zum Inhalt"
          >
            speed <span>/</span> reading
          </a>
          <div className="header-actions">
            {state.view === "input" && articleImportEnabled && (
              <span className="privacy-label">Lokaler Importdienst.</span>
            )}
            <button
              className="button fullscreen-button"
              disabled={!fullscreen.supported || fullscreen.busy}
              aria-label={
                fullscreen.active ? "Vollbild verlassen" : "Vollbild starten"
              }
              aria-pressed={fullscreen.active}
              title={
                !fullscreen.supported
                  ? "Vollbild wird in diesem Browser nicht unterstützt."
                  : fullscreen.active
                    ? "Vollbild verlassen"
                    : "Vollbild starten"
              }
              onClick={() => void fullscreen.toggle()}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path
                  d={
                    fullscreen.active
                      ? "M4 9h5V4M20 9h-5V4M4 15h5v5M20 15h-5v5"
                      : "M9 4H4v5M15 4h5v5M4 15v5h5M20 15v5h-5"
                  }
                />
              </svg>
              <span className="fullscreen-label">
                {fullscreen.active ? "Vollbild verlassen" : "Vollbild"}
              </span>
            </button>
            {state.view !== "input" && (
              <button
                className="button end-button"
                onClick={() => dispatch({ type: "finish" })}
              >
                Text beenden
              </button>
            )}
          </div>
        </div>
        {(!fullscreen.supported || fullscreen.error) && (
          <p
            className="header-notice"
            role="status"
            aria-label="Vollbildhinweis"
          >
            {fullscreen.supported
              ? fullscreen.error
              : "Vollbild wird in diesem Browser nicht unterstützt."}
          </p>
        )}
      </header>
      <main id="main">
        {state.view === "input" ? (
          <section className="input-screen">
            <div className="eyebrow">DEIN TEMPO. DEIN TEXT.</div>
            <h1 ref={mainHeading} tabIndex={-1}>
              Ein Wort nach
              <br />
              dem anderen.
            </h1>
            <p className="intro">
              Text einfügen, Tempo wählen, loslesen.
              <br />
              Eingefügter Text bleibt in diesem Browser-Tab.
            </p>
            {articleImportEnabled && (
              <ArticleImport
                initialArticle={state.article}
                onRead={(article) => dispatch({ type: "article", article })}
              />
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                dispatch({ type: "load" });
              }}
            >
              <div className="field-heading">
                <label htmlFor="text-input">Was möchtest du lesen?</label>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => dispatch({ type: "draft", text: exampleText })}
                >
                  Beispieltext laden
                </button>
              </div>
              <textarea
                id="text-input"
                placeholder="Füge deinen Text hier ein …"
                value={state.draft}
                onChange={(e) =>
                  dispatch({ type: "draft", text: e.target.value })
                }
                spellCheck={false}
              />
              <div className="input-meta">
                <span>
                  {count} {count === 1 ? "Wort" : "Wörter"}
                </span>
                <span>Kein Speichern nach Neuladen</span>
              </div>
              {speedControl}
              <button
                type="submit"
                className="button primary wide"
                disabled={!count}
              >
                Zur Leseansicht <span aria-hidden="true">→</span>
              </button>
            </form>
            <details className="explanation example-sources">
              <summary>Quellen zum Beispieltext</summary>
              <p>
                Der Beispieltext fasst Forschung zu RSVP und Lesen zusammen. Er
                ist keine Übersetzung des Referenzvideos. Die Quellen werden
                nicht als Teil des Beispieltexts angezeigt oder vorgelesen.
              </p>
              <ul>
                {exampleSources.map((source) => (
                  <li key={source.href}>
                    <a href={source.href} target="_blank" rel="noreferrer">
                      {source.label}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
            <details className="explanation">
              <summary>Wie funktioniert dieser Lesemodus?</summary>
              <p>
                Es erscheint immer ein Wort. Der rote Buchstabe bleibt an
                derselben Stelle, damit dein Blick einen festen Anker hat. Du
                kannst jederzeit pausieren oder in die normale Textansicht
                wechseln. Mehr Tempo bedeutet nicht automatisch mehr Verständnis
                – wähle ein angenehmes Tempo.
              </p>
            </details>
          </section>
        ) : state.view === "reader" ? (
          <section
            className={`reading-screen ${image ? "image-reader" : "word-reader"}`}
            aria-label="Speedreading"
          >
            <h1 className="sr-only" ref={mainHeading} tabIndex={-1}>
              Speedreading
            </h1>
            {image ? (
              <ArticleImage
                key={image.src}
                image={image}
                reading
                complete={state.complete}
              />
            ) : (
              <ReaderWord
                word={words[state.index]}
                fontScale={state.fontScale}
              />
            )}
            <div className="reader-meta">
              <span role="status" aria-label="Wiedergabestatus">
                {status}
              </span>
              <span>{state.wpm} WPM</span>
            </div>
            <div
              className="progress"
              role="progressbar"
              aria-label="Lesefortschritt"
              aria-valuemin={0}
              aria-valuemax={words.length}
              aria-valuenow={state.index + 1}
            >
              <div style={{ width: `${progress}%` }} />
            </div>
            <div className="reader-controls">
              <div className="actions">
                {state.complete ? (
                  <button
                    className="button primary"
                    onClick={() => dispatch({ type: "restart" })}
                  >
                    Von vorne
                  </button>
                ) : image ? (
                  <button
                    className="button primary"
                    onClick={() => dispatch({ type: "continueImage" })}
                  >
                    Weiterlesen
                  </button>
                ) : (
                  <button
                    className="button primary"
                    onClick={() => dispatch({ type: "toggle" })}
                  >
                    <span aria-hidden="true">{state.playing ? "Ⅱ" : "▶"}</span>{" "}
                    {state.playing ? "Pause" : "Start"}
                  </button>
                )}
                <button
                  className="button"
                  onClick={() => dispatch({ type: "text" })}
                >
                  Textansicht
                </button>
              </div>
              {speedControl}
              <p className="session-info">
                {state.article ? "Leseschritt" : "Wort"} {state.index + 1} von{" "}
                {words.length} <span aria-hidden="true">·</span> {progress} %
                gelesen
                <span className="keyboard-tip" hidden={Boolean(image)}>
                  {" "}
                  · Leertaste für Start/Pause
                </span>
              </p>
            </div>
          </section>
        ) : (
          <section className="text-screen">
            <div className="text-heading">
              <div className="eyebrow">TEXTANSICHT</div>
              <h1 ref={mainHeading} tabIndex={-1}>
                In Ruhe nachlesen.
              </h1>
              <p className="intro">
                Wähle ein Wort, ab dem du weiterlesen möchtest.
                <span className="desktop-tip">
                  {" "}
                  Doppelklick wechselt direkt zur pausierten Leseansicht.
                </span>
              </p>
            </div>
            <NormalText
              words={words}
              index={state.index}
              selected={state.selected}
              dispatch={dispatch}
              currentWordRef={currentWord}
            />
            <div className="selection-bar">
              <div className="selection-inner">
                <span className="selected-label">
                  {state.selected !== null
                    ? words[state.selected].image
                      ? "Bild ausgewählt"
                      : `„${words[state.selected].text}“`
                    : "Wort auswählen"}
                </span>
                <button
                  className="button primary"
                  disabled={state.selected === null}
                  onClick={() => {
                    if (state.selected !== null)
                      dispatch({ type: "resume", index: state.selected });
                  }}
                >
                  Ab hier lesen
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
      <footer className="app-footer">
        <span>Ein ruhiger Ort für deinen Text.</span>
        <span>Ohne Konto · Ohne Tracking</span>
      </footer>
    </div>
  );
}
