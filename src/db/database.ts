import Dexie, { type Table } from "dexie";
import type { Task, TimerSession, WorkEvent, WorkSettings } from "../domain/models";

class SmartPomodoroDatabase extends Dexie {
  tasks!: Table<Task, string>;
  sessions!: Table<TimerSession, string>;
  events!: Table<WorkEvent, string>;
  settings!: Table<WorkSettings & { id: "main" }, "main">;

  constructor() {
    super("smart-pomodoro");
    this.version(1).stores({
      tasks: "id, active, deadline, updatedAt",
      sessions: "id, taskId, startedAt, endedAt",
      events: "id, taskId, type, occurredAt",
      settings: "id",
    });
  }
}

export const db = new SmartPomodoroDatabase();
