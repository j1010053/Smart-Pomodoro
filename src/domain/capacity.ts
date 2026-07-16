import type { WorkSettings } from "./models";

export function effectiveDailyCapacity(settings: WorkSettings): number {
  const safeBuffer = Math.min(1, Math.max(0, settings.bufferRatio));
  return Math.round(Math.max(0, settings.dailyWorkMinutes) * (1 - safeBuffer));
}
