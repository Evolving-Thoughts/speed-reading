import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import ipaddr from "ipaddr.js";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";
import { ImportError } from "./extract.mjs";

export function isPublicAddress(address) {
  try {
    let ip = ipaddr.parse(address);
    if (ip.kind() === "ipv6" && ip.isIPv4MappedAddress())
      ip = ip.toIPv4Address();
    return ip.range() === "unicast";
  } catch {
    return false;
  }
}
export function validateUrl(input) {
  let u;
  try {
    u = new URL(input);
  } catch {
    throw new ImportError("Bitte einen gültigen http(s)-Link eingeben.", 400);
  }
  if (
    !["https:", "http:"].includes(u.protocol) ||
    u.username ||
    u.password ||
    u.href.length > 8192 ||
    (u.port && !["80", "443"].includes(u.port))
  )
    throw new ImportError(
      "Nur öffentliche http(s)-Links ohne Zugangsdaten und mit Standardport sind erlaubt.",
      400,
    );
  u.hash = "";
  return u;
}
export async function resolvePublic(url, lookup = dns.lookup) {
  const u = validateUrl(url);
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  )
    throw new ImportError(
      "Lokale und interne Adressen sind nicht erlaubt.",
      400,
    );
  const addresses = ipaddr.isValid(host)
    ? [{ address: host, family: ipaddr.parse(host).kind() === "ipv4" ? 4 : 6 }]
    : await lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
    throw new ImportError(
      "Lokale und interne Adressen sind nicht erlaubt.",
      400,
    );
  return { url: u, address: addresses[0] };
}
const allowedImages = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);
/** Validate every redirect and pin a checked IP to the connection (no DNS rebinding). */
export async function fetchPublic(input, kind = "html", signal) {
  const budget = AbortSignal.timeout(15000);
  const combined = signal ? AbortSignal.any([signal, budget]) : budget;
  let url = input;
  for (let hop = 0; hop <= 5; hop++) {
    const target = await Promise.race([
      resolvePublic(url),
      new Promise((_, reject) => {
        if (combined.aborted)
          reject(
            new ImportError("Abruf abgebrochen oder Zeitlimit erreicht.", 504),
          );
        else
          combined.addEventListener(
            "abort",
            () =>
              reject(
                new ImportError(
                  "Abruf abgebrochen oder Zeitlimit erreicht.",
                  504,
                ),
              ),
            { once: true },
          );
      }),
    ]);
    const result = await new Promise((resolve, reject) => {
      const transport = target.url.protocol === "https:" ? https : http;
      const req = transport.request(
        target.url,
        {
          method: "GET",
          signal: combined,
          agent: false,
          headers: {
            "User-Agent": "SpeedReading/0.2 (article reader)",
            Accept:
              kind === "html"
                ? "text/html,application/xhtml+xml"
                : "image/avif,image/webp,image/png,image/jpeg,image/gif",
            "Accept-Encoding": "gzip, deflate, br",
          },
          lookup: (_host, options, done) => {
            const a = target.address;
            done(null, options.all ? [a] : a.address, a.family);
          },
        },
        (res) => {
          const status = res.statusCode || 500;
          if ([301, 302, 303, 307, 308].includes(status)) {
            res.destroy();
            if (!res.headers.location) {
              reject(new ImportError("Ungültige Weiterleitung."));
              return;
            }
            try {
              resolve({
                redirect: new URL(res.headers.location, target.url).href,
              });
            } catch {
              reject(new ImportError("Ungültige Weiterleitung."));
            }
            return;
          }
          if (status < 200 || status >= 300) {
            res.destroy();
            reject(
              new ImportError(
                status === 401 || status === 403
                  ? "Die Website verweigert den automatischen Abruf. Auch Freigabelinks können für automatische Abrufe gesperrt sein. Bitte Text manuell einfügen."
                  : `Die Website antwortet mit HTTP ${status}. Bitte Text manuell einfügen.`,
                422,
              ),
            );
            return;
          }
          const type = (res.headers["content-type"] || "")
            .split(";")[0]
            .trim()
            .toLowerCase();
          if (
            kind === "html"
              ? !["text/html", "application/xhtml+xml"].includes(type)
              : !allowedImages.has(type)
          ) {
            res.destroy();
            reject(
              new ImportError(
                kind === "html"
                  ? "Der Link liefert keine HTML-Artikelseite."
                  : "Dieses Bildformat wird nicht unterstützt.",
              ),
            );
            return;
          }
          const max = kind === "html" ? 2 * 1024 * 1024 : 8 * 1024 * 1024;
          const encoding = (
            res.headers["content-encoding"] || "identity"
          ).toLowerCase();
          const decoder =
            encoding === "gzip"
              ? createGunzip()
              : encoding === "br"
                ? createBrotliDecompress()
                : encoding === "deflate"
                  ? createInflate()
                  : null;
          if (!decoder && encoding !== "identity") {
            res.destroy();
            reject(new ImportError("Nicht unterstützte Komprimierung."));
            return;
          }
          let wire = 0,
            total = 0;
          const chunks = [];
          const fail = (err) => {
            req.destroy();
            res.destroy();
            decoder?.destroy();
            reject(
              err instanceof ImportError
                ? err
                : new ImportError(
                    "Die Website konnte nicht vollständig geladen werden.",
                  ),
            );
          };
          res.on("data", (c) => {
            wire += c.length;
            if (wire > max)
              fail(new ImportError("Die Antwort der Website ist zu groß."));
          });
          res.on("error", fail);
          res.on("aborted", () =>
            fail(new ImportError("Der Abruf wurde unterbrochen.")),
          );
          const stream = decoder ? res.pipe(decoder) : res;
          stream.on("error", fail);
          stream.on("data", (c) => {
            total += c.length;
            if (total > max)
              fail(new ImportError("Die entpackte Antwort ist zu groß."));
            else chunks.push(c);
          });
          stream.on("end", () =>
            resolve({
              body: Buffer.concat(chunks),
              type,
              url: target.url.href,
            }),
          );
        },
      );
      req.on("error", () =>
        reject(
          new ImportError(
            "Die Website ist nicht erreichbar oder der Abruf hat zu lange gedauert.",
            504,
          ),
        ),
      );
      req.end();
    });
    if (!result.redirect) return result;
    url = result.redirect;
  }
  throw new ImportError("Zu viele Weiterleitungen.");
}
