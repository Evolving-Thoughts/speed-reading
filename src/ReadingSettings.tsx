import { useEffect, useState, type Dispatch } from "react";
import type { Action, ReaderState } from "./state";

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
    const value = Math.max(100, Math.min(1200, Math.round(parsed)));
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
            min="100"
            max="1200"
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
        min="100"
        max="1200"
        step="1"
        value={wpm}
        onChange={(e) =>
          dispatch({ type: "speed", wpm: Number(e.target.value) })
        }
      />
      <div className="range-labels" id="speed-bounds">
        <span>100</span>
        <span>1.200</span>
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
            <option value="0.8">Klein</option>
            <option value="1">Normal</option>
            <option value="1.25">Groß</option>
            <option value="1.5">Sehr groß</option>
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
            <option value="1">Aus · 1×</option>
            <option value="2">Kurz · 2×</option>
            <option value="3">Normal · 3×</option>
            <option value="4">Lang · 4×</option>
          </select>
        </label>
      </div>
      <p className="hint">
        {sentenceEndFactor === 1
          ? "Keine zusätzliche Pause am Satzende."
          : `Satzendwörter stehen insgesamt ${sentenceEndFactor}× so lange wie normale Wörter.`}
      </p>
    </div>
  );
}
