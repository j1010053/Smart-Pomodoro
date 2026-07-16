import Dexie, { type Table } from "dexie";
import type { DailyStats, Task, TaskTypeProfile, TimerSession, WorkEvent, WorkSettings } from "../domain/models";

class SmartPomodoroDatabase extends Dexie {
  tasks!: Table<Task, string>;
  sessions!: Table<TimerSession, string>;
  events!: Table<WorkEvent, string>;
  settings!: Table<WorkSettings & { id: "main" }, "main">;
  taskProfiles!: Table<TaskTypeProfile, string>;
  dailyStats!: Table<DailyStats, string>;

  constructor() {
    super("smart-pomodoro");
    this.version(1).stores({
      tasks: "id, active, deadline, updatedAt",
      sessions: "id, taskId, startedAt, endedAt",
      events: "id, taskId, type, occurredAt",
      settings: "id",
    });
    this.version(2).stores({
      tasks: "id, active, deadline, typeId, updatedAt",
      sessions: "id, taskId, startedAt, endedAt",
      events: "id, taskId, type, occurredAt",
      settings: "id",
      taskProfiles: "id, active, name",
    });
    this.version(3).stores({
      tasks: "id, active, deadline, typeId, updatedAt",
      sessions: "id, taskId, status, startedAt, endedAt",
      events: "id, taskId, sessionId, type, occurredAt, localDate",
      settings: "id",
      taskProfiles: "id, active, name",
      dailyStats: "date, observed, updatedAt",
    }).upgrade(async (transaction) => {
      await transaction.table("events").toCollection().modify((event: WorkEvent) => {
        const legacyMap: Partial<Record<WorkEvent["type"], WorkEvent["type"]>> = { created: "task_created", started: "task_started", completed: "task_completed", skipped: "task_skipped", timerTransition: "legacy_timer_transition" };
        if (legacyMap[event.type]) { event.type = legacyMap[event.type]!; event.source = "inferred"; event.confidence = Math.min(event.confidence ?? 1, .4); }
        event.localDate ??= event.occurredAt.slice(0, 10);
      });
    });
  }
}

export const db = new SmartPomodoroDatabase();
