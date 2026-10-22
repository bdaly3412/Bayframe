import { randomInt, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test, type Locator } from "@playwright/test";

test("rescheduling preserves conflicting reservations and cancellation releases capacity", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", () => errors.push("pageerror"));
  page.on("console", (message) => { if (message.type() === "error") errors.push("console"); });
  const workshopId = process.env.BAYFRAME_WORKSHOP_ID!;
  const schedule = `/staff/schedule?workshop=${workshopId}`;
  const day = new Date(Date.UTC(2040, 0, 1 + randomInt(3000), 10));
  while ([0, 6].includes(day.getUTCDay())) day.setUTCDate(day.getUTCDate() + 1);
  let starts: string[] = [];
  let available = false;
  await page.goto("/request");
  for (let attempt = 0; attempt < 10 && !available; attempt++) {
    starts = [day.toISOString(), new Date(day.getTime() + 3600000).toISOString()];
    available = true;
    for (const startAt of starts) {
      const capacity = page.getByRole("form", { name: "Check availability", exact: true });
      await capacity.getByLabel("Requested start (absolute time)").fill(startAt);
      await capacity.getByRole("button", { name: "Check availability", exact: true }).click();
      await expect(capacity.getByRole("button")).toBeEnabled();
      await expect(capacity.getByRole("status")).toContainText("currently available");
      available &&= (await capacity.getByRole("status").textContent())?.startsWith("2 bay(s) and 1 technician(s)") === true;
    }
    do { day.setUTCDate(day.getUTCDate() + 1); } while ([0, 6].includes(day.getUTCDay()));
  }
  expect(available, "No unused fixture day found; existing records were preserved").toBe(true);
  const references: string[] = [];
  for (const startAt of [starts[0], starts[1], starts[0]]) {
    await page.goto("/request");
    const form = page.getByRole("form", { name: "Request appointment", exact: true });
    await form.getByLabel("Booking contact").fill(`Synthetic booking ${randomUUID().slice(0, 8)}`);
    await form.getByLabel("Email", { exact: true }).fill("booking-check@example.test");
    await form.getByLabel("Vehicle registration").fill("BF CHECK");
    await form.getByLabel("Requested start (absolute time)").fill(startAt);
    await form.getByRole("button", { name: "Request appointment", exact: true }).click();
    await expect(form.getByRole("status")).toContainText("Request received. Reference");
    const reference = (await form.getByRole("status").textContent())?.match(/Reference ([a-f0-9-]{36})\./)?.[1];
    if (!reference) throw new Error("Booking reference is missing.");
    references.push(reference);
  }
  const credentials = JSON.parse(readFileSync("output/demo-credentials.txt", "utf8"));
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(credentials.manager.email);
  await page.getByLabel("Password", { exact: true }).fill(credentials.manager.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/staff$/);
  await page.goto(`${schedule}&day=${starts[0].slice(0, 10)}`);
  const row = (index: number) => page.locator(`#booking-${references[index]}`).locator("..");
  async function openRow(index: number) {
    const details = row(index).locator("details");
    if (await details.getAttribute("open") === null) await details.locator("summary").click();
  }
  const action = (container: Locator, command: string) => container.locator(`form:has(input[name="command"][value="${command}"])`);
  async function choose(form: Locator) {
    await form.getByRole("combobox", { name: "Bay", exact: true }).selectOption({ label: "Bay 1" });
    await form.getByRole("combobox", { name: "Technician", exact: true }).selectOption({ label: "Demo technician" });
  }
  for (const index of [0, 1]) {
    await openRow(index);
    const form = action(row(index), "confirm");
    await choose(form);
    await form.getByRole("button", { name: "Confirm booking", exact: true }).click();
    await expect(row(index).locator(".status")).toHaveText("confirmed");
  }
  await openRow(0);
  const move = action(row(0), "reschedule");
  await choose(move);
  await move.getByLabel("New absolute start").fill(starts[1]);
  await move.getByRole("button", { name: "Reschedule atomically", exact: true }).click();
  await expect(move.getByRole("alert")).toContainText("unavailable");
  await expect(row(0).locator(".status")).toHaveText("confirmed");
  await openRow(1);
  page.once("dialog", (dialog) => dialog.accept());
  await action(row(1), "cancel").getByRole("button", { name: "Cancel booking", exact: true }).click();
  await expect(row(1).locator(".status")).toHaveText("cancelled");
  await move.getByRole("button", { name: "Reschedule atomically", exact: true }).click();
  await expect(move.getByRole("status")).toContainText("Saved.");
  await page.reload();
  await expect(action(row(0), "reschedule").getByLabel("New absolute start")).toHaveValue(starts[1]);
  await openRow(2);
  page.once("dialog", (dialog) => dialog.accept());
  await action(row(2), "reject").getByRole("button", { name: "Reject request", exact: true }).click();
  await expect(row(2).locator(".status")).toHaveText("rejected");
  await page.goto(`${schedule}&view=absences`);
  const absence = page.getByRole("form", { name: "Record absence", exact: true });
  await absence.getByRole("combobox", { name: "Resource", exact: true }).selectOption({ label: "Bay 1" });
  await absence.getByLabel("Start (ISO 8601 with offset)").fill(starts[1]);
  await absence.getByLabel("End (ISO 8601 with offset)").fill(new Date(new Date(starts[1]).getTime() + 3600000).toISOString());
  await absence.getByRole("button", { name: "Record absence", exact: true }).click();
  await expect(absence.getByRole("alert")).toContainText("Absence overlaps a reservation");
  await absence.getByLabel("Start (ISO 8601 with offset)").fill(starts[0]);
  await absence.getByLabel("End (ISO 8601 with offset)").fill(starts[1]);
  await absence.getByRole("button", { name: "Record absence", exact: true }).click();
  await expect(absence.getByRole("status")).toContainText("Saved.");
  expect(errors).toEqual([]);
});
