import { useEffect, useState } from "react";
import { getConfig, setEditPermission, setTickTick, getTickTickStatus, type TickTickMode, type TickTickStatus } from "../subprocess";

export function VaultSettings({ onClose }: { onClose: () => void }) {
  const [vault, setVault] = useState("Загрузка…");
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [ticktick, setTicktick] = useState<TickTickMode | null>(null);
  const [status, setStatus] = useState<TickTickStatus | "checking">("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getConfig().then(config => { if (active) { setVault(config.vault_path); setAllowed(config.jery_can_edit_vault); setTicktick(config.jery_ticktick ?? "full"); } })
      .catch(reason => { if (active) setError(String(reason)); });
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
  const statusText = {
    checking: "TickTick: проверка подключения…",
    connected: "TickTick: подключён через Claude",
    needs_authentication: "TickTick: нужна авторизация. Подключи TickTick в Claude: Settings → Connectors.",
    not_found: "TickTick не найден. Подключи TickTick в Claude: Settings → Connectors.",
    unavailable: "TickTick: проверка недоступна. Проверь Claude Code и подключение к сети; при лимите дождись его сброса.",
  };
  return <div className="settings-popover" role="dialog" aria-label="Настройки">
    <h2>Хранилище</h2><p>{vault}</p>
    <label><input type="checkbox" checked={allowed === true} disabled={allowed === null || busy} onChange={event => { void change(event.target.checked); }} /> JERY может изменять файлы хранилища</label>
    <p>Разрешает создание и правку файлов внутри хранилища. Смена настройки отключает JERY; следующий запрос подключит его заново.</p>
    <label>Доступ JERY к TickTick <select aria-label="Доступ JERY к TickTick" value={ticktick ?? "full"} disabled={ticktick === null || busy} onChange={event => { void changeTickTick(event.target.value as TickTickMode); }}>
      <option value="full">Полный доступ</option><option value="read">Только чтение</option><option value="off">Не разрешать через приложение</option>
    </select></label>
    <p role="status">{statusText[status]}</p>
    <p>Задачи и календарь: JERY меняет их только по запросу. Смена доступа отключает текущий чат. Правила Claude продолжают действовать.</p>
    {error && <p role="alert">{error}</p>}
    <button onClick={onClose}>Закрыть</button>
  </div>;
}
