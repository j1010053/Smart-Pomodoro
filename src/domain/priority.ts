import { differenceInCalendarDays, startOfDay } from "date-fns";
import type { Task } from "./models";

export type Quadrant = "importantUrgent" | "important" | "urgent" | "later";

export function urgencyFromDeadline(deadline?: string, now = new Date()): number {
  if (!deadline) return 0;
  const days = differenceInCalendarDays(new Date(`${deadline}T00:00:00`), startOfDay(now));
  if (days < 0) return 100;
  if (days === 0) return 80;
  if (days <= 1) return 60;
  if (days <= 3) return 35;
  if (days <= 7) return 15;
  return 5;
}

export function quadrantFor(task: Task, now = new Date()): Quadrant {
  const important = (task.importance ?? 1) >= 3;
  const urgent = urgencyFromDeadline(task.deadline, now) >= 35;
  if (important && urgent) return "importantUrgent";
  if (important) return "important";
  if (urgent) return "urgent";
  return "later";
}

export interface Recommendation {
  task: Task;
  score: number;
  reasons: string[];
}

export function recommendTasks(tasks: Task[], now = new Date()): Recommendation[] {
  const ranked = tasks
    .filter((task) => task.active && !task.isSplitParent)
    .map((task) => {
      const urgency = urgencyFromDeadline(task.deadline, now);
      const importance = task.importance ?? 1;
      const remaining = Math.max(0, (task.estimateMinutes ?? 25) - task.doneMinutes);
      const importantNotUrgent = importance >= 3 && urgency < 35 ? 18 : 0;
      const progressMomentum = task.doneMinutes > 0 ? 5 : 0;
      const score = urgency + importance * 12 + importantNotUrgent + progressMomentum - Math.min(remaining / 20, 8);
      const reasons: string[] = [];
      if (urgency >= 60) reasons.push(task.deadline === undefined ? "需要優先處理" : "截止時間接近");
      if (importance >= 3) reasons.push("對你很重要");
      if (importantNotUrgent) reasons.push("保留重要但不緊急的時間");
      if (task.doneMinutes > 0) reasons.push("已經有進度，容易接續");
      return { task, score, reasons: reasons.slice(0, 2) };
    })
    .sort((a, b) => b.score - a.score);
  if (!ranked.slice(0, 3).some((item) => quadrantFor(item.task, now) === "important")) {
    const protectedIndex = ranked.findIndex((item, index) => index >= 3 && quadrantFor(item.task, now) === "important");
    if (protectedIndex >= 0) {
      const [protectedTask] = ranked.splice(protectedIndex, 1);
      protectedTask.reasons = ["替長期重要工作保留一輪", ...protectedTask.reasons].slice(0, 2);
      ranked.splice(Math.min(2, ranked.length), 0, protectedTask);
    }
  }
  return ranked;
}
