import { test, expect } from "@playwright/test";

test.describe("Researo shell", () => {
  test("dashboard loads with hero and stats", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening)/i })).toBeVisible();
    await expect(page.getByText("Research Sessions")).toBeVisible();
  });

  test("sidebar navigation reaches every workspace", async ({ page }) => {
    await page.goto("/dashboard");
    for (const [label, url] of [
      ["Research", "/research"],
      ["Documents", "/documents"],
      ["Reports", "/reports"],
      ["Analytics", "/analytics"],
      ["Knowledge Graph", "/graph"],
      ["Citations", "/citations"],
      ["Settings", "/settings"],
    ] as const) {
      await page.getByRole("link", { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(url));
    }
  });

  test("command palette opens with Ctrl+K", async ({ page }) => {
    await page.goto("/dashboard");
    await page.keyboard.press("Control+K");
    await expect(page.getByPlaceholder(/search documents, reports/i)).toBeVisible();
  });
});
