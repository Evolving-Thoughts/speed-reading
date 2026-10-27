import { useRef, type Dispatch } from "react";
import { NormalText } from "../NormalText";
import type { Action, ReaderState } from "../state";
import { useScreenFocus } from "./useScreenFocus";

type Props = { state: ReaderState; dispatch: Dispatch<Action> };

export function TextScreen({ state, dispatch }: Props) {
  const currentWord = useRef<HTMLButtonElement>(null);
  const heading = useScreenFocus(currentWord);
  const selected = state.selected === null ? null : state.steps[state.selected];
  return (
    <section className="text-screen">
      <div className="text-heading">
        <div className="eyebrow">TEXTANSICHT</div>
        <h1 ref={heading} tabIndex={-1}>
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
        steps={state.steps}
        index={state.index}
        selected={state.selected}
        dispatch={dispatch}
        currentWordRef={currentWord}
      />
      <div className="selection-bar">
        <div className="selection-inner">
          <span className="selected-label">
            {!selected
              ? "Wort auswählen"
              : selected.kind === "image"
                ? "Bild ausgewählt"
                : `„${selected.text}“`}
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
  );
}
