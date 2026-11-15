import { useEffect, useRef, useState } from "react";
import { onExit, onOutput, sendMessage, startSubprocess, stopSubprocess } from "./subprocess";

type Message = { role: "user" | "assistant"; text: string };

declare const __VITE_CLAUDE_PATH__: string | undefined;
const CLAUDE_PATH = (typeof __VITE_CLAUDE_PATH__ !== "undefined" && __VITE_CLAUDE_PATH__) || "claude";

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bufRef = useRef("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let unlistenOutput: (() => void) | null = null;
    let unlistenExit: (() => void) | null = null;

    onOutput((line) => {
      bufRef.current += (bufRef.current ? "\n" : "") + line;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return [...prev.slice(0, -1), { role: "assistant", text: bufRef.current }];
        }
        return [...prev, { role: "assistant", text: bufRef.current }];
      });
    }).then((fn) => { unlistenOutput = fn });

    onExit(() => {
      setRunning(false);
      setLoading(false);
      bufRef.current = "";
    }).then((fn) => { unlistenExit = fn });

    return () => {
      unlistenOutput?.();
      unlistenExit?.();
    };
  }, []);

  async function connect() {
    setError(null);
    try {
      await startSubprocess(CLAUDE_PATH);
      setRunning(true);
    } catch (e) {
      setError(String(e));
    }
  }

  async function disconnect() {
    await stopSubprocess();
    setRunning(false);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    bufRef.current = "";
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);
    try {
      await sendMessage(text);
    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="chat">
      <div className="chat-header">
        <span className="chat-title">JERY</span>
        {!running ? (
          <button className="btn-connect" onClick={connect}>connect</button>
        ) : (
          <button className="btn-disconnect" onClick={disconnect}>disconnect</button>
        )}
        {error && <span className="chat-error">{error}</span>}
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            {running ? "Say something..." : "Connect to start a session"}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg msg-${m.role}`}>
            <span className="msg-role">{m.role === "user" ? "you" : "jery"}</span>
            <pre className="msg-text">{m.text}</pre>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <textarea
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder={running ? "Message... (Enter to send)" : "Connect first"}
          disabled={!running || loading}
          rows={3}
        />
        <button
          className="btn-send"
          onClick={send}
          disabled={!running || loading || !input.trim()}
        >
          {loading ? "…" : "→"}
        </button>
      </div>
    </div>
  );
}
