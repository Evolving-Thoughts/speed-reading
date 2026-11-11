import { JSDOM } from "jsdom";
import { expect, it } from "vitest";
import { extractArticle, imageUrl } from "./extract";

const sentence =
  "Der Artikel erklärt ein Thema mit ausreichend Kontext und hilfreichen Beispielen. ";
const paragraph = `<p>${sentence.repeat(5)}</p>`;
const page = (body: string, url = "https://example.com/story") =>
  new JSDOM(
    `<html><head><title>Seitentitel</title></head><body>${body}</body>`,
    {
      url,
    },
  ).window.document;
const texts = (result: ReturnType<typeof extractArticle>) =>
  result.ok
    ? result.article.blocks.flatMap((b) => (b.type === "text" ? [b.text] : []))
    : [];

it("reads the article in document order with its image and caption, without navigation or scripts", () => {
  const doc = page(
    `<nav>Navigation</nav><article><h1>Eine faire Gesellschaft</h1>${paragraph}<figure><img data-src="/photo.jpg" alt="Menschen am Tisch"><figcaption>Gemeinsame Entscheidungen</figcaption></figure>${paragraph}<script>alert(1)</script></article><footer>Impressum</footer>`,
  );
  const result = extractArticle(doc);
  if (!result.ok) throw new Error("no article");
  expect(result.source).toBe("article");
  expect(result.article.title).toBe("Eine faire Gesellschaft");
  expect(result.article.sourceUrl).toBe("https://example.com/story");
  expect(result.article.blocks.map((b) => b.type)).toEqual([
    "text",
    "image",
    "text",
  ]);
  expect(result.article.blocks[1]).toEqual({
    type: "image",
    src: "https://example.com/photo.jpg",
    alt: "Menschen am Tisch",
    caption: "Gemeinsame Entscheidungen",
  });
  const json = JSON.stringify(result);
  for (const unwanted of ["Navigation", "alert(1)", "Impressum"])
    expect(json).not.toContain(unwanted);
  // The page itself is only read, never rewritten.
  expect(doc.querySelector("nav")?.textContent).toBe("Navigation");
  expect(doc.querySelector("img")?.getAttribute("data-src")).toBe("/photo.jpg");
});

it("keeps responsive and relative images and drops tracking pixels and unsafe addresses", () => {
  const result = extractArticle(
    page(
      `<article><h1>Titel</h1>${paragraph}<img src="javascript:alert(1)"><img src="https://example.com/tracker" width="1" height="1"><picture><source srcset="/small.jpg 400w, /large.jpg 1200w, /huge.jpg 4000w"><img src="/fallback.jpg" alt="Großes Bild"></picture>${paragraph}</article>`,
    ),
  );
  if (!result.ok) throw new Error("no article");
  expect(
    result.article.blocks.flatMap((b) => (b.type === "image" ? [b.src] : [])),
  ).toEqual(["https://example.com/large.jpg"]);
});

it("reads srcset candidates with or without a space after the comma, and commas inside URLs", () => {
  const sources = (srcset: string) => {
    const result = extractArticle(
      page(
        `<article><h1>Titel</h1>${paragraph}<img srcset="${srcset}" alt="Bild">${paragraph}</article>`,
      ),
    );
    return result.ok
      ? result.article.blocks.flatMap((b) =>
          b.type === "image" ? [b.src] : [],
        )
      : [];
  };
  expect(sources("/a.jpg 400w,/b.jpg 1200w,/c.jpg 4000w")).toEqual([
    "https://example.com/b.jpg",
  ]);
  expect(
    sources("/w_400,c_fill/a.jpg 400w, /w_1200,c_fill/b.jpg 1200w"),
  ).toEqual(["https://example.com/w_1200,c_fill/b.jpg"]);
  expect(sources("/a.jpg, /b.jpg 2x")).toEqual(["https://example.com/b.jpg"]);
});

it("reads the whole marked-up article when it is split into sections around an ad", () => {
  const other =
    "Ein anderer Abschnitt führt den Gedanken mit neuen Belegen weiter. ";
  const result = extractArticle(
    page(
      `<main><article><h1>Geteilter Artikel</h1><div><time>Vor 2 Stunden</time><span>Von Erika Muster</span></div><div class="text"><p>${sentence.repeat(6)}</p></div><div class="ad"><span>Anzeige</span></div><div class="text"><p>${other.repeat(3)}</p><p>${other.repeat(3)}</p></div><article><p>Kommentar eines Lesers</p></article></article></main>`,
    ),
  );
  const all = texts(result).join(" ");
  expect(all).toContain("Der Artikel erklärt");
  expect(all).toContain("Ein anderer Abschnitt");
  for (const unwanted of ["Kommentar eines Lesers", "Erika Muster", "Anzeige"])
    expect(all).not.toContain(unwanted);
  expect(result.ok && result.article.title).toBe("Geteilter Artikel");
});

it("reads a deliberate selection instead of the article, including images inside it", () => {
  const doc = page(
    `<article><h1>Titel</h1>${paragraph}<p id="pick">Nur dieser eine Absatz soll gelesen werden.</p><img id="img" src="/in-selection.png" alt="Auswahlbild"><p id="end">Und noch dieser hier.</p>${paragraph}</article>`,
  );
  const range = doc.createRange();
  range.setStartBefore(doc.getElementById("pick")!);
  range.setEndAfter(doc.getElementById("end")!);
  doc.getSelection()!.addRange(range);
  const result = extractArticle(doc);
  if (!result.ok) throw new Error("no selection");
  expect(result.source).toBe("selection");
  expect(result.article.title).toBe("Seitentitel");
  expect(result.article.blocks).toEqual([
    { type: "text", text: "Nur dieser eine Absatz soll gelesen werden." },
    {
      type: "image",
      src: "https://example.com/in-selection.png",
      alt: "Auswahlbild",
      caption: "",
    },
    { type: "text", text: "Und noch dieser hier." },
  ]);
});

it("treats a selection of a few words as accidental and reads the article", () => {
  const doc = page(
    `<article><h1>Titel</h1>${paragraph}<p id="pick">Zwei Wörter</p>${paragraph}</article>`,
  );
  doc.getSelection()!.selectAllChildren(doc.getElementById("pick")!);
  const result = extractArticle(doc);
  expect(result.ok && result.source).toBe("article");
  expect(texts(result).length).toBeGreaterThan(1);
});

it("falls back to the visible page text when no article is recognised", () => {
  const result = extractArticle(
    page(
      `<header role="banner">Kopfzeile</header><nav>Menü</nav><main><h2>Kurz</h2><p>Ein Satz.</p><div hidden>Versteckt</div><button>Klick</button><p aria-hidden="true">Unsichtbar</p></main><aside>Werbung</aside>`,
    ),
  );
  expect(result.ok && result.source).toBe("page");
  expect(texts(result)).toEqual(["Kurz", "Ein Satz."]);
});

it("reports pages without any reading text", () => {
  expect(extractArticle(page(`<nav>Menü</nav><main></main>`))).toEqual({
    ok: false,
    reason: "empty",
  });
});

it("refuses texts beyond the size the reader can handle", () => {
  const long = `<article><h1>Titel</h1>${`<p>${"Wort ".repeat(2000)}</p>`.repeat(30)}</article>`;
  expect(extractArticle(page(long))).toEqual({ ok: false, reason: "too-long" });
});

it("leaves the extension's own elements out of the text", () => {
  const result = extractArticle(
    page(`<main><p>Ein Satz.</p><div id="own">Eigene Oberfläche</div></main>`),
    { ignore: "#own" },
  );
  expect(texts(result)).toEqual(["Ein Satz."]);
});

it("accepts only addresses an image element may safely show", () => {
  const base = "https://example.com/a/";
  expect(imageUrl("b.png", base)).toBe("https://example.com/a/b.png");
  expect(imageUrl("data:image/png;base64,AAA", base)).toBe(
    "data:image/png;base64,AAA",
  );
  for (const unsafe of [
    "javascript:alert(1)",
    "data:image/svg+xml,<svg onload=alert(1)>",
    "data:text/html,<script>1</script>",
    "https://user:secret@example.com/x.png",
    "file:///etc/passwd",
    "",
  ])
    expect(imageUrl(unsafe, base)).toBeNull();
});
