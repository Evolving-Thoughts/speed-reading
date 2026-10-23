import {
  Fragment,
  memo,
  type Dispatch,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
} from "react";
import type { Word } from "./reader";
import type { Action } from "./state";

type Props = {
  words: Word[];
  index: number;
  selected: number | null;
  dispatch: Dispatch<Action>;
  currentWordRef: RefObject<HTMLButtonElement | null>;
};

function wordButton(
  target: EventTarget | null,
  container: HTMLDivElement,
): HTMLButtonElement | null {
  if (!(target instanceof Element)) return null;
  const button = target.closest<HTMLButtonElement>("button[data-word-index]");
  return button && container.contains(button) ? button : null;
}

/** Native word buttons with delegated events and one roving keyboard tab stop. */
export const NormalText = memo(function NormalText({
  words,
  index,
  selected,
  dispatch,
  currentWordRef,
}: Props) {
  const activeIndex = selected ?? index;
  const selectWord = (event: MouseEvent<HTMLDivElement>) => {
    const button = wordButton(event.target, event.currentTarget);
    if (button)
      dispatch({ type: "select", index: Number(button.dataset.wordIndex) });
  };
  const resumeWord = (event: MouseEvent<HTMLDivElement>) => {
    const button = wordButton(event.target, event.currentTarget);
    if (button)
      dispatch({ type: "resume", index: Number(button.dataset.wordIndex) });
  };
  const navigateWords = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
      return;
    const button = wordButton(event.target, event.currentTarget);
    if (!button) return;
    const current = Number(button.dataset.wordIndex);
    let next: number;
    switch (event.key) {
      case "ArrowLeft":
        next = Math.max(0, current - 1);
        break;
      case "ArrowRight":
        next = Math.min(words.length - 1, current + 1);
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = words.length - 1;
        break;
      default:
        return; // Keep native Enter/Space activation and Tab navigation.
    }
    event.preventDefault();
    dispatch({ type: "select", index: next });
    const nextButton = event.currentTarget.querySelector<HTMLButtonElement>(
      `button[data-word-index="${next}"]`,
    );
    nextButton?.focus({ preventScroll: true });
    nextButton?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "instant",
    });
  };
  return (
    <>
      <p id="word-navigation-help" className="sr-only">
        Ein Tab-Stopp für die Wortauswahl. Mit Pfeil links und rechts zwischen
        Wörtern wechseln; Pos1 und Ende wählen das erste und letzte Wort. Mit
        Tab zu „Ab hier lesen“ wechseln.
      </p>
      <div
        className="normal-text"
        role="group"
        aria-label="Vollständiger Text"
        aria-describedby="word-navigation-help"
        onClick={selectWord}
        onDoubleClick={resumeWord}
        onKeyDown={navigateWords}
      >
        {words.map((word, wordIndex) => (
          <Fragment key={wordIndex}>
            {word.leading}
            <button
              type="button"
              data-word-index={wordIndex}
              tabIndex={wordIndex === activeIndex ? 0 : -1}
              className={`text-word ${wordIndex === index ? "current" : ""} ${wordIndex === selected ? "selected" : ""}`}
              ref={wordIndex === index ? currentWordRef : undefined}
              aria-pressed={wordIndex === selected}
              aria-current={wordIndex === index ? "location" : undefined}
            >
              {word.text}
            </button>
          </Fragment>
        ))}
      </div>
    </>
  );
});
