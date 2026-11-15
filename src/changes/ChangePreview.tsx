import { useEffect, useRef, useState } from 'react';
import { exactDiff, type ChangeProposal } from './proposal';
import { applyChange, previewChange, rollbackChange, type ChangePreviewData, type ChangeRecord } from './bridge';
import './change.css';
import { parseFormat } from '../blocks/schema';
import { BlockView } from '../blocks';
import { BlockContext } from '../blocks/context';
import { useReading } from '../TextViewer';
function VisualFormat({ source }: { source: string | null }) {
  const state = useReading();
  const sample = 'Birds sing. We walk along the river.';
  const reading = { ...state, text: sample, editing: false, sentences: sample.split(/(?<=[.!?])\s+/) }; 
  if (source === null) return <p>Файл отсутствует</p>;
  const format = parseFormat(source);
  return <BlockContext.Provider value={{ reading, message: 'Пример предложения. Следующее предложение.', data: null, intent: () => {} }}><fieldset disabled className="change-render">{format.steps.map(step => <section key={step.id}><h4>{step.title}</h4>{step.blocks.map((block, i) => <BlockView key={i} block={block} />)}</section>)}</fieldset></BlockContext.Provider>;
}
export function ChangePreview({ proposal, streaming = false, onChange, onApplied }: { proposal: ChangeProposal; streaming?: boolean; onChange: (proposal: ChangeProposal) => void; onApplied?: (record: ChangeRecord) => void }) {
  const [preview, setPreview] = useState<ChangePreviewData | null>(null);
  const [record, setRecord] = useState<ChangeRecord | null>(null);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  useEffect(() => { let active = true; setPreview(null); setRecord(null); setError(''); void previewChange(proposal).then(value => { if (active) setPreview(value); }).catch(reason => { if (active) setError(String(reason)); }); return () => { active = false; }; }, [proposal]);
  async function action(run: () => Promise<ChangeRecord | void>) {
    if (locked.current || streaming) return; locked.current = true; setBusy(true); setError('');
    try { const next = await run(); if (next) { setRecord(next); onApplied?.(next); } } catch (reason) { setError(String(reason)); } finally { locked.current = false; setBusy(false); }
  }
  return <section className="change-preview" aria-label="Изменение формата">
    <h2>JERY строит экран</h2><p>{proposal.rule}</p>
    <div className="change-comparison"><section><h3>До</h3><VisualFormat source={proposal.before} /></section><section><h3>После</h3><VisualFormat source={proposal.after} /></section></div>
    <h3>Точные изменения файлов</h3><pre>{exactDiff(proposal.before, proposal.after, proposal.target)}</pre>
    {preview && <pre>{exactDiff(proposal.process_before, preview.process_after, proposal.process)}</pre>}
    {error && <p role="alert">{error}</p>}
    {record ? <><p role="status">Сохранено · {record.id}</p><button className="btn-sm" disabled={busy || streaming} onClick={() => void action(() => rollbackChange(record.id))}>Откатить</button></> : <>
      <button className="btn-primary" disabled={!preview || busy || streaming} onClick={() => void action(() => applyChange(proposal))}>Применить</button>
      <button className="btn-sm" disabled={busy || streaming} onClick={() => onChange(proposal)}>Изменить</button></>}
    {error && <button className="btn-sm" disabled={busy || streaming} onClick={() => void action(async () => { setPreview(await previewChange(proposal)); })}>Проверить ещё раз</button>}
  </section>;
}
