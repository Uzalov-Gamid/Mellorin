import { JeryChanges } from "./changes/JeryChanges";
import { JeryBlocks } from "./blocks/JeryBlocks";
import { useEffect, useState } from "react";
import { Sidebar } from "./shell/Sidebar";
import { resolveSubjects, SUBJECTS, type Subject } from "./subjects";
import { vaultSubjects } from "./subprocess";
import { RequestsInbox } from "./shell/RequestsInbox";
import { SettingsPreferences } from "./screens/settings/SettingsPreferences";
import { VaultSettings } from "./shell/VaultSettings";
import { useJery } from "./useJery";
import { AppShell } from "./shell/AppShell";
import { screens, ScreenPanels, screenFromHash, type ScreenId } from "./screens";
import { localDate } from "./homeData";
import { useVaultState, setTaskDone, type TodayTask } from "./learning";
import { StateHome } from "./shell/StateHome";
import { TODAY_PROMPT, REFRESH_PROMPT } from "./prompts";
import "./app.css";
import { JeryFormatContext } from "./blocks/FormatScreen";

export default function App() {
  const jery = useJery();
  const { snapshot, loading } = useVaultState();
  const [screen, setScreen] = useState<ScreenId>(() => screenFromHash(window.location.hash));
  const [subjects, setSubjects] = useState<Subject[]>(SUBJECTS);
  const [expanded, setExpanded] = useState(false);
  const [taskBusy, setTaskBusy] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") { event.preventDefault(); setExpanded(value => !value); } if ((event.metaKey || event.ctrlKey) && event.key === ",") { event.preventDefault(); setSettings(value => !value); } };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    const changed = () => setScreen(screenFromHash(window.location.hash));
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  useEffect(() => {
    let active = true;
    vaultSubjects().then(found => { if (active) setSubjects(resolveSubjects(found)); }).catch(() => { /* fallback labels, no progress claims */ });
    return () => { active = false; };
  }, []);
  function startTask(task: TodayTask) {
    const subject = subjects.find(item => item.id === task.subject);
    const skill = task.skill || subject?.skills[0]?.id || "start";
    window.location.hash = `${task.subject}/${skill}`;
    setExpanded(true);
    void jery.sendText(`давай ${task.title}`);
  }
  async function toggleTask(task: TodayTask) {
    setTaskBusy(true); setTaskError(null);
    try { await setTaskDone(task.id, !task.done, localDate()); }
    catch (reason) { setTaskError(`Не удалось изменить задачу: ${String(reason)}`); }
    finally { setTaskBusy(false); }
  }
  const Screen = screens.find(item => item.id === screen)?.component;
  const selected = subjects.find(subject => subject.id === screen.split("/")[0]);
  const skill = selected?.skills.find(item => item.id === screen.split("/")[1]);
  return <AppShell jery={jery} expanded={expanded} onToggleChat={() => setExpanded(value => !value)}
    onToday={() => { setExpanded(true); void jery.sendText(TODAY_PROMPT); }}
    sidebar={<Sidebar subjects={subjects} state={snapshot.state} today={snapshot.today} active={screen} connected={jery.running} footer={<>
      <RequestsInbox />
      <button aria-label="Настройки" aria-expanded={settings} onClick={() => setSettings(value => !value)}>◐</button>

    </>} />}>
    <SettingsPreferences />
    {settings && <VaultSettings onClose={() => setSettings(false)} />}
    <div hidden={settings}>
    <JeryBlocks jery={jery} />
    <JeryChanges jery={jery} />
    {taskError && <p role="alert">{taskError}</p>}
    <JeryFormatContext.Provider value={{ canSend: jery.ready && !jery.busy && !jery.loading, intentError: jery.error, message: jery.messages.filter(message => message.role === "assistant").slice(-1)[0]?.text || "", data: null, intent: (intent, value) => { setExpanded(true); void jery.sendText(`${intent}\nДанные ответа: ${JSON.stringify(value)}`, intent); } }}><ScreenPanels active={screen} /></JeryFormatContext.Provider>
    {screen === "home" && <StateHome snapshot={snapshot} subjects={subjects} busy={taskBusy || !jery.ready || jery.busy || jery.loading} onStart={startTask} onToggle={toggleTask} loading={loading} onRefresh={() => { setExpanded(true); void jery.sendText(REFRESH_PROMPT); }} />}
    {!Screen && screen !== "home" && <section className="empty-screen"><h1>{screen === "home" ? "Главная" : `${selected?.name || screen.split("/")[0]} › ${skill?.name || screen.split("/")[1]}`}</h1><p>Данных для этого экрана пока нет. Начни разговор с JERY.</p></section>}
    </div>
  </AppShell>;
}
