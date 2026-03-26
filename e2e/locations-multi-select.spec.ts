import { test, expect, type Page } from "@playwright/test";

// ── Helpers ──────────────────────────────────────────────────────────────────

const CREDS = { username: "mgm/admin", password: "wint00l$" };
const TEST_PREFIX = "E2E-MultiSel";

/** Log in and navigate to the locations page. */
async function loginAndGoToLocations(page: Page) {
  await page.goto("/login");
  await page.getByTestId("login-username-input").fill(CREDS.username);
  await page.getByTestId("login-password-input").fill(CREDS.password);
  await page.getByTestId("login-submit-button").click();
  await page.waitForURL("**/overview", { timeout: 15_000 });
  await page.goto("/reference-data/locations");
  await page.locator("h1:has-text('Locations')").waitFor({ timeout: 15_000 });
  // Wait for table to load
  await page.waitForFunction(
    () => document.querySelectorAll("tr[data-testid^='locations-row-']").length > 0,
    { timeout: 20_000 },
  );
}

/** Create test locations via API. Returns the created IDs. */
async function createTestLocations(page: Page, count: number): Promise<string[]> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const name = `${TEST_PREFIX}-${suffix}-${String.fromCharCode(65 + i)}`;
    const result = await page.evaluate(async (n: string) => {
      const token = sessionStorage.getItem("rcx.auth.token");
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: n, status: "Active" }),
      });
      const body = await res.json();
      return { status: res.status, id: body._id as string };
    }, name);
    if (result.status === 201) ids.push(result.id);
  }
  return ids;
}

/** Delete locations by ID via API. */
async function deleteLocations(page: Page, ids: string[]) {
  for (const id of ids) {
    await page.evaluate(async (locId: string) => {
      const token = sessionStorage.getItem("rcx.auth.token");
      await fetch(`/api/locations/${locId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }, id);
  }
}

/** Get the checkbox cell for a given row test ID. */
function checkboxCell(page: Page, rowTestId: string) {
  return page.getByTestId(rowTestId).locator("td").first();
}

/** Get the checkbox input for a given row test ID. */
function checkbox(page: Page, rowTestId: string) {
  return page.getByTestId(rowTestId).locator("input[type='checkbox']");
}

/** Get all location rows. */
function locationRows(page: Page) {
  return page.locator("tr[data-testid^='locations-row-']");
}

/** Get the selection count text from the bulk action bar. */
function selectionCount(page: Page) {
  return page.getByTestId("bulk-action-bar");
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe("Locations Multi-Select", () => {
  let createdIds: string[] = [];

  test.beforeAll(async ({ browser }) => {
    // Create test data once for all tests
    const page = await browser.newPage();
    await page.goto("http://localhost:4000/login");
    await page.getByTestId("login-username-input").fill(CREDS.username);
    await page.getByTestId("login-password-input").fill(CREDS.password);
    await page.getByTestId("login-submit-button").click();
    await page.waitForURL("**/overview", { timeout: 15_000 });
    createdIds = await createTestLocations(page, 5);
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    // Clean up test data
    const page = await browser.newPage();
    await page.goto("http://localhost:4000/login");
    await page.getByTestId("login-username-input").fill(CREDS.username);
    await page.getByTestId("login-password-input").fill(CREDS.password);
    await page.getByTestId("login-submit-button").click();
    await page.waitForURL("**/overview", { timeout: 15_000 });
    await deleteLocations(page, createdIds);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await loginAndGoToLocations(page);
  });

  // ── Click: toggles individual rows ───────────────────────────────────

  test("clicking checkboxes toggles rows independently", async ({ page }) => {
    const rows = locationRows(page);
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(3);

    const row0Id = await rows.nth(0).getAttribute("data-testid");
    const row1Id = await rows.nth(1).getAttribute("data-testid");
    const row2Id = await rows.nth(2).getAttribute("data-testid");

    // Click first row
    await checkboxCell(page, row0Id!).click();
    await expect(checkbox(page, row0Id!)).toBeChecked();
    await expect(selectionCount(page)).toContainText("1 selected");

    // Click second row — both should be selected (additive)
    await checkboxCell(page, row1Id!).click();
    await expect(checkbox(page, row0Id!)).toBeChecked();
    await expect(checkbox(page, row1Id!)).toBeChecked();
    await expect(selectionCount(page)).toContainText("2 selected");

    // Click third row — three selected
    await checkboxCell(page, row2Id!).click();
    await expect(checkbox(page, row0Id!)).toBeChecked();
    await expect(checkbox(page, row1Id!)).toBeChecked();
    await expect(checkbox(page, row2Id!)).toBeChecked();
    await expect(selectionCount(page)).toContainText("3 selected");

    // Click first row again — deselect it (toggle off)
    await checkboxCell(page, row0Id!).click();
    await expect(checkbox(page, row0Id!)).not.toBeChecked();
    await expect(checkbox(page, row1Id!)).toBeChecked();
    await expect(checkbox(page, row2Id!)).toBeChecked();
    await expect(selectionCount(page)).toContainText("2 selected");

    // Click remaining two to deselect all
    await checkboxCell(page, row1Id!).click();
    await checkboxCell(page, row2Id!).click();
    const checkedBoxes = page.locator(
      "tr[data-testid^='locations-row-'] input[type='checkbox']:checked",
    );
    await expect(checkedBoxes).toHaveCount(0);
  });

  // ── Shift+click: range selection ──────────────────────────────────────

  test("shift+click selects a range of rows", async ({ page }) => {
    const rows = locationRows(page);
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(4);

    const rowIds: string[] = [];
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const id = await rows.nth(i).getAttribute("data-testid");
      rowIds.push(id!);
    }

    // Click first row as anchor
    await checkboxCell(page, rowIds[0]!).click();
    await expect(checkbox(page, rowIds[0]!)).toBeChecked();

    // Shift+click fourth row — rows 0-3 should all be selected
    await checkboxCell(page, rowIds[3]!).click({ modifiers: ["Shift"] });

    for (let i = 0; i <= 3; i++) {
      await expect(checkbox(page, rowIds[i]!)).toBeChecked();
    }

    // Rows beyond the range should not be selected
    if (rowIds.length > 4) {
      await expect(checkbox(page, rowIds[4]!)).not.toBeChecked();
    }

    await expect(selectionCount(page)).toContainText("4 selected");
  });

  // ── Shift+click merges with existing selection ────────────────────────

  test("shift+click merges with existing ctrl+click selection", async ({ page }) => {
    const rows = locationRows(page);
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(5);

    const rowIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const id = await rows.nth(i).getAttribute("data-testid");
      rowIds.push(id!);
    }

    // Ctrl+click row 4 (5th row) to select it independently
    await checkboxCell(page, rowIds[4]!).click();
    await expect(checkbox(page, rowIds[4]!)).toBeChecked();

    // Now click row 0 as new anchor
    await checkboxCell(page, rowIds[0]!).click();

    // Shift+click row 2 — should select range 0-2 AND keep row 4
    await checkboxCell(page, rowIds[2]!).click({ modifiers: ["Shift"] });

    await expect(checkbox(page, rowIds[0]!)).toBeChecked();
    await expect(checkbox(page, rowIds[1]!)).toBeChecked();
    await expect(checkbox(page, rowIds[2]!)).toBeChecked();
    await expect(checkbox(page, rowIds[4]!)).toBeChecked();
    // Row 3 should not be selected (not in either selection)
    await expect(checkbox(page, rowIds[3]!)).not.toBeChecked();

    await expect(selectionCount(page)).toContainText("4 selected");
  });

  // ── Row click still opens edit drawer ─────────────────────────────────

  test("clicking row body opens edit drawer, not selection", async ({ page }) => {
    const rows = locationRows(page);
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });

    // Click on the name cell (not checkbox cell)
    const nameCell = rows.first().locator("td").nth(1);
    await nameCell.click();

    // Edit drawer should open
    const drawerHeading = page.locator("h2:has-text('Edit:')");
    await expect(drawerHeading).toBeVisible({ timeout: 5_000 });

    // No rows should be selected
    const checkedBoxes = page.locator(
      "tr[data-testid^='locations-row-'] input[type='checkbox']:checked",
    );
    await expect(checkedBoxes).toHaveCount(0);

    // Close drawer
    await page.locator("button[aria-label='Close']").click();
  });

  // ── Select-all header checkbox ────────────────────────────────────────

  test("select-all checkbox selects all visible rows", async ({ page }) => {
    const rows = locationRows(page);
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(3);

    // Click the header checkbox
    const headerCheckbox = page.locator("thead input[type='checkbox']");
    await headerCheckbox.click();

    // All rows should be selected
    const checkedBoxes = page.locator(
      "tr[data-testid^='locations-row-'] input[type='checkbox']:checked",
    );
    await expect(checkedBoxes).toHaveCount(rowCount);
    await expect(selectionCount(page)).toContainText(`${rowCount} selected`);

    // Click header checkbox again to deselect all
    await headerCheckbox.click();
    const checkedAfter = page.locator(
      "tr[data-testid^='locations-row-'] input[type='checkbox']:checked",
    );
    await expect(checkedAfter).toHaveCount(0);
  });
});
