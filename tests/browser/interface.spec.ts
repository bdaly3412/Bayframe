import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { test, expect, type Page, type TestInfo } from "@playwright/test";

const workshopId = process.env.BAYFRAME_WORKSHOP_ID ?? "baf00000-0000-4000-8000-000000000001";
const schedule = `/staff/schedule?workshop=${workshopId}`;
const out = "output/playwright/redesign";
test.use({ screenshot: "off" });

async function signIn(page: Page) {
  const accounts = JSON.parse(readFileSync("output/demo-credentials.txt", "utf8")) as Record<string, { email: string; password: string }>;
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(accounts.manager.email);
  await page.getByLabel("Password", { exact: true }).fill(accounts.manager.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/staff$/);
}

async function reflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

async function capture(page: Page, name: string) {
  await expect(page.getByText("Loading workshop records…", { exact: true })).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${out}/${name}.png`, animations: "disabled" });
}

async function measure(page: Page, testInfo: TestInfo, name: string) {
  const measurements = await page.evaluate(() => {
    const recorded = window as unknown as { bayframeLayoutShift: { value: number } };
    return { layoutShiftSum: recorded.bayframeLayoutShift.value, documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth };
  });
  const result = { ...measurements, sample: name.includes("200-percent") ? "after intentional 200% text resize" : "initial viewport render", metric: "sum of layout shifts without recent input; not session-window CLS" };
  writeFileSync(`${out}/${name}.json`, `${JSON.stringify(result, null, 2)}\n`);
  await testInfo.attach(name, { body: JSON.stringify(result), contentType: "application/json" });
}

const views = [
  { name: "entry", path: "/", staff: false, heading: "Your next step" },
  { name: "login", path: "/login", staff: false, heading: "Staff sign in" },
  { name: "request", path: "/request", staff: false, heading: "Request a workshop appointment" },
  { name: "decision-invalid", path: "/decision#invalid-synthetic-link", staff: false, heading: "Review your estimate" },
  { name: "workshops", path: "/staff", staff: true, heading: "Your workshops" },
  { name: "resources", path: `/staff/resources?workshop=${workshopId}`, staff: true, heading: "Workshop resources" },
  { name: "schedule", path: schedule, staff: true, heading: "Schedule" },
  { name: "work", path: `${schedule}&view=work`, staff: true, heading: "Work orders" },
  { name: "absences", path: `${schedule}&view=absences`, staff: true, heading: "Resource absences" },
  { name: "history", path: `${schedule}&view=history`, staff: true, heading: "Recent audit history" },
];

for (const view of views) {
  test(`${view.name}: responsive evidence and text resizing`, async ({ page }, testInfo) => {
    mkdirSync(out, { recursive: true });
    const errors: string[] = [];
    await page.addInitScript(() => {
      const shift = { value: 0 };
      Object.assign(window, { bayframeLayoutShift: shift });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
          if (!entry.hadRecentInput) shift.value += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    if (view.staff) await signIn(page);
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      await page.goto(view.path);
      await expect(page.getByRole("heading", { name: view.heading, exact: true })).toBeVisible();
      if (view.name === "decision-invalid") await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
      await reflow(page);
      await capture(page, `${view.name}-${width}`);
      await measure(page, testInfo, `${view.name}-${width}-measurements`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(view.path);
    await expect(page.getByRole("heading", { name: view.heading, exact: true })).toBeVisible();
    if (view.name === "decision-invalid") await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
    await page.addStyleTag({ content: "html { font-size: 32px !important; }" });
    await reflow(page);
    await capture(page, `${view.name}-200-percent-text`);
    await measure(page, testInfo, `${view.name}-200-percent-text-measurements`);
    writeFileSync(`${out}/${view.name}-console.json`, `${JSON.stringify({ consoleOrPageErrorCount: errors.length }, null, 2)}\n`);
    expect(errors).toEqual([]);
  });
}

test("failed sign in keeps email and focuses recoverable feedback", async ({ page }) => {
  await page.goto("/login");
  const email = "failed-login.synthetic@example.test";
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("incorrect-synthetic-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const alert = page.getByRole("main").getByRole("alert");
  await expect(alert).toContainText("Sign in failed");
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(email);
  await expect(alert.locator("..")).toBeFocused();
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await expect(page).toHaveURL(/\/login$/);
});

test("request connection failure preserves long synthetic input and focuses its error", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/request");
  const form = page.getByRole("form", { name: "Request appointment", exact: true });
  const name = `Synthetic booking ${"LongName".repeat(12)}`;
  const email = `${"long".repeat(25)}@example.test`;
  await form.getByLabel("Booking contact").fill(name);
  await form.getByLabel("Email", { exact: true }).fill(email);
  await form.getByLabel("Vehicle registration").fill("SYNTHETIC12345678901");
  await form.getByLabel("Requested start (absolute time)").fill("2032-10-25T09:00:00+00:00");
  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST" && route.request().headers()["next-action"]) await route.abort("failed");
    else await route.continue();
  });
  await form.getByRole("button", { name: "Request appointment", exact: true }).click();
  const alert = form.getByRole("alert");
  await expect(alert).toContainText("connection failed");
  await expect(form.getByLabel("Booking contact")).toHaveValue(name);
  await expect(form.getByLabel("Email", { exact: true })).toHaveValue(email);
  await expect(form.getByLabel("Vehicle registration")).toHaveValue("SYNTHETIC12345678901");
  await expect(alert.locator("..")).toBeFocused();
  await reflow(page);
  mkdirSync(out, { recursive: true });
  await capture(page, "request-connection-error-320");
});

test("invalid request time links its field error and preserves input for correction", async ({ page }) => {
  await page.goto("/request");
  const form = page.getByRole("form", { name: "Request appointment", exact: true });
  await form.getByLabel("Booking contact").fill("Synthetic correction fixture");
  await form.getByLabel("Email", { exact: true }).fill("correction@example.test");
  await form.getByLabel("Vehicle registration").fill("SYNTHETIC123");
  const time = form.getByLabel("Requested start (absolute time)");
  await time.fill("2032-10-25T09:00:00");
  await form.getByRole("button", { name: "Request appointment", exact: true }).click();
  const alert = form.getByRole("alert");
  await expect(alert).toBeVisible();
  await expect(alert.locator("..")).toBeFocused();
  await expect(time).toHaveAttribute("aria-invalid", "true");
  const errorId = await alert.locator("..").getAttribute("id");
  expect(errorId).toBeTruthy();
  expect((await time.getAttribute("aria-describedby"))?.split(" ")).toContain(errorId);
  await form.getByRole("button", { name: "Correct requested start time", exact: true }).click();
  await expect(time).toBeFocused();
  await expect(time).toHaveValue("2032-10-25T09:00:00");
  await expect(form.getByLabel("Booking contact")).toHaveValue("Synthetic correction fixture");
});

test("keyboard skip navigation and local timeline scrolling remain usable", async ({ page }) => {
  await signIn(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(schedule);
  await expect(page.getByRole("heading", { name: "Schedule", exact: true })).toBeVisible();
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content", exact: true });
  await expect(skip).toBeFocused();
  const focus = await skip.evaluate((element) => ({ style: getComputedStyle(element).outlineStyle, width: parseFloat(getComputedStyle(element).outlineWidth) }));
  expect(focus.style).not.toBe("none");
  expect(focus.width).toBeGreaterThan(0);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  const navigation = page.locator("details.mobile-navigation");
  const summary = navigation.locator("summary");
  await summary.focus();
  await expect(summary).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(navigation).toHaveAttribute("open", "");
  await page.keyboard.press("Tab");
  await expect(navigation.getByRole("link", { name: "Schedule", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Enter");
  await expect(navigation).not.toHaveAttribute("open");
  const timeline = page.getByRole("region", { name: "Scrollable resource timeline", exact: true });
  await timeline.focus();
  await expect(timeline).toBeFocused();
  expect(await timeline.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => timeline.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await reflow(page);
});

test("empty reservation day remains explicit with a working detailed schedule", async ({ page }) => {
  await signIn(page);
  await page.goto(`${schedule}&day=2099-01-01`);
  await expect(page.getByText("No confirmed reservations on this day.", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Appointment requests and schedule", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Show day", exact: true })).toBeEnabled();
});
