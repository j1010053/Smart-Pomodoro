import type { TimerOutcome, TimerSession } from "./models";

export function timerRemainingSeconds(session: TimerSession, nowMs = Date.now()): number {
  if (session.status === "paused") return Math.max(0, session.pausedRemainingSeconds ?? 0);
  if (!session.plannedEndAt) return 0;
  return Math.max(0, Math.ceil((new Date(session.plannedEndAt).getTime() - nowMs) / 1000));
}

export function timerActualSeconds(session: TimerSession, outcome: TimerOutcome, nowMs = Date.now()): number {
  if (outcome === "skipped") return 0;
  return Math.max(0, Math.min(session.plannedSeconds, session.plannedSeconds - timerRemainingSeconds(session, nowMs)));
}
