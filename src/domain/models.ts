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
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type WorkEventType = "created" | "started" | "completed" | "skipped" | "timerTransition";

export interface WorkEvent {
  id: string;
  taskId?: string;
  type: WorkEventType;
  occurredAt: string;
  source: "explicit" | "timer" | "inferred" | "corrected";
  confidence: number;
}

export interface WorkSettings {
  dailyWorkMinutes: number;
  averageEnergy: EnergyLevel;
  bufferRatio: number;
}

export type TimerMode = "focus" | "shortBreak" | "longBreak" | "microStart";

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
  completed: boolean;
}
