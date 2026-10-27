import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { ImportError } from "./extract.mjs";
export function imageTokens(secret = randomBytes(32), now = Date.now) {
  const sign = (value) =>
    createHmac("sha256", secret).update(value).digest("base64url");
  return {
    url(src) {
      const data = Buffer.from(
        JSON.stringify({ url: src, expires: now() + 60 * 60 * 1000 }),
      ).toString("base64url");
      return `/api/image?token=${data}.${sign(data)}`;
    },
    read(token) {
      if (typeof token !== "string" || token.length > 15000)
        throw new ImportError("Ungültiger Bildlink.", 400);
      const [data, signature, ...rest] = token.split(".");
      const expected = sign(data || "");
      if (
        rest.length ||
        !signature ||
        !/^[A-Za-z0-9_-]{43}$/.test(signature) ||
        signature.length !== expected.length ||
        !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
      )
        throw new ImportError("Ungültiger Bildlink.", 400);
      let value;
      try {
        value = JSON.parse(Buffer.from(data, "base64url").toString());
      } catch {
        throw new ImportError("Ungültiger Bildlink.", 400);
      }
      if (
        typeof value.url !== "string" ||
        !Number.isFinite(value.expires) ||
        value.expires < now()
      )
        throw new ImportError(
          "Der Bildlink ist abgelaufen. Bitte den Artikel erneut importieren.",
          410,
        );
      return value.url;
    },
  };
}
