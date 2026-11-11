import { useLayoutEffect, useRef, type RefObject } from "react";

/**
 * Moves focus to the screen heading when a screen opens. The view scrolls to
 * the top, or to `scrollTarget` when one is given (the current word in the text view).
 * The view is the window, or the enclosing `data-scroll-root` when the screens
 * are embedded in another page (browser extension).
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
    else
      (heading.current?.closest("[data-scroll-root]") ?? window).scrollTo({
        top: 0,
        behavior: "instant",
      });
    // Runs once per screen: every view change mounts a new screen.
  }, []);
  return heading;
}
