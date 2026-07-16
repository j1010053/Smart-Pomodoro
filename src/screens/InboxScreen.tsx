import { useState } from "react";
import { ArrowLeft, Check, Pencil, Plus, RotateCcw, X } from "lucide-react";
import type { EnergyLevel, Importance, Task } from "../domain/models";
import { useAppStore } from "../store/useAppStore";
import { BottomNav } from "../app/BottomNav";
import type { AppPage } from "../app/navigation";

function TaskEditor({ task, onClose }: { task: Task; onClose: () => void }) {
  const { taskProfiles, updateTask } = useAppStore();
  const [form, setForm] = useState({
    title: task.title,
    typeId: task.typeId ?? "",
    importance: task.importance ?? 2,
    deadline: task.deadline ?? "",
    energy: task.energy ?? 2,
    estimateMinutes: task.estimateMinutes ?? 25,
  });
  const chooseProfile = (typeId: string) => {
    const profile = taskProfiles.find((item) => item.id === typeId);
    setForm((current) => profile ? { ...current, typeId, importance: profile.defaultImportance, energy: profile.defaultEnergy, estimateMinutes: profile.defaultEstimateMinutes } : { ...current, typeId });
  };
  const save = async () => {
    if (!form.title.trim()) return;
    await updateTask(task.id, { title: form.title.trim(), typeId: form.typeId || undefined, importance: form.importance as Importance, deadline: form.deadline || undefined, energy: form.energy as EnergyLevel, estimateMinutes: Math.max(1, form.estimateMinutes) });
    onClose();
  };
  return <div className="dialog-backdrop" role="presentation"><section className="task-dialog" role="dialog" aria-modal="true" aria-label="編輯任務">
    <div className="section-heading"><div><p className="eyebrow">任務編輯</p><h2>調整開始需要的資訊</h2></div><button className="icon-button" aria-label="關閉" onClick={onClose}><X size={18} /></button></div>
    <label>任務名稱<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
    <label>任務類型<select value={form.typeId} onChange={(event) => chooseProfile(event.target.value)}><option value="">不分類</option>{taskProfiles.filter((item) => item.active).map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>
    <div className="form-grid"><label>重要性<select value={form.importance} onChange={(event) => setForm({ ...form, importance: Number(event.target.value) as Importance })}><option value="1">低</option><option value="2">一般</option><option value="3">高</option><option value="4">很高</option></select></label><label>所需能量<select value={form.energy} onChange={(event) => setForm({ ...form, energy: Number(event.target.value) as EnergyLevel })}><option value="1">低</option><option value="2">中</option><option value="3">高</option></select></label></div>
    <div className="form-grid"><label>截止日<input type="date" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} /></label><label>預估分鐘<input type="number" min="1" step="5" value={form.estimateMinutes} onChange={(event) => setForm({ ...form, estimateMinutes: Number(event.target.value) })} /></label></div>
    <p className="form-note">類型只提供建議值，你仍可自由修改。</p>
    <button className="primary-button full-button" onClick={() => void save()}><Check size={17} /> 儲存任務</button>
  </section></div>;
}

export function InboxScreen({ onNavigate }: { onNavigate: (page: AppPage) => void }) {
  const { tasks, addTask, completeTask, restoreTask } = useAppStore();
  const [title, setTitle] = useState("");
  const [editing, setEditing] = useState<Task>();
  const [tab, setTab] = useState<"active" | "completed">("active");
  const visible = tasks.filter((task) => tab === "active" ? task.active : !task.active);
  return <main className="app-shell page-screen">
    <header className="page-header"><button className="icon-button" aria-label="返回今天" onClick={() => onNavigate("today")}><ArrowLeft size={18} /></button><div><p className="eyebrow">整理</p><h1>收件匣</h1></div></header>
    <form className="inline-capture" onSubmit={(event) => { event.preventDefault(); void addTask(title).then(() => setTitle("")); }}><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="快速記下一件事" /><button className="primary-button" aria-label="新增任務"><Plus size={18} /></button></form>
    <div className="segmented"><button className={tab === "active" ? "active" : ""} onClick={() => setTab("active")}>待處理 {tasks.filter((task) => task.active).length}</button><button className={tab === "completed" ? "active" : ""} onClick={() => setTab("completed")}>已完成 {tasks.filter((task) => !task.active).length}</button></div>
    <section className="inbox-list"><ul>{visible.map((task) => <li key={task.id}><button className={task.active ? "check-button" : "completed-mark"} aria-label={task.active ? `完成 ${task.title}` : `復原 ${task.title}`} onClick={() => void (task.active ? completeTask(task.id) : restoreTask(task.id))}>{task.active ? null : <RotateCcw size={12} />}</button><button className="task-main" onClick={() => setEditing(task)}><strong>{task.title}</strong><span>{task.deadline || "無截止日"} · {task.estimateMinutes ?? 25} 分鐘</span></button><button className="icon-button small" aria-label={`編輯 ${task.title}`} onClick={() => setEditing(task)}><Pencil size={15} /></button></li>)}</ul>{visible.length === 0 ? <p className="empty-state">這裡目前是空的。</p> : null}</section>
    {editing ? <TaskEditor task={editing} onClose={() => setEditing(undefined)} /> : null}
    <BottomNav current="inbox" onNavigate={onNavigate} />
  </main>;
}
