import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export class ImportError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.status = status;
  }
}
export function httpUrl(value, base) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const u = new URL(value, base);
    if (!["http:", "https:"].includes(u.protocol) || u.username || u.password)
      return null;
    u.hash = "";
    return u.href;
  } catch {
    return null;
  }
}
function imageSource(img, base) {
  // Lazy-loading attributes often contain the real image rather than a placeholder.
  const lazy =
    img.getAttribute("data-src") ||
    img.getAttribute("data-original") ||
    img.getAttribute("data-lazy-src");
  const candidates = (
    img.getAttribute("data-srcset") ||
    img.getAttribute("srcset") ||
    img
      .closest("picture")
      ?.querySelector("source[srcset]")
      ?.getAttribute("srcset") ||
    ""
  )
    .split(",")
    .map((s) => s.trim().split(/\s+/)[0])
    .filter(Boolean);
  return httpUrl(
    lazy || candidates.at(-1) || img.getAttribute("src") || "",
    base,
  );
}
/** No scripts or remote resources run in jsdom; only a typed text/image model leaves the parser. */
export function extractArticle(html, url) {
  if ((html.match(/</g) || []).length > 30000)
    throw new ImportError("Die Artikelseite ist zu komplex.");
  const dom = new JSDOM(html, { url });
  try {
    const doc = dom.window.document;
    const originalTitle = doc.querySelector("article h1")?.textContent?.trim();
    for (const img of doc.querySelectorAll("img")) {
      const src = imageSource(img, url);
      if (src) img.setAttribute("src", src);
      else img.remove();
    }
    const article = new Readability(doc, {
      charThreshold: 100,
      keepClasses: false,
      maxElemsToParse: 30000,
    }).parse();
    if (!article?.content || !article.textContent?.trim())
      throw new ImportError(
        "Kein lesbarer Artikel gefunden. Du kannst den Text weiterhin manuell einfügen.",
      );
    const content = new JSDOM(article.content, { url });
    try {
      const root = content.window.document.body;
      root
        .querySelectorAll(
          "script,style,noscript,iframe,video,audio,svg,form,button,input,nav,aside,footer,header",
        )
        .forEach((el) => el.remove());
      const title = (
        originalTitle ||
        article.title ||
        "Importierter Artikel"
      ).slice(0, 500);
      const blocks = [];
      let pending = "";
      let imageCount = 0;
      let textLength = 0;
      const flush = () => {
        const text = pending.replace(/[\t\r\n ]+/g, " ").trim();
        pending = "";
        if (text) {
          textLength += text.length;
          blocks.push({ type: "text", text });
        }
      };
      const visit = (node) => {
        if (node.nodeType === 3) {
          pending += node.textContent;
          return;
        }
        if (node.nodeType !== 1) return;
        const tag = node.tagName;
        if (tag === "FIGCAPTION") return;
        if (/^H[1-6]$/.test(tag) && node.textContent.trim() === title) return;
        if (tag === "IMG") {
          const src = httpUrl(node.getAttribute("src"), url);
          const w = Number(node.getAttribute("width")),
            h = Number(node.getAttribute("height"));
          if (
            !src ||
            (w > 0 && w <= 2) ||
            (h > 0 && h <= 2) ||
            imageCount >= 50
          )
            return;
          flush();
          imageCount++;
          blocks.push({
            type: "image",
            src,
            alt: (node.getAttribute("alt") || "Artikelbild").slice(0, 1000),
            caption: (
              node
                .closest("figure")
                ?.querySelector("figcaption")
                ?.textContent?.trim() || ""
            ).slice(0, 2000),
          });
          return;
        }
        const block = [
          "P",
          "DIV",
          "SECTION",
          "ARTICLE",
          "H1",
          "H2",
          "H3",
          "H4",
          "LI",
          "BLOCKQUOTE",
          "PRE",
          "TR",
          "BR",
          "FIGURE",
        ].includes(tag);
        if (block) flush();
        for (const child of node.childNodes) visit(child);
        if (block) flush();
      };
      visit(root);
      flush();
      if (!textLength)
        throw new ImportError(
          "Der Artikel enthält keinen erkennbaren Lesetext.",
        );
      if (textLength > 250000 || blocks.length > 3000)
        throw new ImportError(
          "Der Artikel ist zu groß (maximal 250.000 Textzeichen).",
        );
      return { title, sourceUrl: url, blocks };
    } finally {
      content.window.close();
    }
  } finally {
    dom.window.close();
  }
}
