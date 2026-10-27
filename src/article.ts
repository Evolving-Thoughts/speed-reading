import { tokenize, type Step } from "./reader";
export type ArticleImage = { src: string; alt: string; caption: string };
export type Article = {
  title: string;
  sourceUrl: string;
  blocks: (
    | { type: "text"; text: string }
    | ({ type: "image" } & ArticleImage)
  )[];
};
export function articleSteps(article: Article): Step[] {
  const steps: Step[] = [];
  for (const block of article.blocks) {
    if (block.type === "image") {
      const { src, alt, caption } = block;
      steps.push({ kind: "image", image: { src, alt, caption } });
      continue;
    }
    const words = tokenize(block.text);
    if (words.length && steps.length) words[0].leading = "\n\n";
    steps.push(...words);
  }
  return steps;
}
/** Treat the API response as data, not executable HTML or arbitrary image/source URLs. */
export function isArticle(value: unknown): value is Article {
  if (!value || typeof value !== "object") return false;
  const a = value as Article;
  if (
    typeof a.title !== "string" ||
    typeof a.sourceUrl !== "string" ||
    !Array.isArray(a.blocks) ||
    !a.blocks.length ||
    a.blocks.length > 3000
  )
    return false;
  try {
    const u = new URL(a.sourceUrl);
    if (!["http:", "https:"].includes(u.protocol) || u.username || u.password)
      return false;
  } catch {
    return false;
  }
  return a.blocks.every(
    (b) =>
      b &&
      typeof b === "object" &&
      (b.type === "text"
        ? typeof b.text === "string"
        : b.type === "image" &&
          typeof b.src === "string" &&
          /^\/api\/image\?token=[A-Za-z0-9_.-]+$/.test(b.src) &&
          typeof b.alt === "string" &&
          typeof b.caption === "string"),
  );
}
