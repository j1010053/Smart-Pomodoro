import { create } from "zustand";
import { db } from "../db/database";
import type { Task, TaskTypeProfile, TimerMode, TimerOutcome, TimerSession, WorkEvent, WorkSettings } from "../domain/models";
import { format } from "date-fns";
import { quadrantFor, urgencyFromDeadline } from "../domain/priority";
import { timerActualSeconds, timerRemainingSeconds } from "../domain/timer";

const defaultSettings: WorkSettings = { dailyWorkMinutes: 180, averageEnergy: 2, bufferRatio: 0.2 };
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const defaultProfiles: TaskTypeProfile[] = [
  { id: "deep-work", name: "深度工作", defaultImportance: 4, defaultEnergy: 3, defaultEstimateMinutes: 50, preferredTimeWindow: "morning", active: true },
  { id: "admin", name: "行政雜務", defaultImportance: 2, defaultEnergy: 1, defaultEstimateMinutes: 15, preferredTimeWindow: "afternoon", active: true },
  { id: "learning", name: "學習成長", defaultImportance: 3, defaultEnergy: 2, defaultEstimateMinutes: 30, preferredTimeWindow: "any", active: true },
];

interface AppState {
  hydrated: boolean;
  tasks: Task[];
  taskProfiles: TaskTypeProfile[];
  settings: WorkSettings;
  activeSession?: TimerSession;
  hydrate: () => Promise<void>;
  addTask: (title: string) => Promise<void>;
  loadTrialTasks: () => Promise<void>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  restoreTask: (id: string) => Promise<void>;
  skipTask: (id: string) => Promise<void>;
  saveSettings: (settings: WorkSettings) => Promise<void>;
  startTimer: (taskId: string | undefined, mode: TimerMode, seconds: number, parentSessionId?: string) => Promise<boolean>;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  finishTimer: (outcome: TimerOutcome) => Promise<TimerSession | undefined>;
  exportBackup: () => Promise<string>;
  importBackup: (content: string) => Promise<void>;
}

async function recordEvent(type: WorkEvent["type"], taskId?: string, source: WorkEvent["source"] = "explicit", details: Partial<WorkEvent> = {}) {
  const task = taskId ? await db.tasks.get(taskId) : undefined;
  const occurredAt = now();
  await db.events.put({ id: id(), taskId, type, occurredAt, localDate: format(new Date(occurredAt), "yyyy-MM-dd"), source, confidence: 1, quadrant: task ? quadrantFor(task) : undefined, importance: task?.importance, urgencyScore: task ? urgencyFromDeadline(task.deadline) : undefined, ...details });
}

export const useAppStore = create<AppState>((set, get) => ({
  hydrated: false,
  tasks: [],
  taskProfiles: [],
  settings: defaultSettings,
  async hydrate() {
    let taskProfiles = await db.taskProfiles.toArray();
    if (taskProfiles.length === 0) {
      await db.taskProfiles.bulkPut(defaultProfiles);
      taskProfiles = defaultProfiles;
    }
    const [tasks, storedSettings, activeSession] = await Promise.all([
      db.tasks.orderBy("updatedAt").reverse().toArray(),
      db.settings.get("main"),
      db.sessions.filter((session) => !session.endedAt).first(),
    ]);
    const normalizedSession = activeSession ? { ...activeSession, status: activeSession.status ?? (activeSession.pausedRemainingSeconds !== undefined ? "paused" as const : "running" as const) } : undefined;
    set({ tasks, taskProfiles, settings: storedSettings ?? defaultSettings, activeSession: normalizedSession, hydrated: true });
  },
  async addTask(title) {
    const trimmed = title.trim();
    if (!trimmed) return;
    const timestamp = now();
    const task: Task = { id: id(), title: trimmed, doneMinutes: 0, active: true, createdAt: timestamp, updatedAt: timestamp };
    await db.tasks.put(task);
    await recordEvent("task_created", task.id);
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
    await Promise.all(examples.map((task) => recordEvent("task_created", task.id)));
    set({ tasks: examples });
  },
  async updateTask(taskId, patch) {
    const updatedAt = now();
    await db.tasks.update(taskId, { ...patch, updatedAt });
    set((state) => ({ tasks: state.tasks.map((task) => task.id === taskId ? { ...task, ...patch, updatedAt } : task) }));
    await recordEvent("task_updated", taskId);
  },
  async completeTask(taskId) {
    const task = get().tasks.find((item) => item.id === taskId);
    if (!task?.active) return;
    if (get().activeSession?.taskId === taskId) await get().finishTimer("endedEarly");
    await get().updateTask(taskId, { active: false, completedAt: now() });
    await recordEvent("task_completed", taskId);
  },
  async restoreTask(taskId) {
    const task = get().tasks.find((item) => item.id === taskId);
    if (!task || task.active) return;
    await get().updateTask(taskId, { active: true, completedAt: undefined });
    await recordEvent("task_reopened", taskId, "corrected");
  },
  async skipTask(taskId) {
    if (!get().tasks.some((task) => task.id === taskId && task.active)) return;
    await recordEvent("task_skipped", taskId);
  },
  async saveSettings(settings) {
    await db.settings.put({ id: "main", ...settings });
    set({ settings });
    await recordEvent("settings_updated");
  },
  async startTimer(taskId, mode, seconds, parentSessionId) {
    if (get().activeSession) return false;
    const session: TimerSession = { id: id(), taskId, parentSessionId, mode, plannedSeconds: seconds, startedAt: now(), plannedEndAt: new Date(Date.now() + seconds * 1000).toISOString(), completed: false, status: "running" };
    await db.sessions.put(session);
    await recordEvent("timer_started", taskId, "timer", { sessionId: session.id, mode, plannedSeconds: seconds });
    if (mode === "focus" || mode === "microStart") await recordEvent("task_started", taskId, "timer", { sessionId: session.id, mode, plannedSeconds: seconds });
    set({ activeSession: session });
    return true;
  },
  async pauseTimer() {
    const session = get().activeSession;
    if (!session || session.status === "paused" || !session.plannedEndAt) return;
    const remaining = timerRemainingSeconds(session);
    const updated = { ...session, status: "paused" as const, plannedEndAt: undefined, pausedRemainingSeconds: remaining };
    await db.sessions.update(session.id, { status: "paused", plannedEndAt: undefined, pausedRemainingSeconds: remaining });
    await recordEvent("timer_paused", session.taskId, "timer", { sessionId: session.id, mode: session.mode, plannedSeconds: session.plannedSeconds });
    set({ activeSession: updated });
  },
  async resumeTimer() {
    const session = get().activeSession;
    if (!session || session.status !== "paused") return;
    const remaining = Math.max(0, session.pausedRemainingSeconds ?? 0);
    const plannedEndAt = new Date(Date.now() + remaining * 1000).toISOString();
    const updated = { ...session, status: "running" as const, plannedEndAt, pausedRemainingSeconds: undefined };
    await db.sessions.update(session.id, { status: "running", plannedEndAt, pausedRemainingSeconds: undefined });
    await recordEvent("timer_resumed", session.taskId, "timer", { sessionId: session.id, mode: session.mode, plannedSeconds: session.plannedSeconds });
    set({ activeSession: updated });
  },
  async finishTimer(outcome) {
    const session = get().activeSession;
    if (!session || !["running", "paused"].includes(session.status)) return undefined;
    const endedAt = now();
    const actualSeconds = timerActualSeconds(session, outcome);
    const completed = outcome === "completed";
    const finished: TimerSession = { ...session, status: outcome, actualSeconds, endedAt, completed, plannedEndAt: undefined, pausedRemainingSeconds: undefined };
    await db.sessions.update(session.id, { status: outcome, actualSeconds, endedAt, completed, plannedEndAt: undefined, pausedRemainingSeconds: undefined });
    if (session.taskId && actualSeconds > 0 && (session.mode === "focus" || session.mode === "microStart")) {
      const minutes = Math.round(actualSeconds / 60);
      const task = get().tasks.find((item) => item.id === session.taskId);
      if (task && minutes > 0) await get().updateTask(task.id, { doneMinutes: task.doneMinutes + minutes });
    }
    const eventType = outcome === "completed" ? "timer_completed" : outcome === "skipped" ? "timer_skipped" : "timer_ended_early";
    await recordEvent(eventType, session.taskId, "timer", { sessionId: session.id, mode: session.mode, plannedSeconds: session.plannedSeconds, actualSeconds });
    set({ activeSession: undefined });
    return finished;
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
