export type Interval = Readonly<{
  start: number;
  end: number;
}>;

function validateInterval({ start, end }: Interval): void {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    throw new RangeError("Interval endpoints must be finite epoch milliseconds with start < end.");
  }
}

export function createInterval(start: number, end: number): Interval {
  const interval = { start, end };
  validateInterval(interval);
  return Object.freeze(interval);
}

export function overlaps(left: Interval, right: Interval): boolean {
  validateInterval(left);
  validateInterval(right);
  return left.start < right.end && right.start < left.end;
}
