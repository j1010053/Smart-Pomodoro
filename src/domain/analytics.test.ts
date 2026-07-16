import { describe, expect, it } from "vitest";
import type { WorkEvent } from "./models";
import { buildReviewSummary } from "./analytics";

const event = (id: string, type: WorkEvent["type"], patch: Partial<WorkEvent> = {}): WorkEvent => ({ id, type, occurredAt: "2026-07-16T10:00:00Z", localDate: "2026-07-16", source: "explicit", confidence: 1, ...patch });

describe("M3 analytics", () => {
  it("uses ratio of totals for completion and skip rates", () => { const result = buildReviewSummary([event("1", "task_completed"), event("2", "task_skipped"), event("3", "task_completed")], new Date("2026-07-16")); expect(result.completionRate).toBeCloseTo(2 / 3); expect(result.skipRate).toBeCloseTo(1 / 3); });
  it("excludes low-confidence legacy events", () => expect(buildReviewSummary([event("1", "task_completed", { confidence: .4 })], new Date("2026-07-16")).completionRate).toBeNull());
  it("counts actual focus seconds and excludes breaks", () => { const result = buildReviewSummary([event("1", "timer_completed", { mode: "focus", actualSeconds: 1500, plannedSeconds: 1500 }), event("2", "timer_completed", { mode: "shortBreak", actualSeconds: 300, plannedSeconds: 300 })], new Date("2026-07-16")); expect(result.totalCompletedSeconds).toBe(1500); expect(result.totalPomodoros).toBe(1); });
  it("calculates important loss from event snapshots", () => { const result = buildReviewSummary([event("1", "task_skipped", { importance: 4, quadrant: "important" }), event("2", "task_completed", { importance: 4, quadrant: "important" })], new Date("2026-07-16")); expect(result.importantLossRate).toBe(.5); });
  it("returns null instead of misleading zero when no work was observed", () => { const result = buildReviewSummary([], new Date("2026-07-16")); expect(result.q2AbsenceRate).toBeNull(); expect(result.frictionIndex).toBeNull(); });
});
