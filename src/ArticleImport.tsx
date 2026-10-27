import { useEffect, useRef, useState } from "react";
import { isArticle, type Article } from "./article";
import { ArticleImage } from "./ArticleImage";

/** The link import needs the local Node.js service; static builds (GitHub Pages) ship without it. */
export const articleImportAvailable =
  import.meta.env.VITE_ARTICLE_IMPORT !== "false";

export function ArticleImport({
  initialArticle,
  onRead,
}: {
  initialArticle: Article | null;
  onRead: (article: Article) => void;
}) {
  const [url, setUrl] = useState(initialArticle?.sourceUrl || "");
  const [preview, setPreview] = useState<Article | null>(initialArticle);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const cancel = () => {
    request.current?.abort();
    request.current = null;
    setLoading(false);
  };
  async function importArticle(e: React.FormEvent) {
    e.preventDefault();
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    setPreview(null);
    try {
      const response = await fetch("/api/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || "Artikel konnte nicht importiert werden.",
        );
      if (!isArticle(data))
        throw new Error("Der Import hat keinen lesbaren Artikel geliefert.");
      if (!controller.signal.aborted) setPreview(data as Article);
    } catch (err) {
      if (!controller.signal.aborted)
        setError(
          err instanceof Error
            ? err.message
            : "Import fehlgeschlagen. Bitte Text manuell einfügen.",
        );
    } finally {
      if (request.current === controller) {
        setLoading(false);
        request.current = null;
      }
    }
  }
  const imageCount =
    preview?.blocks.filter((b) => b.type === "image").length || 0;
  return (
    <section
      className="article-import"
      aria-label="Artikel per Link importieren"
    >
      <form onSubmit={(e) => void importArticle(e)}>
        <label htmlFor="article-url">Oder einen Artikellink importieren</label>
        <div className="import-row">
          <input
            id="article-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            required
            maxLength={8192}
            disabled={loading}
            autoComplete="off"
          />
          <button
            type="submit"
            className="button"
            disabled={loading || !url.trim()}
          >
            {loading ? "Wird geladen…" : "Artikel laden"}
          </button>
        </div>
        <p className="hint">
          Der lokale Importdienst ruft die Website ab. Freigabelinks bleiben
          erhalten. Manche Websites sperren automatische Abrufe.
        </p>
        {loading && (
          <button type="button" className="text-button" onClick={cancel}>
            Import abbrechen
          </button>
        )}
        {loading && <p role="status">Text und Bilder werden erkannt…</p>}
        {error && (
          <p className="import-error" role="alert">
            {error}
          </p>
        )}
      </form>
      {preview && (
        <div className="article-preview" aria-label="Artikelvorschau">
          <div className="eyebrow">ARTIKELVORSCHAU</div>
          <h2>{preview.title}</h2>
          <a href={preview.sourceUrl} target="_blank" rel="noreferrer">
            Quelle öffnen <span aria-hidden="true">↗</span>
          </a>
          <p className="hint">
            {imageCount} {imageCount === 1 ? "Bild" : "Bilder"} erkannt · Inhalt
            vor dem Lesen prüfen. Erkennung und Bildreihenfolge können je nach
            Website abweichen.
          </p>
          <div className="preview-content">
            {preview.blocks.map((b, i) =>
              b.type === "text" ? (
                <p key={i}>{b.text}</p>
              ) : (
                <ArticleImage key={i} image={b} />
              ),
            )}
          </div>
          <button
            type="button"
            className="button primary wide"
            onClick={() => onRead(preview)}
          >
            Artikel übernehmen
          </button>
        </div>
      )}
    </section>
  );
}
