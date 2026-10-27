import { useEffect, type Dispatch } from "react";
import { ArticleImage } from "../ArticleImage";
import { ReaderWord } from "../ReaderWord";
import { ReadingSettings } from "../ReadingSettings";
import { readerView, type Action, type ReaderState } from "../state";
import { useScreenFocus } from "./useScreenFocus";

type Props = { state: ReaderState; dispatch: Dispatch<Action> };

const ignoresSpace = 'input,textarea,button,select,a,[contenteditable="true"]';

export function ReaderScreen({ state, dispatch }: Props) {
  const heading = useScreenFocus();
  const { word, image, status, progress } = readerView(state);
  const total = state.steps.length;

  // Space toggles playback unless a control or text field keeps its native meaning.
  useEffect(() => {
    if (state.complete) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const modified =
        event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
      if (event.code !== "Space" || event.repeat || modified) return;
      if ((event.target as HTMLElement).closest(ignoresSpace)) return;
      event.preventDefault();
      dispatch({ type: "toggle" });
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [state.complete, dispatch]);

  return (
    <section
      className={`reading-screen ${image ? "image-reader" : "word-reader"}`}
      aria-label="Speedreading"
    >
      <h1 className="sr-only" ref={heading} tabIndex={-1}>
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
        word && <ReaderWord word={word} fontScale={state.fontScale} />
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
        aria-valuemax={total}
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
          <button className="button" onClick={() => dispatch({ type: "text" })}>
            Textansicht
          </button>
        </div>
        <ReadingSettings {...state} dispatch={dispatch} />
        <p className="session-info">
          {state.article ? "Leseschritt" : "Wort"} {state.index + 1} von {total}{" "}
          <span aria-hidden="true">·</span> {progress} % gelesen
          <span className="keyboard-tip" hidden={Boolean(image)}>
            {" "}
            · Leertaste für Start/Pause
          </span>
        </p>
      </div>
    </section>
  );
}
