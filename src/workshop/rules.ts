import { z } from "zod";

export const uuid = z.uuid();
export const absoluteTime = z.iso.datetime({ offset: true }).transform((value) => new Date(value));
export const requestInput = z.object({
  workshopId: uuid, name: z.string().trim().min(1).max(120), email: z.email().max(254),
  registration: z.string().trim().min(1).max(20).transform((v) => v.toUpperCase()), startAt: absoluteTime,
});
export const lineInput = z.object({ description: z.string().trim().min(1).max(500), quantity: z.number().int().min(1).max(1000), unitPrice: z.number().int().min(0).max(1000000) });
export const linesInput = z.array(lineInput).min(1).max(50);
export type Line = z.infer<typeof lineInput>;
export function totals(input: unknown) {
  const lines = linesInput.parse(input);
  const net = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const tax = lines.reduce((sum, line) => sum + Math.floor((line.quantity * line.unitPrice + 2) / 5), 0);
  if (net > 100000000) throw new WorkflowError("Estimate exceeds the supported £1,000,000 net limit.");
  return { net, tax, total: net + tax };
}
export function money(pence: number) { return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100); }
export function displayTime(value: Date | string, timezone = "Europe/London") {
  return new Intl.DateTimeFormat("en-GB", { timeZone: timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function localDay(value: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const field = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${field("year")}-${field("month")}-${field("day")}`;
}
export function timelinePosition(start: Date, end: Date, day: string, timezone: string) {
  const firstDay = localDay(start, timezone), lastDay = localDay(end, timezone);
  if (firstDay > day || lastDay < day) return null;
  const minutes = (date: Date) => {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
    const field = (type: string) => Number(parts.find((p) => p.type === type)!.value);
    return field("hour") * 60 + field("minute") + field("second") / 60;
  };
  const from = Math.max(540, firstDay < day ? 540 : minutes(start));
  const to = Math.min(1020, lastDay > day ? 1020 : minutes(end));
  if (from >= to) return null;
  return { left: (from - 540) / 480 * 100, width: (to - from) / 480 * 100 };
}

export class WorkflowError extends Error {}
export function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new WorkflowError(message);
}
