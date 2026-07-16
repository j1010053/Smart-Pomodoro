import { format, subDays } from "date-fns";
import type { DailyStats, QuadrantStats, WorkEvent } from "./models";

const quadrants = ["importantUrgent", "important", "urgent", "later"] as const;
const emptyQuadrant = (): QuadrantStats => ({ completedCount: 0, skippedCount: 0, resolvedCount: 0, completedSeconds: 0, completionRate: null, skipRate: null });
const ratio = (value: number, total: number) => total > 0 ? value / total : null;

function buildDay(date: string, events: WorkEvent[]): DailyStats {
  const reliable = events.filter((event) => (event.localDate ?? event.occurredAt.slice(0, 10)) === date && event.confidence >= .5);
  const started = reliable.filter((event) => event.type === "task_started");
  const completed = reliable.filter((event) => event.type === "task_completed");
  const skipped = reliable.filter((event) => event.type === "task_skipped");
  const resolved = completed.length + skipped.length;
  const workTimers = reliable.filter((event) => ["timer_completed", "timer_ended_early"].includes(event.type) && (event.mode === "focus" || event.mode === "microStart"));
  const quadrantStats = Object.fromEntries(quadrants.map((quadrant) => {
    const qCompleted = completed.filter((event) => event.quadrant === quadrant).length;
    const qSkipped = skipped.filter((event) => event.quadrant === quadrant).length;
    const qResolved = qCompleted + qSkipped;
    const completedSeconds = workTimers.filter((event) => event.quadrant === quadrant).reduce((sum, event) => sum + (event.actualSeconds ?? 0), 0);
    return [quadrant, { completedCount: qCompleted, skippedCount: qSkipped, resolvedCount: qResolved, completedSeconds, completionRate: ratio(qCompleted, qResolved), skipRate: ratio(qSkipped, qResolved) }];
  })) as DailyStats["quadrants"];
  const completedSeconds = workTimers.reduce((sum, event) => sum + (event.actualSeconds ?? 0), 0);
  return {
    date, observed: started.length > 0 || resolved > 0 || completedSeconds > 0, startedCount: started.length, completedCount: completed.length, skippedCount: skipped.length,
    resolvedCount: resolved, completionRate: ratio(completed.length, resolved), skipRate: ratio(skipped.length, resolved),
    pomodoroCount: reliable.filter((event) => event.type === "timer_completed" && event.mode === "focus" && (event.actualSeconds ?? 0) >= (event.plannedSeconds ?? Number.MAX_SAFE_INTEGER)).length,
    completedSeconds, quadrants: quadrantStats, q2Completed: quadrantStats.important.completedCount > 0, updatedAt: new Date().toISOString(), calculationVersion: 1,
  };
}

export interface ReviewSummary {
  days: DailyStats[];
  totalCompletedSeconds: number;
  totalPomodoros: number;
  completionRate: number | null;
  skipRate: number | null;
  importantLossRate: number | null;
  urgentCrowdingRate: number | null;
  q2AbsenceRate: number | null;
  frictionIndex: number | null;
}

export function buildReviewSummary(events: WorkEvent[], now = new Date()): ReviewSummary {
  const dates = Array.from({ length: 7 }, (_, index) => format(subDays(now, 6 - index), "yyyy-MM-dd"));
  const days = dates.map((date) => buildDay(date, events));
  const completed = days.reduce((sum, day) => sum + day.completedCount, 0);
  const skipped = days.reduce((sum, day) => sum + day.skippedCount, 0);
  const resolved = completed + skipped;
  const qImportantCompleted = days.reduce((sum, day) => sum + day.quadrants.important.completedCount + day.quadrants.importantUrgent.completedCount, 0);
  const qImportantSkipped = days.reduce((sum, day) => sum + day.quadrants.important.skippedCount + day.quadrants.importantUrgent.skippedCount, 0);
  const importantResolved = qImportantCompleted + qImportantSkipped;
  const totalSeconds = days.reduce((sum, day) => sum + day.completedSeconds, 0);
  const urgentNotImportantSeconds = days.reduce((sum, day) => sum + day.quadrants.urgent.completedSeconds, 0);
  const observedDays = days.filter((day) => day.observed);
  const importantLossRate = ratio(qImportantSkipped, importantResolved);
  const urgentCrowdingRate = ratio(urgentNotImportantSeconds, totalSeconds);
  const q2AbsenceRate = ratio(observedDays.filter((day) => !day.q2Completed).length, observedDays.length);
  const frictionIndex = importantLossRate === null || urgentCrowdingRate === null || q2AbsenceRate === null ? null : importantLossRate * .4 + urgentCrowdingRate * .35 + q2AbsenceRate * .25;
  return { days, totalCompletedSeconds: totalSeconds, totalPomodoros: days.reduce((sum, day) => sum + day.pomodoroCount, 0), completionRate: ratio(completed, resolved), skipRate: ratio(skipped, resolved), importantLossRate, urgentCrowdingRate, q2AbsenceRate, frictionIndex };
}
