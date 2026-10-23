import { useEffect, useRef, type Dispatch } from "react";
import { wordDuration } from "./reader";
import type { Action, ReaderState } from "./state";

/** Monotonic deadlines; late frames never skip unread words to catch up. */
export function usePlayback(state: ReaderState, dispatch: Dispatch<Action>) {
  const previous = useRef({ index: -1, wpm: 0, deadline: 0, playing: false });
  useEffect(() => {
    if (!state.playing) {
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
      wordDuration(state.words[state.index], state.wpm);
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
  }, [state.playing, state.index, state.wpm, state.words, dispatch]);
}
