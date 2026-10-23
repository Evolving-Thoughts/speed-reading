import { useEffect, useLayoutEffect, useMemo, useReducer, useRef } from "react";
import { initialState, reducer } from "./state";
import { ReaderWord } from "./ReaderWord";
import { NormalText } from "./NormalText";
import { usePlayback } from "./usePlayback";
import { countWords } from "./reader";

const example =
  "Manchmal braucht eine gute Idee keinen großen Plan. Es reicht, einen Gedanken festzuhalten und ihm ein Stück zu folgen.\n\nEin kurzer Text, ein ruhiger Moment. Wir lesen weiter und finden heraus, welche Richtung sich daraus ergibt.";
export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
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
  const status = state.complete
    ? "Text beendet"
    : state.playing
      ? "Läuft"
      : "Pausiert";
  const speedControl = (
    <div className="speed-control">
      <div className="speed-heading">
        <label htmlFor="speed">Lesetempo</label>
        <span>
          <output htmlFor="speed">{state.wpm}</output>{" "}
          <span className="muted">WPM</span>
        </span>
      </div>
      <input
        id="speed"
        type="range"
        min="100"
        max="1200"
        step="10"
        value={state.wpm}
        onChange={(e) =>
          dispatch({ type: "speed", wpm: Number(e.target.value) })
        }
      />
      <div className="range-labels" aria-hidden="true">
        <span>100</span>
        <span>1.200</span>
      </div>
      <p className="hint">Satzenden bleiben dreimal so lange stehen.</p>
    </div>
  );
  return (
    <div className="app-shell">
      <header className="app-header">
        <a
          className="brand"
          href="#main"
          aria-label="Speed Reading – zum Inhalt"
        >
          speed <span>/</span> reading
        </a>
        {state.view !== "input" ? (
          <button
            className="button end-button"
            onClick={() => dispatch({ type: "finish" })}
          >
            Text beenden
          </button>
        ) : (
          <span className="privacy-label">Lokal. Ohne Upload.</span>
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
              Deine Texte bleiben in diesem Browser-Tab.
            </p>
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
                  onClick={() => dispatch({ type: "draft", text: example })}
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
          <section className="reading-screen" aria-label="Speedreading">
            <h1 className="sr-only" ref={mainHeading} tabIndex={-1}>
              Speedreading
            </h1>
            <ReaderWord word={words[state.index]} />
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
                Wort {state.index + 1} von {words.length}{" "}
                <span aria-hidden="true">·</span> {progress} % gelesen
                <span className="keyboard-tip">
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
                    ? `„${words[state.selected].text}“`
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
