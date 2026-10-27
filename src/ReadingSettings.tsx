import { useEffect, useState, type Dispatch } from "react";
import type { Action, ReaderState } from "./state";
import { FONT_SCALES, SENTENCE_PAUSES, SPEED, clampWpm } from "./settings";

type Props = Pick<ReaderState, "wpm" | "fontScale" | "sentenceEndFactor"> & {
  dispatch: Dispatch<Action>;
};
export function ReadingSettings({
  wpm,
  fontScale,
  sentenceEndFactor,
  dispatch,
}: Props) {
  const [speedDraft, setSpeedDraft] = useState(String(wpm));
  useEffect(() => {
    setSpeedDraft(String(wpm));
  }, [wpm]);
  const commitSpeed = () => {
    const parsed = Number(speedDraft);
    if (!speedDraft.trim() || !Number.isFinite(parsed)) {
      setSpeedDraft(String(wpm));
      return;
    }
    const value = clampWpm(parsed);
    dispatch({ type: "speed", wpm: value });
    setSpeedDraft(String(value));
  };
  return (
    <div className="speed-control">
      <div className="speed-heading">
        <label htmlFor="speed">Lesetempo</label>
        <div className="speed-value">
          <input
            type="number"
            className="speed-number"
            aria-label="Tempo in Wörtern pro Minute"
            aria-describedby="speed-bounds"
            min={SPEED.min}
            max={SPEED.max}
            step="1"
            value={speedDraft}
            onChange={(e) => setSpeedDraft(e.target.value)}
            onBlur={commitSpeed}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitSpeed();
                e.currentTarget.blur();
              }
            }}
          />
          <span className="muted">WPM</span>
        </div>
      </div>
      <input
        id="speed"
        type="range"
        min={SPEED.min}
        max={SPEED.max}
        step="1"
        value={wpm}
        onChange={(e) =>
          dispatch({ type: "speed", wpm: Number(e.target.value) })
        }
      />
      <div className="range-labels" id="speed-bounds">
        <span>{SPEED.min.toLocaleString("de-DE")}</span>
        <span>{SPEED.max.toLocaleString("de-DE")}</span>
      </div>
      <div className="reading-preferences">
        <label htmlFor="font-scale">
          Schriftgröße
          <select
            id="font-scale"
            value={fontScale}
            onChange={(e) =>
              dispatch({ type: "fontScale", value: Number(e.target.value) })
            }
          >
            {FONT_SCALES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="sentence-pause">
          Satzendpause
          <select
            id="sentence-pause"
            value={sentenceEndFactor}
            onChange={(e) =>
              dispatch({
                type: "sentenceEndFactor",
                value: Number(e.target.value),
              })
            }
          >
            {SENTENCE_PAUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} · {option.value}×
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="hint">
        {sentenceEndFactor === 1
          ? "Satzenddauer: wie bei normalen Wörtern."
          : `Satzenddauer: ${sentenceEndFactor}× normale Wortdauer.`}
      </p>
    </div>
  );
}
