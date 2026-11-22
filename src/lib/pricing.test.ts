import { describe, expect, it } from "vitest";
import { countDays, quote, rangesOverlap } from "./pricing";

describe("pricing rules", () => {
  it("counts rental days inclusively", () => {
    expect(countDays("2026-12-01", "2026-12-03")).toBe(3);
    expect(countDays("2026-12-01", "2026-12-01")).toBe(1);
  });
  it("charges rental + deposit; Muuvaca takes 5% of the rental only", () => {
    const q = quote(100, 500, "2026-12-01", "2026-12-03");
    expect(q.rental).toBe(300);
    expect(q.total).toBe(800);
    expect(q.commission).toBe(15);
    expect(q.ownerReceives).toBe(285);
  });
  it("detects overlapping date ranges", () => {
    expect(rangesOverlap("2026-12-01", "2026-12-05", "2026-12-05", "2026-12-07")).toBe(true);
    expect(rangesOverlap("2026-12-01", "2026-12-04", "2026-12-05", "2026-12-07")).toBe(false);
  });
});
