import type { ReactNode } from "react";
import { ChatPanel } from "../Chat";
import type { Jery } from "../useJery";
import { JeryStrip } from "./JeryStrip";

export function AppShell({ sidebar, children, jery, expanded, onToggleChat, onToday }: {
  sidebar: ReactNode; children: ReactNode; jery: Jery; expanded: boolean; onToggleChat: () => void; onToday: () => void;
}) {
  return <div className="app-shell">{sidebar}<div className="shell-content">
    <header className="shell-top"><time>{new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}</time>
      <button className="ui-button ui-button-outlined" disabled={!jery.ready || jery.busy || jery.loading} onClick={onToday}>› Сегодня</button></header>
    <main className="shell-main">{children}</main>
    <section className="jery-expanded" hidden={!expanded}><div className="jery-panel-heading"><span>JERY · чат занятия</span><button onClick={onToggleChat}>▾ свернуть</button></div><ChatPanel jery={jery} /></section>
    <JeryStrip jery={jery} expanded={expanded} onToggle={onToggleChat} />
  </div></div>;
}
