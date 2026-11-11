import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  test as base,
  chromium,
  expect,
  type BrowserContext,
  type Page,
} from "@playwright/test";

/**
 * Runs the built extension (npm run build:extension) in Chromium against
 * pages served from fixtures. Automation cannot click the toolbar button, so
 * the click event is dispatched in the service worker; the copy under test
 * gets host access in place of the per-click activeTab grant.
 */
const BUILT = "dist-extension";
const ORIGIN = "https://news.example";
const sentence =
  "Der Artikel erklärt ein Thema mit ausreichend Kontext und hilfreichen Beispielen. ";
const paragraph = `<p>${sentence.repeat(4)}</p>`;
const ARTICLE = `<!doctype html><html lang="de"><head><title>Fixture</title>
<style nonce="page">html{font-size:9px}body{min-height:3000px}*{font-family:fantasy!important;color:lime!important}div,dialog,button{display:none!important}</style></head>
<body><nav>Navigation Menü Start</nav>
<article><h1>Eine faire Gesellschaft</h1>
<p id="lead">Erster Absatz mit genau diesen Wörtern zum Lesen.</p>${paragraph}
<figure><img src="/photo.png" alt="Menschen am Tisch"><figcaption>Gemeinsame Entscheidungen</figcaption></figure>
${paragraph.repeat(12)}</article>
<script nonce="page">window.pageKeys=[];for(const t of ["keydown","keyup","click"])document.addEventListener(t,e=>window.pageKeys.push(t));</script>
</body></html>`;
// The reader must work where foreign styles, scripts and HTML strings are forbidden.
const STRICT_CSP =
  "default-src 'none'; img-src 'self'; style-src 'nonce-page'; script-src 'nonce-page'; require-trusted-types-for 'script'";

const test = base.extend<{
  context: BrowserContext;
  open: () => Promise<void>;
}>({
  context: async ({}, use, testInfo) => {
    if (!existsSync(`${BUILT}/manifest.json`))
      throw new Error("Run `npm run build:extension` before this test.");
    const dir = testInfo.outputPath("extension");
    cpSync(BUILT, dir, { recursive: true });
    const manifest = JSON.parse(readFileSync(`${dir}/manifest.json`, "utf8"));
    manifest.host_permissions = ["<all_urls>"];
    writeFileSync(`${dir}/manifest.json`, JSON.stringify(manifest));
    const context = await chromium.launchPersistentContext("", {
      ...(process.env.CHROMIUM_PATH
        ? { executablePath: process.env.CHROMIUM_PATH }
        : { channel: "chromium" }),
      headless: true,
      viewport: { width: 1280, height: 900 },
      args: [
        "--no-sandbox",
        `--disable-extensions-except=${dir}`,
        `--load-extension=${dir}`,
      ],
    });
    await context.route(`${ORIGIN}/**`, (route) => {
      const { pathname } = new URL(route.request().url());
      if (pathname === "/photo.png")
        return route.fulfill({
          contentType: "image/png",
          body: readFileSync("extension/public/icons/icon-128.png"),
        });
      if (pathname === "/empty")
        return route.fulfill({
          contentType: "text/html",
          body: "<title>Leer</title><nav>Menü</nav>",
        });
      return route.fulfill({
        contentType: "text/html; charset=utf-8",
        headers: { "Content-Security-Policy": STRICT_CSP },
        body: ARTICLE,
      });
    });
    // An idle service worker is stopped after 30 seconds and cannot be woken
    // from here; any extension API call keeps it running on a slow machine.
    const keepAwake = setInterval(() => {
      void context
        .serviceWorkers()[0]
        ?.evaluate(() => chrome.runtime.getPlatformInfo())
        .catch(() => {});
    }, 10_000);
    await use(context);
    clearInterval(keepAwake);
    await context.close();
  },
  open: async ({ context, page }, use) => {
    await use(async () => {
      await page.bringToFront();
      const worker =
        context.serviceWorkers()[0] ??
        (await context.waitForEvent("serviceworker"));
      await worker.evaluate(async () => {
        const [tab] = await chrome.tabs.query({
          active: true,
          lastFocusedWindow: true,
        });
        (
          chrome.action.onClicked as unknown as {
            dispatch: (tab: chrome.tabs.Tab) => void;
          }
        ).dispatch(tab);
      });
    });
  },
});
// Each test starts its own browser with the extension; side by side they starve each other.
test.describe.configure({ mode: "default", timeout: 90_000 });
test.skip(
  ({ isMobile }) => isMobile,
  "Browser extensions are a desktop feature.",
);

const word = (page: Page) => page.getByTestId("reader-word");
const status = (page: Page) =>
  page.getByRole("status", { name: "Wiedergabestatus" });
const host = (page: Page) => page.locator("#speed-reading-extension");

test("opens the page's article in the reader, isolated from page styles, shortcuts and CSP", async ({
  page,
  open,
}) => {
  await page.goto(`${ORIGIN}/artikel`);
  await page.evaluate(() => window.scrollTo(0, 400));
  expect(await page.evaluate(() => window.scrollY)).toBe(400);
  await open();
  await expect(word(page)).toHaveAttribute("aria-label", "Erster");
  await expect(status(page)).toHaveText("Pausiert");
  await expect(page.locator(".overlay-title")).toHaveText(
    "Eine faire Gesellschaft",
  );
  await expect(page.locator(".app-footer")).toContainText(
    "Artikel dieser Seite",
  );
  // Page rules (fantasy font, lime text, hidden buttons, 9px root) do not leak in.
  await expect(word(page)).toHaveCSS("font-family", /Georgia/);
  await expect(word(page).locator(".anchor")).toHaveCSS(
    "color",
    "rgb(250, 82, 108)",
  );
  await expect(word(page)).toHaveCSS("font-size", "88px");
  // The reader covers the whole viewport on top of the page.
  const box = await page.locator(".sr-dialog").boundingBox();
  expect(box).toEqual({ x: 0, y: 0, width: 1280, height: 900 });

  await page.keyboard.press("Space");
  await expect(status(page)).toHaveText("Läuft");
  await expect(word(page)).not.toHaveAttribute("aria-label", "Erster");
  await page.keyboard.press("Space");
  await expect(status(page)).toHaveText("Pausiert");
  await page.getByRole("button", { name: "Textansicht", exact: true }).click();
  await expect(page.locator(".normal-text")).not.toContainText("Navigation");
  expect(await page.evaluate(() => (window as any).pageKeys)).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(host(page)).toHaveCount(0);
  // The page is exactly as before: position, scrolling and content.
  expect(await page.evaluate(() => window.scrollY)).toBe(400);
  expect(
    await page.evaluate(() => document.documentElement.style.overflow),
  ).toBe("");
  await expect(page.locator("#lead")).toHaveText(
    "Erster Absatz mit genau diesen Wörtern zum Lesen.",
  );
});

test("pauses at the article's images with their caption and resumes from the text view", async ({
  page,
  open,
}) => {
  await page.goto(`${ORIGIN}/artikel`);
  await open();
  await page.getByRole("button", { name: "Textansicht", exact: true }).click();
  const image = page.getByRole("button", { name: /Menschen am Tisch/ });
  await image.click();
  await page.getByRole("button", { name: "Ab hier lesen" }).click();
  await expect(status(page)).toHaveText("Bildpause");
  const shown = page.locator(".reading-image img");
  await expect(shown).toHaveAttribute("alt", "Menschen am Tisch");
  await expect(shown).toBeVisible();
  expect(
    await shown.evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBe(128);
  await expect(page.locator(".image-caption")).toHaveText(
    "Gemeinsame Entscheidungen",
  );
  await page.getByRole("button", { name: "Weiterlesen" }).click();
  await expect(status(page)).toHaveText("Läuft");
});

test("reads only the marked text when there is a selection", async ({
  page,
  open,
}) => {
  await page.goto(`${ORIGIN}/artikel`);
  await page.evaluate(() =>
    getSelection()!.selectAllChildren(document.getElementById("lead")!),
  );
  await open();
  await expect(page.locator(".app-footer")).toContainText("Markierter Text");
  await expect(page.locator(".session-info")).toContainText("1 von 8");
});

test("toggles with a second click and remembers the reading settings", async ({
  page,
  open,
}) => {
  await page.goto(`${ORIGIN}/artikel`);
  await open();
  await page.getByLabel("Lesetempo").fill("600");
  await page.getByLabel("Schriftgröße").selectOption({ label: "Groß" });
  await open();
  await expect(host(page)).toHaveCount(0);
  await page.goto(`${ORIGIN}/anderer-artikel`);
  await open();
  await expect(page.getByLabel("Lesetempo")).toHaveValue("600");
  await expect(page.getByLabel("Schriftgröße")).toHaveValue("1.25");
  await page.getByRole("button", { name: "Schließen" }).click();
  await expect(host(page)).toHaveCount(0);
});

test("stays on top when the reader enters fullscreen", async ({
  page,
  open,
}) => {
  await page.goto(`${ORIGIN}/artikel`);
  await open();
  await page.getByRole("button", { name: "Vollbild starten" }).click();
  await expect(
    page.getByRole("button", { name: "Vollbild verlassen" }),
  ).toBeVisible();
  // Hit-testing proves the reader, not the fullscreen page, is in front.
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(status(page)).toHaveText("Läuft");
  await page.getByRole("button", { name: "Schließen" }).click();
  await expect(host(page)).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement === null))
    .toBe(true);
});

test("says so when the page has no text to read", async ({ page, open }) => {
  await page.goto(`${ORIGIN}/empty`);
  await open();
  await expect(page.getByRole("status")).toContainText(
    "kein Lesetext gefunden",
  );
  await expect(host(page)).toHaveCount(0);
});
