import { useEffect, useState } from "react";
import { Chat } from "./Chat";
import { TextViewer } from "./TextViewer";
import "./app.css";
import { getConfig } from "./subprocess";

type Tab = "chat" | "text";

export default function App() {
  const [tab, setTab] = useState<Tab>("chat");

  const [vault, setVault] = useState("Загрузка…");
  useEffect(() => {
    let active = true;
    getConfig().then(config => { if (active) setVault(config.vault_path); })
      .catch((reason: unknown) => { if (active) setVault(`Ошибка: ${String(reason)}`); });
    return () => { active = false; };
  }, []);

  return (
    <div className="app">
      <nav className="nav">
        <span className="nav-brand">Mellorin</span>
        <div className="nav-tabs">
          <button
            className={`nav-tab ${tab === "chat" ? "nav-tab-active" : ""}`}
            onClick={() => setTab("chat")}
          >
            Чат
          </button>
          <button
            className={`nav-tab ${tab === "text" ? "nav-tab-active" : ""}`}
            onClick={() => setTab("text")}
          >
            Чтение текста
          </button>
        </div>
      </nav>
      <div className="settings-line">Настройки · Хранилище: {vault}</div>
      <main className="main">
        <div className="tab-panel" hidden={tab !== "chat"}><Chat /></div>
        <div className="tab-panel" hidden={tab !== "text"}><TextViewer /></div>
      </main>
    </div>
  );
}
