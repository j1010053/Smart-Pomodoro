import { useState } from "react";
import { Check, Scissors, X } from "lucide-react";
import type { EnergyLevel, Importance, Task } from "../domain/models";
import { useAppStore } from "../store/useAppStore";

const toDateTimeLocal = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export function importanceLabel(importance?: Importance): string {
  return importance === 1 ? "低" : importance === 2 ? "一般" : importance === 3 ? "高" : importance === 4 ? "很高" : "未設定";
}

export function TaskEditorDialog({ task, onClose }: { task: Task; onClose: () => void }) {
  const { taskProfiles, updateTask, splitTask } = useAppStore();
  const [form, setForm] = useState({
    title: task.title,
    typeId: task.typeId ?? "",
    importance: task.importance ? String(task.importance) : "",
    deadline: task.deadline ?? "",
    reminderAt: toDateTimeLocal(task.reminderAt),
    energy: task.energy ?? 2,
    estimateMinutes: task.estimateMinutes ?? 25,
  });
  const [showSplit, setShowSplit] = useState(false);
  const [splitLines, setSplitLines] = useState("");
  const [splitError, setSplitError] = useState("");

  const chooseProfile = (typeId: string) => {
    const profile = taskProfiles.find((item) => item.id === typeId);
    setForm((current) => profile ? { ...current, typeId, importance: String(profile.defaultImportance), energy: profile.defaultEnergy, estimateMinutes: profile.defaultEstimateMinutes } : { ...current, typeId });
  };
  const save = async () => {
    if (!form.title.trim()) return false;
    await updateTask(task.id, {
      title: form.title.trim(), typeId: form.typeId || undefined,
      importance: form.importance ? Number(form.importance) as Importance : undefined,
      deadline: form.deadline || undefined, reminderAt: form.reminderAt || undefined, energy: form.energy as EnergyLevel,
      estimateMinutes: Math.max(1, form.estimateMinutes),
    });
    return true;
  };
  const createSplit = async () => {
    const titles = splitLines.split("\n").map((line) => line.trim()).filter(Boolean);
    if (titles.length < 2) { setSplitError("請至少輸入兩個子任務，每行一項。"); return; }
    if (!await save()) return;
    await splitTask(task.id, titles);
    onClose();
  };

  return <div className="dialog-backdrop" role="presentation"><section className="task-dialog" role="dialog" aria-modal="true" aria-label="編輯任務">
    <div className="section-heading"><div><p className="eyebrow">任務編輯</p><h2>調整開始需要的資訊</h2></div><button className="icon-button" aria-label="關閉" onClick={onClose}><X size={18} /></button></div>
    <label>任務名稱<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
    <label>任務類型<select value={form.typeId} onChange={(event) => chooseProfile(event.target.value)}><option value="">不分類</option>{taskProfiles.filter((item) => item.active).map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>
    <div className="form-grid"><label>重要性設定<select aria-label="重要性設定" value={form.importance} onChange={(event) => setForm({ ...form, importance: event.target.value })}><option value="">未設定</option><option value="1">低</option><option value="2">一般</option><option value="3">高</option><option value="4">很高</option></select><small>未設定不會當作重要任務。</small></label><label>所需能量<select value={form.energy} onChange={(event) => setForm({ ...form, energy: Number(event.target.value) as EnergyLevel })}><option value="1">低</option><option value="2">中</option><option value="3">高</option></select></label></div>
    <div className="form-grid"><label>截止日期<input type="date" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} /></label><label>預估分鐘<input type="number" min="1" step="5" value={form.estimateMinutes} onChange={(event) => setForm({ ...form, estimateMinutes: Number(event.target.value) })} /></label></div>
    <label>提醒時間（選填）<input type="datetime-local" value={form.reminderAt} onChange={(event) => setForm({ ...form, reminderAt: event.target.value })} /><small>需先在「今天」右上角設定開啟訊息提醒。</small></label>
    {task.isSplitParent ? <p className="form-note">此任務已切分為子任務，排程與四象限只會計算子任務。</p> : <>
      <button className="text-button split-trigger" onClick={() => setShowSplit((visible) => !visible)}><Scissors size={16} /> 切分任務</button>
      {showSplit ? <div className="split-panel"><label>子任務（每行一項）<textarea value={splitLines} onChange={(event) => { setSplitLines(event.target.value); setSplitError(""); }} placeholder={"例如：\n整理資料\n完成第一稿\n檢查並送出"} /></label><p>子任務會沿用重要性、期限、能量，並平分剩餘預估時間。</p>{splitError ? <p className="form-error" role="alert">{splitError}</p> : null}<button className="secondary-button full-button" onClick={() => void createSplit()}><Scissors size={16} /> 建立子任務</button></div> : null}
    </>}
    <p className="form-note">重要性描述影響程度；是否緊急則由截止日期決定。</p>
    <button className="primary-button full-button" onClick={() => void save().then((saved) => saved && onClose())}><Check size={17} /> 儲存任務</button>
  </section></div>;
}
