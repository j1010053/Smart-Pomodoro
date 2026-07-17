import type { Task } from "./models";
import { quadrantFor, type Quadrant } from "./priority";
import { differenceInCalendarDays, isValid, parseISO, startOfDay } from "date-fns";

export type LoadSummary = Record<Quadrant, number> & { total: number };

export function remainingMinutes(task: Task, fallback = 25): { minutes: number; usesDefaultEstimate: boolean } {
  const estimate = Math.max(0, task.estimateMinutes ?? fallback);
  return { minutes: Math.max(0, estimate - Math.max(0, task.doneMinutes)), usesDefaultEstimate: task.estimateMinutes === undefined };
}

export type SkipPressure =
  | { kind: "notApplicable" }
  | { kind: "impossible"; reason: "dueToday" | "overdue" }
  | { kind: "possible"; daysAfterSkip: number; minutesPerDay: number; increaseMinutesPerDay: number };

export function taskPressure(task: Task, now = new Date()): { remainingMinutes: number; requiredPerDay?: number; skipPressure: SkipPressure } {
  const remaining = remainingMinutes(task).minutes;
  if (!task.deadline) return { remainingMinutes: remaining, skipPressure: { kind: "notApplicable" } };
  const deadline = parseISO(task.deadline);
  if (!isValid(deadline)) return { remainingMinutes: remaining, skipPressure: { kind: "notApplicable" } };
  const days = differenceInCalendarDays(startOfDay(deadline), startOfDay(now));
  const requiredPerDay = Math.ceil(remaining / Math.max(1, days + 1));
  if (days < 0) return { remainingMinutes: remaining, requiredPerDay, skipPressure: { kind: "impossible", reason: "overdue" } };
  if (days === 0) return { remainingMinutes: remaining, requiredPerDay, skipPressure: { kind: "impossible", reason: "dueToday" } };
  const minutesPerDay = Math.ceil(remaining / days);
  return { remainingMinutes: remaining, requiredPerDay, skipPressure: { kind: "possible", daysAfterSkip: days, minutesPerDay, increaseMinutesPerDay: Math.max(0, minutesPerDay - requiredPerDay) } };
}

export function workloadByQuadrant(tasks: Task[]): LoadSummary {
  const summary: LoadSummary = { importantUrgent: 0, important: 0, urgent: 0, later: 0, total: 0 };
  for (const task of tasks.filter((item) => item.active && !item.isSplitParent)) {
    const minutes = remainingMinutes(task).minutes;
    summary[quadrantFor(task)] += minutes;
    summary.total += minutes;
  }
  return summary;
}

export function workloadWarning(totalMinutes: number, capacityMinutes: number): string | undefined {
  if (capacityMinutes <= 0) return "請先設定今天想投入的時間。";
  if (totalMinutes > capacityMinutes * 1.5) return "今天排得偏滿，先保留最重要的一兩件事。";
  if (totalMinutes > capacityMinutes) return "待辦超過今日容量，建議把部分任務留到之後。";
  return undefined;
}
