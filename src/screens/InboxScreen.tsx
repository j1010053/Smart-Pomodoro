import { useState } from "react";
import { ArrowLeft, Pencil, Plus, RotateCcw } from "lucide-react";
import type { Task } from "../domain/models";
import { useAppStore } from "../store/useAppStore";
import { BottomNav } from "../app/BottomNav";
import type { AppPage } from "../app/navigation";
import { importanceLabel, TaskEditorDialog } from "../components/TaskEditorDialog";

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
    <section className="inbox-list"><ul>{visible.map((task) => <li key={task.id}>{task.isSplitParent ? <span className="split-parent-mark" aria-label="已切分為子任務">↳</span> : <button className={task.active ? "check-button" : "completed-mark"} aria-label={task.active ? `完成 ${task.title}` : `復原 ${task.title}`} onClick={() => void (task.active ? completeTask(task.id) : restoreTask(task.id))}>{task.active ? null : <RotateCcw size={12} />}</button>}<button className="task-main" onClick={() => setEditing(task)}><strong>{task.title}</strong><span>{task.isSplitParent ? "已切分為子任務" : `${task.deadline || "無截止日"} · ${task.estimateMinutes ?? 25} 分鐘`}</span><small>重要性設定：{importanceLabel(task.importance)}</small></button><button className="icon-button small" aria-label={`編輯 ${task.title}`} onClick={() => setEditing(task)}><Pencil size={15} /></button></li>)}</ul>{visible.length === 0 ? <p className="empty-state">這裡目前是空的。</p> : null}</section>
    {editing ? <TaskEditorDialog task={editing} onClose={() => setEditing(undefined)} /> : null}
    <BottomNav current="inbox" onNavigate={onNavigate} />
  </main>;
}
