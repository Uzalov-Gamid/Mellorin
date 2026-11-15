import type { Jery } from "../useJery";

export function JeryStrip({ jery, expanded, onToggle }: { jery: Jery; expanded: boolean; onToggle: () => void }) {
  const last = [...jery.messages].reverse().find(message => message.role === "assistant");
  async function submit() {
    const text = jery.input.trim();
    if (!text) return;
    jery.setInput("");
    await jery.sendText(text);
  }
  return <div className="jery-strip">
    <span className={jery.running ? "jery-online" : "jery-offline"}>●</span><span>JERY</span>
    <span className="jery-last" aria-live="polite"><span>› </span>{jery.error || last?.text || (jery.loading ? "JERY отвечает…" : "Начни разговор")}</span>
    <div className="jery-entry"><input aria-label="Ответ JERY" placeholder="Ответ голосом или текстом…" value={jery.input}
      disabled={!jery.ready || jery.loading || jery.busy} onChange={event => jery.setInput(event.target.value)}
      onKeyDown={event => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); void submit(); } }} />
      <button aria-label="Отправить JERY" disabled={!jery.ready || jery.loading || jery.busy || !jery.input.trim()} onClick={() => void submit()}>↵</button></div>
    <button aria-label={expanded ? "Свернуть чат" : "Развернуть чат"} aria-expanded={expanded} onClick={onToggle}>{expanded ? "▾" : "▴"}</button>
  </div>;
}
