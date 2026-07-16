import { describe, expect, it } from "vitest";
import { effectiveDailyCapacity } from "./capacity";

describe("effectiveDailyCapacity", () => {
  it("reserves the configured buffer", () => {
    expect(effectiveDailyCapacity({ dailyWorkMinutes: 180, averageEnergy: 2, bufferRatio: 0.2 })).toBe(144);
  });

  it("keeps invalid ratios within a safe range", () => {
    expect(effectiveDailyCapacity({ dailyWorkMinutes: 180, averageEnergy: 2, bufferRatio: 2 })).toBe(0);
  });
});
