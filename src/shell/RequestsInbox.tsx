import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
export interface RequestNote { name: string; body: string }
export interface RequestSnapshot { open: RequestNote[] }
export function RequestsInbox() {
  const [snapshot, setSnapshot] = useState<RequestSnapshot | null>(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    let active = true, busy = false;
    async function refresh() {
      if (busy) return; busy = true;
      try {
        const next = await invoke<RequestSnapshot>('requests_snapshot');
        if (active) { setSnapshot(next); setError(''); }
      } catch (reason) { if (active) { setSnapshot(null); setError(String(reason)); } }
      finally { busy = false; }
    }
    void refresh(); const timer = setInterval(() => { void refresh(); }, 5000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  const count = snapshot ? String(snapshot.open.length) : error ? '?' : '…';
  return <>
    <button className="requests-badge" aria-label={`Заявки блоков: ${count}`} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>◆ {count}</button>
    {expanded && <section className="requests-inbox" role="dialog" aria-label="Заявки блоков">
      <div className="requests-heading"><h2>Заявки блоков</h2><button className="btn-sm" onClick={() => setExpanded(false)}>Закрыть</button></div>
      <p>Источник: app-requests/*.md · обновление каждые 5 секунд</p>
      {error && <p role="alert">Не удалось прочитать заявки: {error}</p>}
      {!error && !snapshot && <p>Загрузка…</p>}
      {snapshot?.open.length === 0 && <p>Открытых заявок нет.</p>}
      {snapshot?.open.map(note => <article key={note.name}><h3>{note.name}</h3><pre>{note.body}</pre></article>)}
      <p>После реализации блока закрой заметку строкой Status: closed или Status: done.</p>
    </section>}
  </>;
}
