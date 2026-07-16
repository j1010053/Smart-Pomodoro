import { BarChart3, CalendarDays, Inbox } from "lucide-react";
import type { AppPage } from "./navigation";

export function BottomNav({ current, onNavigate }: { current: AppPage; onNavigate: (page: AppPage) => void }) {
  return <nav className="bottom-nav" aria-label="主要導覽">
    <button className={current === "today" ? "active" : ""} onClick={() => onNavigate("today")}><CalendarDays size={17} />今天</button>
    <button className={current === "inbox" ? "active" : ""} onClick={() => onNavigate("inbox")}><Inbox size={17} />收件匣</button>
    <button className={current === "review" ? "active" : ""} onClick={() => onNavigate("review")}><BarChart3 size={17} />回顧</button>
  </nav>;
}
