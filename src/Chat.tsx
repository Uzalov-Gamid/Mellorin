import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useJery, type Jery } from "./useJery";

export function Chat() {
  const jery = useJery();
  return ChatPanel({ jery });
}

export function ChatPanel({ jery }: { jery: Jery }) {
  const { messages, input, setInput, running, ready, busy, loading, error, toggleConnection, send } = jery;
  const listRef = useRef<HTMLDivElement>(null);
  const stuck = useRef(true);
  const [unseen, setUnseen] = useState(false);
  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    stuck.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    if (stuck.current) setUnseen(false);
  };
  const toBottom = () => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    stuck.current = true;
    setUnseen(false);
  };
  useEffect(() => { if (stuck.current) toBottom(); else setUnseen(true); }, [messages]);
  return (
    <div className="chat">
      <div className="chat-header">
        <span className="chat-title">Джери</span>
        <button className={running ? "btn-disconnect" : "btn-connect"} disabled={!ready || busy} onClick={toggleConnection}>
          {busy ? "Подождите…" : running ? "Отключиться" : "Подключиться"}
        </button>
      </div>
      {error && <div className="chat-error" role="alert">Ошибка: {error}</div>}
      <div className="chat-messages" aria-live="polite" ref={listRef} onScroll={onScroll}>
        {messages.length === 0 && <div className="chat-empty">{running ? "Напишите сообщение…" : "Подключитесь, чтобы начать диалог"}</div>}
        {messages.map((message, index) => <div key={index} className={`msg msg-${message.role}`}>
          <span className="msg-role">{message.role === "user" ? "Вы" : "Джери"}</span>
          {message.role === "assistant" && message.text
            ? <div className="msg-text msg-md"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{message.text}</ReactMarkdown></div>
            : <pre className="msg-text">{message.text || (loading ? "Джери отвечает…" : "Ответ не получен")}</pre>}
        </div>)}
      </div>
      {unseen && <button className="chat-jump" onClick={toBottom}>↓ новое</button>}
      <div className="chat-input-row">
        <textarea className="chat-input" aria-label="Сообщение" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }}
          placeholder={running ? "Сообщение… (Enter — отправить)" : "Сначала подключитесь"} disabled={!running || loading || busy} rows={3} />
        <button className="btn-send" aria-label="Отправить" onClick={send} disabled={!running || loading || busy || !input.trim()}>{loading ? "…" : "→"}</button>
      </div>
    </div>
  );
}
