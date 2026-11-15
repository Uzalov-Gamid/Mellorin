import { useState } from "react";
import { Chat } from "./Chat";
import { TextViewer } from "./TextViewer";
import "./app.css";

type Tab = "chat" | "text";

export default function App() {
  const [tab, setTab] = useState<Tab>("chat");

  return (
    <div className="app">
      <nav className="nav">
        <span className="nav-brand">Mellorin</span>
        <div className="nav-tabs">
          <button
            className={`nav-tab ${tab === "chat" ? "nav-tab-active" : ""}`}
            onClick={() => setTab("chat")}
          >
            Chat
          </button>
          <button
            className={`nav-tab ${tab === "text" ? "nav-tab-active" : ""}`}
            onClick={() => setTab("text")}
          >
            Text viewer
          </button>
        </div>
      </nav>
      <main className="main">
        {tab === "chat" ? <Chat /> : <TextViewer />}
      </main>
    </div>
  );
}
