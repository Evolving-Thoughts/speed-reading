import { test, expect, type Page } from "@playwright/test";
const image = Buffer.from(
  "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eeec1dHZUf/q2LFj64dt2rxpsDP09PTUPujt7U3/n6iuzq6Ojo6U0uVXfvnwmTOOnz3r3wbfOdXd0/3qqtdTSrW7tn0N8by1lzlp4sTaxx2po++XDjrwgDvuuufwmYfsvtvkrq6uAc9TH2TdlqOtR3ftunX1VwrA6JX8EvR7ttlmp512fP/eUx957PGU0pNPP/ud2+6of3Xd+vXnL1i499S9Ljj3nCeeejaltGnT5ieefial9NAjP9r/A/vWjxzsDCmlffbe60ePP5lSeuSxJ3pT/zXiSy//94cOn/m733V3d3cPNsixY8Yuu/Ly1b/57b33P5BSql/HHvp5U0qd785nX5MmThw/fvz3H3jwsBkHD3ueIUY7ceutX1v1ekrpwR8+PPizATBi5VwB1y5Bd3R0ppTmnnnGH2y77fJrrr3nvh90dXXOO2tO/bCJW289Y/q0ufMX9G7efNJf/XlKadzYsf/16OO33n7XpIkTP3/2Z+tHzvnUqVue4Y/+cKfv3HbHZ0475erlK+685759pu651fj+t0U/duzR8y64ePcpkydNnNjd3d13Vd1XR0fHRefNnXvBgt2mTL7x27csufSSIZ63QTOmT/vWP//Lp07+RCPnqb2WLUd75hmnXX7Vl7d973un7rnH2DEDDx6AJnSsXL0megw50nfTb4O+9JVr/uz42VMm7/rSypevu+HmpUsWtWhsAJRJOVfA7XT87FkrrvvG+PHjurt7zp5zevRwACgGK2AACFDyTVgAkE8CDAABBBgAAggwAAQQYAAIIMAAEECAASCAAANAAAEGgAACDAABBBgAAggwAAQQYAAIIMAAEECAASCAAANAAAEGgAACDAABBBgAAggwAAQQYAAIIMAAEECAASCAAANAAAEGgAACDAABBBgAAggwAAQQYAAIIMAAEECAASCAAANAgP8DUsszaspcdLoAAAAASUVORK5CYII=",
  "base64",
);
const article = {
  title: "Ein Artikel mit Bild",
  sourceUrl: "https://example.com/story?sk=test-access",
  blocks: [
    { type: "text", text: "Anfang hier." },
    {
      type: "image",
      src: "/api/image?token=fixture",
      alt: "Beispielgrafik",
      caption: "Ein Verlauf als Beispiel",
    },
    { type: "text", text: "Weiter geht es." },
    {
      type: "image",
      src: "/api/image?token=final",
      alt: "Abschlussbild",
      caption: "Das letzte Bild",
    },
  ],
};
async function prepare(page: Page, broken = false) {
  await page.route("**/api/article", (route) =>
    route.fulfill({ json: article }),
  );
  await page.route("**/api/image?*", (route) =>
    broken
      ? route.fulfill({ status: 422, json: { error: "Bild nicht erreichbar" } })
      : route.fulfill({ contentType: "image/png", body: image }),
  );
  await page.goto("/");
  await page
    .getByLabel("Oder einen Artikellink importieren")
    .fill("https://example.com/story?sk=test-access");
  await page
    .getByRole("button", { name: "Artikel laden", exact: true })
    .click();
}
test("previews the imported article, pauses for images and continues at the next word", async ({
  page,
}, info) => {
  await prepare(page);
  await expect(
    page.getByRole("heading", { name: "Ein Artikel mit Bild" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Quelle öffnen" }),
  ).toHaveAttribute("href", article.sourceUrl);
  await expect(page.locator(".preview-content > p").first()).toHaveText(
    "Anfang hier.",
  );
  await expect(page.locator(".preview-content figure").first()).toContainText(
    "Ein Verlauf als Beispiel",
  );
  await page.getByRole("button", { name: "Artikel übernehmen" }).click();
  await page.getByLabel("Lesetempo").fill("1200");
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.clock.runFor(60);
  await page.clock.runFor(160);
  await expect(
    page.getByRole("status", { name: "Wiedergabestatus" }),
  ).toHaveText("Bildpause");
  await expect(page.locator(".reading-image img")).toHaveAttribute(
    "alt",
    "Beispielgrafik",
  );
  await expect(
    page.getByRole("button", { name: "Text beenden" }),
  ).toBeInViewport();
  await page.clock.runFor(10000);
  await expect(
    page.getByRole("status", { name: "Wiedergabestatus" }),
  ).toHaveText("Bildpause");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `test-results/${info.project.name}-article-image.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Weiterlesen", exact: true }).click();
  await expect(page.getByTestId("reader-word")).toHaveAttribute(
    "aria-label",
    "Weiter",
  );
  await page.clock.runFor(60);
  await page.clock.runFor(60);
  await page.clock.runFor(160);
  await expect(
    page.getByRole("status", { name: "Wiedergabestatus" }),
  ).toHaveText("Bildpause");
  await page.getByRole("button", { name: "Weiterlesen", exact: true }).click();
  await expect(page.getByRole("button", { name: "Von vorne" })).toBeVisible();
  await page.getByRole("button", { name: "Von vorne" }).click();
  await expect(page.getByTestId("reader-word")).toHaveAttribute(
    "aria-label",
    "Anfang",
  );
});
test("normal text keeps images, keyboard selection and exact-word restart", async ({
  page,
}) => {
  await prepare(page);
  await page.getByRole("button", { name: "Artikel übernehmen" }).click();
  await page.getByRole("button", { name: "Textansicht", exact: true }).click();
  await expect(page.locator(".normal-text img")).toHaveCount(2);
  await page.getByRole("button", { name: "Weiter", exact: true }).click();
  await page.getByRole("button", { name: "Ab hier lesen" }).click();
  await expect(page.getByTestId("reader-word")).toHaveAttribute(
    "aria-label",
    "Weiter",
  );
  await page.getByRole("button", { name: "Textansicht", exact: true }).click();
  await page.locator("button.text-image").first().click();
  await page.getByRole("button", { name: "Ab hier lesen" }).click();
  await expect(
    page.getByRole("status", { name: "Wiedergabestatus" }),
  ).toHaveText("Bildpause");
});
test("broken images can be skipped and imported text remains usable", async ({
  page,
}) => {
  await prepare(page, true);
  await page.getByRole("button", { name: "Artikel übernehmen" }).click();
  await page.getByRole("button", { name: "Textansicht", exact: true }).click();
  await page.locator("button.text-image").first().click();
  await page.getByRole("button", { name: "Ab hier lesen" }).click();
  await expect(page.locator(".reading-image")).toContainText(
    "Bild konnte nicht geladen werden",
  );
  await page.getByRole("button", { name: "Weiterlesen", exact: true }).click();
  await expect(page.getByTestId("reader-word")).toHaveAttribute(
    "aria-label",
    "Weiter",
  );
});
test("blocked imports and cancellation preserve manually entered text", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Was möchtest du lesen?").fill("Mein eigener Text");
  await page.route("**/api/article", (route) =>
    route.fulfill({
      status: 422,
      json: {
        error: "Website verweigert den Abruf. Bitte Text manuell einfügen.",
      },
    }),
  );
  await page
    .getByLabel("Oder einen Artikellink importieren")
    .fill("https://example.com");
  await page
    .getByRole("button", { name: "Artikel laden", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("verweigert");
  await expect(page.getByLabel("Was möchtest du lesen?")).toHaveValue(
    "Mein eigener Text",
  );
  await page.unroute("**/api/article");
  await page.route("**/api/article", async (route) => {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      await route.fulfill({ json: article });
    } catch {
      /* request cancelled */
    }
  });
  await page
    .getByRole("button", { name: "Artikel laden", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Import abbrechen", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Artikel laden", exact: true }),
  ).toBeEnabled();
  await expect(page.getByLabel("Artikelvorschau", { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Zur Leseansicht" }).click();
  await expect(page.getByTestId("reader-word")).toHaveAttribute(
    "aria-label",
    "Mein",
  );
});
test("new manual text discards imported images and reload resets the article", async ({
  page,
}) => {
  await prepare(page);
  await page.getByRole("button", { name: "Artikel übernehmen" }).click();
  await page.getByRole("button", { name: "Text beenden" }).click();
  await expect(
    page.getByRole("heading", { name: "Ein Artikel mit Bild" }),
  ).toBeVisible();
  await page.getByLabel("Was möchtest du lesen?").fill("Neuer Text");
  await page.getByRole("button", { name: "Zur Leseansicht" }).click();
  await page.getByRole("button", { name: "Textansicht", exact: true }).click();
  await expect(page.locator(".normal-text img")).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Was möchtest du lesen?")).toHaveValue("");
  await expect(page.getByLabel("Artikelvorschau", { exact: true })).toHaveCount(
    0,
  );
});
test("the actual local API rejects internal URLs through the Vite proxy", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const response = await fetch("/api/article", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "http://127.0.0.1/private" }),
    });
    return { status: response.status, text: await response.text() };
  });
  expect(result.status).toBe(400);
  expect(result.text).toContain("interne Adressen");
});
