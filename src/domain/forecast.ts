import { addDays, differenceInCalendarDays, format, isValid, parseISO, startOfDay } from "date-fns";
import type { Task } from "./models";
import { quadrantFor, type Quadrant } from "./priority";
import { remainingMinutes } from "./workload";

export type ForecastRisk = "healthy" | "tight" | "overload";
export interface ForecastDay {
  date: string;
  capacityMinutes: number;
  scheduledMinutes: number;
  deadlineMinutes: number;
  protectedQ2Minutes: number;
  remainingCapacityMinutes: number;
  overflowMinutes: number;
  cumulativeDemandMinutes: number;
  cumulativeCapacityMinutes: number;
  cumulativeShortfallMinutes: number;
  quadrantMinutes: Record<Quadrant, number>;
  risk: ForecastRisk;
}
export interface SevenDayForecast { days: ForecastDay[]; overdueMinutes: number; flexibleBacklogMinutes: number; firstRiskDate?: string; peakUtilization: number; hasOverload: boolean; }

const emptyQuadrants = (): Record<Quadrant, number> => ({ importantUrgent: 0, important: 0, urgent: 0, later: 0 });

export function buildSevenDayForecast(tasks: Task[], dailyCapacity: number, now = new Date(), todayUsedMinutes = 0): SevenDayForecast {
  const today = startOfDay(now);
  const capacity = Math.max(0, dailyCapacity);
  const days: ForecastDay[] = Array.from({ length: 7 }, (_, index) => ({
    date: format(addDays(today, index), "yyyy-MM-dd"), capacityMinutes: index === 0 ? Math.max(0, capacity - Math.max(0, todayUsedMinutes)) : capacity,
    scheduledMinutes: 0, deadlineMinutes: 0, protectedQ2Minutes: 0, remainingCapacityMinutes: index === 0 ? Math.max(0, capacity - Math.max(0, todayUsedMinutes)) : capacity,
    overflowMinutes: 0, cumulativeDemandMinutes: 0, cumulativeCapacityMinutes: 0, cumulativeShortfallMinutes: 0, quadrantMinutes: emptyQuadrants(), risk: "healthy",
  }));
  const hard: Array<{ task: Task; minutes: number; dueIndex: number }> = [];
  let overdueMinutes = 0;
  let flexibleBacklogMinutes = 0;
  for (const task of tasks.filter((item) => item.active)) {
    const minutes = remainingMinutes(task).minutes;
    if (minutes <= 0) continue;
    const parsed = task.deadline ? parseISO(task.deadline) : undefined;
    if (!parsed || !isValid(parsed)) { flexibleBacklogMinutes += minutes; continue; }
    const rawIndex = differenceInCalendarDays(startOfDay(parsed), today);
    if (rawIndex < 0) overdueMinutes += minutes;
    if (rawIndex > 6) { flexibleBacklogMinutes += minutes; continue; }
    hard.push({ task, minutes, dueIndex: Math.max(0, rawIndex) });
  }
  hard.sort((a, b) => a.dueIndex - b.dueIndex || a.task.createdAt.localeCompare(b.task.createdAt));
  for (const item of hard) {
    let unplaced = item.minutes;
    for (let index = item.dueIndex; index >= 0 && unplaced > 0; index -= 1) {
      const planned = Math.min(unplaced, days[index].remainingCapacityMinutes);
      days[index].scheduledMinutes += planned; days[index].deadlineMinutes += planned; days[index].remainingCapacityMinutes -= planned;
      days[index].quadrantMinutes[quadrantFor(item.task, addDays(today, index))] += planned; unplaced -= planned;
    }
    if (unplaced > 0) days[item.dueIndex].overflowMinutes += unplaced;
  }
  const q2 = tasks.filter((task) => task.active && quadrantFor(task, now) === "important" && remainingMinutes(task).minutes > 0).sort((a, b) => (b.importance ?? 1) - (a.importance ?? 1))[0];
  if (q2 && days[0].quadrantMinutes.important === 0 && days[0].remainingCapacityMinutes > 0) {
    const protectedMinutes = Math.min(25, days[0].remainingCapacityMinutes, remainingMinutes(q2).minutes);
    days[0].protectedQ2Minutes = protectedMinutes; days[0].scheduledMinutes += protectedMinutes; days[0].remainingCapacityMinutes -= protectedMinutes; days[0].quadrantMinutes.important += protectedMinutes;
  }
  let cumulativeCapacity = 0; let peakUtilization = 0;
  for (let index = 0; index < days.length; index += 1) {
    const cumulativeDemand = hard.filter((item) => item.dueIndex <= index).reduce((sum, item) => sum + item.minutes, 0);
    cumulativeCapacity += days[index].capacityMinutes;
    const shortfall = Math.max(0, cumulativeDemand - cumulativeCapacity);
    const utilization = cumulativeCapacity > 0 ? cumulativeDemand / cumulativeCapacity : cumulativeDemand > 0 ? 1 : 0;
    peakUtilization = Math.max(peakUtilization, utilization);
    days[index].cumulativeDemandMinutes = cumulativeDemand; days[index].cumulativeCapacityMinutes = cumulativeCapacity; days[index].cumulativeShortfallMinutes = shortfall;
    days[index].risk = shortfall > 0 ? "overload" : utilization >= .85 ? "tight" : "healthy";
  }
  return { days, overdueMinutes, flexibleBacklogMinutes, firstRiskDate: days.find((day) => day.risk === "overload")?.date, peakUtilization, hasOverload: days.some((day) => day.risk === "overload") };
}

export function matrixHint(day: ForecastDay): string | undefined {
  if (day.risk === "overload") return "截止工作已超過可用容量，請先調整期限或範圍。";
  if (day.scheduledMinutes <= 0) return undefined;
  const urgentShare = (day.quadrantMinutes.importantUrgent + day.quadrantMinutes.urgent) / day.scheduledMinutes;
  const q3Share = day.quadrantMinutes.urgent / day.scheduledMinutes;
  if (urgentShare > .65) return "今天多數時間被緊急工作占用，請保留一段重要工作時間。";
  if (q3Share > .35) return "緊急但不重要的工作偏多，看看是否能縮短或延後。";
  if (day.protectedQ2Minutes > 0) return `已替重要但不緊急的工作保留 ${day.protectedQ2Minutes} 分鐘。`;
  return undefined;
}
