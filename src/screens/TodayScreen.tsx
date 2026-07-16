import { useEffect, useMemo, useState } from "react";
import { Download, Play, Plus, Settings2, Sparkles, Square, TimerReset } from "lucide-react";
import { effectiveDailyCapacity } from "../domain/capacity";
import type { Importance, Task } from "../domain/models";
import { recommendTasks, urgencyFromDeadline } from "../domain/priority";
import { workloadByQuadrant, workloadWarning } from "../domain/workload";
import { useAppStore } from "../store/useAppStore";

const minute = 60;

function formatDuration(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

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

export function TodayScreen() {
  const { hydrated, tasks, settings, activeSession, hydrate, addTask, loadTrialTasks, saveSettings, startTimer, stopTimer, exportBackup } = useAppStore();
  const [title, setTitle] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const capacity = effectiveDailyCapacity(settings);
  const recommendations = useMemo(() => recommendTasks(tasks), [tasks]);
  const load = useMemo(() => workloadByQuadrant(tasks), [tasks]);
  const warning = workloadWarning(load.total, capacity);
  const top = recommendations[0];

  useEffect(() => { void hydrate(); }, [hydrate]);
  useEffect(() => {
    if (!activeSession?.plannedEndAt) { setSecondsLeft(0); return; }
    const update = () => {
      const remaining = Math.max(0, Math.ceil((new Date(activeSession.plannedEndAt!).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) void stopTimer(true);
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [activeSession, stopTimer]);

  const begin = (task?: Task, fiveMinutes = false) => void startTimer(task?.id, fiveMinutes ? "microStart" : "focus", (fiveMinutes ? 5 : 25) * minute);
  const submit = (event: React.FormEvent) => { event.preventDefault(); void addTask(title).then(() => setTitle("")); };
  const downloadBackup = () => void exportBackup().then((content) => {
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    anchor.download = `smart-pomodoro-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click(); URL.revokeObjectURL(anchor.href);
  });

  if (!hydrated) return <main className="app-shell"><p className="loading">正在讀取你的本機資料…</p></main>;
  return (
    <main className="app-shell">
      <header className="topbar">
        <div><p className="eyebrow">試用版 · 今天</p><h1>先開始，再慢慢整理。</h1></div>
        <button className="icon-button" aria-label="開啟設定" onClick={() => setShowSettings(true)}><Settings2 size={19} /></button>
      </header>

      {activeSession ? <section className="timer-card" aria-live="polite"><p className="eyebrow">{activeSession.mode === "microStart" ? "五分鐘啟動中" : "專注中"}</p><strong>{formatDuration(secondsLeft)}</strong><p>{tasks.find((task) => task.id === activeSession.taskId)?.title ?? "正在做的事"}</p><button className="secondary-button" onClick={() => void stopTimer(false)}><Square size={16} /> 結束並記錄</button></section> : null}

      {tasks.length === 0 ? <section className="trial-card"><Sparkles size={21} /><div><p className="eyebrow">兩分鐘體驗</p><h2>不知道從哪裡開始也沒關係</h2><p>載入三個範例任務，看看推薦、容量與五分鐘啟動如何運作。</p><button className="secondary-button" onClick={() => void loadTrialTasks()}>載入範例任務</button></div></section> : null}

      <form className="capture-card" onSubmit={submit}>
        <div><p className="eyebrow">快速收件匣</p><label htmlFor="quick-capture">腦中有什麼，就先放下來</label></div>
        <div className="capture-input"><input id="quick-capture" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：回覆王小姐" /><button className="primary-button" type="submit" aria-label="記下任務"><Plus size={18} /></button></div>
      </form>

      <section className="focus-card" aria-labelledby="focus-title">
        <p className="eyebrow">下一步建議</p>
        <h2 id="focus-title">{top ? top.task.title : "先記下一件想做的事"}</h2>
        <p className="muted">{top ? (top.reasons.length ? top.reasons.join("；") : "這是目前最容易開始的一件事") : "不必先填完資料，先讓任務進入收件匣。"}</p>
        <div className="action-row"><button className="primary-button" disabled={!top} onClick={() => begin(top?.task, true)}><Play size={16} /> 開始 5 分鐘</button>{top ? <button className="secondary-button" onClick={() => begin(top.task)}><TimerReset size={16} /> 專注 25 分鐘</button> : null}</div>
      </section>

      <section className="capacity-card" aria-label="今日工作容量">
        <div><p className="eyebrow">今日可用容量</p><strong>{capacity} 分鐘</strong></div>
        <p>待辦約 {load.total} 分鐘<br />已保留 {Math.round(settings.dailyWorkMinutes * settings.bufferRatio)} 分鐘緩衝</p>
      </section>
      {warning ? <p className="warning" role="status">{warning}</p> : null}

      <section className="matrix-card"><div className="section-heading"><div><p className="eyebrow">工作負荷</p><h2>四象限一覽</h2></div><span>{load.total} 分</span></div><div className="matrix"><div className="quadrant urgent-important"><b>重要且緊急</b><span>{load.importantUrgent} 分</span></div><div className="quadrant important"><b>重要、不緊急</b><span>{load.important} 分</span></div><div className="quadrant urgent"><b>緊急、不重要</b><span>{load.urgent} 分</span></div><div className="quadrant later"><b>之後再說</b><span>{load.later} 分</span></div></div></section>

      <section className="task-section"><div className="section-heading"><div><p className="eyebrow">收件匣與待辦</p><h2>你可以隨時改變主意</h2></div><span>{tasks.filter((task) => task.active).length} 件</span></div><ul>{tasks.filter((task) => task.active).map((task) => <TaskRow key={task.id} task={task} onStart={(item) => begin(item)} />)}</ul></section>

      {showSettings ? <div className="dialog-backdrop" role="presentation"><section className="settings-dialog" role="dialog" aria-modal="true" aria-label="工作設定"><div className="section-heading"><h2>今天的節奏</h2><button className="icon-button" aria-label="關閉設定" onClick={() => setShowSettings(false)}>×</button></div><label>預計投入 <input type="number" min="0" step="15" value={settings.dailyWorkMinutes} onChange={(event) => void saveSettings({ ...settings, dailyWorkMinutes: Number(event.target.value) })} /> 分鐘</label><label>保留緩衝 <input type="range" min="0" max="0.5" step="0.05" value={settings.bufferRatio} onChange={(event) => void saveSettings({ ...settings, bufferRatio: Number(event.target.value) })} /><span>{Math.round(settings.bufferRatio * 100)}%</span></label><button className="secondary-button" onClick={downloadBackup}><Download size={16} /> 匯出本機備份</button></section></div> : null}

      <nav className="bottom-nav" aria-label="主要導覽"><a className="active" href="#today">今天</a><a href="#inbox">收件匣</a><a href="#review">回顧</a></nav>
    </main>
  );
}
