import { create } from "zustand";
import { db } from "../db/database";
import type { Task, TimerMode, TimerSession, WorkEvent, WorkSettings } from "../domain/models";

const defaultSettings: WorkSettings = { dailyWorkMinutes: 180, averageEnergy: 2, bufferRatio: 0.2 };
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();

interface AppState {
  hydrated: boolean;
  tasks: Task[];
  settings: WorkSettings;
  activeSession?: TimerSession;
  hydrate: () => Promise<void>;
  addTask: (title: string) => Promise<void>;
  loadTrialTasks: () => Promise<void>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  saveSettings: (settings: WorkSettings) => Promise<void>;
  startTimer: (taskId: string | undefined, mode: TimerMode, seconds: number) => Promise<void>;
  stopTimer: (completed?: boolean) => Promise<void>;
  exportBackup: () => Promise<string>;
  importBackup: (content: string) => Promise<void>;
}

async function recordEvent(type: WorkEvent["type"], taskId?: string, source: WorkEvent["source"] = "explicit") {
  await db.events.put({ id: id(), taskId, type, occurredAt: now(), source, confidence: 1 });
}

export const useAppStore = create<AppState>((set, get) => ({
  hydrated: false,
  tasks: [],
  settings: defaultSettings,
  async hydrate() {
    const [tasks, storedSettings, activeSession] = await Promise.all([
      db.tasks.orderBy("updatedAt").reverse().toArray(),
      db.settings.get("main"),
      db.sessions.filter((session) => !session.endedAt).first(),
    ]);
    set({ tasks, settings: storedSettings ?? defaultSettings, activeSession, hydrated: true });
  },
  async addTask(title) {
    const trimmed = title.trim();
    if (!trimmed) return;
    const timestamp = now();
    const task: Task = { id: id(), title: trimmed, doneMinutes: 0, active: true, createdAt: timestamp, updatedAt: timestamp };
    await db.tasks.put(task);
    await recordEvent("created", task.id);
    set((state) => ({ tasks: [task, ...state.tasks] }));
  },
  async loadTrialTasks() {
    if (get().tasks.length > 0) return;
    const timestamp = now();
    const dateAt = (offset: number) => { const date = new Date(); date.setDate(date.getDate() + offset); return date.toISOString().slice(0, 10); };
    const examples: Task[] = [
      { id: id(), title: "回覆重要訊息", importance: 3, deadline: dateAt(0), estimateMinutes: 15, doneMinutes: 0, active: true, createdAt: timestamp, updatedAt: timestamp },
      { id: id(), title: "整理本週計畫", importance: 4, deadline: dateAt(4), estimateMinutes: 30, doneMinutes: 0, active: true, createdAt: timestamp, updatedAt: timestamp },
      { id: id(), title: "閱讀一篇想看的文章", importance: 2, estimateMinutes: 20, doneMinutes: 0, active: true, createdAt: timestamp, updatedAt: timestamp },
    ];
    await db.tasks.bulkPut(examples);
    await Promise.all(examples.map((task) => recordEvent("created", task.id)));
    set({ tasks: examples });
  },
  async updateTask(taskId, patch) {
    const updatedAt = now();
    await db.tasks.update(taskId, { ...patch, updatedAt });
    set((state) => ({ tasks: state.tasks.map((task) => task.id === taskId ? { ...task, ...patch, updatedAt } : task) }));
  },
  async completeTask(taskId) {
    await get().updateTask(taskId, { active: false });
    await recordEvent("completed", taskId);
  },
  async saveSettings(settings) {
    await db.settings.put({ id: "main", ...settings });
    set({ settings });
  },
  async startTimer(taskId, mode, seconds) {
    const session: TimerSession = { id: id(), taskId, mode, plannedSeconds: seconds, startedAt: now(), plannedEndAt: new Date(Date.now() + seconds * 1000).toISOString(), completed: false };
    await db.sessions.put(session);
    await recordEvent("started", taskId, "timer");
    set({ activeSession: session });
  },
  async stopTimer(completed = false) {
    const session = get().activeSession;
    if (!session) return;
    const endedAt = now();
    await db.sessions.update(session.id, { endedAt, completed });
    if (session.taskId && session.startedAt) {
      const minutes = Math.max(1, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000));
      const task = get().tasks.find((item) => item.id === session.taskId);
      if (task) await get().updateTask(task.id, { doneMinutes: task.doneMinutes + minutes });
    }
    await recordEvent("timerTransition", session.taskId, "timer");
    set({ activeSession: undefined });
  },
  async exportBackup() {
    const [tasks, sessions, events, settings] = await Promise.all([db.tasks.toArray(), db.sessions.toArray(), db.events.toArray(), db.settings.get("main")]);
    return JSON.stringify({ version: 1, exportedAt: now(), tasks, sessions, events, settings }, null, 2);
  },
  async importBackup(content) {
    const backup = JSON.parse(content) as { version?: number; tasks?: Task[]; sessions?: TimerSession[]; events?: WorkEvent[]; settings?: WorkSettings & { id?: "main" } };
    if (backup.version !== 1 || !Array.isArray(backup.tasks)) throw new Error("不支援的備份格式");
    await db.transaction("rw", [db.tasks, db.sessions, db.events, db.settings], async () => {
      await Promise.all([db.tasks.clear(), db.sessions.clear(), db.events.clear(), db.settings.clear()]);
      await db.tasks.bulkPut(backup.tasks ?? []);
      await db.sessions.bulkPut(backup.sessions ?? []);
      await db.events.bulkPut(backup.events ?? []);
      if (backup.settings) await db.settings.put({ ...backup.settings, id: "main" });
    });
    await get().hydrate();
  },
}));
