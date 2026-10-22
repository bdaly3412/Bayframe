import { randomBytes, randomInt } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { test, expect, type Locator, type Page } from "@playwright/test";

const workshopId = process.env.BAYFRAME_WORKSHOP_ID ?? "baf00000-0000-4000-8000-000000000001";
const scheduleUrl = `/staff/schedule?workshop=${workshopId}`;
test.use({ screenshot: "off" });

async function signIn(page: Page, role: "manager" | "technician") {
  const accounts = JSON.parse(readFileSync("output/demo-credentials.txt", "utf8")) as Record<string, { email: string; password: string }>;
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(accounts[role].email);
  await page.getByLabel("Password", { exact: true }).fill(accounts[role].password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/staff$/);
}

const actionForm = (container: Page | Locator, command: string) => container.locator(`form:has(input[name="command"][value="${command}"])`);

function futureSlot() {
  const date = new Date(Date.UTC(2032, 0, 1 + randomInt(2500), 10));
  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString();
}

async function captureWidths(page: Page, name: string) {
  mkdirSync("output/playwright/redesign", { recursive: true });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    await expect(page.getByText("Loading workshop records…", { exact: true })).toHaveCount(0);
    if (name === "work-selected") await page.locator("article.work-order").scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    if (name.startsWith("decision-")) {
      const table = page.getByRole("region", { name: "Estimate line items", exact: true });
      const size = await table.evaluate((element) => ({ scroll: element.scrollWidth, frame: element.clientWidth }));
      expect(size.scroll <= size.frame + 1, `${name} at ${width}px: table ${size.scroll}px / frame ${size.frame}px`).toBe(true);
      for (const price of await table.locator("tbody td:last-child").all()) {
        const box = await price.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
      }
    }
    await page.screenshot({ path: `output/playwright/redesign/${name}-${width}.png`, animations: "disabled" });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
}

async function submitRequest(page: Page, name: string, startAt: string, registration = `BF${randomBytes(4).toString("hex").toUpperCase()}`) {
  await page.goto("/request");
  const form = actionForm(page, "request");
  await form.getByLabel("Booking contact").fill(name);
  await form.getByLabel("Email", { exact: true }).fill("browser.fixture@example.test");
  await form.getByLabel("Vehicle registration").fill(registration);
  await form.getByLabel("Requested start (absolute time)").fill(startAt);
  await form.getByRole("button", { name: "Request appointment", exact: true }).click();
  await expect(form.getByRole("status")).toContainText("Request received. Reference");
  const message = await form.getByRole("status").textContent();
  const id = message?.match(/Reference ([a-f0-9-]{36})\./)?.[1];
  if (!id) throw new Error("The request acknowledgement did not contain a booking reference.");
  return id;
}

async function chooseResources(row: Locator) {
  await row.locator("summary").click();
  const form = actionForm(row, "confirm");
  await form.getByRole("combobox", { name: "Bay", exact: true }).selectOption({ label: "Bay 1" });
  await form.getByRole("combobox", { name: "Technician", exact: true }).selectOption({ label: "Demo technician" });
  await form.getByRole("button", { name: "Confirm booking", exact: true }).click();
  return form;
}

test("staff entry points deny anonymous and another workshop", async ({ page }) => {
  await page.goto(`/staff/resources?workshop=${workshopId}`);
  await expect(page).toHaveURL(/\/login$/);
  await signIn(page, "manager");
  await page.goto("/staff/resources?workshop=baf00000-0000-4000-8000-000000000099");
  await expect(page).toHaveURL(/\/staff\?denied=1$/);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Access denied");
  await expect(page.getByText("Restricted fixture bay", { exact: true })).toHaveCount(0);
});

test("synthetic request, conflict handling, approved work and handover", async ({ page, browser }) => {
  const errors: string[] = [];
  function observe(target: Page) {
    target.on("pageerror", () => errors.push("pageerror"));
    target.on("console", (message) => { if (message.type() === "error") errors.push("console"); });
  }
  observe(page);
  const suffix = randomBytes(5).toString("hex"), name = `Browser fixture ${suffix}`, conflictName = `Conflict fixture ${suffix}`;
  const slot = futureSlot(), description = `Inspect and service fixture ${suffix}`;

  await page.goto("/request");
  const request = actionForm(page, "request");
  await request.getByLabel("Booking contact").fill(name);
  await request.getByLabel("Email", { exact: true }).fill("browser.fixture@example.test");
  await request.getByLabel("Vehicle registration").fill(`BF${suffix.toUpperCase()}`);
  await request.getByLabel("Requested start (absolute time)").fill(slot.slice(0, 19));
  await request.getByRole("button", { name: "Request appointment", exact: true }).click();
  await expect(request.getByRole("alert")).toBeVisible();
  await expect(request.getByRole("alert")).toHaveAttribute("data-outcome", "error");
  await expect(request.getByLabel("Booking contact")).toHaveValue(name);
  await expect(request.getByLabel("Email", { exact: true })).toHaveValue("browser.fixture@example.test");
  await expect(request.getByLabel("Requested start (absolute time)")).toHaveValue(slot.slice(0, 19));
  await request.getByLabel("Requested start (absolute time)").fill(slot);
  await request.getByRole("button", { name: "Request appointment", exact: true }).click();
  await expect(request.getByRole("status")).toContainText("Request received. Reference");
  await expect(request.getByRole("status")).toHaveAttribute("data-outcome", "success");
  await expect(request.getByRole("status")).toHaveCSS("color", "rgb(20, 92, 80)");
  const reference = (await request.getByRole("status").textContent())?.match(/Reference ([a-f0-9-]{36})\./)?.[1];
  if (!reference) throw new Error("The request acknowledgement did not contain a booking reference.");
  await submitRequest(page, conflictName, slot);

  await signIn(page, "manager");
  await page.goto(`${scheduleUrl}&day=${slot.slice(0,10)}`);
  const row = page.getByRole("row").filter({ hasText: name });
  await chooseResources(row);
  await expect(row.locator(".status")).toHaveText("confirmed");
  const timeline = page.getByRole("region", { name: "Scrollable resource timeline" });
  const reservation = timeline.getByRole("link", { name: new RegExp(`Booking ${reference.slice(0,8)} ·`) });
  await expect(reservation).toHaveCount(2);
  const labels = await reservation.evaluateAll((links) => links.map((link) => link.getAttribute("aria-label")));
  for (const label of labels) {
    expect(label).toContain(`BF${suffix.toUpperCase()} · Booking ${reference.slice(0,8)} ·`);
    expect(label).toMatch(/: .+ – .+ \(Europe\/London\)$/);
  }
  expect(labels.some((label) => label?.includes("Bay 1:"))).toBe(true);
  expect(labels.some((label) => label?.includes("Demo technician:"))).toBe(true);
  await page.getByRole("combobox", { name: "Booking state", exact: true }).selectOption("requested");
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await expect(row).toHaveCount(0);
  await reservation.first().click();
  await expect(page.locator(`#booking-${reference}`)).toBeFocused();
  await page.evaluate(() => window.scrollTo(0, 0));
  await captureWidths(page, "schedule-allocated");
  mkdirSync("output/playwright", { recursive: true });
  await page.screenshot({ path: "output/playwright/timeline-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "output/playwright/timeline-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });

  const scheduleTechContext = await browser.newContext({ baseURL: "http://127.0.0.1:3000" });
  const scheduleTech = await scheduleTechContext.newPage();
  await signIn(scheduleTech, "technician");
  await scheduleTech.goto(scheduleUrl);
  await expect(scheduleTech.getByRole("heading", { name: "Your scheduled appointments", exact: true })).toBeVisible();
  await expect(scheduleTech.getByText(`Booking ${reference.slice(0,8)} · confirmed`, { exact: false })).toBeVisible();
  await expect(scheduleTech.getByText("browser.fixture@example.test", { exact: true })).toHaveCount(0);
  await scheduleTechContext.close();

  const conflict = page.getByRole("row").filter({ hasText: conflictName });
  const rejectedConfirmation = await chooseResources(conflict);
  await expect(rejectedConfirmation.getByRole("alert")).toContainText("unavailable");
  await expect(conflict.locator(".status")).toHaveText("requested");
  page.once("dialog", (dialog) => dialog.accept());
  await actionForm(conflict, "cancel").getByRole("button", { name: "Cancel booking", exact: true }).click();
  await expect(conflict.locator(".status")).toHaveText("cancelled");

  await row.getByRole("button", { name: "Check in / create work order", exact: true }).click();
  await expect(row.locator(".status")).toHaveText("checked-in");
  await row.getByRole("link", { name: "Open work order", exact: true }).click();
  const work = page.locator("article.work-order").filter({ hasText: `Booking ${reference.slice(0, 8)}` });
  await expect(work.locator("header .status")).toHaveText("ready");
  await work.getByText("Add a task", { exact: true }).click();
  const task = actionForm(work, "add-task");
  await task.getByLabel("Task description").fill(description);
  await task.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(work.locator(".task-list")).toContainText(description);
  const taskAnchor = await work.locator(".task-list li").first().getAttribute("id");
  await work.getByRole("button", { name: "Start work", exact: true }).click();
  await expect(work.locator("header .status")).toHaveText("in-progress");
  await expect(work.getByRole("button", { name: "Mark task complete", exact: true })).toHaveCount(0);
  await expect(work.getByRole("button", { name: "Complete approved work", exact: true })).toHaveCount(0);

  await work.getByText("Prepare a new estimate version", { exact: true }).click();
  const draft = actionForm(work, "draft");
  await draft.getByLabel("Work / parts description").fill(description);
  await draft.getByLabel("Quantity", { exact: true }).fill("1");
  await draft.getByLabel("Unit price (£, excluding VAT)").fill("85.00");
  await draft.getByRole("button", { name: "Save draft version", exact: true }).click();
  await expect(work.getByText("Version 1 · draft", { exact: true })).toBeVisible();
  const issue = actionForm(work, "issue");
  await issue.getByRole("button", { name: "Issue exact version for customer decision", exact: true }).click();
  const linkField = issue.getByLabel("Copy decision link");
  await expect(linkField).toBeVisible();
  const decisionLink = await linkField.inputValue();
  const decisionPath = new URL(decisionLink).pathname;
  expect(decisionPath).toBe("/decision");

  const customerContext = await browser.newContext({ baseURL: "http://127.0.0.1:3000" });
  const customer = await customerContext.newPage();
  observe(customer);
  const capabilityTokens = [new URL(decisionLink).hash.slice(1)];
  let capabilityLeaks = 0;
  customer.on("request", (request) => {
    if (capabilityTokens.some((token) => request.url().includes(token) || (request.headers()["referer"] ?? "").includes(token))) capabilityLeaks++;
  });
  await customer.goto(decisionLink);
  await expect(customer.getByRole("heading", { name: "Estimate version 1", exact: true })).toBeVisible();
  expect(new URL(customer.url()).hash === "" && new URL(customer.url()).search === "").toBe(true);
  await expect(customer.getByText(description, { exact: true })).toBeVisible();
  await captureWidths(customer, "decision-issued");
  customer.once("dialog", (dialog) => dialog.accept());
  await customer.getByRole("button", { name: "Reject estimate", exact: true }).click();
  await expect(customer.locator(".status")).toHaveText("rejected");
  await captureWidths(customer, "decision-rejected");

  async function prepareVersion(version: number) {
    if (!await draft.isVisible()) await work.getByText("Prepare a new estimate version", { exact: true }).click();
    await draft.getByLabel("Work / parts description").fill(`${description} version ${version}`);
    await draft.getByLabel("Quantity", { exact: true }).fill("1");
    await draft.getByLabel("Unit price (£, excluding VAT)").fill("90.00");
    await draft.getByRole("button", { name: "Save draft version", exact: true }).click();
    await expect(work.getByText(`Version ${version} · draft`, { exact: true })).toBeVisible();
  }
  async function issueCurrentVersion() {
    await issue.getByRole("button", { name: "Issue exact version for customer decision", exact: true }).click();
    await expect(linkField).toBeVisible();
    return linkField.inputValue();
  }
  await issue.getByRole("button", { name: "Refresh after copying link", exact: true }).click();
  await expect(linkField).toHaveCount(0);
  await expect(work.locator("header .status")).toHaveText("in-progress");
  await expect(work.getByRole("button", { name: "Mark task complete", exact: true })).toHaveCount(0);
  await prepareVersion(2);
  await issueCurrentVersion();
  await page.reload();
  await expect(work.locator("header .status")).toHaveText("awaiting-approval");
  await prepareVersion(3);
  await work.getByText("Add a task", { exact: true }).click();
  await task.getByLabel("Task description").fill(`${description} revised scope`);
  await task.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(work.locator(".task-list")).toContainText(`${description} revised scope`);
  const revisedLink = await issueCurrentVersion();
  capabilityTokens.push(new URL(revisedLink).hash.slice(1));
  await customer.goto(revisedLink);
  await expect(customer.getByRole("heading", { name: "Estimate version 3", exact: true })).toBeVisible();
  expect(new URL(customer.url()).hash === "" && new URL(customer.url()).search === "").toBe(true);
  customer.once("dialog", (dialog) => dialog.accept());
  await customer.getByRole("button", { name: "Accept and authorize work", exact: true }).click();
  await expect(customer.locator(".status")).toHaveText("accepted");
  await captureWidths(customer, "decision-accepted");
  expect(capabilityLeaks).toBe(0);
  await customerContext.close();

  const technicianContext = await browser.newContext({ baseURL: "http://127.0.0.1:3000" });
  const technician = await technicianContext.newPage();
  observe(technician);
  await signIn(technician, "technician");
  await technician.goto(`http://127.0.0.1:3000${scheduleUrl}`);
  await expect(technician.getByRole("heading", { name: "Appointment requests and schedule", exact: true })).toHaveCount(0);
  await expect(technician.getByText("browser.fixture@example.test", { exact: true })).toHaveCount(0);
  await technician.getByRole("navigation", { name: "Staff navigation", exact: true }).getByRole("link", { name: "Work orders", exact: true }).click();
  await technician.getByRole("navigation", { name: "Work orders", exact: true }).getByRole("link").filter({ hasText: `Booking ${reference.slice(0, 8)}` }).click();
  const assigned = technician.locator("article.work-order").filter({ hasText: `Booking ${reference.slice(0, 8)}` });
  await expect(assigned.locator("header .status")).toHaveText("in-progress");
  await expect(assigned.getByRole("button", { name: "Complete approved work", exact: true })).toHaveCount(0);
  await assigned.getByRole("button", { name: "Mark task complete", exact: true }).first().click();
  await expect(assigned.locator(".task-list")).toContainText(`Complete · ${description}`);
  await expect(assigned.getByRole("button", { name: "Complete approved work", exact: true })).toHaveCount(0);
  await assigned.getByRole("button", { name: "Mark task complete", exact: true }).click();
  await expect(assigned.locator(".task-list")).toContainText(`Complete · ${description} revised scope`);
  await assigned.getByRole("button", { name: "Complete approved work", exact: true }).click();
  await expect(assigned.locator("header .status")).toHaveText("completed");
  await technicianContext.close();

  await page.reload();
  await expect(work.locator("header .status")).toHaveText("completed");
  await captureWidths(page, "work-selected");
  await work.getByRole("button", { name: "Record handover and close", exact: true }).click();
  await expect(work.locator("header .status")).toHaveText("closed");
  await page.getByRole("navigation", { name: "Staff navigation", exact: true }).getByRole("link", { name: "History", exact: true }).click();
  const audit = page.getByRole("table", { name: "Latest 100 business events" });
  await expect(audit.getByRole("cell", { name: "customer-accepted", exact: true }).first()).toBeVisible();
  await expect(audit.getByRole("cell", { name: "close", exact: true }).first()).toBeVisible();
  const approvalEvent = audit.getByRole("row").filter({ has: page.getByRole("cell", { name: "customer-accepted", exact: true }) }).first();
  await approvalEvent.getByRole("link", { name: /^Estimate / }).click();
  await expect(page).not.toHaveURL(/work=null/);
  await expect(page.locator("article.work-order")).toContainText(`Booking ${reference.slice(0, 8)}`);
  await expect(page.locator('[id^="estimate-"]:focus')).toContainText("Version 3 · accepted");
  await page.getByRole("navigation", { name: "Staff navigation", exact: true }).getByRole("link", { name: "History", exact: true }).click();
  if (!taskAnchor) throw new Error("Task reference is missing.");
  await audit.getByRole("link", { name: `Task ${taskAnchor.slice(5,13)}`, exact: true }).first().click();
  await expect(page).toHaveURL(/view=work/);
  await expect(page.locator(`#${taskAnchor}`)).toBeFocused();

  mkdirSync("output/playwright", { recursive: true });
  await page.screenshot({ path: "output/playwright/schedule-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "output/playwright/schedule-mobile.png" });
  expect(errors).toEqual([]);
});

test("maximum-sized synthetic job context remains readable after storage", async ({ page }) => {
  const name = `Synthetic ${"N".repeat(110)}`;
  const registration = `BF${randomBytes(9).toString("hex").toUpperCase()}`;
  const description = `Synthetic task ${"T".repeat(485)}`;
  expect(name.length).toBe(120);
  expect(registration.length).toBe(20);
  expect(description.length).toBe(500);
  const reference = await submitRequest(page, name, futureSlot(), registration);
  await signIn(page, "manager");
  await page.goto(scheduleUrl);
  const row = page.locator(`#booking-${reference}`).locator("..");
  await chooseResources(row);
  await expect(row.locator(".status")).toHaveText("confirmed");
  await row.getByRole("button", { name: "Check in / create work order", exact: true }).click();
  await expect(row.locator(".status")).toHaveText("checked-in");
  await row.getByRole("link", { name: "Open work order", exact: true }).click();
  const work = page.locator("article.work-order");
  await expect(work).toContainText(`Booking ${reference.slice(0,8)}`);
  await expect(work).toContainText(name);
  await expect(work).toContainText(registration);
  await work.getByText("Add a task", { exact: true }).click();
  const task = actionForm(work, "add-task");
  await task.getByLabel("Task description").fill(description);
  await task.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(work.locator(".task-list")).toContainText(description);
  await page.reload();
  await expect(work.locator(".task-list")).toContainText(description);
  await expect(work).toContainText(name);
  await page.setViewportSize({ width: 390, height: 844 });
  const picker = page.getByRole("combobox", { name: "Work order", exact: true });
  const current = await picker.inputValue();
  const other = await picker.locator("option").evaluateAll((options, selected) => options.map((option) => option.getAttribute("value")).find((value) => value && value !== selected), current);
  expect(other).toBeTruthy();
  await picker.selectOption(other!);
  await page.getByRole("button", { name: "Open job", exact: true }).click();
  await expect(work).toHaveAttribute("id", `work-${other}`);
  await page.getByRole("combobox", { name: "Work order", exact: true }).selectOption(current);
  await page.getByRole("button", { name: "Open job", exact: true }).click();
  await expect(work).toHaveAttribute("id", `work-${current}`);
  await expect(work.locator(".task-list")).toContainText(description);
  await captureWidths(page, "work-long-content");
});
