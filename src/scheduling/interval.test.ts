import { expect, test } from "vitest";
import { createInterval, overlaps, type Interval } from "@/scheduling/interval";

test("preserves absolute epoch milliseconds in a frozen interval", () => {
  const start = Date.UTC(2026, 9, 20, 9);
  const end = Date.UTC(2026, 9, 20, 10);
  const interval = createInterval(start, end);

  expect(interval).toEqual({ start, end });
  expect(Object.isFrozen(interval)).toBe(true);
});

test.each([
  { name: "partial overlap", left: [0, 10], right: [5, 15], expected: true },
  { name: "strict containment", left: [0, 20], right: [5, 15], expected: true },
  { name: "shared start", left: [0, 20], right: [0, 10], expected: true },
  { name: "shared end", left: [0, 20], right: [10, 20], expected: true },
  { name: "identical intervals", left: [0, 10], right: [0, 10], expected: true },
  { name: "disjoint intervals", left: [0, 10], right: [11, 20], expected: false },
  { name: "adjacent intervals", left: [0, 10], right: [10, 20], expected: false },
  { name: "negative epoch milliseconds", left: [-20, -10], right: [-15, 0], expected: true },
  { name: "fractional milliseconds", left: [0, 0.5], right: [0.25, 1], expected: true },
])("$name has symmetric overlap", ({ left, right, expected }) => {
  const a = createInterval(left[0], left[1]);
  const b = createInterval(right[0], right[1]);

  expect(overlaps(a, b)).toBe(expected);
  expect(overlaps(b, a)).toBe(expected);
});

const invalidIntervals = [
  { start: 0, end: 0 },
  { start: 10, end: 0 },
  { start: NaN, end: 10 },
  { start: 0, end: NaN },
  { start: -Infinity, end: 10 },
  { start: Infinity, end: 10 },
  { start: 0, end: Infinity },
  { start: 0, end: -Infinity },
];

test.each(invalidIntervals)("rejects invalid endpoints $start, $end at both entry points", (invalid) => {
  const valid = createInterval(0, 20);

  expect(() => createInterval(invalid.start, invalid.end)).toThrow(RangeError);
  expect(() => overlaps(invalid, valid)).toThrow(RangeError);
  expect(() => overlaps(valid, invalid)).toThrow(RangeError);
});

test.each(["0", "2026-10-20T09:00:00Z", null, undefined, true, new Date(0)])(
  "rejects non-numeric endpoints without coercion: %s",
  (value) => {
    // Exercise callers that bypass the TypeScript boundary.
    const endpoint = value as unknown as number;
    const valid = createInterval(0, 20);
    const invalidStart: Interval = { start: endpoint, end: 10 };
    const invalidEnd: Interval = { start: 0, end: endpoint };

    expect(() => createInterval(endpoint, 10)).toThrow(RangeError);
    expect(() => createInterval(0, endpoint)).toThrow(RangeError);
    for (const invalid of [invalidStart, invalidEnd]) {
      expect(() => overlaps(invalid, valid)).toThrow(RangeError);
      expect(() => overlaps(valid, invalid)).toThrow(RangeError);
    }
  },
);
