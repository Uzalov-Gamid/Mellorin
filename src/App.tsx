import { useEffect, useState } from "react";
import { getConfig } from "./subprocess";
import { useJery } from "./useJery";
import { AppShell } from "./shell/AppShell";
import { screens, screenFromHash, type ScreenId } from "./screens";
import { TODAY_PROMPT } from "./prompts";
import "./app.css";

export default function App() {
  const jery = useJery();
  const [screen, setScreen] = useState<ScreenId>(() => screenFromHash(window.location.hash));
  const [expanded, setExpanded] = useState(false);
  const [settings, setSettings] = useState(false);
  const [vault, setVault] = useState("Загрузка…");
  useEffect(() => {
    const changed = () => setScreen(screenFromHash(window.location.hash));
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  useEffect(() => {
    let active = true;
    getConfig().then(config => { if (active) setVault(config.vault_path); })
      .catch((reason: unknown) => { if (active) setVault(`Ошибка: ${String(reason)}`); });
    return () => { active = false; };
  }, []);
  const Screen = screens.find(item => item.id === screen)!.component;
  return <AppShell jery={jery} expanded={expanded} onToggleChat={() => setExpanded(value => !value)}
    onToday={() => { setExpanded(true); void jery.sendText(TODAY_PROMPT); }}
    sidebar={<aside className="shell-placeholder"><a href="#english/reading">English › Чтение</a><footer>
      <span className="caption">{jery.running ? "● JERY на связи" : "○ JERY"}</span>
      <button aria-label="Настройки" aria-expanded={settings} onClick={() => setSettings(value => !value)}>◐</button>
      {settings && <div className="settings-popover" role="dialog" aria-label="Настройки"><h2>Хранилище</h2><p>{vault}</p><button onClick={() => setSettings(false)}>Закрыть</button></div>}
    </footer></aside>}>
    <Screen />
  </AppShell>;
}
