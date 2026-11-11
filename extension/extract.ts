import { Readability } from "@mozilla/readability";
import type { Article } from "../src/article";
import { countWords } from "../src/reader";

/**
 * Turns the page the user is looking at into the app's article model, without
 * any network request: the DOM is already rendered, signed in and scripted.
 * Mirrors `server/extract.mjs`, which does the same for a fetched HTML string.
 */
export type Extraction =
  | { ok: true; article: Article; source: "selection" | "article" | "page" }
  | { ok: false; reason: "empty" | "too-long" };

type Block = Article["blocks"][number];

export const LIMITS = {
  chars: 250_000,
  blocks: 3000,
  images: 50,
  /** A shorter selection is treated as accidental and the whole article is read. */
  selectionWords: 5,
  /** Below this, Readability's pick is distrusted and the visible page text is used. */
  articleChars: 140,
  /** The page's own <article> wins once it holds this many times Readability's text. */
  containerFactor: 1.4,
} as const;

const BLOCK_TAGS = new Set(
  (
    "ADDRESS ARTICLE ASIDE BLOCKQUOTE BR DD DETAILS DIV DL DT FIGURE FOOTER " +
    "H1 H2 H3 H4 H5 H6 HEADER HR LI MAIN OL P PRE SECTION SUMMARY TABLE TR UL"
  ).split(" "),
);
/** Never reading text, wherever it appears. */
const NON_TEXT_TAGS = new Set(
  (
    "SCRIPT STYLE NOSCRIPT TEMPLATE IFRAME VIDEO AUDIO CANVAS OBJECT EMBED " +
    "SVG MATH FORM BUTTON INPUT SELECT TEXTAREA DIALOG FIGCAPTION"
  ).split(" "),
);
/** Elements that hold running text, as opposed to bylines, labels and timestamps. */
const PROSE_TAGS = new Set(
  "P LI BLOCKQUOTE PRE H1 H2 H3 H4 H5 H6 DD DT TD TH".split(" "),
);
/** Page furniture around the text; a deliberate selection may still include it. */
const CHROME_TAGS = new Set(["NAV", "ASIDE", "FOOTER"]);
const CHROME_ROLES = new Set([
  "navigation",
  "banner",
  "contentinfo",
  "complementary",
  "search",
  "dialog",
  "alertdialog",
  "menu",
  "menubar",
  "toolbar",
]);

const ARTICLE_SELECTOR = "article,[role=article]";
const normalize = (text: string) =>
  text.replace(/[\t\r\n \u00a0]+/g, " ").trim();

const LAZY_ATTRIBUTES = ["data-src", "data-original", "data-lazy-src"];
const SRCSET_ATTRIBUTES = ["data-srcset", "data-lazy-srcset", "srcset"];

/** Image addresses the page itself could display; never scripts or other schemes. */
export function imageUrl(
  value: string | null | undefined,
  base: string,
): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  if (/^data:image\/(png|jpe?g|gif|webp|avif);/i.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed, base);
    if (url.protocol === "blob:") return url.href;
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

/** Prefers a candidate around one reader width; huge originals only slow the image pause. */
function srcsetCandidate(srcset: string): string {
  const candidates = srcset
    // Only a comma followed by whitespace separates candidates; URLs may contain commas.
    .split(/,\s+/)
    .map((entry) => entry.trim().split(/\s+/))
    .filter(([url]) => url)
    .map(([url, descriptor = ""]) => ({
      url,
      width: descriptor.endsWith("w") ? parseInt(descriptor, 10) : NaN,
    }));
  if (!candidates.length) return "";
  const sized = candidates
    .filter((c) => Number.isFinite(c.width))
    .sort((a, b) => a.width - b.width);
  if (!sized.length) return candidates[candidates.length - 1].url;
  return (sized.find((c) => c.width >= 1000) ?? sized[sized.length - 1]).url;
}

/** The address written into the markup, including common lazy-loading attributes. */
function markupImageSource(img: Element, base: string): string | null {
  const firstAttribute = (names: string[], element: Element | null = img) => {
    for (const name of names) {
      const value = element?.getAttribute(name);
      if (value?.trim()) return value;
    }
    return "";
  };
  const picture = img.closest("picture");
  const srcset =
    firstAttribute(SRCSET_ATTRIBUTES) ||
    firstAttribute(
      SRCSET_ATTRIBUTES,
      picture?.querySelector("source[srcset],source[data-srcset]") ?? null,
    );
  return (
    imageUrl(firstAttribute(LAZY_ATTRIBUTES), base) ||
    imageUrl(srcsetCandidate(srcset), base) ||
    imageUrl(img.getAttribute("src"), base)
  );
}

const isDecorative = (width: number, height: number) =>
  width < 100 || height < 50;

/**
 * What the browser actually shows wins: it already resolved `srcset`, `picture`
 * and script-driven lazy loading. Markup is the fallback for images that have
 * not loaded yet; icons, avatars and tracking pixels are dropped.
 */
function liveImageSource(img: HTMLImageElement, base: string): string | null {
  const shown = img.complete && img.naturalWidth > 0 ? img.currentSrc : "";
  const placeholder =
    !shown || isDecorative(img.naturalWidth, img.naturalHeight);
  if (!placeholder) return imageUrl(shown, base);
  const fromMarkup = markupImageSource(img, base);
  if (!fromMarkup) return null;
  // A small image with no other source behind it is decoration, not a placeholder.
  if (shown && imageUrl(shown, base) === fromMarkup) return null;
  return fromMarkup;
}

type CollectOptions = {
  base: string;
  /** Headings repeating the title are skipped; it is shown above the reader. */
  title?: string;
  /** Skip navigation, sidebars and footers (not wanted for a deliberate selection). */
  skipChrome: boolean;
  /** The nodes are rendered, so hidden and pinned elements can be recognised. */
  live: boolean;
  /** Images were already resolved by `prepareImages`; trust their `src`. */
  preparedImages: boolean;
  /**
   * Read the element as the article the page says it is: only running text
   * counts, and articles nested inside it are comments or teasers.
   */
  articleElement?: boolean;
};

function isHiddenOrPinned(element: Element): boolean {
  if (element.hasAttribute("hidden")) return true;
  if (element.getAttribute("aria-hidden") === "true") return true;
  const view = element.ownerDocument.defaultView;
  const visible = (
    element as Element & { checkVisibility?: (options?: object) => boolean }
  ).checkVisibility?.({ visibilityProperty: true });
  if (visible === false) return true;
  // Cookie banners, sticky headers and chat widgets float above the text.
  const position = view?.getComputedStyle(element).position;
  return position === "fixed" || position === "sticky";
}

function collectBlocks(roots: Iterable<Node>, options: CollectOptions) {
  const blocks: Block[] = [];
  let pending = "";
  let chars = 0;
  let images = 0;
  let prose = 0;
  const flush = () => {
    const text = normalize(pending);
    pending = "";
    if (!text) return;
    chars += text.length;
    blocks.push({ type: "text", text });
  };
  const addImage = (img: Element) => {
    const src = options.preparedImages
      ? imageUrl(img.getAttribute("src"), options.base)
      : options.live
        ? liveImageSource(img as HTMLImageElement, options.base)
        : markupImageSource(img, options.base);
    const width = Number(img.getAttribute("width"));
    const height = Number(img.getAttribute("height"));
    if (!src || images >= LIMITS.images) return;
    if ((width > 0 && width <= 2) || (height > 0 && height <= 2)) return;
    flush();
    images += 1;
    blocks.push({
      type: "image",
      src,
      alt: (img.getAttribute("alt") || "Artikelbild").slice(0, 1000),
      caption: (
        img.closest("figure")?.querySelector("figcaption")?.textContent || ""
      )
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 2000),
    });
  };
  const visit = (node: Node) => {
    if (node.nodeType === 3) {
      if (prose || !options.articleElement) pending += node.textContent ?? "";
      return;
    }
    if (node.nodeType === 11) {
      node.childNodes.forEach(visit);
      return;
    }
    if (node.nodeType !== 1) return;
    const element = node as Element;
    const tag = element.tagName.toUpperCase();
    if (NON_TEXT_TAGS.has(tag)) return;
    if (options.skipChrome) {
      if (CHROME_TAGS.has(tag)) return;
      if (CHROME_ROLES.has(element.getAttribute("role") ?? "")) return;
    }
    if (options.live && isHiddenOrPinned(element)) return;
    if (options.articleElement && element.matches(ARTICLE_SELECTOR)) return;
    if (
      options.title &&
      /^H[1-6]$/.test(tag) &&
      element.textContent?.trim() === options.title
    )
      return;
    if (tag === "IMG") {
      addImage(element);
      return;
    }
    const block = BLOCK_TAGS.has(tag);
    const isProse = PROSE_TAGS.has(tag);
    if (block) flush();
    if (isProse) prose += 1;
    element.childNodes.forEach(visit);
    if (isProse) prose -= 1;
    if (block) flush();
  };
  for (const root of roots) visit(root);
  flush();
  return { blocks, chars };
}

/**
 * Carries what the live page knows about its images over to the detached copy
 * Readability works on, so its own lazy-image guessing has nothing left to do.
 */
function prepareImages(live: Document, copy: Document, base: string) {
  const liveImages = live.querySelectorAll("img");
  copy.querySelectorAll("img").forEach((img, index) => {
    const source = liveImages[index];
    const src = source
      ? liveImageSource(source, base)
      : markupImageSource(img, base);
    if (!src) {
      img.remove();
      return;
    }
    for (const name of [...LAZY_ATTRIBUTES, ...SRCSET_ATTRIBUTES, "class"])
      img.removeAttribute(name);
    img.setAttribute("src", src);
  });
}

function fromSelection(doc: Document, base: string) {
  const selection = doc.getSelection?.();
  if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
  const text = selection.toString();
  if (countWords(text) < LIMITS.selectionWords) return null;
  const fragments: Node[] = [];
  for (let i = 0; i < selection.rangeCount; i += 1)
    fragments.push(selection.getRangeAt(i).cloneContents());
  const collected = collectBlocks(fragments, {
    base,
    skipChrome: false,
    live: false,
    preparedImages: false,
  });
  if (collected.chars) return collected;
  // Selections inside form fields have text but no DOM range contents.
  const parts = text
    .split(/\n\s*\n/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const blocks: Block[] = parts.map((part) => ({ type: "text", text: part }));
  return { blocks, chars: parts.reduce((n, part) => n + part.length, 0) };
}

function fromReadability(doc: Document, base: string, ignore: string) {
  try {
    const copy = doc.cloneNode(true) as Document;
    if (ignore) copy.querySelectorAll(ignore).forEach((el) => el.remove());
    prepareImages(doc, copy, base);
    const pageTitle = copy.querySelector("article h1")?.textContent?.trim();
    const parsed = new Readability<Node>(copy, {
      charThreshold: 100,
      keepClasses: false,
      serializer: (node) => node,
    }).parse();
    if (!parsed?.content) return null;
    const title = (pageTitle || parsed.title || "").slice(0, 500);
    const collected = collectBlocks([parsed.content], {
      base,
      title,
      skipChrome: true,
      live: false,
      preparedImages: true,
    });
    return { ...collected, title };
  } catch {
    // Readability gives up on unusual or very large documents; the page text remains.
    return null;
  }
}

/**
 * Readability scores one container and can miss half of an article that the
 * page splits into sibling sections (around an ad, for example). When the page
 * marks the article itself and Readability's text lies inside that element, the
 * element's visible running text is the more complete reading.
 */
function fromArticleElement(
  doc: Document,
  base: string,
  found: { blocks: Block[]; chars: number; title: string },
) {
  const textBlocks = found.blocks.flatMap((b) =>
    b.type === "text" ? [b.text] : [],
  );
  if (!textBlocks.length) return null;
  const first = textBlocks[0].slice(0, 60);
  const last = textBlocks[textBlocks.length - 1].slice(-60);
  const container = [...doc.querySelectorAll<HTMLElement>(ARTICLE_SELECTOR)]
    .map((element) => ({ element, text: normalize(element.textContent ?? "") }))
    .filter(({ text }) => text.includes(first) && text.includes(last))
    .sort((a, b) => a.text.length - b.text.length)[0];
  if (!container) return null;
  const collected = collectBlocks(container.element.childNodes, {
    base,
    title: found.title,
    skipChrome: true,
    live: true,
    preparedImages: false,
    articleElement: true,
  });
  return collected.chars >= found.chars * LIMITS.containerFactor
    ? { ...collected, title: found.title }
    : null;
}

function fromVisiblePage(doc: Document, base: string, ignore: string) {
  const candidates = [
    ...doc.querySelectorAll<HTMLElement>("main,[role=main],article"),
  ];
  const root =
    candidates.sort(
      (a, b) => (b.textContent?.length ?? 0) - (a.textContent?.length ?? 0),
    )[0] ?? doc.body;
  if (!root) return null;
  const ignored = ignore ? new Set(doc.querySelectorAll(ignore)) : new Set();
  const roots = [...root.childNodes].filter((node) => !ignored.has(node));
  return collectBlocks(roots, {
    base,
    skipChrome: true,
    live: true,
    preparedImages: false,
  });
}

export function extractArticle(
  doc: Document,
  { ignore = "" }: { ignore?: string } = {},
): Extraction {
  const base = doc.baseURI || doc.URL;
  const sourceUrl = doc.URL;
  const fallbackTitle = (doc.title || "").trim().slice(0, 500);
  const finish = (
    source: "selection" | "article" | "page",
    result: { blocks: Block[]; chars: number; title?: string },
  ): Extraction => {
    if (result.chars > LIMITS.chars || result.blocks.length > LIMITS.blocks)
      return { ok: false, reason: "too-long" };
    return {
      ok: true,
      source,
      article: {
        title: result.title || fallbackTitle,
        sourceUrl,
        blocks: result.blocks,
      },
    };
  };

  const selection = fromSelection(doc, base);
  if (selection?.chars) return finish("selection", selection);

  const article = fromReadability(doc, base, ignore);
  if (article && article.chars >= LIMITS.articleChars)
    return finish("article", fromArticleElement(doc, base, article) ?? article);

  // Too little for an article: what is visibly on the page is the better guess.
  const page = fromVisiblePage(doc, base, ignore);
  if (page?.chars) return finish("page", page);
  if (article?.chars) return finish("article", article);
  return { ok: false, reason: "empty" };
}
