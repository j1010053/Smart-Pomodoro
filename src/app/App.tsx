import { useEffect, useState, type ReactNode } from "react";
import { TimerReset } from "lucide-react";
import { TodayScreen } from "../screens/TodayScreen";
import { InboxScreen } from "../screens/InboxScreen";
import { FocusScreen } from "../screens/FocusScreen";
import { ReviewScreen } from "../screens/ReviewScreen";
import type { AppPage } from "./navigation";
import { useAppStore } from "../store/useAppStore";
import { useTaskReminders } from "./notifications";

export function App() {
  const [page, setPage] = useState<AppPage>("today");
  const { hydrated, hydrate, activeSession, tasks, settings } = useAppStore();
  useEffect(() => { void hydrate(); }, [hydrate]);
  useEffect(() => { if (hydrated && activeSession) setPage("focus"); }, [hydrated, activeSession?.id]);
  useTaskReminders(tasks, hydrated && settings.notificationsEnabled);
  if (!hydrated) return <main className="app-shell"><p className="loading">正在讀取你的本機資料…</p></main>;
  if (page === "focus") return <FocusScreen onNavigate={setPage} />;
  let screen: ReactNode = <TodayScreen onNavigate={setPage} />;
  if (page === "inbox") screen = <InboxScreen onNavigate={setPage} />;
  if (page === "review") screen = <ReviewScreen onNavigate={setPage} />;
  return <>{screen}{activeSession ? <button className="active-session-pill" onClick={() => setPage("focus")}><TimerReset size={16} />{activeSession.status === "paused" ? "計時已暫停" : "回到專注計時"}</button> : null}</>;
}
