import { useEffect, useRef, type Dispatch } from "react";
import { wordDuration } from "./reader";
import type { Action, ReaderState } from "./state";

/**
 * Drives the reader: advances words on monotonic deadlines (late frames never
 * skip unread words to catch up) and pauses whenever the tab is hidden.
 */
export function usePlayback(state: ReaderState, dispatch: Dispatch<Action>) {
  const previous = useRef({ index: -1, wpm: 0, deadline: 0, playing: false });

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.hidden) dispatch({ type: "pause" });
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () =>
      document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, [dispatch]);

  useEffect(() => {
    const step = state.steps[state.index];
    if (!state.playing || step?.kind !== "word") {
      previous.current.playing = false;
      return;
    }
    const prior = previous.current;
    const now = performance.now();
    const continuous =
      prior.playing &&
      prior.index + 1 === state.index &&
      prior.wpm === state.wpm;
    const deadline =
      (continuous ? Math.max(prior.deadline, now) : now) +
      wordDuration(step, state.wpm, state.sentenceEndFactor);
    previous.current = {
      index: state.index,
      wpm: state.wpm,
      deadline,
      playing: true,
    };
    let timer: ReturnType<typeof setTimeout>;
    const advance = () => {
      if (document.hidden) {
        dispatch({ type: "pause" });
        return;
      }
      const remaining = deadline - performance.now();
      if (remaining > 0) timer = setTimeout(advance, remaining);
      else dispatch({ type: "tick" });
    };
    timer = setTimeout(advance, Math.max(0, deadline - performance.now()));
    return () => clearTimeout(timer);
  }, [
    state.playing,
    state.index,
    state.wpm,
    state.sentenceEndFactor,
    state.steps,
    dispatch,
  ]);
}
