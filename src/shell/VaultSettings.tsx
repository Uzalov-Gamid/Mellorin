import { useEffect, useState } from "react";
import { getConfig, setEditPermission } from "../subprocess";

export function VaultSettings({ onClose }: { onClose: () => void }) {
  const [vault, setVault] = useState("Загрузка…");
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getConfig().then(config => { if (active) { setVault(config.vault_path); setAllowed(config.jery_can_edit_vault); } })
      .catch(reason => { if (active) setError(String(reason)); });
    return () => { active = false; };
  }, []);
  async function change(enabled: boolean) {
    setBusy(true); setError("");
    try { await setEditPermission(enabled); setAllowed(enabled); }
    catch (reason) { setError(String(reason)); }
    finally { setBusy(false); }
  }
  return <div className="settings-popover" role="dialog" aria-label="Настройки">
    <h2>Хранилище</h2><p>{vault}</p>
    <label><input type="checkbox" checked={allowed === true} disabled={allowed === null || busy} onChange={event => { void change(event.target.checked); }} /> JERY может изменять файлы хранилища</label>
    <p>Разрешает создание и правку файлов внутри хранилища. Смена настройки отключает JERY; следующий запрос подключит его заново.</p>
    {error && <p role="alert">{error}</p>}
    <button onClick={onClose}>Закрыть</button>
  </div>;
}
