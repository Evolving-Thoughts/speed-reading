import { test, expect, type Page } from "@playwright/test";
async function load(page: Page, text = "Hallo Welt! Noch ein Satz.") {
  await page.goto("/");
  await page.getByLabel("Was möchtest du lesen?").fill(text);
  await page.getByRole("button", { name: "Zur Leseansicht" }).click();
}
const word = (page: Page) => page.getByTestId("reader-word");
test("loads paused, highlights anchor, keeps End visible and preserves text/speed on early exit", async ({
  page,
}) => {
  await load(page, "which recognised understanding.");
  await expect(word(page)).toHaveAttribute("aria-label", "which");
  await expect(word(page).locator(".anchor")).toHaveText("h");
  await expect(
    page.getByRole("status", { name: "Wiedergabestatus" }),
  ).toHaveText("Pausiert");
  await page.getByLabel("Lesetempo").fill("600");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Text beenden" }),
  ).toBeInViewport();
  await page.getByRole("button", { name: "Text beenden" }).click();
  await expect(page.getByLabel("Was möchtest du lesen?")).toHaveValue(
    "which recognised understanding.",
  );
  await expect(page.getByLabel("Lesetempo")).toHaveValue("600");
  await page.getByLabel("Was möchtest du lesen?").fill("Neuer Text.");
  await page.getByRole("button", { name: "Zur Leseansicht" }).click();
  await expect(word(page)).toHaveAttribute("aria-label", "Neuer");
});
test("selects a word in normal text and resumes paused at exactly that word", async ({
  page,
}, info) => {
  await load(page);
  await page.getByRole("button", { name: "Textansicht", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Hallo", exact: true }),
  ).toHaveAttribute("aria-current", "location");
  await expect(
    page.getByRole("button", { name: "Text beenden" }),
  ).toBeInViewport();
  await page.getByRole("button", { name: "Noch", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Noch", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({
    path: `test-results/${info.project.name}-text.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Ab hier lesen" }).click();
  await expect(word(page)).toHaveAttribute("aria-label", "Noch");
  await expect(
    page.getByRole("status", { name: "Wiedergabestatus" }),
  ).toHaveText("Pausiert");
});
test("desktop double-click selects a paused restart position", async ({
  page,
}, info) => {
  test.skip(
    info.project.name === "mobile",
    "Mobile uses explicit word selection and button.",
  );
  await load(page);
  await page.getByRole("button", { name: "Textansicht", exact: true }).click();
  await page.getByRole("button", { name: "Welt!", exact: true }).dblclick();
  await expect(word(page)).toHaveAttribute("aria-label", "Welt!");
  await expect(
    page.getByRole("status", { name: "Wiedergabestatus" }),
  ).toHaveText("Pausiert");
});
test("gives a sentence-ending word triple duration and completes after it, then restarts paused", async ({
  page,
}, info) => {
  await load(page, "Hallo Welt!");
  await page.clock.install();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.clock.runFor(210);
  await expect(word(page)).toHaveAttribute("aria-label", "Welt!");
  await page.clock.runFor(400);
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.clock.runFor(220);
  await expect(
    page.getByRole("status", { name: "Wiedergabestatus" }),
  ).toHaveText("Text beendet");
  await expect(
    page.getByRole("button", { name: "Text beenden" }),
  ).toBeInViewport();
  await page.screenshot({
    path: `test-results/${info.project.name}-complete.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Von vorne" }).click();
  await expect(word(page)).toHaveAttribute("aria-label", "Hallo");
  await expect(
    page.getByRole("status", { name: "Wiedergabestatus" }),
  ).toHaveText("Pausiert");
});
test("scrolls the current reading position into view in long texts", async ({
  page,
}) => {
  await load(page, Array.from({ length: 150 }, (_, i) => `Wort${i}`).join(" "));
  await page.getByRole("button", { name: "Textansicht", exact: true }).click();
  await page.getByRole("button", { name: "Wort130", exact: true }).click();
  await page.getByRole("button", { name: "Ab hier lesen" }).click();
  await page.getByRole("button", { name: "Textansicht", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Wort130", exact: true }),
  ).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "Wort130", exact: true }),
  ).toHaveAttribute("aria-current", "location");
});
test("keeps a long word fully inside its reading area and aligns anchor with the guide", async ({
  page,
}, info) => {
  await load(page, "Donaudampfschifffahrtsgesellschaftskapitän");
  const bounds = await word(page).evaluate((el) => {
    const viewport = el.closest(".word-viewport")!.getBoundingClientRect();
    const before = el.querySelector(".before")!.getBoundingClientRect();
    const after = el.querySelector(".after")!.getBoundingClientRect();
    const anchor = el.querySelector(".anchor")!.getBoundingClientRect();
    return {
      left: before.left,
      right: after.right,
      min: viewport.left,
      max: viewport.right,
      anchor: (anchor.left + anchor.right) / 2,
      guide: viewport.left + viewport.width * 0.38,
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(bounds.min);
  expect(bounds.right).toBeLessThanOrEqual(bounds.max);
  expect(Math.abs(bounds.anchor - bounds.guide)).toBeLessThan(2);
  expect(bounds.overflow).toBe(false);
  await page.screenshot({
    path: `test-results/${info.project.name}-long-word.png`,
    fullPage: true,
  });
});
test("ignores blank text, treats markup as text, and never runs network requests for user content", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (req) => {
    if (!req.url().startsWith("http://127.0.0.1:5173"))
      external.push(req.url());
  });
  await page.goto("/");
  await page.getByLabel("Was möchtest du lesen?").fill("   \n");
  await expect(
    page.getByRole("button", { name: "Zur Leseansicht" }),
  ).toBeDisabled();
  await page
    .getByLabel("Was möchtest du lesen?")
    .fill("<script>alert(1)</script>");
  await page.getByRole("button", { name: "Zur Leseansicht" }).click();
  await expect(word(page)).toHaveAttribute(
    "aria-label",
    "<script>alert(1)</script>",
  );
  expect(external).toEqual([]);
  await page.reload();
  await expect(page.getByLabel("Was möchtest du lesen?")).toHaveValue("");
});
test("space toggles playback but does not intercept typing or native controls", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.getByLabel("Was möchtest du lesen?");
  await input.fill("Hallo");
  await input.press("End");
  await input.press("Space");
  await input.press("W");
  await expect(input).toHaveValue("Hallo W");
  await page.getByRole("button", { name: "Zur Leseansicht" }).click();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("status", { name: "Wiedergabestatus" }),
  ).toHaveText("Pausiert");
});
test("pauses when the document becomes hidden", async ({ page }) => {
  await load(page);
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(
    page.getByRole("status", { name: "Wiedergabestatus" }),
  ).toHaveText("Pausiert");
});
test("visual reference states", async ({ page }, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Beispieltext laden" }).click();
  await page.screenshot({
    path: `test-results/${info.project.name}-input.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Zur Leseansicht" }).click();
  await page.getByRole("button", { name: "Textansicht", exact: true }).click();
  await page.getByRole("button", { name: "Gedanken", exact: true }).dblclick();
  await expect(word(page)).toHaveAttribute("aria-label", "Gedanken");
  await page.screenshot({
    path: `test-results/${info.project.name}-reader.png`,
    fullPage: true,
  });
});

test("pause cancels pending advancement and speed changes apply while playing", async ({
  page,
}) => {
  await load(page, "Eins zwei drei vier Ende!");
  await page.clock.install();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.clock.runFor(40);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.clock.runFor(1000);
  await expect(word(page)).toHaveAttribute("aria-label", "Eins");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByLabel("Lesetempo").fill("1200");
  await page.clock.runFor(60);
  await expect(word(page)).toHaveAttribute("aria-label", "zwei");
  await page.getByRole("button", { name: "Textansicht", exact: true }).click();
  await page.clock.runFor(1000);
  await expect(
    page.getByRole("button", { name: "zwei", exact: true }),
  ).toHaveAttribute("aria-current", "location");
});
