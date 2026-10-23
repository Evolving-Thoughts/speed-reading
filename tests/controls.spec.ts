import { test, expect, type Page } from "@playwright/test";
const numeric = (page: Page) =>
  page.getByRole("spinbutton", { name: "Tempo in Wörtern pro Minute" });
async function load(page: Page, text = "Hallo Welt! Noch ein Satz.") {
  await page.goto("/");
  await page.getByLabel("Was möchtest du lesen?").fill(text);
  await page.getByRole("button", { name: "Zur Leseansicht" }).click();
}
async function freeze(page: Page) {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
}
test("numeric tempo accepts exact values without starting the form and clamps on commit", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Was möchtest du lesen?").fill("Hallo Welt!");
  await numeric(page).fill("375");
  await numeric(page).press("Enter");
  await expect(page.getByLabel("Was möchtest du lesen?")).toBeVisible();
  await expect(page.getByLabel("Lesetempo")).toHaveValue("375");
  await numeric(page).fill("1300");
  await numeric(page).blur();
  await expect(numeric(page)).toHaveValue("1200");
  await numeric(page).fill("50");
  await numeric(page).blur();
  await expect(numeric(page)).toHaveValue("100");
  await numeric(page).fill("");
  await numeric(page).blur();
  await expect(numeric(page)).toHaveValue("100");
  await page.getByLabel("Lesetempo").fill("423");
  await expect(numeric(page)).toHaveValue("423");
});
test("font size affects reader and normal text; preferences survive new texts but not reload", async ({
  page,
}) => {
  await load(page, "Hallo Welt!");
  const word = page.getByTestId("reader-word");
  const before = await word.evaluate((el) =>
    parseFloat(getComputedStyle(el).fontSize),
  );
  await page.getByLabel("Schriftgröße").selectOption("1.5");
  await expect
    .poll(() =>
      word.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    )
    .toBeGreaterThan(before);
  await page.getByLabel("Satzendpause").selectOption("2");
  await page.getByRole("button", { name: "Textansicht", exact: true }).click();
  const size = await page
    .locator(".normal-text")
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThanOrEqual(30);
  await page.getByRole("button", { name: "Text beenden" }).click();
  await expect(page.getByLabel("Schriftgröße")).toHaveValue("1.5");
  await expect(page.getByLabel("Satzendpause")).toHaveValue("2");
  await page.getByRole("button", { name: "Zur Leseansicht" }).click();
  await expect(page.getByLabel("Schriftgröße")).toHaveValue("1.5");
  await expect(page.getByLabel("Satzendpause")).toHaveValue("2");
  await page.reload();
  await expect(page.getByLabel("Schriftgröße")).toHaveValue("1");
  await expect(page.getByLabel("Satzendpause")).toHaveValue("3");
});
for (const factor of [1, 2, 4]) {
  test(`sentence-end factor ${factor} controls actual playback duration`, async ({
    page,
  }) => {
    await load(page, "Hallo Ende!");
    await page.getByLabel("Satzendpause").selectOption(String(factor));
    await freeze(page);
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await page.clock.runFor(200);
    await expect(page.getByTestId("reader-word")).toHaveAttribute(
      "aria-label",
      "Ende!",
    );
    await page.clock.runFor(200 * factor - 10);
    await expect(
      page.getByRole("status", { name: "Wiedergabestatus" }),
    ).toHaveText("Läuft");
    await page.clock.runFor(20);
    await expect(
      page.getByRole("status", { name: "Wiedergabestatus" }),
    ).toHaveText("Text beendet");
  });
}
test("changing sentence-end pause while playing resets current word to the new duration", async ({
  page,
}) => {
  await load(page, "Ende!");
  await freeze(page);
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.clock.runFor(100);
  await page.getByLabel("Satzendpause").selectOption("1");
  await page.clock.runFor(190);
  await expect(
    page.getByRole("status", { name: "Wiedergabestatus" }),
  ).toHaveText("Läuft");
  await page.clock.runFor(20);
  await expect(
    page.getByRole("status", { name: "Wiedergabestatus" }),
  ).toHaveText("Text beendet");
});
test("fullscreen enters and exits without losing the text or reading position", async ({
  page,
}) => {
  await load(page);
  const enter = page.getByRole("button", { name: "Vollbild starten" });
  await expect(enter).toBeEnabled();
  await enter.click();
  await expect(
    page.getByRole("button", { name: "Vollbild verlassen" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(true);
  await expect(
    page.getByRole("button", { name: "Text beenden" }),
  ).toBeInViewport();
  // Simulates browser/Escape exit: state must follow the browser, not a local toggle.
  await page.evaluate(() => document.exitFullscreen());
  await expect(
    page.getByRole("button", { name: "Vollbild starten" }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("reader-word")).toHaveAttribute(
    "aria-label",
    "Hallo",
  );
  await page.getByRole("button", { name: "Vollbild starten" }).click();
  await page.getByRole("button", { name: "Text beenden" }).click();
  await expect(page.getByLabel("Was möchtest du lesen?")).toHaveValue(
    "Hallo Welt! Noch ein Satz.",
  );
  await page.getByRole("button", { name: "Vollbild verlassen" }).click();
  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(false);
});
test("unsupported fullscreen explains the limitation and leaves reading usable", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(Document.prototype, "fullscreenEnabled", {
      configurable: true,
      get: () => false,
    }),
  );
  await load(page);
  await expect(
    page.getByRole("button", { name: "Vollbild starten" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("status", { name: "Vollbildhinweis" }),
  ).toContainText("nicht unterstützt");
  await expect(
    page.getByRole("button", { name: "Text beenden" }),
  ).toBeInViewport();
  await page.getByRole("button", { name: "Textansicht", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Ab hier lesen" }),
  ).toBeVisible();
});
test("a rejected fullscreen request shows a recoverable message", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    Object.defineProperty(Document.prototype, "fullscreenEnabled", {
      configurable: true,
      get: () => true,
    });
    Element.prototype.requestFullscreen = () =>
      Promise.reject(new Error("Denied for test"));
  });
  await load(page);
  await page.getByRole("button", { name: "Vollbild starten" }).click();
  await expect(
    page.getByRole("status", { name: "Vollbildhinweis" }),
  ).toContainText("Du kannst normal weiterlesen");
  await expect(page.getByTestId("reader-word")).toHaveAttribute(
    "aria-label",
    "Hallo",
  );
  await expect(
    page.getByRole("button", { name: "Vollbild starten" }),
  ).toBeEnabled();
  expect(errors).toEqual([]);
});
test("entering the reader from a scrolled input or text view reveals the full reading area", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Was möchtest du lesen?").fill("Hallo Welt!");
  await page
    .getByRole("button", { name: "Zur Leseansicht" })
    .scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Zur Leseansicht" }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.getByRole("button", { name: "Textansicht", exact: true }).click();
  await page.getByRole("button", { name: "Ab hier lesen" }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});
test("large font still fits long words around the fixed anchor", async ({
  page,
}) => {
  await load(page, "Donaudampfschifffahrtsgesellschaftskapitän");
  await page.getByLabel("Schriftgröße").selectOption("1.5");
  const bounds = await page.getByTestId("reader-word").evaluate((el) => {
    const box = el.closest(".word-viewport")!.getBoundingClientRect();
    const a = el.querySelector(".anchor")!.getBoundingClientRect();
    return {
      left: el.querySelector(".before")!.getBoundingClientRect().left,
      right: el.querySelector(".after")!.getBoundingClientRect().right,
      min: box.left,
      max: box.right,
      anchor: (a.left + a.right) / 2,
      target: box.left + box.width * 0.38,
    };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(bounds.min + 19);
  expect(bounds.right).toBeLessThanOrEqual(bounds.max - 19);
  expect(Math.abs(bounds.anchor - bounds.target)).toBeLessThan(2);
});
test("numeric tempo changes while playing take effect without the font resetting the timer", async ({
  page,
}) => {
  await load(page, "Hallo Welt");
  await freeze(page);
  await numeric(page).fill("600");
  await numeric(page).press("Enter");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.clock.runFor(50);
  await page.getByLabel("Schriftgröße").selectOption("1.25");
  await page.clock.runFor(60);
  await expect(page.getByTestId("reader-word")).toHaveAttribute(
    "aria-label",
    "Welt",
  );
  await numeric(page).fill("100");
  await numeric(page).press("Enter");
  await page.clock.runFor(590);
  await expect(
    page.getByRole("status", { name: "Wiedergabestatus" }),
  ).toHaveText("Läuft");
  await page.clock.runFor(20);
  await expect(
    page.getByRole("status", { name: "Wiedergabestatus" }),
  ).toHaveText("Text beendet");
});
