import { it, expect } from "vitest";
import { articleSteps, type Article } from "./article";
it("keeps an image between its surrounding words without reading the caption as body text", () => {
  const doc: Article = {
    title: "Test",
    sourceUrl: "https://example.com",
    blocks: [
      { type: "text", text: "Hallo Welt." },
      {
        type: "image",
        src: "/api/image?token=fixture",
        alt: "Ein Foto",
        caption: "Bildunterschrift",
      },
      { type: "text", text: "Weiter geht es." },
    ],
  };
  const steps = articleSteps(doc);
  expect(steps.map((w) => (w.image ? "[Bild]" : w.text))).toEqual([
    "Hallo",
    "Welt.",
    "[Bild]",
    "Weiter",
    "geht",
    "es.",
  ]);
  expect(steps[2].image?.caption).toBe("Bildunterschrift");
});
import { isArticle } from "./article";
it("rejects executable source links and images not served by the local signed image endpoint", () => {
  const a = {
    title: "Test",
    sourceUrl: "https://example.com",
    blocks: [{ type: "text", text: "Text" }],
  };
  expect(isArticle(a)).toBe(true);
  expect(isArticle({ ...a, sourceUrl: "javascript:alert(1)" })).toBe(false);
  expect(
    isArticle({
      ...a,
      blocks: [
        { type: "image", src: "http://127.0.0.1/image", alt: "x", caption: "" },
      ],
    }),
  ).toBe(false);
  expect(
    isArticle({
      ...a,
      blocks: [
        {
          type: "image",
          src: "/api/image?token=valid.test",
          alt: "x",
          caption: "",
        },
      ],
    }),
  ).toBe(true);
});
