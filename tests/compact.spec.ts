import { test, expect } from "@playwright/test";

for (const [width, height] of [
  [1440, 900],
  [1366, 768],
  [390, 844],
  [375, 667],
]) {
  test(`reader fits ${width}x${height} without scrolling`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page
      .getByLabel("Was möchtest du lesen?")
      .fill("Hallo Welt! Ein kompakter Lesemodus.");
    await page.getByRole("button", { name: "Zur Leseansicht" }).click();
    await page.getByLabel("Schriftgröße").selectOption("1.5");
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollHeight <= innerHeight + 1,
        ),
      )
      .toBe(true);
    await expect(
      page.getByRole("button", { name: "Text beenden" }),
    ).toBeInViewport({ ratio: 1 });
    await expect(
      page.getByRole("button", { name: "Start", exact: true }),
    ).toBeInViewport({ ratio: 1 });
    await expect(
      page.getByRole("button", { name: "Textansicht", exact: true }),
    ).toBeInViewport({ ratio: 1 });
    await expect(page.getByLabel("Satzendpause")).toBeInViewport({ ratio: 1 });
    await expect(page.locator(".session-info")).toBeInViewport({ ratio: 1 });
    const bounds = await page.getByTestId("reader-word").evaluate((el) => {
      const area = el.parentElement!.getBoundingClientRect();
      const word = el.getBoundingClientRect();
      return { fits: word.top >= area.top && word.bottom <= area.bottom };
    });
    expect(bounds.fits).toBe(true);
    for (const el of await page
      .locator(
        ".reader-controls button, .reader-controls select, .speed-number, #speed",
      )
      .all()) {
      expect((await el.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("short landscape viewport stays scrollable without clipping controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await page.goto("/");
  await page.getByLabel("Was möchtest du lesen?").fill("Hallo Welt!");
  await page.getByRole("button", { name: "Zur Leseansicht" }).click();
  await page.getByLabel("Schriftgröße").selectOption("1.5");
  await page.getByLabel("Satzendpause").scrollIntoViewIfNeeded();
  await expect(page.getByLabel("Satzendpause")).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "Text beenden" }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

for (const [width, height] of [
  [1440, 900],
  [1366, 768],
  [390, 844],
  [375, 667],
]) {
  test(`word area balances type and control spacing at ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page.getByLabel("Was möchtest du lesen?").fill("Dein Text.");
    await page.getByRole("button", { name: "Zur Leseansicht" }).click();
    for (const scale of ["0.8", "1", "1.25", "1.5"]) {
      await page.getByLabel("Schriftgröße").selectOption(scale);
      const layout = await page.locator(".word-viewport").evaluate((el) => {
        const word = el.querySelector<HTMLElement>(".word")!;
        const controls = document.querySelector(".reader-controls")!;
        const speed = controls.querySelector(".speed-control")!;
        const info = controls.querySelector(".session-info")!;
        return {
          area: el.getBoundingClientRect().height,
          line: parseFloat(getComputedStyle(word).lineHeight),
          font: parseFloat(getComputedStyle(word).fontSize),
          speedGap: parseFloat(getComputedStyle(speed).marginTop),
          infoGap: parseFloat(getComputedStyle(info).marginTop),
        };
      });
      expect(layout.area).toBeLessThanOrEqual(
        layout.line + (width > 600 ? 80 : 56),
      );
      expect(layout.area).toBeGreaterThanOrEqual(layout.line + 24);
      expect(layout.font).toBeCloseTo(
        (width > 600 ? 88 : 56) * Number(scale),
        0,
      );
      expect(layout.speedGap).toBeGreaterThanOrEqual(16);
      expect(layout.infoGap).toBeGreaterThanOrEqual(12);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollHeight <= innerHeight + 1,
        ),
      ).toBe(true);
    }
  });
}

const tallImage = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAMgAAAJYCAIAAACowz6jAAAGGUlEQVR4nO3UMQ2EABBFQSCIwwfl6aHEB2IwQIWFM8ELCZkR8LPFy47ndQ/wtOntA/gmYZEQFglhkRAWCWGREBYJYZEQFglhkRAWCWGREBYJYZEQFglhkRAWCWGREBYJYZEQFglhkRAWCWGREBYJYZEQFglhkRAWCWGREBYJYZEQFglhkRAWCWGREBYJYZEQFom5m162vRvnKcdvLWZ9LBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiMZ7X/fYNfJCPRUJYJIRFQlgkhEVCWCSERUJYJIRFQlgkhEVCWCSERUJYJIRFQlgkhEVCWCSERUJYJIRFQlgkhEVCWCSERUJYJIRFQlgkhEVCWCSERUJYJIRFQlgkhEVCWCSERUJYJP7row0ZQGF5LgAAAABJRU5ErkJggg==",
  "base64",
);
for (const [width, height] of [
  [1366, 768],
  [375, 667],
]) {
  test(`image pause fits ${width}x${height} with its caption and controls`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.route("**/api/article", (r) =>
      r.fulfill({
        json: {
          title: "Bildtest",
          sourceUrl: "https://example.com/article",
          blocks: [
            {
              type: "image",
              src: "/api/image?token=tall",
              alt: "Hochformat",
              caption: "Eine Abbildung im Hochformat",
            },
            { type: "text", text: "Danach geht es weiter." },
          ],
        },
      }),
    );
    await page.route("**/api/image?*", (r) =>
      r.fulfill({ contentType: "image/png", body: tallImage }),
    );
    await page.goto("/");
    await page
      .getByLabel("Oder einen Artikellink importieren")
      .fill("https://example.com/article");
    await page
      .getByRole("button", { name: "Artikel laden", exact: true })
      .click();
    await page.getByRole("button", { name: "Artikel übernehmen" }).click();
    await expect(page.locator(".reading-image img")).toBeVisible();
    await expect(
      page.getByRole("status", { name: "Wiedergabestatus" }),
    ).toHaveText("Bildpause");
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollHeight <= innerHeight + 1,
        ),
      )
      .toBe(true);
    await expect(
      page.getByRole("button", { name: "Weiterlesen", exact: true }),
    ).toBeInViewport({ ratio: 1 });
    await expect(page.locator(".reading-image .image-caption")).toBeInViewport({
      ratio: 1,
    });
    await expect(page.locator(".session-info")).toBeInViewport({ ratio: 1 });
  });
}
