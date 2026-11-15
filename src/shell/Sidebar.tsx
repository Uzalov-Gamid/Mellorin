import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { Subject } from "../subjects";
import { Ring } from "../ui";
import { trailState } from "./trail";

function storedCollapsed() { try { return localStorage.getItem("sidebar_collapsed") === "true"; } catch { return false; } }
export function Sidebar({ subjects, active, connected, footer }: { subjects: Subject[]; active: string; connected: boolean; footer: ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => storedCollapsed() || window.matchMedia("(max-width: 999px)").matches);
  const [open, setOpen] = useState(active.includes("/") ? active.split("/")[0] : subjects[0]?.id);
  function changeCollapsed(value: boolean) {
    setCollapsed(value);
    try { localStorage.setItem("sidebar_collapsed", String(value)); } catch { /* storage can be disabled */ }
  }
  useEffect(() => {
    const media = window.matchMedia("(max-width: 999px)");
    const resize = () => setCollapsed(media.matches || storedCollapsed());
    const keys = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setCollapsed(previous => { const next = !previous; try { localStorage.setItem("sidebar_collapsed", String(next)); } catch { /* unavailable */ } return next; });
      }
    };
    media.addEventListener("change", resize); window.addEventListener("keydown", keys);
    return () => { media.removeEventListener("change", resize); window.removeEventListener("keydown", keys); };
  }, []);
  useEffect(() => { if (active.includes("/")) setOpen(active.split("/")[0]); }, [active]);
  return <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""}`} aria-label="Предметы">
    <div className="sidebar-top"><a href="#home" aria-label="Главная: данные задач пока отсутствуют" className={`day-home ${active === "home" ? "day-home-active" : ""}`}><Ring value={0} label="Задачи: нет данных">—</Ring></a>
      {!collapsed && <span className="week-empty" title="Данные занятий появятся после обновления состояния">Неделя: —</span>}
      <button aria-label={collapsed ? "Развернуть панель" : "Свернуть панель"} onClick={() => changeCollapsed(!collapsed)}>{collapsed ? "»" : "«"}</button></div>
    <nav className="sidebar-subjects">{subjects.map(subject => {
      const opened = subject.id === open;
      const trail = trailState(subject.skills.map(skill => skill.id), active.startsWith(subject.id + "/") ? active.split("/")[1] : "");
      return <div key={subject.id} className={`subject ${opened ? "subject-open" : ""}`}>
        <button className="subject-heading" aria-label={`Открыть ${subject.name}`} aria-expanded={opened} onClick={() => { setOpen(subject.id); if (collapsed) changeCollapsed(false); }}>
          <Ring size={collapsed ? 44 : 30} value={0} label={`${subject.name}: нет данных`}>{collapsed ? subject.letter : null}</Ring>
          {!collapsed && <span><strong>{subject.name}</strong><small>Прогресс: —</small></span>}</button>
        {opened && <div className={`trail ${collapsed ? "trail-mini" : ""}`} style={{ "--trail-percent": `${trail.linePercent}%` } as CSSProperties}>
          {subject.skills.map((skill, index) => <a key={skill.id} href={`#${subject.id}/${skill.id}`} aria-label={`${subject.name}: ${skill.name}`} aria-current={trail.nodes[index] === "current" ? "page" : undefined} className={`trail-row trail-${trail.nodes[index]}`}>
            <span className="trail-node" />{!collapsed && <><span>{skill.name}</span><small>{trail.nodes[index] === "current" ? "сейчас" : "—"}</small></>}</a>)}
        </div>}
      </div>;
    })}</nav>
    <footer><span className="caption" title={connected ? "JERY на связи" : "JERY отключён"}>{collapsed ? (connected ? "●" : "○") : connected ? "● JERY на связи" : "○ JERY"}</span>{footer}</footer>
  </aside>;
}
