import { useLayoutEffect, useRef, type RefObject } from "react";

/**
 * Moves focus to the screen heading when a screen opens. The page scrolls to
 * the top, or to `scrollTarget` when one is given (the current word in the text view).
 */
export function useScreenFocus(scrollTarget?: RefObject<HTMLElement | null>) {
  const heading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    heading.current?.focus({ preventScroll: true });
    if (scrollTarget)
      scrollTarget.current?.scrollIntoView({
        block: "center",
        behavior: "instant",
      });
    else window.scrollTo({ top: 0, behavior: "instant" });
    // Runs once per screen: every view change mounts a new screen.
  }, []);
  return heading;
}
