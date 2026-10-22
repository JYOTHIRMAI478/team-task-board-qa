import { expect, test, type Page } from "@playwright/test";

// Helpers so the tests read like the manual steps
async function addTask(page: Page, title: string, priority = "medium") {
  await page.getByLabel("Task title").fill(title);
  await page.getByLabel("Priority").selectOption(priority);
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(page.getByText(title)).toBeVisible();
}

const row = (page: Page, title: string) =>
  page.getByRole("listitem").filter({ hasText: title });

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("No tasks to show.")).toBeVisible();
});

test("critical journey: create, refresh, edit, refresh, search", async ({ page }) => {
  // Create two tasks
  await addTask(page, "Team Meeting", "high");
  await expect(page.getByText("Task added.")).toBeVisible();
  await addTask(page, "Client call", "low");

  // Refresh: both are still there (TTB-8)
  await page.reload();
  await expect(page.getByText("Team Meeting")).toBeVisible();
  await expect(page.getByText("Client call")).toBeVisible();

  // Edit a title (TTB-2)
  await row(page, "Client call").getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Edit title").fill("Client call (Bella)");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Task updated.")).toBeVisible();

  // Refresh: the edit is still there
  await page.reload();
  await expect(page.getByText("Client call (Bella)")).toBeVisible();

  // Search narrows the list (TTB-6)
  await page.getByLabel("Search tasks").fill("Bella");
  await expect(page.getByRole("listitem")).toHaveCount(1);
  await expect(page.getByText("Client call (Bella)")).toBeVisible();
});

test("empty title shows an inline error (TTB-1)", async ({ page }) => {
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(page.getByText("Title is required.")).toBeVisible();
});

// Known bugs: test.fail() means "we expect this to fail until the bug is fixed"

test("[BUG-01] a deleted task stays deleted after refresh (TTB-3)", async ({ page }) => {
  test.fail();
  await addTask(page, "Keep me");
  await addTask(page, "Delete me");
  await row(page, "Delete me").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Delete me")).toHaveCount(0);

  await page.reload();
  await expect(page.getByText("Keep me")).toBeVisible(); // wait for the list to load
  await expect(page.getByText("Delete me")).toHaveCount(0, { timeout: 2000 });
});

test("[BUG-02] a completed task stays completed after refresh (TTB-4)", async ({ page }) => {
  test.fail();
  await addTask(page, "Women's Meet");
  await row(page, "Women's Meet").getByRole("checkbox").check();

  await page.reload();
  await expect(page.getByText("Women's Meet")).toBeVisible(); // wait for the list to load
  await expect(row(page, "Women's Meet").getByRole("checkbox")).toBeChecked({ timeout: 2000 });
});