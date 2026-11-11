import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { build } from "vite";

/**
 * Builds the browser extension into dist-extension/. Content script and
 * service worker are each one self-contained classic script: a content script
 * cannot import modules, and it is injected again on every use.
 */
const root = fileURLToPath(new URL("..", import.meta.url));
const outDir = "dist-extension";

const bundle = (entry, fileName, first) =>
  build({
    root,
    configFile: false,
    logLevel: "warn",
    plugins: [react()],
    publicDir: first ? "extension/public" : false,
    define: { "process.env.NODE_ENV": '"production"' },
    build: {
      outDir,
      emptyOutDir: first,
      target: "es2022",
      lib: {
        entry,
        formats: ["iife"],
        name: "SpeedReading",
        fileName: () => fileName,
      },
    },
  });

await bundle("extension/content.tsx", "content.js", true);
await bundle("extension/background.ts", "background.js", false);
console.log(`Extension built: ${outDir}/ (load it as an unpacked extension)`);
