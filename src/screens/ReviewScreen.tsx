import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowLeft, Clock3, Flame } from "lucide-react";
import { BottomNav } from "../app/BottomNav";
import type { AppPage } from "../app/navigation";
import { db } from "../db/database";
import { buildReviewSummary } from "../domain/analytics";
import type { WorkEvent } from "../domain/models";

const percent = (value: number | null) => value === null ? "累積中" : `${Math.round(value * 100)}%`;

export function ReviewScreen({ onNavigate }: { onNavigate: (page: AppPage) => void }) {
  const [events, setEvents] = useState<WorkEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { void db.events.toArray().then((items) => { setEvents(items); setLoaded(true); }); }, []);
  const summary = useMemo(() => buildReviewSummary(events), [events]);
  useEffect(() => { if (loaded) void db.dailyStats.bulkPut(summary.days); }, [loaded, summary]);
  const maxMinutes = Math.max(1, ...summary.days.map((day) => day.completedSeconds / 60));
  return <main className="app-shell page-screen">
    <header className="page-header"><button className="icon-button" aria-label="返回今天" onClick={() => onNavigate("today")}><ArrowLeft size={18} /></button><div><p className="eyebrow">最近七天</p><h1>回顧</h1></div></header>
    <section className="review-lead"><div><p className="eyebrow">累積專注</p><strong>{Math.round(summary.totalCompletedSeconds / 60)}</strong><span>分鐘</span></div><div><p className="eyebrow">完整番茄</p><strong>{summary.totalPomodoros}</strong><span>輪</span></div></section>
    <section className="review-card"><div className="section-heading"><div><p className="eyebrow">每天的節奏</p><h2>專注分鐘</h2></div><Clock3 size={19} /></div><div className="week-chart">{summary.days.map((day) => { const minutes = Math.round(day.completedSeconds / 60); return <div className="day-bar" key={day.date}><span>{minutes || "·"}</span><div><i style={{ height: `${Math.max(day.observed ? 8 : 2, minutes / maxMinutes * 100)}%` }} /></div><small>{new Date(`${day.date}T00:00:00`).toLocaleDateString("zh-TW", { weekday: "short" })}</small></div>; })}</div></section>
    <section className="review-grid"><article><Activity size={18} /><span>任務完成率</span><strong>{percent(summary.completionRate)}</strong></article><article><Flame size={18} /><span>工作詰抗指數</span><strong>{summary.frictionIndex === null ? "累積中" : summary.frictionIndex.toFixed(2)}</strong></article></section>
    <section className="review-card"><p className="eyebrow">工作組成警示</p><div className="metric-row"><div><b>重要流失率</b><span>重要任務被跳過的比例</span></div><strong>{percent(summary.importantLossRate)}</strong></div><div className="metric-row"><div><b>緊急侵占率</b><span>不重要緊急工作占用的時間</span></div><strong>{percent(summary.urgentCrowdingRate)}</strong></div><div className="metric-row"><div><b>第二象限缺席率</b><span>沒有完成重要不緊急工作的工作日</span></div><strong>{percent(summary.q2AbsenceRate)}</strong></div>{summary.frictionIndex === null ? <p className="data-note">再完成或跳過幾件任務後，這裡會形成較可靠的趨勢。</p> : null}</section>
    <BottomNav current="review" onNavigate={onNavigate} />
  </main>;
}
