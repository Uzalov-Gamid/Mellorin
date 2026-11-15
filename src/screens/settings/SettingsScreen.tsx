import { useEffect, useState } from "react";
import { getDiagnostics, saveSettings, type Diagnostics } from "./bridge";
import "./settings.css";
import { ChangeHistory } from "../../changes/ChangeHistory";
import { getConfig, setEditPermission, setTickTick, getTickTickStatus, type TickTickMode, type TickTickStatus } from "../../subprocess";

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const [originalPaths, setOriginalPaths] = useState<{ vault: string; cli: string } | null>(null);
  const [claude, setClaude] = useState("claude");
  const [textSize, setTextSize] = useState(14);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [saved, setSaved] = useState("");
  const [details, setDetails] = useState(false);
  const [vault, setVault] = useState("Загрузка…");
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [ticktick, setTicktick] = useState<TickTickMode | null>(null);
  const [status, setStatus] = useState<TickTickStatus | "checking">("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getConfig().then(config => { if (active) { setOriginalPaths({vault: config.vault_path, cli: config.claude_path || "claude"}); setVault(config.vault_path); setClaude(config.claude_path || "claude"); setTextSize((config as { text_size?: number }).text_size || 14); setAllowed(config.jery_can_edit_vault); setTicktick(config.jery_ticktick ?? "full"); } })
      .catch(reason => { if (active) setError(String(reason)); });
    getDiagnostics().then(value => { if (active) setDiagnostics(value); }).catch(() => { if (active) setError("Диагностика недоступна. Повтори проверку."); });
    getTickTickStatus().then(value => { if (active) setStatus(value); }).catch(() => { if (active) setStatus("unavailable"); });
    return () => { active = false; };
  }, []);
  async function change(enabled: boolean) {
    setBusy(true); setError("");
    try { await setEditPermission(enabled); setAllowed(enabled); }
    catch (reason) { setError(String(reason)); }
    finally { setBusy(false); }
  }
  async function changeTickTick(mode: TickTickMode) {
    setBusy(true); setError("");
    try { await setTickTick(mode); setTicktick(mode); }
    catch (reason) { setError(String(reason)); }
    finally { setBusy(false); }
  }
  async function persist(size = textSize) {
    setBusy(true); setError(""); setSaved("");
    try {
      await saveSettings({ vault_path: vault, claude_path: claude, theme: "light", text_size: size });
      setTextSize(size); document.documentElement.style.setProperty("--text-size", `${size}px`); document.body.style.fontSize = `${size}px`;
      if (originalPaths && (originalPaths.vault !== vault || originalPaths.cli !== claude)) { window.location.reload(); return; }
      setSaved("Настройки сохранены");
      try { setDiagnostics(await getDiagnostics()); } catch { setError("Настройки сохранены, но диагностика недоступна."); }
    } catch (reason) { setError(`Не удалось сохранить настройки: ${String(reason)}`); }
    finally { setBusy(false); }
  }
  async function check() {
    setBusy(true); setError("");
    try { setDiagnostics(await getDiagnostics()); setStatus(await getTickTickStatus()); }
    catch { setError("Проверка недоступна. Проверь сохранённые пути и подключение."); }
    finally { setBusy(false); }
  }
  const statusText = {
    checking: "TickTick: проверка подключения…",
    connected: "● подключён через Claude",
    needs_authentication: "TickTick: нужна авторизация. Подключи TickTick в Claude: Settings → Connectors.",
    not_found: "TickTick не найден. Подключи TickTick в Claude: Settings → Connectors.",
    unavailable: "TickTick: проверка недоступна. Проверь Claude Code и подключение к сети; при лимите дождись его сброса.",
  };
  return <section className="settings-screen" aria-label="Настройки">
    <div className="settings-heading"><div><div className="settings-cap">≡ НАСТРОЙКИ</div><h1>Настройки</h1></div><button className="settings-btn" onClick={onClose}>Закрыть</button></div>
    <div className="settings-grid"><div className="settings-column">
      <section className="settings-card settings-paper"><div className="settings-cap">◆ ХРАНИЛИЩЕ</div>
        <div className="settings-row"><input className="settings-field" aria-label="Путь хранилища" value={vault} disabled={allowed === null || busy} onChange={e => setVault(e.target.value)} /><button className="settings-btn" disabled={busy || allowed === null} onClick={() => void persist()}>Сохранить</button></div>
        <div className="settings-status">{diagnostics ? diagnostics.vault_found ? `● найдено${diagnostics.learning_found ? " · Learning/" : " · Learning/ не найдено"}` : "○ папка не найдена" : "Проверка хранилища…"}</div>
        <p>Markdown-файлы остаются единственным источником правды: то же хранилище открывается в Obsidian.</p>
      </section>
      <section className="settings-card settings-paper"><div className="settings-cap">◆ JERY</div>
        <div className="settings-row"><label className="settings-label" htmlFor="settings-cli">Claude Code</label><input id="settings-cli" title="Сохрани изменения путей кнопкой «Сохранить». При смене пути текущий чат остановится." className="settings-field" value={claude} disabled={busy || allowed === null} onChange={e => setClaude(e.target.value)} /><button className="settings-btn" disabled={busy} onClick={() => void check()}>Проверить</button></div>
        <div className="settings-status">{diagnostics ? diagnostics.cli_available ? "● доступен" : "○ Claude Code недоступен" : "Проверка Claude Code…"}</div>
        <div className="settings-row settings-divider"><span className="settings-label">TickTick</span><span className="settings-status" role="status">{statusText[status]}</span></div>
        <div className="settings-modes" role="group" aria-label="Доступ JERY к TickTick">{([["full", "читать и менять"], ["read", "только читать"], ["off", "выключено"]] as const).map(([mode, label]) => <button key={mode} className="settings-pill" aria-pressed={ticktick === mode} disabled={ticktick === null || busy} onClick={() => void changeTickTick(mode)}>{label}</button>)}</div>
        <p>Календарь и задачи, как всегда у JERY. Правила, когда ему можно менять задачи, остаются в твоём CLAUDE.md.</p>
        <label className="settings-permission settings-divider"><input type="checkbox" checked={allowed === true} disabled={allowed === null || busy} onChange={event => { void change(event.target.checked); }} /><span>JERY может менять файлы в хранилище<span className="settings-help">Разрешает создание и правку внутри хранилища. Смена доступа отключает текущий чат. Правила Claude продолжают действовать.</span></span></label>
      </section>
      <section className="settings-card settings-paper"><div className="settings-cap">◆ ВНЕШНИЙ ВИД</div>
        <div className="settings-row settings-between"><span>Тема</span><span className="settings-themes"><button className="settings-pill" disabled={busy || allowed === null} onClick={() => void persist()}>светлая</button><button className="settings-pill" disabled>тёмная · скоро</button></span></div>
        <label className="settings-row settings-between">Размер текста<span className="settings-size"><span>A</span><input aria-label="Размер текста" type="range" min="12" max="18" value={textSize} disabled={busy || allowed === null} onChange={e => void persist(Number(e.target.value))} /><span>A</span></span></label>
      </section>
      <section className="settings-card settings-paper"><div className="settings-cap">◆ МАСТЕРСКАЯ</div><ChangeHistory onApplied={() => { window.dispatchEvent(new Event("mellorin-format-changed")); }} /></section>
    </div><div className="settings-column">
      <section className="settings-card"><div className="settings-cap">◆ ПРЕДМЕТЫ</div><div>Добавить, переименовать, переставить, архивировать.</div><button className="settings-btn settings-subjects" disabled title="Экран управления предметами готовится">Управлять предметами ›</button></section>
      <section className="settings-card"><div className="settings-cap">◆ ГОРЯЧИЕ КЛАВИШИ</div>{[["Свернуть и развернуть панель", "⌘ B"], ["Настройки", "⌘ ,"], ["Отправить JERY", "↵"], ["Развернуть чат", "⌘ J"]].map(([label, key]) => <div className="settings-kv" key={key}><span>{label}</span><kbd>{key}</kbd></div>)}</section>
      <section className="settings-card"><div className="settings-cap">◆ О ПРИЛОЖЕНИИ</div><div className="settings-kv"><span>Версия</span><span>0.1.0</span></div><div className="settings-kv"><span>Лицензия</span><span>source-available · нужно разрешение</span></div><div className="settings-row settings-wrap"><button className="settings-btn" onClick={() => setDetails(!details)}>Показать папку данных</button><button className="settings-btn" disabled={busy} onClick={() => { setDetails(true); void check(); }}>Журнал для диагностики</button></div>
        {details && <p>Папка данных: {diagnostics?.data_directory || "недоступна"}. Конфигурация: mellorin.toml. Проверки: папка хранилища, Learning/, Claude Code --version и mcp list. Содержимое файлов и задач в диагностику не включается. {diagnostics?.cli_available ? "CLI доступен." : "CLI не подтверждён."}</p>}
      </section>
    </div></div>
    {saved && <p role="status">{saved}</p>}{error && <p role="alert">{error}</p>}
  </section>;
}
