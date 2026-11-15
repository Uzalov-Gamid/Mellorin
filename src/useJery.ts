import { useEffect, useRef, useState } from "react";
import { getStatus, onChatDelta, onChatDone, onChatError, onExit, sendMessage, startSubprocess, stopSubprocess } from "./subprocess";

export type Message = { role: "user" | "assistant"; text: string };

export function useJery() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const exits = useRef(0);
  const sending = useRef(false);
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
      onExit(() => { exits.current += 1; setRunning(false); finish(); }),
    ].map(subscription => subscription.then(unlisten => {
      if (disposed) unlisten(); else cleanups.push(unlisten);
    }));
    Promise.all(subscriptions).then(async () => {
      const observedExits = exits.current;
      const status = await getStatus();
      if (!disposed) { setRunning(status && exits.current === observedExits); setReady(true); }
    }).catch((reason: unknown) => { if (!disposed) setError(String(reason)); });
    return () => { disposed = true; cleanups.forEach(fn => fn()); };
  }, []);

  async function toggleConnection() {
    setBusy(true);
    setError(null);
    try {
      if (running) { await stopSubprocess(); pending.current = false; setLoading(false); }
      else {
        const observedExits = exits.current;
        await startSubprocess();
        setRunning(exits.current === observedExits);
      }
      if (running) setRunning(false);
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
  async function sendText(text: string) {
    if (!text.trim() || !ready || pending.current || busy || sending.current) return;
    sending.current = true;
    setBusy(true);
    setError(null);
    try {
      if (!running) {
        const observedExits = exits.current;
        await startSubprocess();
        if (exits.current !== observedExits) throw new Error("Процесс завершился при подключении");
        setRunning(true);
      }
      pending.current = true;
      setLoading(true);
      setMessages(previous => [...previous, { role: "user", text }, { role: "assistant", text: "" }]);
      await sendMessage(text);
    } catch (reason) { setError(String(reason)); pending.current = false; setLoading(false); }
    finally { sending.current = false; setBusy(false); }
  }
  return { messages, input, setInput, running, ready, busy, loading, error, toggleConnection, send, sendText };
}
export type Jery = ReturnType<typeof useJery>;
