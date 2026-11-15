import { useEffect, useRef, useState } from "react";
import { getStatus, onChatDelta, onChatDone, onChatError, onExit, sendMessage, startSubprocess, stopSubprocess } from "./subprocess";

type Message = { role: "user" | "assistant"; text: string };

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView?.({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    let disposed = false;
    const cleanups: (() => void)[] = [];
    const finish = () => { pending.current = false; setLoading(false); };
    const subscriptions = [
      onChatDelta(({ text }) => {
        if (!pending.current) return;
        setMessages(previous => {
          const last = previous[previous.length - 1];
          if (last?.role !== "assistant") return previous;
          return [...previous.slice(0, -1), { ...last, text: last.text + text }];
        });
      }),
      onChatDone(finish),
      onChatError(({ message }) => { setError(message); finish(); }),
      onExit(() => { setRunning(false); finish(); }),
    ].map(subscription => subscription.then(unlisten => {
      if (disposed) unlisten(); else cleanups.push(unlisten);
    }));
    Promise.all(subscriptions).then(async () => {
      const status = await getStatus();
      if (!disposed) { setRunning(status); setReady(true); }
    }).catch((reason: unknown) => { if (!disposed) setError(String(reason)); });
    return () => { disposed = true; cleanups.forEach(fn => fn()); };
  }, []);

  async function toggleConnection() {
    setBusy(true);
    setError(null);
    try {
      if (running) { await stopSubprocess(); pending.current = false; setLoading(false); }
      else await startSubprocess();
      setRunning(!running);
    } catch (reason) { setError(String(reason)); }
    finally { setBusy(false); }
  }
  async function send() {
    const text = input.trim();
    if (!text || !running || pending.current || busy) return;
    pending.current = true;
    setLoading(true);
    setError(null);
    setInput("");
    setMessages(previous => [...previous, { role: "user", text }, { role: "assistant", text: "" }]);
    try { await sendMessage(text); }
    catch (reason) { setError(String(reason)); pending.current = false; setLoading(false); }
  }
  return (
    <div className="chat">
      <div className="chat-header">
        <span className="chat-title">Джери</span>
        <button className={running ? "btn-disconnect" : "btn-connect"} disabled={!ready || busy} onClick={toggleConnection}>
          {busy ? "Подождите…" : running ? "Отключиться" : "Подключиться"}
        </button>
      </div>
      {error && <div className="chat-error" role="alert">Ошибка: {error}</div>}
      <div className="chat-messages" aria-live="polite">
        {messages.length === 0 && <div className="chat-empty">{running ? "Напишите сообщение…" : "Подключитесь, чтобы начать диалог"}</div>}
        {messages.map((message, index) => <div key={index} className={`msg msg-${message.role}`}>
          <span className="msg-role">{message.role === "user" ? "Вы" : "Джери"}</span>
          <pre className="msg-text">{message.text || (loading ? "Джери отвечает…" : "Ответ не получен")}</pre>
        </div>)}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-row">
        <textarea className="chat-input" aria-label="Сообщение" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }}
          placeholder={running ? "Сообщение… (Enter — отправить)" : "Сначала подключитесь"} disabled={!running || loading || busy} rows={3} />
        <button className="btn-send" aria-label="Отправить" onClick={send} disabled={!running || loading || busy || !input.trim()}>{loading ? "…" : "→"}</button>
      </div>
    </div>
  );
}
