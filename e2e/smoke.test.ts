/**
 * E2E smoke test — AHK Manager
 *
 * Tests the React UI in a plain Chromium browser with a Tauri IPC mock.
 * No real Tauri/Rust process is needed.
 *
 * Run:  npx playwright test --project=chromium
 *       npx playwright test --headed          (to watch)
 */
import { test, expect, Page } from "@playwright/test";
import { tauriMockScript } from "./tauri-mock";

// ── Helper: inject mock + navigate ────────────────────────────────────────────

async function loadApp(page: Page) {
  await page.addInitScript(tauriMockScript());
  await page.goto("/");
  await page.waitForSelector(".app", { timeout: 12_000 });
}

// Helper: create a profile and wait for the content area
async function createProfile(page: Page) {
  await page.locator(".sidebar-foot button").click();
  await expect(page.locator(".content .content-head")).toBeVisible({ timeout: 3_000 });
}

// Helper: open "Add Hotkey" modal, fill trigger + text, save
async function addHotkey(page: Page, trigger: string, text: string) {
  // Click "Add Hotkey" button in toolbar (may be "Add hotkey" in empty state)
  const btn = page.locator("button", { hasText: /^Add [Hh]otkey$/ }).first();
  await btn.click();
  await expect(page.locator(".modal-backdrop")).toBeVisible();

  // Click the recorder div to start listening, then press the shortcut
  const recorder = page.locator(".recorder");
  await recorder.click();
  await expect(recorder).toHaveClass(/listening/);
  await page.keyboard.press(trigger);           // e.g. "Control+a"
  await expect(recorder).not.toHaveClass(/listening/, { timeout: 2_000 });

  // Fill in the action value (textarea)
  await page.locator("textarea").first().fill(text);

  // Save
  await page.locator(".modal-foot button", { hasText: /Add hotkey/i }).click();
  await expect(page.locator(".modal-backdrop")).not.toBeVisible({ timeout: 3_000 });
}

// ── 1. App shell loads ────────────────────────────────────────────────────────

test("app loads and shows the main shell", async ({ page }) => {
  await loadApp(page);

  await expect(page.locator(".titlebar")).toBeVisible();
  await expect(page.locator(".titlebar-logo")).toContainText("AHK Manager");
  await expect(page.locator(".sidebar")).toBeVisible();
  await expect(page.locator(".actionbar")).toBeVisible();
});

// ── 2. Create a profile ───────────────────────────────────────────────────────

test("create profile — appears in sidebar and opens content", async ({ page }) => {
  await loadApp(page);

  await createProfile(page);

  // Sidebar shows one profile item
  await expect(page.locator(".profile-item")).toHaveCount(1);

  // Content area subtitle shows "0 hotkeys"
  await expect(page.locator(".profile-sub")).toContainText("0 hotkeys");
});

// ── 3. Add a hotkey ───────────────────────────────────────────────────────────

test("add hotkey — appears in table", async ({ page }) => {
  await loadApp(page);
  await createProfile(page);
  await addHotkey(page, "Control+a", "Hello, world!");

  // Table shows one row
  await expect(page.locator("table tbody tr")).toHaveCount(1);

  // Profile subtitle updates
  await expect(page.locator(".profile-sub")).toContainText("1 hotkey");
});

// ── 4. Apply profile ──────────────────────────────────────────────────────────

test("apply profile — status pill shows Running", async ({ page }) => {
  await loadApp(page);
  await createProfile(page);
  await addHotkey(page, "Control+b", "test");

  // Click Apply in action bar
  await page.locator(".actionbar button", { hasText: "Apply" }).click();

  // StatusPill becomes "Running"
  await expect(page.locator(".status-pill.running")).toBeVisible({ timeout: 5_000 });

  // Action bar now shows Stop
  await expect(page.locator(".actionbar button", { hasText: "Stop" })).toBeVisible();
});

// ── 5. Stop script ────────────────────────────────────────────────────────────

test("stop script — status pill shows Stopped", async ({ page }) => {
  await loadApp(page);
  await createProfile(page);
  await addHotkey(page, "Control+c", "test");

  await page.locator(".actionbar button", { hasText: "Apply" }).click();
  await expect(page.locator(".status-pill.running")).toBeVisible({ timeout: 5_000 });

  await page.locator(".actionbar button", { hasText: "Stop" }).click();

  await expect(page.locator(".status-pill:not(.running)")).toBeVisible({ timeout: 3_000 });
  await expect(page.locator(".actionbar button", { hasText: "Apply" })).toBeVisible();
});

// ── 6. Delete a hotkey ────────────────────────────────────────────────────────

test("delete hotkey — removed from table", async ({ page }) => {
  await loadApp(page);
  await createProfile(page);
  await addHotkey(page, "Control+d", "delete me");

  await expect(page.locator("table tbody tr")).toHaveCount(1);

  // Hover the row to reveal action buttons
  const row = page.locator("table tbody tr").first();
  await row.hover();

  // Click the Delete button (danger ghost icon)
  await row.locator("button[title='Delete']").click();

  // Confirm dialog
  await expect(page.locator(".modal-backdrop")).toBeVisible();
  await page.locator(".modal-foot button", { hasText: "Delete" }).click();

  // Table is now empty
  await expect(page.locator("table tbody tr")).toHaveCount(0, { timeout: 3_000 });

  // Empty state shown
  await expect(page.locator(".empty-title")).toContainText("No hotkeys yet");
});

// ── 7. Settings modal opens and closes ───────────────────────────────────────

test("settings modal opens and closes", async ({ page }) => {
  await loadApp(page);

  await page.locator(".win-ctrl[title='Settings']").click();

  await expect(page.locator(".modal")).toBeVisible();
  await expect(page.locator(".modal")).toContainText("AutoHotkey");

  // Cancel
  await page.locator(".modal-foot button", { hasText: "Cancel" }).click();
  await expect(page.locator(".modal-backdrop")).not.toBeVisible();
});

// ── 8. Search filters hotkeys ─────────────────────────────────────────────────

test("search filters hotkey rows", async ({ page }) => {
  await loadApp(page);
  await createProfile(page);
  await addHotkey(page, "Control+e", "Email signature here");
  await addHotkey(page, "Control+w", "Website URL value");

  await expect(page.locator("table tbody tr")).toHaveCount(2);

  // Search narrows to one row
  await page.locator(".toolbar input[placeholder*='Search']").fill("email");
  await expect(page.locator("table tbody tr")).toHaveCount(1);

  // Clear — both rows reappear
  await page.locator(".toolbar input[placeholder*='Search']").fill("");
  await expect(page.locator("table tbody tr")).toHaveCount(2);
});

// ── 9. Keyboard shortcut Ctrl+N opens modal ──────────────────────────────────

test("Ctrl+N shortcut opens new hotkey modal", async ({ page }) => {
  await loadApp(page);
  await createProfile(page);

  await page.keyboard.press("Control+n");

  await expect(page.locator(".modal-backdrop")).toBeVisible({ timeout: 2_000 });
  await expect(page.locator(".modal")).toContainText("New Hotkey");

  // Escape closes
  await page.keyboard.press("Escape");
  await expect(page.locator(".modal-backdrop")).not.toBeVisible({ timeout: 2_000 });
});
