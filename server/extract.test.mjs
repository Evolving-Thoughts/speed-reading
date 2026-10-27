import { it, expect } from "vitest";
import { extractArticle } from "./extract.mjs";
it("extracts article text, an image and its caption in document order without navigation", () => {
  const paragraphs =
    "<p>Das ist ein ausführlicher Absatz zum Thema Vermögen und Gesellschaft. Die verständliche Darstellung erklärt Zusammenhänge und konkrete Auswirkungen auf den Alltag. Ein weiterer Satz liefert genügend Kontext für die Artikelerkennung.</p>";
  const html = `<html><head><title>Ein Artikel</title></head><body><nav>Navigation</nav><article><h1>Eine faire Gesellschaft</h1>${paragraphs}<figure><img data-src="/photo.jpg" alt="Menschen am Tisch"><figcaption>Gemeinsame Entscheidungen</figcaption></figure>${paragraphs}<script>alert(1)</script></article></body></html>`;
  const result = extractArticle(html, "https://example.com/story");
  expect(result.title).toBe("Eine faire Gesellschaft");
  expect(result.blocks.map((b) => b.type)).toEqual(["text", "image", "text"]);
  expect(result.blocks[0].text).toContain("Vermögen");
  expect(result.blocks[1]).toEqual({
    type: "image",
    src: "https://example.com/photo.jpg",
    alt: "Menschen am Tisch",
    caption: "Gemeinsame Entscheidungen",
  });
  expect(JSON.stringify(result)).not.toContain("Navigation");
  expect(JSON.stringify(result)).not.toContain("alert(1)");
});
it("ignores tracker-sized and unsafe images while retaining responsive and relative images", () => {
  const p =
    "<p>" +
    "Der Artikel erklärt ein Thema mit ausreichend Kontext und hilfreichen Beispielen. ".repeat(
      5,
    ) +
    "</p>";
  const doc = extractArticle(
    `<article><h1>Titel</h1>${p}<img src="javascript:alert(1)"><img src="https://example.com/tracker" width="1" height="1"><picture><source srcset="/small.jpg 400w, /large.jpg 900w"><img src="data:image/png;base64,AAA" alt="Großes Bild"></picture>${p}</article>`,
    "https://example.com/article",
  );
  expect(
    doc.blocks.filter((b) => b.type === "image").map((b) => b.src),
  ).toEqual(["https://example.com/large.jpg"]);
});
