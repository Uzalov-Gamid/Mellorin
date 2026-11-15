import { useEffect, useRef, useState } from 'react';
import { changeHistory, recoverChange, rollbackChange, type ChangeRecord } from './bridge';
export function ChangeHistory({ revision, onApplied }: { revision?: unknown; onApplied?: (record: ChangeRecord) => void }) {
  const [records, setRecords] = useState<ChangeRecord[]>([]); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const lock = useRef(false);
  useEffect(() => { let active = true; void changeHistory().then(r => { if (active) setRecords(r); }).catch(e => { if (active) setError(String(e)); }); return () => { active = false; }; }, [revision]);
  async function act(id?: string) { if (lock.current) return; lock.current = true; setBusy(true); setError(''); try { if (id) onApplied?.(await rollbackChange(id)); else await recoverChange(); setRecords(await changeHistory()); } catch (e) { setError(String(e)); } finally { lock.current = false; setBusy(false); } }
  return <section aria-label="История форматов"><h2>История форматов</h2>{error && <p role="alert">{error}</p>}<button className="btn-sm" disabled={busy} onClick={() => void act()}>Восстановить прерванное изменение</button>{records.map(r => <p key={r.id}>{r.target} · {r.id} <button className="btn-sm" disabled={busy} onClick={() => void act(r.id)}>Откатить</button></p>)}</section>;
}
