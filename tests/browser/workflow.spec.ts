import { randomBytes, randomInt } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { test, expect, type Locator, type Page } from "@playwright/test";

const workshopId = process.env.BAYFRAME_WORKSHOP_ID ?? "baf00000-0000-4000-8000-000000000001";
const scheduleUrl = `/staff/schedule?workshop=${workshopId}`;

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

async function submitRequest(page: Page, name: string, startAt: string) {
  await page.goto("/request");
  const form = actionForm(page, "request");
  await form.getByLabel("Booking contact").fill(name);
  await form.getByLabel("Email", { exact: true }).fill("browser.fixture@example.test");
  await form.getByLabel("Vehicle registration").fill(`BF${randomBytes(4).toString("hex").toUpperCase()}`);
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
  await expect(request.getByLabel("Booking contact")).toHaveValue(name);
  await expect(request.getByLabel("Email", { exact: true })).toHaveValue("browser.fixture@example.test");
  await expect(request.getByLabel("Requested start (absolute time)")).toHaveValue(slot.slice(0, 19));
  await request.getByLabel("Requested start (absolute time)").fill(slot);
  await request.getByRole("button", { name: "Request appointment", exact: true }).click();
  await expect(request.getByRole("status")).toContainText("Request received. Reference");
  const reference = (await request.getByRole("status").textContent())?.match(/Reference ([a-f0-9-]{36})\./)?.[1];
  if (!reference) throw new Error("The request acknowledgement did not contain a booking reference.");
  await submitRequest(page, conflictName, slot);

  await signIn(page, "manager");
  await page.goto(`${scheduleUrl}&day=${slot.slice(0,10)}`);
  const row = page.getByRole("row").filter({ hasText: name });
  await chooseResources(row);
  await expect(row.locator(".status")).toHaveText("confirmed");
  const timeline = page.getByRole("region", { name: "Scrollable resource timeline" });
  const reservation = timeline.getByRole("link", { name: `Booking ${reference.slice(0,8)}`, exact: true });
  await expect(reservation).toHaveCount(2);
  await reservation.first().click();
  await expect(page.locator(`#booking-${reference}`)).toBeFocused();
  mkdirSync("output/playwright", { recursive: true });
  await page.screenshot({ path: "output/playwright/timeline-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "output/playwright/timeline-mobile.png", fullPage: true });
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
  await actionForm(conflict, "cancel").getByRole("button", { name: "Cancel booking", exact: true }).click();
  await expect(conflict.locator(".status")).toHaveText("cancelled");

  await row.getByRole("button", { name: "Check in / create work order", exact: true }).click();
  await expect(row.locator(".status")).toHaveText("checked-in");
  const work = page.locator("article.work-order").filter({ hasText: `Booking ${reference.slice(0, 8)}` });
  await expect(work.locator("header .status")).toHaveText("ready");
  await work.getByText("Add a task", { exact: true }).click();
  const task = actionForm(work, "add-task");
  await task.getByLabel("Task description").fill(description);
  await task.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(work.locator(".task-list")).toContainText(description);

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
  await customer.goto(decisionLink);
  await expect(customer.getByRole("heading", { name: "Estimate version 1", exact: true })).toBeVisible();
  await expect(customer.getByText(description, { exact: true })).toBeVisible();
  customer.once("dialog", (dialog) => dialog.accept());
  await customer.getByRole("button", { name: "Accept and authorize work", exact: true }).click();
  await expect(customer.locator(".status")).toHaveText("accepted");
  await customerContext.close();

  const technicianContext = await browser.newContext({ baseURL: "http://127.0.0.1:3000" });
  const technician = await technicianContext.newPage();
  await signIn(technician, "technician");
  await technician.goto(`http://127.0.0.1:3000${scheduleUrl}`);
  await expect(technician.getByRole("heading", { name: "Appointment requests and schedule", exact: true })).toHaveCount(0);
  await expect(technician.getByText("browser.fixture@example.test", { exact: true })).toHaveCount(0);
  const assigned = technician.locator("article.work-order").filter({ hasText: `Booking ${reference.slice(0, 8)}` });
  await expect(assigned.locator("header .status")).toHaveText("in-progress");
  await assigned.getByRole("button", { name: "Mark task complete", exact: true }).click();
  await expect(assigned.locator(".task-list")).toContainText(`Complete · ${description}`);
  await assigned.getByRole("button", { name: "Complete approved work", exact: true }).click();
  await expect(assigned.locator("header .status")).toHaveText("completed");
  await technicianContext.close();

  await page.reload();
  await expect(work.locator("header .status")).toHaveText("completed");
  await work.getByRole("button", { name: "Record handover and close", exact: true }).click();
  await expect(work.locator("header .status")).toHaveText("closed");
  const audit = page.getByRole("table", { name: "Latest 100 business events" });
  await expect(audit.getByRole("cell", { name: "customer-accepted", exact: true }).first()).toBeVisible();
  await expect(audit.getByRole("cell", { name: "close", exact: true }).first()).toBeVisible();

  mkdirSync("output/playwright", { recursive: true });
  await page.screenshot({ path: "output/playwright/schedule-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "output/playwright/schedule-mobile.png", fullPage: true });
});
