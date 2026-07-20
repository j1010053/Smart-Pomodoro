import { describe, expect, it } from "vitest";
import type { Task } from "./models";
import { buildSevenDayForecast } from "./forecast";

const task = (id: string, patch: Partial<Task>): Task => ({ id, title: id, doneMinutes: 0, active: true, createdAt: `2026-07-16T00:00:0${id.length}Z`, updatedAt: "2026-07-16T00:00:00Z", ...patch });
const now = new Date("2026-07-16T10:00:00");

describe("M2 seven-day forecast", () => {
  it("keeps undated work out of hard deadline pressure", () => { const result = buildSevenDayForecast([task("a", { estimateMinutes: 40 })], 100, now); expect(result.flexibleBacklogMinutes).toBe(40); expect(result.days[0].cumulativeDemandMinutes).toBe(0); });
  it("detects a one-minute cumulative shortfall", () => { const result = buildSevenDayForecast([task("a", { estimateMinutes: 301, deadline: "2026-07-17" })], 150, now); expect(result.days[1].cumulativeShortfallMinutes).toBe(1); expect(result.hasOverload).toBe(true); });
  it("accepts demand equal to cumulative capacity", () => expect(buildSevenDayForecast([task("a", { estimateMinutes: 300, deadline: "2026-07-17" })], 150, now).hasOverload).toBe(false));
  it("spreads a deadline task from today through its due date", () => {
    const result = buildSevenDayForecast([task("a", { estimateMinutes: 100, deadline: "2026-07-18" })], 100, now);
    expect(result.days.slice(0, 3).map((day) => day.scheduledMinutes)).toEqual([34, 33, 33]);
  });
  it("uses later days to catch up when today has no remaining capacity", () => {
    const result = buildSevenDayForecast([task("a", { estimateMinutes: 100, deadline: "2026-07-17" })], 100, now, 100);
    expect(result.days.slice(0, 2).map((day) => day.scheduledMinutes)).toEqual([0, 100]);
    expect(result.hasOverload).toBe(false);
  });
  it("protects a short block for important non-urgent work", () => { const result = buildSevenDayForecast([task("q2", { importance: 4, estimateMinutes: 60 })], 100, now); expect(result.days[0].protectedQ2Minutes).toBe(25); });
  it("handles zero capacity without NaN", () => { const result = buildSevenDayForecast([task("a", { estimateMinutes: 10, deadline: "2026-07-16" })], 0, now); expect(result.peakUtilization).toBe(1); expect(result.days[0].risk).toBe("overload"); });
});
