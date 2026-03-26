# Fulfillment E2E Tests Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Write end-to-end Playwright tests that verify round-trip persistence of all fulfillment types (External, Points, Tier Status) for both single edit and bulk edit, then clean up created data.

**Architecture:** Add `testIdPrefix` props to all fulfillment Select components in both drawers so e2e tests can reliably target them. Then write 6 test cases in the existing `e2e/reward-catalog.spec.ts` file using the established helper pattern (login → navigate → interact → verify → cleanup).

**Tech Stack:** Playwright, existing reward-catalog e2e helpers (`loginAndGoToRewards`, `openAddDrawer`, `drawer`, `clickSave`, etc.)

---

### Task 1: Add `testIdPrefix` to fulfillment Selects in reward-form-drawer

**Files:**
- Modify: `src/features/reward-catalog/components/reward-form-drawer.tsx`

**Step 1: Add testIdPrefix to each fulfillment Select**

Add `testIdPrefix` prop to every `<Select>` in the fulfillment tab so e2e tests can target them:

- Fulfillment Type select: `testIdPrefix="ffmnt-type"`
- Partner select: `testIdPrefix="ffmnt-partner"`
- Delivery Method select: `testIdPrefix="ffmnt-delivery"`
- Currency select: `testIdPrefix="ffmnt-currency"`
- Expiration Type select: `testIdPrefix="ffmnt-exp-type"`
- Expiry Unit select: `testIdPrefix="ffmnt-exp-unit"`
- Expiration Snap To select: `testIdPrefix="ffmnt-exp-snap"`
- Escrow Unit select: `testIdPrefix="ffmnt-esc-unit"`
- Escrow Snap To select: `testIdPrefix="ffmnt-esc-snap"`
- Tier Policy select: `testIdPrefix="ffmnt-tier-policy"`
- Tier Level select: `testIdPrefix="ffmnt-tier-level"`
- Tier Duration Unit select: `testIdPrefix="ffmnt-tier-dur-unit"`

For each Select, add the prop. Example for Fulfillment Type:
```tsx
<Select
  value={field.value}
  onChange={field.onChange}
  options={FULFILLMENT_TYPE_OPTIONS}
  placeholder="Select fulfillment type..."
  testIdPrefix="ffmnt-type"
/>
```

**Step 2: Run type check**
Run: `npx tsc --noEmit`

**Step 3: Commit**
```bash
git commit -m "chore: add testIdPrefix to fulfillment Selects in form drawer"
```

---

### Task 2: Add `testIdPrefix` to fulfillment Selects in bulk-edit-drawer

**Files:**
- Modify: `src/features/reward-catalog/components/bulk-edit-drawer.tsx`

**Step 1: Add testIdPrefix to each bulk edit fulfillment Select**

Same prefixes as Task 1 but for the bulk edit drawer:

- Fulfillment Type: `testIdPrefix="bulk-ffmnt-type"`
- Partner: `testIdPrefix="bulk-ffmnt-partner"`
- Delivery Method: `testIdPrefix="bulk-ffmnt-delivery"`
- Currency: `testIdPrefix="bulk-ffmnt-currency"`
- Expiration Type: `testIdPrefix="bulk-ffmnt-exp-type"`
- Expiry Unit: `testIdPrefix="bulk-ffmnt-exp-unit"`
- Expiration Snap To: `testIdPrefix="bulk-ffmnt-exp-snap"`
- Escrow Unit: `testIdPrefix="bulk-ffmnt-esc-unit"`
- Escrow Snap To: `testIdPrefix="bulk-ffmnt-esc-snap"`
- Tier Policy: `testIdPrefix="bulk-ffmnt-tier-policy"`
- Tier Level: `testIdPrefix="bulk-ffmnt-tier-level"`
- Tier Duration Unit: `testIdPrefix="bulk-ffmnt-tier-dur-unit"`

**Step 2: Run type check**
Run: `npx tsc --noEmit`

**Step 3: Commit**
```bash
git commit -m "chore: add testIdPrefix to fulfillment Selects in bulk edit drawer"
```

---

### Task 3: Add e2e helper for selecting a value in a custom Select

**Files:**
- Modify: `e2e/reward-catalog.spec.ts`

**Step 1: Add a helper function after the existing helpers**

The custom Select component uses Radix Popover. To select a value:
1. Click the trigger button (`data-testid="${prefix}-select-trigger"`)
2. Wait for the popover to open
3. Click the option (`data-testid="${prefix}-select-option-${value}"`)

```typescript
/** Select a value in a custom Select component by testIdPrefix. */
async function selectValue(page: Page, container: ReturnType<typeof page.locator>, testIdPrefix: string, value: string) {
  await container.locator(`[data-testid="${testIdPrefix}-select-trigger"]`).click();
  await page.locator(`[data-testid="${testIdPrefix}-select-option-${value}"]`).click();
}

/** Read the currently displayed value from a custom Select trigger. */
async function getSelectDisplayValue(container: ReturnType<typeof page.locator>, testIdPrefix: string): Promise<string> {
  return container.locator(`[data-testid="${testIdPrefix}-select-trigger"]`).innerText();
}
```

**Step 2: Add a helper for navigating to a tab in a drawer**

```typescript
/** Click a tab by label text inside a drawer. */
async function clickTab(container: ReturnType<typeof page.locator>, label: string) {
  await container.locator(`button[role='tab']:has-text('${label}')`).click();
}
```

**Step 3: Commit**
```bash
git commit -m "chore: add e2e helpers for custom Select and tab navigation"
```

---

### Task 4: E2E test — Single reward with External Fulfillment

**Files:**
- Modify: `e2e/reward-catalog.spec.ts`

**Step 1: Add the test**

Inside the existing `test.describe("Reward Catalog", ...)` block, add:

```typescript
test("create reward with External Fulfillment, verify persistence, delete", async ({ page }) => {
  const rewardName = `ExtFfmnt ${uniqueSuffix()}`;
  await openAddDrawer(page);

  // Fill name
  await nameInput(page).fill(rewardName);

  // Go to Fulfillment tab
  const d = drawer(page);
  await clickTab(d, "Fulfillment");

  // Select External Fulfillment
  await selectValue(page, d, "ffmnt-type", "External Fulfillment");

  // Select Partner (first available)
  const partnerTrigger = d.locator('[data-testid="ffmnt-partner-select-trigger"]');
  await partnerTrigger.click();
  const firstPartnerOption = page.locator('[data-testid^="ffmnt-partner-select-option-"]').first();
  const partnerValue = await firstPartnerOption.getAttribute("data-testid");
  const partnerId = partnerValue!.replace("ffmnt-partner-select-option-", "");
  await firstPartnerOption.click();

  // Select Delivery Method
  await selectValue(page, d, "ffmnt-delivery", "Event-Based");

  // Save
  await clickSave(page);
  await waitForDrawerClosed(page);
  await waitForSavingDone(page);

  // Find and reopen
  await page.getByTestId("rewards-search-input").fill(rewardName);
  await expect(page.locator("tr[data-testid^='rewards-row-']")).toHaveCount(1, { timeout: 10_000 });
  await page.locator("tr[data-testid^='rewards-row-']").first().locator("button[title='Edit']").click();
  await page.getByTestId("reward-form-drawer").waitFor({ timeout: 5_000 });
  await drawer(page).locator("textarea").first().waitFor({ timeout: 5_000 });

  // Verify fulfillment tab values
  await clickTab(drawer(page), "Fulfillment");
  await expect(d.locator('[data-testid="ffmnt-type-select-trigger"]')).toContainText("External Fulfillment");
  await expect(d.locator('[data-testid="ffmnt-partner-select-trigger"]')).not.toContainText("Select partner");
  await expect(d.locator('[data-testid="ffmnt-delivery-select-trigger"]')).toContainText("Event-Based");

  // Close and delete
  await clickCancel(page);
  await waitForDrawerClosed(page);
  await page.locator("tr[data-testid^='rewards-row-']").first().locator("button[title='Delete']").click();
  await page.getByRole("button", { name: "Delete" }).click();
  await waitForSavingDone(page);
});
```

**Step 2: Run test**
Run: `npx playwright test e2e/reward-catalog.spec.ts -g "External Fulfillment"`

**Step 3: Commit**
```bash
git commit -m "test: e2e for single reward with External Fulfillment"
```

---

### Task 5: E2E test — Single reward with Points fulfillment

**Files:**
- Modify: `e2e/reward-catalog.spec.ts`

**Step 1: Add the test**

```typescript
test("create reward with Points fulfillment, verify persistence, delete", async ({ page }) => {
  const rewardName = `PtsFfmnt ${uniqueSuffix()}`;
  await openAddDrawer(page);
  await nameInput(page).fill(rewardName);

  const d = drawer(page);
  await clickTab(d, "Fulfillment");

  // Select Points
  await selectValue(page, d, "ffmnt-type", "Points");

  // Select Currency (first available non-qualifying purse policy)
  const currTrigger = d.locator('[data-testid="ffmnt-currency-select-trigger"]');
  await currTrigger.click();
  const firstCurrency = page.locator('[data-testid^="ffmnt-currency-select-option-"]').first();
  await firstCurrency.click();

  // Fill Points
  const pointsInput = d.locator('input[type="number"]').first();
  await pointsInput.fill("500");

  // Expand Advanced Settings
  await d.locator('button:has-text("Advanced Settings")').click();

  // Select Expiration Type = Custom
  await selectValue(page, d, "ffmnt-exp-type", "Custom");

  // Fill Expiry Value — locate the FormattedNumberInput inside the "Expire after" row
  const expiryValueInput = d.locator('text=Expire after').locator('..').locator('input').first();
  await expiryValueInput.fill("30");

  // Save
  await clickSave(page);
  await waitForDrawerClosed(page);
  await waitForSavingDone(page);

  // Find and reopen
  await page.getByTestId("rewards-search-input").fill(rewardName);
  await expect(page.locator("tr[data-testid^='rewards-row-']")).toHaveCount(1, { timeout: 10_000 });
  await page.locator("tr[data-testid^='rewards-row-']").first().locator("button[title='Edit']").click();
  await page.getByTestId("reward-form-drawer").waitFor({ timeout: 5_000 });
  await drawer(page).locator("textarea").first().waitFor({ timeout: 5_000 });

  // Verify
  await clickTab(drawer(page), "Fulfillment");
  await expect(d.locator('[data-testid="ffmnt-type-select-trigger"]')).toContainText("Points");
  await expect(d.locator('[data-testid="ffmnt-currency-select-trigger"]')).not.toContainText("Select currency");

  // Expand Advanced and check expiration
  await d.locator('button:has-text("Advanced Settings")').click();
  await expect(d.locator('[data-testid="ffmnt-exp-type-select-trigger"]')).toContainText("Custom");

  // Close and delete
  await clickCancel(page);
  await waitForDrawerClosed(page);
  await page.locator("tr[data-testid^='rewards-row-']").first().locator("button[title='Delete']").click();
  await page.getByRole("button", { name: "Delete" }).click();
  await waitForSavingDone(page);
});
```

**Step 2: Run test**
Run: `npx playwright test e2e/reward-catalog.spec.ts -g "Points fulfillment"`

**Step 3: Commit**
```bash
git commit -m "test: e2e for single reward with Points fulfillment"
```

---

### Task 6: E2E test — Single reward with Tier Status fulfillment

**Files:**
- Modify: `e2e/reward-catalog.spec.ts`

**Step 1: Add the test**

```typescript
test("create reward with Tier Status fulfillment, verify persistence, delete", async ({ page }) => {
  const rewardName = `TierFfmnt ${uniqueSuffix()}`;
  await openAddDrawer(page);
  await nameInput(page).fill(rewardName);

  const d = drawer(page);
  await clickTab(d, "Fulfillment");

  // Select Tier Status — this auto-selects first policy and second level
  await selectValue(page, d, "ffmnt-type", "Tier Status");

  // Wait for auto-selection to populate
  await expect(d.locator('[data-testid="ffmnt-tier-policy-select-trigger"]')).not.toContainText("Select tier policy", { timeout: 5_000 });
  await expect(d.locator('[data-testid="ffmnt-tier-level-select-trigger"]')).not.toContainText("Select tier level", { timeout: 5_000 });

  // Read auto-selected values for later verification
  const policyText = await d.locator('[data-testid="ffmnt-tier-policy-select-trigger"]').innerText();
  const levelText = await d.locator('[data-testid="ffmnt-tier-level-select-trigger"]').innerText();

  // Toggle off "use defaults" and set duration
  const useDefaultsSwitch = d.locator('label:has-text("Use level defaults") button[role="switch"]');
  await useDefaultsSwitch.click();
  // Fill duration value
  const durationInput = d.locator('input[type="number"]').last();
  await durationInput.fill("90");
  // Select duration unit
  await selectValue(page, d, "ffmnt-tier-dur-unit", "Days");

  // Save
  await clickSave(page);
  await waitForDrawerClosed(page);
  await waitForSavingDone(page);

  // Find and reopen
  await page.getByTestId("rewards-search-input").fill(rewardName);
  await expect(page.locator("tr[data-testid^='rewards-row-']")).toHaveCount(1, { timeout: 10_000 });
  await page.locator("tr[data-testid^='rewards-row-']").first().locator("button[title='Edit']").click();
  await page.getByTestId("reward-form-drawer").waitFor({ timeout: 5_000 });
  await drawer(page).locator("textarea").first().waitFor({ timeout: 5_000 });

  // Verify
  await clickTab(drawer(page), "Fulfillment");
  await expect(d.locator('[data-testid="ffmnt-type-select-trigger"]')).toContainText("Tier Status");
  await expect(d.locator('[data-testid="ffmnt-tier-policy-select-trigger"]')).toContainText(policyText);
  await expect(d.locator('[data-testid="ffmnt-tier-level-select-trigger"]')).toContainText(levelText);

  // Verify use-defaults is off and duration persisted
  const switchEl = d.locator('label:has-text("Use level defaults") button[role="switch"]');
  await expect(switchEl).toHaveAttribute("aria-checked", "false");

  // Close and delete
  await clickCancel(page);
  await waitForDrawerClosed(page);
  await page.locator("tr[data-testid^='rewards-row-']").first().locator("button[title='Delete']").click();
  await page.getByRole("button", { name: "Delete" }).click();
  await waitForSavingDone(page);
});
```

**Step 2: Run test**
Run: `npx playwright test e2e/reward-catalog.spec.ts -g "Tier Status fulfillment"`

**Step 3: Commit**
```bash
git commit -m "test: e2e for single reward with Tier Status fulfillment"
```

---

### Task 7: E2E test — Bulk edit External Fulfillment

**Files:**
- Modify: `e2e/reward-catalog.spec.ts`

**Step 1: Add the test**

```typescript
test("bulk edit fulfillment to External, verify, revert", async ({ page }) => {
  // Select 2 rewards
  await selectRewards(page, 2);
  await openBulkEdit(page);

  const bd = bulkDrawer(page);
  await bd.locator("button[role='tab']:has-text('Fulfillment')").click();

  // Enable and set Fulfillment Type
  const ffmntTypeCheckbox = bd.locator('[data-testid="bulk-field-toggle-ffmntType"]');
  await ffmntTypeCheckbox.click();
  await selectValue(page, bd, "bulk-ffmnt-type", "External Fulfillment");

  // Enable and set Partner
  const partnerCheckbox = bd.locator('[data-testid="bulk-field-toggle-ffmntPartner"]');
  await partnerCheckbox.click();
  const partnerTrigger = bd.locator('[data-testid="bulk-ffmnt-partner-select-trigger"]');
  await partnerTrigger.click();
  await page.locator('[data-testid^="bulk-ffmnt-partner-select-option-"]').first().click();

  // Enable and set Delivery Method
  const deliveryCheckbox = bd.locator('[data-testid="bulk-field-toggle-ffmntDeliveryMethod"]');
  await deliveryCheckbox.click();
  await selectValue(page, bd, "bulk-ffmnt-delivery", "Batch");

  // Apply
  await bd.locator("button:has-text('Apply to')").click();
  // Confirm
  await page.getByRole("button", { name: "Apply" }).click();
  await waitForBulkDrawerClosed(page);
  await waitForSavingDone(page);

  // Verify first reward
  await openEditDrawerForFirstReward(page);
  await clickTab(drawer(page), "Fulfillment");
  await expect(drawer(page).locator('[data-testid="ffmnt-type-select-trigger"]')).toContainText("External Fulfillment");
  await clickCancel(page);
  await waitForDrawerClosed(page);

  // Revert: bulk edit back to Discount
  await selectRewards(page, 2);
  await openBulkEdit(page);
  await bulkDrawer(page).locator("button[role='tab']:has-text('Fulfillment')").click();
  await bulkDrawer(page).locator('[data-testid="bulk-field-toggle-ffmntType"]').click();
  await selectValue(page, bulkDrawer(page), "bulk-ffmnt-type", "Discount");
  await bulkDrawer(page).locator("button:has-text('Apply to')").click();
  await page.getByRole("button", { name: "Apply" }).click();
  await waitForBulkDrawerClosed(page);
  await waitForSavingDone(page);
});
```

**Step 2: Run test**
Run: `npx playwright test e2e/reward-catalog.spec.ts -g "bulk edit fulfillment to External"`

**Step 3: Commit**
```bash
git commit -m "test: e2e for bulk edit External Fulfillment"
```

---

### Task 8: E2E test — Bulk edit Points fulfillment

**Files:**
- Modify: `e2e/reward-catalog.spec.ts`

**Step 1: Add the test**

```typescript
test("bulk edit fulfillment to Points, verify, revert", async ({ page }) => {
  await selectRewards(page, 2);
  await openBulkEdit(page);

  const bd = bulkDrawer(page);
  await bd.locator("button[role='tab']:has-text('Fulfillment')").click();

  // Enable and set type
  await bd.locator('[data-testid="bulk-field-toggle-ffmntType"]').click();
  await selectValue(page, bd, "bulk-ffmnt-type", "Points");

  // Enable and set Currency
  await bd.locator('[data-testid="bulk-field-toggle-ffmntCurrency"]').click();
  const currTrigger = bd.locator('[data-testid="bulk-ffmnt-currency-select-trigger"]');
  await currTrigger.click();
  await page.locator('[data-testid^="bulk-ffmnt-currency-select-option-"]').first().click();

  // Enable and set Points
  await bd.locator('[data-testid="bulk-field-toggle-ffmntPoints"]').click();
  await bd.locator('input[type="number"]').last().fill("250");

  // Apply
  await bd.locator("button:has-text('Apply to')").click();
  await page.getByRole("button", { name: "Apply" }).click();
  await waitForBulkDrawerClosed(page);
  await waitForSavingDone(page);

  // Verify first reward
  await openEditDrawerForFirstReward(page);
  await clickTab(drawer(page), "Fulfillment");
  await expect(drawer(page).locator('[data-testid="ffmnt-type-select-trigger"]')).toContainText("Points");
  await clickCancel(page);
  await waitForDrawerClosed(page);

  // Revert
  await selectRewards(page, 2);
  await openBulkEdit(page);
  await bulkDrawer(page).locator("button[role='tab']:has-text('Fulfillment')").click();
  await bulkDrawer(page).locator('[data-testid="bulk-field-toggle-ffmntType"]').click();
  await selectValue(page, bulkDrawer(page), "bulk-ffmnt-type", "Discount");
  await bulkDrawer(page).locator("button:has-text('Apply to')").click();
  await page.getByRole("button", { name: "Apply" }).click();
  await waitForBulkDrawerClosed(page);
  await waitForSavingDone(page);
});
```

**Step 2: Run test**
Run: `npx playwright test e2e/reward-catalog.spec.ts -g "bulk edit fulfillment to Points"`

**Step 3: Commit**
```bash
git commit -m "test: e2e for bulk edit Points fulfillment"
```

---

### Task 9: E2E test — Bulk edit Tier Status fulfillment

**Files:**
- Modify: `e2e/reward-catalog.spec.ts`

**Step 1: Add the test**

```typescript
test("bulk edit fulfillment to Tier Status, verify, revert", async ({ page }) => {
  await selectRewards(page, 2);
  await openBulkEdit(page);

  const bd = bulkDrawer(page);
  await bd.locator("button[role='tab']:has-text('Fulfillment')").click();

  // Enable and set type
  await bd.locator('[data-testid="bulk-field-toggle-ffmntType"]').click();
  await selectValue(page, bd, "bulk-ffmnt-type", "Tier Status");

  // Enable and set Tier Policy
  await bd.locator('[data-testid="bulk-field-toggle-ffmntTierPolicy"]').click();
  const policyTrigger = bd.locator('[data-testid="bulk-ffmnt-tier-policy-select-trigger"]');
  await policyTrigger.click();
  await page.locator('[data-testid^="bulk-ffmnt-tier-policy-select-option-"]').first().click();

  // Enable and set Tier Level
  await bd.locator('[data-testid="bulk-field-toggle-ffmntTierLevel"]').click();
  const levelTrigger = bd.locator('[data-testid="bulk-ffmnt-tier-level-select-trigger"]');
  await levelTrigger.click();
  await page.locator('[data-testid^="bulk-ffmnt-tier-level-select-option-"]').first().click();

  // Apply
  await bd.locator("button:has-text('Apply to')").click();
  await page.getByRole("button", { name: "Apply" }).click();
  await waitForBulkDrawerClosed(page);
  await waitForSavingDone(page);

  // Verify first reward
  await openEditDrawerForFirstReward(page);
  await clickTab(drawer(page), "Fulfillment");
  await expect(drawer(page).locator('[data-testid="ffmnt-type-select-trigger"]')).toContainText("Tier Status");
  await clickCancel(page);
  await waitForDrawerClosed(page);

  // Revert
  await selectRewards(page, 2);
  await openBulkEdit(page);
  await bulkDrawer(page).locator("button[role='tab']:has-text('Fulfillment')").click();
  await bulkDrawer(page).locator('[data-testid="bulk-field-toggle-ffmntType"]').click();
  await selectValue(page, bulkDrawer(page), "bulk-ffmnt-type", "Discount");
  await bulkDrawer(page).locator("button:has-text('Apply to')").click();
  await page.getByRole("button", { name: "Apply" }).click();
  await waitForBulkDrawerClosed(page);
  await waitForSavingDone(page);
});
```

**Step 2: Run test**
Run: `npx playwright test e2e/reward-catalog.spec.ts -g "bulk edit fulfillment to Tier Status"`

**Step 3: Commit**
```bash
git commit -m "test: e2e for bulk edit Tier Status fulfillment"
```

---

### Task 10: Run all e2e tests together

**Step 1: Run full e2e suite**
Run: `npx playwright test e2e/reward-catalog.spec.ts`
Expected: All tests pass.

**Step 2: Commit any fixes needed**
