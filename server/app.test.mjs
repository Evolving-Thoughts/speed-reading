import { afterEach, it, expect, vi } from "vitest";
import { createApp } from "./app.mjs";
import { imageTokens } from "./tokens.mjs";
import { ImportError } from "./extract.mjs";
const servers = [];
afterEach(async () => {
  for (const s of servers.splice(0)) await new Promise((r) => s.close(r));
});
async function start(options) {
  const s = createApp(options);
  servers.push(s);
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  return `http://127.0.0.1:${s.address().port}`;
}
const paragraph =
  "<p>Eine ausführliche Darstellung erklärt das Verhältnis zwischen Wohlstand und Gesellschaft. Hier stehen konkrete Beispiele und Überlegungen zur Verteilung. Der Artikel kann ohne weitere Anmeldung gelesen werden und enthält eine Abbildung zwischen zwei Absätzen.</p>";
const html = `<html><title>Beispiel</title><body><article><h1>Beispiel</h1>${paragraph}<figure><img src="/photo.png" alt="Foto"><figcaption>Eine Bildunterschrift</figcaption></figure>${paragraph}</article></body></html>`;
const post = (base, url, headers = {}) =>
  fetch(base + "/api/article", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ url }),
  });
it("imports ordered text and signed images; the image endpoint fetches only an authenticated URL", async () => {
  const seen = [];
  const base = await start({
    fetcher: async (url, kind) => {
      seen.push([url, kind]);
      return kind === "html"
        ? { body: Buffer.from(html), url, type: "text/html" }
        : { body: Buffer.from([1, 2, 3]), url, type: "image/png" };
    },
  });
  const response = await post(
    base,
    "https://example.com/article?sk=test-access",
  );
  expect(response.status).toBe(200);
  const doc = await response.json();
  expect(doc.blocks.map((b) => b.type)).toEqual(["text", "image", "text"]);
  expect(doc.sourceUrl).toBe("https://example.com/article?sk=test-access");
  expect(doc.blocks[1].src).toMatch(/^\/api\/image\?token=/);
  const image = await fetch(base + doc.blocks[1].src);
  expect(image.status).toBe(200);
  expect(image.headers.get("content-type")).toBe("image/png");
  expect([...new Uint8Array(await image.arrayBuffer())]).toEqual([1, 2, 3]);
  expect(seen).toEqual([
    ["https://example.com/article?sk=test-access", "html"],
    ["https://example.com/photo.png", "image"],
  ]);
  const invalid = await fetch(base + "/api/image?token=invalid");
  expect(invalid.status).toBe(400);
  expect(seen).toHaveLength(2);
});
it("blocks local/private targets through the real fetch boundary before making a request", async () => {
  const base = await start();
  for (const url of [
    "http://127.0.0.1/secret",
    "http://[::1]/secret",
    "http://169.254.169.254/latest",
  ])
    expect((await post(base, url)).status).toBe(400);
});
it("rejects cross-site requests, invalid content and excessive body sizes", async () => {
  const base = await start();
  expect(
    (
      await post(base, "https://example.com", {
        Origin: "https://evil.example",
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await fetch(base + "/api/article", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "x",
      })
    ).status,
  ).toBe(415);
  expect(
    (
      await fetch(base + "/api/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await fetch(base + "/api/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "x".repeat(13000),
      })
    ).status,
  ).toBe(413);
});
it("returns a helpful blocked-site error without echoing access query strings", async () => {
  const base = await start({
    fetcher: async () => {
      throw new ImportError(
        "Die Website verweigert den automatischen Abruf.",
        422,
      );
    },
  });
  const r = await post(base, "https://example.com?sk=private-test");
  expect(r.status).toBe(422);
  const text = await r.text();
  expect(text).toContain("verweigert");
  expect(text).not.toContain("private-test");
});
it("rejects tampered, non-ASCII and expired image tokens", () => {
  let now = 1000;
  const tokens = imageTokens(Buffer.alloc(32, 7), () => now);
  const token = new URL(
    tokens.url("https://example.com/photo.jpg"),
    "https://local.test",
  ).searchParams.get("token");
  expect(tokens.read(token)).toBe("https://example.com/photo.jpg");
  expect(() => tokens.read(token + "x")).toThrow();
  expect(() =>
    tokens.read(token.split(".")[0] + "." + "ä".repeat(43)),
  ).toThrow();
  now += 3600001;
  expect(() => tokens.read(token)).toThrow("abgelaufen");
});
it("enforces the concurrent fetch cap after asynchronous request-body parsing", async () => {
  let release;
  const gate = new Promise((r) => {
    release = r;
  });
  let count = 0;
  const base = await start({
    fetcher: async (url) => {
      count++;
      await gate;
      return { body: Buffer.from(html), type: "text/html", url };
    },
  });
  const first = Array.from({ length: 4 }, () =>
    post(base, "https://example.com"),
  );
  try {
    await vi.waitFor(() => expect(count).toBe(4));
    const fifth = post(base, "https://example.com");
    await new Promise((r) => setTimeout(r, 40));
    release();
    const response = await fifth;
    expect(response.status).toBe(429);
    expect(count).toBe(4);
  } finally {
    release();
    await Promise.all(first);
  }
});
