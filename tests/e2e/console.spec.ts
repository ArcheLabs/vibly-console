import { expect, test } from "@playwright/test";

test("connects to a mock coordinator and opens the project dashboard", async ({ page }) => {
  await page.route("**/health", async (route) => {
    await route.fulfill({ json: { ok: true, data: { status: "ok" } } });
  });
  await page.route("**/projects?*", async (route) => {
    await route.fulfill({
      json: {
        ok: true,
        data: [{ id: "project_1", slug: "demo", name: "Demo Project", status: "active", createdAt: new Date().toISOString() }],
        page: { limit: 50, nextCursor: null },
      },
    });
  });
  await page.route("**/projects/project_1", async (route) => {
    await route.fulfill({ json: { ok: true, data: { project: { id: "project_1", name: "Demo Project", status: "active" } } } });
  });
  await page.route("**/projects/project_1/**", async (route) => {
    await route.fulfill({ json: { ok: true, data: [], page: { limit: 100, nextCursor: null } } });
  });
  await page.route("**/knowledge/latest**", async (route) => {
    await route.fulfill({ json: { ok: true, data: { knowledgeVersion: { id: "kv_1", hash: "hash" } } } });
  });
  await page.route("**/negotiations**", async (route) => {
    await route.fulfill({ json: { ok: true, data: [], page: { limit: 100, nextCursor: null } } });
  });
  await page.route("**/reviews**", async (route) => {
    await route.fulfill({ json: { ok: true, data: [], page: { limit: 100, nextCursor: null } } });
  });
  await page.route("**/rewards**", async (route) => {
    await route.fulfill({ json: { ok: true, data: [], page: { limit: 100, nextCursor: null } } });
  });
  await page.route("**/events**", async (route) => {
    await route.fulfill({ json: { ok: true, data: [], page: { limit: 20, nextCursor: null } } });
  });
  await page.route("**/traces**", async (route) => {
    await route.fulfill({ json: { ok: true, data: [], page: { limit: 100, nextCursor: null } } });
  });

  await page.goto("/login");
  await page.getByLabel("Coordinator URL").fill("http://mock.test");
  await page.getByLabel("API Token").fill("dev-token");
  await page.getByRole("button", { name: "Connect" }).click();
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  await page.getByRole("link", { name: /Demo Project/ }).click();
  await expect(page.getByRole("heading", { name: "Demo Project" })).toBeVisible();
});
