import { useMemo, useState } from "react";
import { ArrowRight, Download, Play, Plus, Settings2, Sparkles, TimerReset } from "lucide-react";
import { effectiveDailyCapacity } from "../domain/capacity";
import type { Importance, Task } from "../domain/models";
import { recommendTasks, urgencyFromDeadline } from "../domain/priority";
import { workloadByQuadrant, taskPressure } from "../domain/workload";
import { buildSevenDayForecast, matrixHint } from "../domain/forecast";
import { useAppStore } from "../store/useAppStore";
import { BottomNav } from "../app/BottomNav";
import type { AppPage } from "../app/navigation";

const minute = 60;

function TaskRow({ task, onStart }: { task: Task; onStart: (task: Task) => void }) {
  const updateTask = useAppStore((state) => state.updateTask);
  const completeTask = useAppStore((state) => state.completeTask);
  const urgency = urgencyFromDeadline(task.deadline);
  return (
    <li className="task-row">
      <button className="check-button" aria-label={`完成 ${task.title}`} onClick={() => void completeTask(task.id)} />
      <div className="task-copy">
        <strong>{task.title}</strong>
        <span>{task.deadline ? `${task.deadline}${urgency >= 35 ? " · 時間接近" : ""}` : "尚未分類"} · {task.estimateMinutes ?? 25} 分鐘</span>
      </div>
      <select aria-label={`${task.title} 的重要性`} value={task.importance ?? ""} onChange={(event) => void updateTask(task.id, { importance: event.target.value ? Number(event.target.value) as Importance : undefined })}>
        <option value="">重要性</option><option value="1">低</option><option value="2">一般</option><option value="3">高</option><option value="4">很高</option>
      </select>
      <button className="compact-button" onClick={() => onStart(task)}>開始</button>
    </li>
  );
}

function CompletedTaskRow({ task }: { task: Task }) {
  const restoreTask = useAppStore((state) => state.restoreTask);
  return <li className="task-row completed-task"><span className="completed-mark">✓</span><div className="task-copy"><strong>{task.title}</strong><span>已完成，可隨時復原</span></div><button className="compact-button" onClick={() => void restoreTask(task.id)}>復原</button></li>;
}

export function TodayScreen({ onNavigate }: { onNavigate: (page: AppPage) => void }) {
  const { tasks, settings, addTask, loadTrialTasks, saveSettings, startTimer, skipTask, exportBackup, importBackup } = useAppStore();
  const [title, setTitle] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [recommendationIndex, setRecommendationIndex] = useState(0);
  const [skipNotice, setSkipNotice] = useState<string>();
  const capacity = effectiveDailyCapacity(settings);
  const recommendations = useMemo(() => recommendTasks(tasks), [tasks]);
  const load = useMemo(() => workloadByQuadrant(tasks), [tasks]);
  const forecast = useMemo(() => buildSevenDayForecast(tasks, capacity), [tasks, capacity]);
  const todayPlan = forecast.days[0];
  const planHint = matrixHint(todayPlan);
  const top = recommendations.length ? recommendations[recommendationIndex % recommendations.length] : undefined;

  const begin = async (task?: Task, fiveMinutes = false) => { const started = await startTimer(task?.id, fiveMinutes ? "microStart" : "focus", (fiveMinutes ? 5 : 25) * minute); if (started) onNavigate("focus"); };
  const chooseNext = async () => { if (top) { const pressure = taskPressure(top.task); const skip = pressure.skipPressure; setSkipNotice(skip.kind === "impossible" ? (skip.reason === "overdue" ? "這件事已逾期，今天再跳過會繼續累積壓力。" : "這件事今天到期，跳過可能造成逾期。") : skip.kind === "possible" ? `跳過今天後，需每天約 ${skip.minutesPerDay} 分鐘（增加 ${skip.increaseMinutesPerDay} 分）。` : "已換成下一個建議，你可以隨時再回來。"); await skipTask(top.task.id); } setRecommendationIndex((index) => index + 1); };
  const submit = (event: React.FormEvent) => { event.preventDefault(); void addTask(title).then(() => setTitle("")); };
  const downloadBackup = () => void exportBackup().then((content) => {
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    anchor.download = `smart-pomodoro-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click(); URL.revokeObjectURL(anchor.href);
  });

  return (
    <main className="app-shell">
      <header className="topbar">
        <div><p className="eyebrow">長期試用版 v1 · 今天</p><h1>先開始，再慢慢整理。</h1></div>
        <button className="icon-button" aria-label="開啟設定" onClick={() => setShowSettings(true)}><Settings2 size={19} /></button>
      </header>

      {tasks.length === 0 ? <section className="trial-card"><Sparkles size={21} /><div><p className="eyebrow">兩分鐘體驗</p><h2>不知道從哪裡開始也沒關係</h2><p>載入三個範例任務，看看推薦、容量與五分鐘啟動如何運作。</p><button className="secondary-button" onClick={() => void loadTrialTasks()}>載入範例任務</button></div></section> : null}

      <form className="capture-card" onSubmit={submit}>
        <div><p className="eyebrow">快速收件匣</p><label htmlFor="quick-capture">腦中有什麼，就先放下來</label></div>
        <div className="capture-input"><input id="quick-capture" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：回覆王小姐" /><button className="primary-button" type="submit" aria-label="記下任務"><Plus size={18} /></button></div>
      </form>

      <section className="focus-card" aria-labelledby="focus-title">
        <p className="eyebrow">下一步建議</p>
        <h2 id="focus-title">{top ? top.task.title : "先記下一件想做的事"}</h2>
        <p className="muted">{top ? (top.reasons.length ? top.reasons.join("；") : "這是目前最容易開始的一件事") : "不必先填完資料，先讓任務進入收件匣。"}</p>
        <div className="action-row"><button className="primary-button" disabled={!top} onClick={() => begin(top?.task, true)}><Play size={16} /> 開始 5 分鐘</button>{top ? <><button className="secondary-button" onClick={() => begin(top.task)}><TimerReset size={16} /> 專注 25 分鐘</button><button className="text-button inline" onClick={() => void chooseNext()}>換一件 <ArrowRight size={15} /></button></> : null}</div>
        {recommendations.length > 1 ? <div className="recommendation-choices" aria-label="其他建議">{recommendations.slice(0, 3).map((item, index) => <button className={item.task.id === top?.task.id ? "active" : ""} key={item.task.id} onClick={() => setRecommendationIndex(index)}>{item.task.title}</button>)}</div> : null}
        {skipNotice ? <p className="skip-notice" role="status">{skipNotice}</p> : null}
      </section>

      <section className="capacity-card" aria-label="今日工作容量">
        <div><p className="eyebrow">今日可用容量</p><strong>{capacity} 分鐘</strong></div>
        <p>今日建議 {todayPlan.scheduledMinutes} 分鐘<br />已保留 {Math.round(settings.dailyWorkMinutes * settings.bufferRatio)} 分鐘緩衝</p>
      </section>
      {todayPlan.overflowMinutes > 0 ? <p className="warning" role="status">今天到期的工作超出容量 {todayPlan.overflowMinutes} 分鐘。</p> : null}

      <section className="forecast-card"><div className="section-heading"><div><p className="eyebrow">未來七天</p><h2>截止工作壓力</h2></div><span>{forecast.hasOverload ? "需要調整" : "可安排"}</span></div><div className="forecast-days">{forecast.days.map((day, index) => <div className={`forecast-day ${day.risk}`} key={day.date}><span>{index === 0 ? "今天" : `${new Date(`${day.date}T00:00:00`).getMonth() + 1}/${new Date(`${day.date}T00:00:00`).getDate()}`}</span><b>{day.scheduledMinutes + day.overflowMinutes}</b><small>分</small></div>)}</div><p>{forecast.hasOverload ? `最早風險日：${forecast.firstRiskDate}` : `彈性待辦 ${forecast.flexibleBacklogMinutes} 分鐘，不列入硬性期限壓力。`}</p></section>

      <section className="matrix-card"><div className="section-heading"><div><p className="eyebrow">今日安排</p><h2>四象限配比</h2></div><span>{todayPlan.scheduledMinutes} 分</span></div><div className="matrix"><div className="quadrant urgent-important"><b>重要且緊急</b><span>{todayPlan.quadrantMinutes.importantUrgent} 分</span></div><div className="quadrant important"><b>重要、不緊急</b><span>{todayPlan.quadrantMinutes.important} 分</span></div><div className="quadrant urgent"><b>緊急、不重要</b><span>{todayPlan.quadrantMinutes.urgent} 分</span></div><div className="quadrant later"><b>之後再說</b><span>{todayPlan.quadrantMinutes.later} 分</span></div></div>{planHint ? <p className="matrix-hint">{planHint}</p> : null}<p className="backlog-note">全部未完成待辦共 {load.total} 分鐘。</p></section>

      <section className="task-section"><div className="section-heading"><div><p className="eyebrow">收件匣與待辦</p><h2>你可以隨時改變主意</h2></div><span>{tasks.filter((task) => task.active).length} 件</span></div><ul>{tasks.filter((task) => task.active).map((task) => <TaskRow key={task.id} task={task} onStart={(item) => begin(item)} />)}</ul></section>

      {tasks.some((task) => !task.active) ? <details className="completed-section"><summary>已完成 {tasks.filter((task) => !task.active).length} 件</summary><ul>{tasks.filter((task) => !task.active).map((task) => <CompletedTaskRow key={task.id} task={task} />)}</ul></details> : null}

      {showSettings ? <div className="dialog-backdrop" role="presentation"><section className="settings-dialog" role="dialog" aria-modal="true" aria-label="工作設定"><div className="section-heading"><h2>今天的節奏</h2><button className="icon-button" aria-label="關閉設定" onClick={() => setShowSettings(false)}>×</button></div><label>預計投入 <input type="number" min="0" step="15" value={settings.dailyWorkMinutes} onChange={(event) => void saveSettings({ ...settings, dailyWorkMinutes: Number(event.target.value) })} /> 分鐘</label><label>保留緩衝 <input type="range" min="0" max="0.5" step="0.05" value={settings.bufferRatio} onChange={(event) => void saveSettings({ ...settings, bufferRatio: Number(event.target.value) })} /><span>{Math.round(settings.bufferRatio * 100)}%</span></label><div className="backup-actions"><button className="secondary-button" onClick={downloadBackup}><Download size={16} /> 匯出備份</button><label className="secondary-button import-button">匯入備份<input type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void file.text().then(importBackup); }} /></label></div></section></div> : null}

      <BottomNav current="today" onNavigate={onNavigate} />
    </main>
  );
}
