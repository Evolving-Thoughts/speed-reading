import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import { fetchPublic, validateUrl } from "./network.mjs";
import { extractArticle, ImportError } from "./extract.mjs";
import { imageTokens } from "./tokens.mjs";
import { createFetchSlots } from "./fetch-slots.mjs";
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};
export function createApp({ fetcher = fetchPublic, serveDist = false } = {}) {
  const tokens = imageTokens();
  const slots = createFetchSlots();
  const rates = new Map();
  const json = (res, status, data) => {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(data));
  };
  return http.createServer(
    { requestTimeout: 10000, headersTimeout: 10000, keepAliveTimeout: 5000 },
    async (req, res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Referrer-Policy", "no-referrer");
      const controller = new AbortController();
      res.on("close", () => {
        if (!res.writableEnded) controller.abort();
      });
      try {
        const host = req.headers.host || "";
        const base = new URL(`http://${host}`);
        if (!["localhost", "127.0.0.1", "[::1]"].includes(base.hostname))
          throw new ImportError(
            "Dieser lokale Dienst akzeptiert diesen Host nicht.",
            403,
          );
        const url = new URL(req.url, base);
        if (url.pathname.startsWith("/api/")) {
          if (
            req.headers["sec-fetch-site"] === "cross-site" ||
            (req.headers.origin && req.headers.origin !== base.origin)
          )
            throw new ImportError(
              "Diese Anfrage stammt nicht von der lokalen App.",
              403,
            );
          if (req.method === "POST" && url.pathname === "/api/article") {
            if (
              !(req.headers["content-type"] || "").startsWith(
                "application/json",
              )
            )
              throw new ImportError("JSON-Anfrage erwartet.", 415);
            const key = req.socket.remoteAddress || "local";
            const now = Date.now();
            let rate = rates.get(key);
            if (!rate || now - rate.time > 60000) {
              rate = { time: now, count: 0 };
              rates.set(key, rate);
            }
            if (++rate.count > 12)
              throw new ImportError(
                "Bitte höchstens zwölf Artikel pro Minute importieren.",
                429,
              );
            req.setEncoding("utf8");
            let body = "";
            for await (const chunk of req) {
              body += chunk;
              if (Buffer.byteLength(body) > 12000)
                throw new ImportError("Der Link ist zu lang.", 413);
            }
            let data;
            try {
              data = JSON.parse(body);
            } catch {
              throw new ImportError("Ungültige Anfrage.", 400);
            }
            if (typeof data?.url !== "string")
              throw new ImportError("Bitte einen Link eingeben.", 400);
            const target = validateUrl(data.url.trim()).href;
            const release = slots.acquire();
            try {
              const response = await fetcher(target, "html", controller.signal);
              const doc = extractArticle(
                response.body.toString("utf8"),
                response.url,
              );
              doc.blocks = doc.blocks.map((b) =>
                b.type === "image" ? { ...b, src: tokens.url(b.src) } : b,
              );
              json(res, 200, doc);
            } finally {
              release();
            }
            return;
          }
          if (req.method === "GET" && url.pathname === "/api/image") {
            const target = tokens.read(url.searchParams.get("token"));
            const release = await slots.acquireImage(controller.signal);
            try {
              if (controller.signal.aborted) return;
              const image = await fetcher(target, "image", controller.signal);
              res.writeHead(200, {
                "Content-Type": image.type,
                "Cache-Control": "private, max-age=300",
                "Cross-Origin-Resource-Policy": "same-origin",
              });
              res.end(image.body);
            } finally {
              release();
            }
            return;
          }
          json(res, 404, { error: "Endpunkt nicht gefunden." });
          return;
        }
        if (!serveDist || !["GET", "HEAD"].includes(req.method)) {
          json(res, 404, { error: "Nicht gefunden." });
          return;
        }
        const root = resolve("dist");
        let relative;
        try {
          relative = decodeURIComponent(url.pathname);
        } catch {
          throw new ImportError("Ungültiger Pfad.", 400);
        }
        const path = resolve(
          root,
          "." + (relative === "/" ? "/index.html" : relative),
        );
        if (path !== root && !path.startsWith(root + sep))
          throw new ImportError("Nicht erlaubt.", 403);
        let body;
        try {
          body = await readFile(path);
        } catch {
          json(res, 404, { error: "Nicht gefunden." });
          return;
        }
        res.writeHead(200, {
          "Content-Type": mime[extname(path)] || "application/octet-stream",
          "Cache-Control": "no-cache",
          "Content-Security-Policy":
            "default-src 'self'; img-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
        });
        res.end(req.method === "HEAD" ? undefined : body);
      } catch (err) {
        if (!res.headersSent && !res.destroyed)
          json(res, err instanceof ImportError ? err.status : 502, {
            error:
              err instanceof ImportError
                ? err.message
                : "Der Import ist fehlgeschlagen. Bitte später erneut versuchen oder Text manuell einfügen.",
          });
        else res.destroy();
      }
    },
  );
}
