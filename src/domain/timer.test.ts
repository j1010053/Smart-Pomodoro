import { describe, expect, it } from "vitest";
import type { TimerSession } from "./models";
import { timerActualSeconds, timerRemainingSeconds } from "./timer";

const running: TimerSession = { id: "s", mode: "focus", plannedSeconds: 1500, startedAt: "2026-07-16T10:00:00Z", plannedEndAt: "2026-07-16T10:25:00Z", status: "running", completed: false };

describe("timer accounting", () => {
  it("uses timestamps after returning from the background", () => expect(timerRemainingSeconds(running, new Date("2026-07-16T10:05:00Z").getTime())).toBe(1200));
  it("does not count paused time", () => expect(timerActualSeconds({ ...running, status: "paused", plannedEndAt: undefined, pausedRemainingSeconds: 1200 }, "endedEarly")).toBe(300));
  it("does not add a fake minute when skipped", () => expect(timerActualSeconds(running, "skipped", new Date("2026-07-16T10:10:00Z").getTime())).toBe(0));
});
