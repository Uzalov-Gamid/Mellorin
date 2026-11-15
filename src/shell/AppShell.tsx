import { useState, type ReactNode } from "react";
import { ChatPanel } from "../Chat";
import type { Jery } from "../useJery";
import { JeryStrip } from "./JeryStrip";

export function AppShell({ sidebar, children, jery, expanded, onToggleChat, onToday, active = "home" }: {
  sidebar: ReactNode; children: ReactNode; jery: Jery; expanded: boolean; onToggleChat: () => void; onToday: () => void; active?: string;
}) {
  const [height, setHeight] = useState(() => {
    try { const v = Number(localStorage.getItem("mellorin.chatHeight")); return v >= 160 ? v : 420; } catch { return 420; }
  });
  const startDrag = (e: React.PointerEvent) => {
    const startY = e.clientY, startH = height;
    let h = startH;
    const move = (ev: PointerEvent) => { h = Math.min(window.innerHeight - 160, Math.max(160, startH + startY - ev.clientY)); setHeight(h); };
    const up = () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      try { localStorage.setItem("mellorin.chatHeight", String(Math.round(h))); } catch { /* ignore */ }
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  return <div className="app-shell">{sidebar}<div className="shell-content">
    <header className="shell-top" data-tauri-drag-region><time data-tauri-drag-region>{new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}</time>
      <div className="shell-actions">{active === "home" && <button className="shell-refresh" type="button" aria-label="Обновить" title="Обновить из TickTick" disabled={!jery.ready || jery.busy || jery.loading} onClick={onToday}>⟳</button>}</div></header>
    <main className="shell-main">{children}</main>
    <section className="jery-expanded" hidden={!expanded} style={{ height }}><div className="jery-resize" role="separator" aria-orientation="horizontal" aria-label="Размер чата" onPointerDown={startDrag} /><div className="jery-panel-heading"><span>JERY · чат занятия</span><button onClick={onToggleChat}>▾ свернуть</button></div><ChatPanel jery={jery} /></section>
    <JeryStrip jery={jery} expanded={expanded} onToggle={onToggleChat} />
  </div></div>;
}
