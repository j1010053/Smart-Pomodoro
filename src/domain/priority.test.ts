import { describe, expect, it } from "vitest";
import { quadrantFor, urgencyFromDeadline } from "./priority";
import type { Task } from "./models";

const task = (overrides: Partial<Task>): Task => ({ id: "1", title: "測試", doneMinutes: 0, active: true, createdAt: "2026-07-16", updatedAt: "2026-07-16", ...overrides });

describe("priority", () => {
  it("derives urgency from a deadline without storing it", () => {
    expect(urgencyFromDeadline("2026-07-16", new Date("2026-07-16T10:00:00"))).toBe(80);
  });

  it("keeps importance independent from urgency", () => {
    expect(quadrantFor(task({ importance: 4, deadline: "2026-08-10" }), new Date("2026-07-16"))).toBe("important");
  });
});
