import type { Task } from "./models";
import { quadrantFor, type Quadrant } from "./priority";

export type LoadSummary = Record<Quadrant, number> & { total: number };

export function workloadByQuadrant(tasks: Task[]): LoadSummary {
  const summary: LoadSummary = { importantUrgent: 0, important: 0, urgent: 0, later: 0, total: 0 };
  for (const task of tasks.filter((item) => item.active)) {
    const minutes = Math.max(0, (task.estimateMinutes ?? 25) - task.doneMinutes);
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
