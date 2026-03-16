import { expect, test } from "@playwright/test";

const MODULE_IDS = Object.freeze({
  systemSettings: "system-settings",
  taxonomy: "test-modules-taxonomy",
  content: "test-modules-content",
  pages: "test-modules-pages"
});
const ROUTE_SEGMENTS = Object.freeze({
  systemSettings: "system-settings",
  taxonomy: "taxonomies",
  content: "posts"
});

async function signInLocally(page) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /sign in \(local\)/i })).toBeVisible();
  await page.getByRole("button", { name: /sign in \(local\)/i }).click();
  await expect(page).toHaveURL(new RegExp(`/app/${ROUTE_SEGMENTS.systemSettings}$`));
  await expect(page.getByRole("heading", { name: "Advanced Product Defaults" })).toBeVisible();
}

test.describe("browser smoke lane", () => {
  test("shell/auth and workspace load flow", async ({ page }) => {
    await signInLocally(page);
    await expect(page.getByRole("heading", { name: "Normal Setup Flow" })).toBeVisible();
    await expect(page.locator("button[data-module-id='test-modules-remote-ops']")).toBeVisible();

    await page.locator(`button[data-module-id='${MODULE_IDS.taxonomy}']`).first().click();
    await expect(page).toHaveURL(new RegExp(`/app/${ROUTE_SEGMENTS.taxonomy}$`));
    await expect(page.getByRole("heading", { name: "Taxonomy Studio" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Category Tree" })).toBeVisible();

    await page.locator(`button[data-module-id='${MODULE_IDS.content}']`).first().click();
    await expect(page).toHaveURL(new RegExp(`/app/${ROUTE_SEGMENTS.content}$`));
    await expect(page.getByRole("heading", { name: "Content Desk" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Post Editor" })).toBeVisible();
  });

  test("module CRUD workflow through active route (records collection)", async ({ page }) => {
    const tagName = `QA Smoke Tag ${Date.now()}`;
    await signInLocally(page);

    await page.locator(`button[data-module-id='${MODULE_IDS.taxonomy}']`).first().click();
    await expect(page).toHaveURL(new RegExp(`/app/${ROUTE_SEGMENTS.taxonomy}$`));
    await page.getByRole("button", { name: "Tags" }).click();
    await page.getByRole("tab", { name: "Manage Terms" }).click();
    await expect(page.getByRole("heading", { name: "Taxonomy Workspace" })).toBeVisible();
    await expect(page.getByText("Collection: Tags")).toBeVisible();

    await page.getByLabel("Name", { exact: true }).fill(tagName);
    await page.getByLabel("Description", { exact: true }).fill("Smoke-created taxonomy tag");
    await page.getByRole("button", { name: "Create tag" }).click();

    await expect(page.getByText("Tag created")).toBeVisible();
    const row = page.locator("tr", { hasText: tagName });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Tag deleted")).toBeVisible();
    await expect(row).toHaveCount(0);
  });

  test("module settings workflow persists deterministic values", async ({ page }) => {
    await signInLocally(page);
    await expect(page).toHaveURL(new RegExp(`/app/${ROUTE_SEGMENTS.systemSettings}$`));
    const mountTagName = `qa-smoke-root-${Date.now()}`;
    await page.getByRole("button", { name: "Show Advanced Defaults" }).click();
    await page.getByLabel("App Mount Tag Name", { exact: true }).fill(mountTagName);
    const saveResponsePromise = page.waitForResponse((response) => {
      return (
        response.request().method() === "PUT" &&
        response
          .url()
          .includes(`/api/reference/settings/modules/${MODULE_IDS.pages}`)
      );
    });
    await page.getByRole("button", { name: "Save Pages Defaults" }).click();
    const saveResponse = await saveResponsePromise;
    expect(saveResponse.ok()).toBeTruthy();

    await page.reload();
    await expect(page).toHaveURL(new RegExp(`/app/${ROUTE_SEGMENTS.systemSettings}$`));
    await expect(page.getByRole("heading", { name: "Advanced Product Defaults" })).toBeVisible();
    await page.getByRole("button", { name: "Show Advanced Defaults" }).click();
    await expect(page.getByLabel("App Mount Tag Name", { exact: true })).toHaveValue(mountTagName);
  });
});
