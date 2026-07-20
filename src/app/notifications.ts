import { useEffect, useRef } from "react";
import type { Task } from "../domain/models";

const maxTimeoutMs = 2_147_000_000;

export function showNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
  const notification = new Notification(title, { body, tag: `${title}:${body}` });
  notification.onclick = () => { window.focus(); notification.close(); };
}

export function useTaskReminders(tasks: Task[], enabled: boolean) {
  const notified = useRef(new Set<string>());
  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
    const timers: number[] = [];
    for (const task of tasks.filter((item) => item.active && item.reminderAt)) {
      const reminderAt = task.reminderAt!;
      const key = `${task.id}:${reminderAt}`;
      if (notified.current.has(key)) continue;
      const schedule = () => {
        const delay = new Date(reminderAt).getTime() - Date.now();
        if (delay <= 0) return;
        timers.push(window.setTimeout(() => {
          if (delay > maxTimeoutMs) { schedule(); return; }
          notified.current.add(key);
          showNotification("任務提醒", task.title);
        }, Math.min(delay, maxTimeoutMs)));
      };
      schedule();
    }
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [tasks, enabled]);
}
