import { it, expect } from "vitest";
import { isPublicAddress, resolvePublic, validateUrl } from "./network.mjs";
it("rejects non-public IP ranges, mapped addresses, credentials, non-http protocols and unusual ports", async () => {
  for (const ip of [
    "127.0.0.1",
    "0.0.0.0",
    "10.0.0.1",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "224.0.0.1",
    "::1",
    "::",
    "fc00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "2001:db8::1",
  ])
    expect(isPublicAddress(ip), ip).toBe(false);
  expect(isPublicAddress("1.1.1.1")).toBe(true);
  for (const u of [
    "file:///etc/passwd",
    "ftp://example.com/a",
    "https://user:password@example.com",
    "http://example.com:8080",
  ])
    expect(() => validateUrl(u)).toThrow();
  for (const u of [
    "http://127.1",
    "http://2130706433",
    "http://0x7f000001",
    "http://[::1]",
    "http://localhost",
    "http://metadata.internal",
  ])
    await expect(resolvePublic(u)).rejects.toThrow();
});
it("checks every DNS answer and retains the query while pinning a public address", async () => {
  await expect(
    resolvePublic("https://example.com", async () => [
      { address: "1.1.1.1", family: 4 },
      { address: "10.0.0.2", family: 4 },
    ]),
  ).rejects.toThrow();
  const r = await resolvePublic(
    "https://example.com/a?sk=example-access#fragment",
    async () => [{ address: "1.1.1.1", family: 4 }],
  );
  expect(r.address).toEqual({ address: "1.1.1.1", family: 4 });
  expect(r.url.href).toBe("https://example.com/a?sk=example-access");
});

import { vi, afterEach } from "vitest";
import dns from "node:dns/promises";
import https from "node:https";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { gzipSync } from "node:zlib";
import { fetchPublic } from "./network.mjs";
afterEach(() => vi.restoreAllMocks());
function upstream(responses) {
  vi.spyOn(dns, "lookup").mockResolvedValue([
    { address: "1.1.1.1", family: 4 },
  ]);
  return vi
    .spyOn(https, "request")
    .mockImplementation((_url, options, callback) => {
      const req = new EventEmitter();
      req.destroy = () => {};
      req.end = () =>
        queueMicrotask(() => {
          options.lookup("example.com", {}, (err, address, family) => {
            expect(err).toBeNull();
            expect(address).toBe("1.1.1.1");
            expect(family).toBe(4);
          });
          const value = responses.shift() || responses[0];
          const res = new PassThrough();
          res.statusCode = value.status || 200;
          res.headers = value.headers || { "content-type": "text/html" };
          callback(res);
          res.end(value.body || "");
        });
      return req;
    });
}
it("checks redirect destinations again rather than following a public URL into a private address", async () => {
  const request = upstream([
    { status: 302, headers: { location: "http://169.254.169.254/latest" } },
  ]);
  await expect(fetchPublic("https://example.com/article")).rejects.toThrow(
    "interne",
  );
  expect(request).toHaveBeenCalledTimes(1);
});
it("decodes bounded compressed HTML and rejects wrong MIME types and decompression bombs", async () => {
  upstream([
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "content-encoding": "gzip",
      },
      body: gzipSync("Ein Artikel über Wörter."),
    },
  ]);
  expect((await fetchPublic("https://example.com")).body.toString()).toBe(
    "Ein Artikel über Wörter.",
  );
  vi.restoreAllMocks();
  upstream([{ headers: { "content-type": "image/svg+xml" }, body: "<svg/>" }]);
  await expect(fetchPublic("https://example.com/x", "image")).rejects.toThrow(
    "Bildformat",
  );
  vi.restoreAllMocks();
  upstream([
    {
      headers: { "content-type": "text/html", "content-encoding": "gzip" },
      body: gzipSync("x".repeat(2 * 1024 * 1024 + 1)),
    },
  ]);
  await expect(fetchPublic("https://example.com")).rejects.toThrow("groß");
});
it("bounds redirect chains and respects cancellation before connecting", async () => {
  const request = upstream(
    Array.from({ length: 6 }, () => ({
      status: 302,
      headers: { location: "https://example.com/again" },
    })),
  );
  await expect(fetchPublic("https://example.com")).rejects.toThrow(
    "Weiterleitungen",
  );
  expect(request).toHaveBeenCalledTimes(6);
  await expect(
    fetchPublic("https://example.com", "html", AbortSignal.abort()),
  ).rejects.toThrow();
});
