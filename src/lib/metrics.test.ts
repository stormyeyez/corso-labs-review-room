import { describe, expect, it } from "vitest";
import { calculateSpeedup, formatMs } from "./metrics";

describe("metrics", () => {
  it("calculates relative speedup", () => {
    expect(calculateSpeedup(3000, 12000)).toBe(4);
  });

  it("returns null speedup when timing is invalid", () => {
    expect(calculateSpeedup(0, 12000)).toBeNull();
    expect(calculateSpeedup(3000, 0)).toBeNull();
  });

  it("formats milliseconds as seconds", () => {
    expect(formatMs(3450)).toBe("3.45s");
  });
});
