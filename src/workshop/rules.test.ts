import { describe, expect, it } from "vitest";
import { absoluteTime, lineInput, linesInput, localDay, requestInput, timelinePosition, totals, workCapabilities } from "./rules";

describe("workflow rules", () => {
  it.each([
    ["ready", undefined, [], true, false, false],
    ["in-progress", undefined, [false], true, false, false],
    ["awaiting-approval", "draft", [false], true, false, false],
    ["awaiting-approval", "issued", [false], false, false, false],
    ["in-progress", "rejected", [false], true, false, false],
    ["in-progress", "accepted", [false], false, true, false],
    ["in-progress", "accepted", [true], false, false, true],
    ["in-progress", "accepted", [], false, false, false],
    ["closed", "accepted", [true], false, false, false],
  ] as [string, string | undefined, boolean[], boolean, boolean, boolean][])("exposes valid actions for %s / %s", (state, estimate, done, canAddTask, canMarkTaskComplete, canComplete) => {
    expect(workCapabilities(state, estimate, done)).toEqual({ approvalAccepted: estimate === "accepted", canAddTask, canMarkTaskComplete, canComplete });
  });
  it("positions workshop-local reservations across winter and summer offsets", () => {
    expect(timelinePosition(new Date("2031-04-07T08:00:00Z"), new Date("2031-04-07T09:00:00Z"), "2031-04-07", "Europe/London")).toEqual({ left: 0, width: 12.5 });
    expect(timelinePosition(new Date("2031-10-27T16:00:00Z"), new Date("2031-10-27T17:00:00Z"), "2031-10-27", "Europe/London")).toEqual({ left: 87.5, width: 12.5 });
    expect(localDay(new Date("2031-04-07T23:30:00Z"), "Europe/London")).toBe("2031-04-08");
  });
  it("clips absences to opening hours and excludes other days", () => {
    expect(timelinePosition(new Date("2031-04-06T12:00:00Z"), new Date("2031-04-09T12:00:00Z"), "2031-04-07", "Europe/London")).toEqual({ left: 0, width: 100 });
    expect(timelinePosition(new Date("2031-04-07T07:30:00Z"), new Date("2031-04-07T08:30:00Z"), "2031-04-07", "Europe/London")).toEqual({ left: 0, width: 6.25 });
    expect(timelinePosition(new Date("2031-04-07T08:00:00Z"), new Date("2031-04-07T09:00:00Z"), "2031-04-08", "Europe/London")).toBeNull();
  });
  it("accepts offset timestamps and rejects malformed or missing offsets", () => {
    expect(absoluteTime.parse("2031-04-07T09:00:00+01:00").toISOString()).toBe("2031-04-07T08:00:00.000Z");
    expect(() => absoluteTime.parse("2031-04-07T09:00:00")).toThrow();
    expect(() => requestInput.parse({ workshopId: "nope" })).toThrow();
  });

  it("enforces line and collection bounds and rounds VAT per line", () => {
    expect(lineInput.parse({ description: "  Labour ", quantity: 1, unitPrice: 3 }).description).toBe("Labour");
    expect(() => lineInput.parse({ description: " ", quantity: 1, unitPrice: 3 })).toThrow();
    expect(() => lineInput.parse({ description: "Part", quantity: 1001, unitPrice: 3 })).toThrow();
    expect(() => linesInput.parse([])).toThrow();
    expect(totals([
      { description: "A", quantity: 1, unitPrice: 3 },
      { description: "B", quantity: 1, unitPrice: 3 },
    ])).toEqual({ net: 6, tax: 2, total: 8 });
    expect(() => totals([{ description: "A", quantity: 1000, unitPrice: 100001 }])).toThrow("£1,000,000");
  });
});
