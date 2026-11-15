import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useReading } from '../TextViewer';
import { vaultReadText } from '../learning';
import { localDate } from '../homeData';
import builtin from '../../formats/english-reading.json';
import { BlockContext } from './context';
import { BlockView, blockTypes } from './index';
import { parseFormat, simpleName, type Data, type Format } from './schema';
export const JeryFormatContext = createContext<{ message: string; data: Data; intent: (intent: string, value: Data) => void }>({ message: '', data: null, intent: () => {} });
export function FormatScreen({ subject = 'english', skill = 'reading' }: { subject?: string; skill?: string }) {
  const reading = useReading();
  const jery = useContext(JeryFormatContext);
  const [format, setFormat] = useState<Format>(subject === 'english' && skill === 'reading' ? builtin as Format : { version: 1, steps: [] });
  const [error, setError] = useState('');
  const [requestError, setRequestError] = useState('');
  const requested = useRef(new Set<string>());
  const path = `formats/${subject}-${skill}.json`;
  useEffect(() => {
    let active = true, pending = false;
    let seedError = '';
    async function refresh() {
      if (pending) return;
      pending = true;
      try {
        if (!simpleName(subject) || !simpleName(skill)) throw Error('invalid format name');
        const next = parseFormat(await vaultReadText(path));
        if (active) { setFormat(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next); setError(seedError); }
      } catch (reason) { if (active) setError(`${seedError} Не удалось прочитать формат: ${String(reason)}. Доступен последний рабочий формат.`); }
      finally { pending = false; }
    }
    void (async () => {
      if (subject === 'english' && skill === 'reading') {
        try { await invoke('format_seed'); } catch (reason) { seedError = `Не удалось подготовить формат: ${String(reason)}.`; }
      }
      if (active) await refresh();
    })();
    const timer = setInterval(() => { void refresh(); }, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [path, subject, skill]);
  useEffect(() => {
    let active = true;
    for (const step of format.steps) for (const block of step.blocks) {
      if (blockTypes.includes(block.type)) continue;
      const key = `${path}:${block.type}`;
      if (requested.current.has(key)) continue;
      requested.current.add(key);
      void invoke('format_request_block', { date: localDate(), block: block.type, format: `${subject}-${skill}` }).catch(reason => {
        if (active) setRequestError(`Не удалось записать запрос блока ${block.type}: ${String(reason)}`);
      });
    }
    return () => { active = false; };
  }, [format, path, subject, skill]);
  return <BlockContext.Provider value={{ ...jery, reading }}><section aria-label="Формат урока">
    {error && <p role="alert">{error}</p>}{requestError && <p role="alert">{requestError}</p>}
    {format.steps.map(step => <section key={step.id} aria-label={step.title}>{format.steps.length > 1 && <h2>{step.title}</h2>}{step.blocks.map((block, i) => <BlockView key={`${i}:${JSON.stringify(block)}`} block={block} />)}</section>)}
  </section></BlockContext.Provider>;
}
