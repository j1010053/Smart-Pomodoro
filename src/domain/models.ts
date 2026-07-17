export type Importance = 1 | 2 | 3 | 4;
export type EnergyLevel = 1 | 2 | 3;
export type PreferredTimeWindow = "morning" | "afternoon" | "evening" | "any";

export interface TaskTypeProfile {
  id: string;
  name: string;
  defaultImportance: Importance;
  defaultEnergy: EnergyLevel;
  defaultEstimateMinutes: number;
  preferredTimeWindow?: PreferredTimeWindow;
  targetShare?: number;
  active: boolean;
}

export interface Task {
  id: string;
  title: string;
  typeId?: string;
  importance?: Importance;
  deadline?: string;
  energy?: EnergyLevel;
  estimateMinutes?: number;
  doneMinutes: number;
  repeatDays?: number[];
  /** A split parent stays visible in the inbox but is excluded from planning totals. */
  isSplitParent?: boolean;
  parentTaskId?: string;
  active: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type WorkEventType =
  | "created" | "started" | "completed" | "skipped" | "timerTransition"
  | "task_created" | "task_started" | "task_completed" | "task_skipped" | "task_reopened" | "task_updated" | "task_split"
  | "timer_started" | "timer_paused" | "timer_resumed" | "timer_completed" | "timer_ended_early" | "timer_skipped"
  | "settings_updated" | "legacy_timer_transition";

export interface WorkEvent {
  id: string;
  taskId?: string;
  type: WorkEventType;
  occurredAt: string;
  source: "explicit" | "timer" | "inferred" | "corrected";
  confidence: number;
  sessionId?: string;
  localDate?: string;
  quadrant?: "importantUrgent" | "important" | "urgent" | "later";
  importance?: Importance;
  urgencyScore?: number;
  actualSeconds?: number;
  mode?: TimerMode;
  plannedSeconds?: number;
}

export interface QuadrantStats { completedCount: number; skippedCount: number; resolvedCount: number; completedSeconds: number; completionRate: number | null; skipRate: number | null; }
export interface DailyStats {
  date: string;
  observed: boolean;
  startedCount: number;
  completedCount: number;
  skippedCount: number;
  resolvedCount: number;
  completionRate: number | null;
  skipRate: number | null;
  pomodoroCount: number;
  completedSeconds: number;
  quadrants: Record<"importantUrgent" | "important" | "urgent" | "later", QuadrantStats>;
  q2Completed: boolean;
  updatedAt: string;
  calculationVersion: number;
}

export interface WorkSettings {
  dailyWorkMinutes: number;
  averageEnergy: EnergyLevel;
  bufferRatio: number;
}

export type TimerMode = "focus" | "shortBreak" | "longBreak" | "microStart";
export type TimerStatus = "running" | "paused" | "completed" | "endedEarly" | "skipped";
export type TimerOutcome = "completed" | "endedEarly" | "skipped";

export interface TimerSession {
  id: string;
  taskId?: string;
  parentSessionId?: string;
  mode: TimerMode;
  plannedSeconds: number;
  startedAt?: string;
  plannedEndAt?: string;
  endedAt?: string;
  pausedRemainingSeconds?: number;
  actualSeconds?: number;
  status: TimerStatus;
  completed: boolean;
}
