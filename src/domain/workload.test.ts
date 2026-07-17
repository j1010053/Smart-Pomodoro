import { describe, expect, it } from "vitest";
import type { Task } from "./models";
import { remainingMinutes, taskPressure, workloadByQuadrant } from "./workload";

const task = (patch: Partial<Task> = {}): Task => ({ id: "t", title: "工作", doneMinutes: 0, active: true, createdAt: "2026-07-16T00:00:00Z", updatedAt: "2026-07-16T00:00:00Z", ...patch });

describe("M2 workload pressure", () => {
  it("never returns negative remaining time", () => expect(remainingMinutes(task({ estimateMinutes: 20, doneMinutes: 30 })).minutes).toBe(0));
  it("marks fallback estimates", () => expect(remainingMinutes(task())).toEqual({ minutes: 25, usesDefaultEstimate: true }));
  it("includes the deadline day in required per day", () => expect(taskPressure(task({ estimateMinutes: 40, deadline: "2026-07-17" }), new Date("2026-07-16T10:00:00")).requiredPerDay).toBe(20));
  it("reports the pressure increase after skipping today", () => expect(taskPressure(task({ estimateMinutes: 40, deadline: "2026-07-17" }), new Date("2026-07-16T10:00:00")).skipPressure).toEqual({ kind: "possible", daysAfterSkip: 1, minutesPerDay: 40, increaseMinutesPerDay: 20 }));
  it("does not produce infinity for a task due today", () => expect(taskPressure(task({ deadline: "2026-07-16" }), new Date("2026-07-16T10:00:00")).skipPressure).toEqual({ kind: "impossible", reason: "dueToday" }));
  it("includes low-importance work in the later quadrant", () => {
    const load = workloadByQuadrant([task({ importance: 1, estimateMinutes: 30 })]);
    expect(load).toMatchObject({ later: 30, total: 30 });
  });
  it("does not double-count a split parent", () => {
    const load = workloadByQuadrant([task({ id: "parent", estimateMinutes: 60, isSplitParent: true }), task({ id: "child", estimateMinutes: 30, parentTaskId: "parent" })]);
    expect(load.total).toBe(30);
  });
});
