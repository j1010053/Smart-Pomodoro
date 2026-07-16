import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Coffee, FastForward, Pause, Play, RotateCcw, Square } from "lucide-react";
import type { TimerMode, TimerSession } from "../domain/models";
import { useAppStore } from "../store/useAppStore";
import type { AppPage } from "../app/navigation";

const modeLabel: Record<TimerMode, string> = { focus: "專注時間", microStart: "五分鐘啟動", shortBreak: "短休息", longBreak: "長休息" };
const format = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

export function FocusScreen({ onNavigate }: { onNavigate: (page: AppPage) => void }) {
  const { activeSession, tasks, pauseTimer, resumeTimer, finishTimer, startTimer, completeTask } = useAppStore();
  const [remaining, setRemaining] = useState(activeSession?.pausedRemainingSeconds ?? activeSession?.plannedSeconds ?? 0);
  const [finished, setFinished] = useState<TimerSession>();
  const finalizing = useRef(false);
  const task = tasks.find((item) => item.id === (activeSession?.taskId ?? finished?.taskId));

  useEffect(() => {
    if (!activeSession) return;
    const update = () => {
      const next = activeSession.status === "paused" ? (activeSession.pausedRemainingSeconds ?? 0) : Math.max(0, Math.ceil(((activeSession.plannedEndAt ? new Date(activeSession.plannedEndAt).getTime() : Date.now()) - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0 && activeSession.status === "running" && !finalizing.current) {
        finalizing.current = true;
        void finishTimer("completed").then((session) => { if (session) setFinished(session); finalizing.current = false; });
      }
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [activeSession, finishTimer]);

  const begin = async (mode: TimerMode, minutes: number, parentSessionId?: string) => {
    setFinished(undefined);
    await startTimer(task?.id, mode, minutes * 60, parentSessionId);
  };
  const endEarly = async () => { const session = await finishTimer("endedEarly"); if (session) setFinished(session); };
  const skip = async () => { await finishTimer("skipped"); onNavigate("today"); };

  if (finished) return <main className="focus-screen"><section className="transition-card"><div className="success-orb"><Check size={28} /></div><p className="eyebrow">{modeLabel[finished.mode]}結束</p><h1>{finished.mode === "microStart" ? "你已經開始了。" : finished.mode.includes("Break") ? "休息好了嗎？" : "這一輪完成了。"}</h1><p>{task?.title ?? "未連結任務"}</p>
    <div className="transition-actions">{finished.mode === "microStart" ? <><button className="primary-button" onClick={() => void begin("focus", 20, finished.id)}><Play size={17} />補滿一輪（再 20 分）</button><button className="secondary-button" onClick={() => void begin("microStart", 5, finished.id)}><RotateCcw size={17} />再做 5 分鐘</button></> : finished.mode === "focus" ? <><button className="primary-button" onClick={() => void begin("shortBreak", 5, finished.id)}><Coffee size={17} />短休息 5 分鐘</button><button className="secondary-button" onClick={() => void begin("longBreak", 15, finished.id)}>長休息 15 分鐘</button><button className="secondary-button" onClick={() => void begin("focus", 25, finished.id)}>再專注一輪</button></> : <button className="primary-button" onClick={() => void begin("focus", 25, finished.id)}><Play size={17} />開始下一輪</button>}
      {task?.active && (finished.mode === "focus" || finished.mode === "microStart") ? <button className="secondary-button" onClick={() => void completeTask(task.id).then(() => onNavigate("today"))}>完成任務並回今天</button> : null}<button className="text-button" onClick={() => onNavigate("today")}>先收下這段時間，回到今天</button></div></section></main>;

  if (!activeSession) return <main className="focus-screen"><section className="transition-card"><p className="eyebrow">專注</p><h1>目前沒有進行中的計時。</h1><button className="primary-button" onClick={() => onNavigate("today")}><ArrowLeft size={17} />回到今天</button></section></main>;

  const isBreak = activeSession.mode === "shortBreak" || activeSession.mode === "longBreak";
  return <main className={`focus-screen ${isBreak ? "break-mode" : ""}`}>
    <header className="focus-header"><button className="icon-button" aria-label="返回但保留計時" onClick={() => onNavigate("today")}><ArrowLeft size={18} /></button><span>{modeLabel[activeSession.mode]}</span><span className="session-state">{activeSession.status === "paused" ? "已暫停" : "進行中"}</span></header>
    <section className="focus-center"><p className="eyebrow">{isBreak ? "讓注意力休息一下" : task?.title ?? "未連結任務"}</p><strong className="focus-time">{format(remaining)}</strong><p>{activeSession.status === "paused" ? "時間停在這裡，準備好再繼續。" : "鎖定手機也沒關係，回來會依時間校正。"}</p></section>
    <div className="focus-controls">{activeSession.status === "paused" ? <button className="round-control primary" aria-label="繼續" onClick={() => void resumeTimer()}><Play size={28} /></button> : <button className="round-control primary" aria-label="暫停" onClick={() => void pauseTimer()}><Pause size={28} /></button>}<button className="round-control" aria-label="結束並記錄" onClick={() => void endEarly()}><Square size={23} /></button><button className="round-control" aria-label="跳過這輪" onClick={() => void skip()}><FastForward size={25} /></button></div>
    <div className="focus-labels"><span>{activeSession.status === "paused" ? "繼續" : "暫停"}</span><span>結束</span><span>跳過</span></div>
  </main>;
}
