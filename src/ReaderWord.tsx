import { useLayoutEffect, useRef, useState } from "react";
import { characters, type WordStep } from "./reader";
export function ReaderWord({
  word,
  fontScale = 1,
}: {
  word: WordStep;
  fontScale?: number;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(88);
  const chars = characters(word.text);
  useLayoutEffect(() => {
    const box = viewport.current;
    const element = text.current;
    if (!box || !element) return;
    const measure = () => {
      // Measure at a fixed reference size, including both sides of the anchor.
      element.style.fontSize = "100px";
      const before = element.querySelector<HTMLElement>(".before")!;
      const anchor = element.querySelector<HTMLElement>(".anchor")!;
      const after = element.querySelector<HTMLElement>(".after")!;
      const left =
        before.getBoundingClientRect().width +
        anchor.getBoundingClientRect().width / 2;
      const right =
        after.getBoundingClientRect().width +
        anchor.getBoundingClientRect().width / 2;
      const width = box.clientWidth;
      const max = (width < 600 ? 56 : 88) * fontScale;
      const fitted = Math.min(
        max,
        (100 * (width * 0.38 - 20)) / Math.max(1, left),
        (100 * (width * 0.62 - 20)) / Math.max(1, right),
      );
      element.style.fontSize = `${Math.max(1, fitted)}px`;
      setSize(Math.max(1, fitted));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    void document.fonts.ready.then(() => {
      if (element.isConnected) measure();
    });
    return () => observer.disconnect();
  }, [word.text, word.anchor, fontScale]);
  return (
    <div className="word-viewport" ref={viewport}>
      <div className="guide guide-top" aria-hidden="true" />
      <div
        className="word"
        ref={text}
        style={{ fontSize: size }}
        aria-label={word.text}
        data-testid="reader-word"
      >
        <span className="before" aria-hidden="true">
          {chars.slice(0, word.anchor).join("")}
        </span>
        <span className="anchor" aria-hidden="true">
          {chars[word.anchor]}
        </span>
        <span className="after" aria-hidden="true">
          {chars.slice(word.anchor + 1).join("")}
        </span>
      </div>
      <div className="guide guide-bottom" aria-hidden="true" />
    </div>
  );
}
