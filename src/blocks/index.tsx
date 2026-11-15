import { WritingStudy } from './WritingStudy';
import { ListeningLesson } from './ListeningStudy';
import { WordStudy } from './WordStudy';
import { useEffect, useState } from 'react';
import { ReadingText, ReadingPhrases, ReadingWord } from '../TextViewer';
import { Button, Card, NightCard, Collapsible, Table, Segments, StepPills } from '../ui';
import { useBlocks } from './context';
import type { Block, Data } from './schema';
export const blockTypes = ['writing-study', 'listening-lesson', 'word-study', 'text', 'phrase-breakdown', 'word-card', 'quiz', 'flashcard', 'table', 'audio-player', 'code', 'query', 'checklist', 'timer', 'progress', 'collapsible-answers', 'night-code-card', 'step-pills'];
export function safeAudio(value: string): string | undefined {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined; } catch { return undefined; }
}
export function BlockView({ block }: { block: Block }) {
  const context = useBlocks();
  const p = block.props;
  const str = (key: string) => typeof p[key] === 'string' ? p[key] as string : '';
  const strings = (key: string) => Array.isArray(p[key]) ? (p[key] as Data[]).filter((v): v is string => typeof v === 'string') : [];
  const [answer, setAnswer] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [code, setCode] = useState(str('value'));
  const [checked, setChecked] = useState<string[]>([]);
  const duration = typeof p.seconds === 'number' ? Math.max(0, Math.min(86400, Math.floor(p.seconds))) : 60;
  const [seconds, setSeconds] = useState(duration);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running || seconds <= 0) return;
    const timer = setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [running, seconds]);
  let content;
  if (p.source === 'reading' && block.type === 'text') content = ReadingText(context.reading, false, p.sentenceNumbers !== false && p.sentenceNumbers !== 'none');
  else if (p.source === 'reading' && block.type === 'phrase-breakdown') content = ReadingPhrases(context.reading);
  else if (p.source === 'reading' && block.type === 'word-card') content = ReadingWord(context.reading);
  else switch (block.type) {
    case 'writing-study': content = <WritingStudy />; break;
    case 'listening-lesson': content = <ListeningLesson />; break;
    case 'word-study': content = <WordStudy />; break;
    case 'text': content = <PlainText text={str('text') || context.message} numbered={p.sentenceNumbers === 'after'} />; break;
    case 'phrase-breakdown': content = <Card>{strings('phrases').map((phrase, i) => <p key={i}>{phrase}</p>)}</Card>; break;
    case 'word-card': content = <NightCard><strong>{str('word')}</strong><p>{str('translation')}</p></NightCard>; break;
    case 'quiz': content = <fieldset><legend>{str('question')}</legend>{strings('choices').map((choice, i) => <Button key={i} aria-pressed={answer === choice} onClick={() => setAnswer(choice)}>{choice}</Button>)}{answer !== null && <p role="status">{answer === str('answer') ? 'Верно' : 'Попробуйте ещё раз'}</p>}</fieldset>; break;
    case 'flashcard': content = <Card><p>{str('front')}</p><Button aria-expanded={revealed} onClick={() => setRevealed(v => !v)}>Показать ответ</Button>{revealed && <p>{str('back')}</p>}</Card>; break;
    case 'table': content = <Table headers={strings('headers')} rows={Array.isArray(p.rows) ? p.rows.filter(Array.isArray).map(row => row.map(cell => typeof cell === 'string' || typeof cell === 'number' ? cell : '')) : []} />; break;
    case 'audio-player': content = safeAudio(str('url')) ? <audio aria-label={str('label') || 'Аудио'} controls src={safeAudio(str('url'))} preload="none" /> : <p role="alert">Аудио: нужен URL http/https</p>; break;
    case 'code': case 'query': content = <label>{str('label') || 'Код / запрос'}<textarea value={code} maxLength={20000} onChange={e => setCode(e.target.value)} /></label>; break;
    case 'checklist': content = <fieldset><legend>{str('label') || 'Чеклист'}</legend>{strings('items').map((item, i) => <label key={i}><input type="checkbox" checked={checked.includes(String(i))} onChange={e => setChecked(old => e.target.checked ? [...old, String(i)] : old.filter(v => v !== String(i)))} />{item}</label>)}</fieldset>; break;
    case 'timer': content = <Card><output aria-live="polite">{seconds} с</output><Button onClick={() => setRunning(v => !v)}>{running ? 'Пауза' : 'Старт'}</Button><Button onClick={() => { setRunning(false); setSeconds(duration); }}>Сбросить</Button></Card>; break;
    case 'progress': { const total = Math.max(1, Math.min(100, typeof p.total === 'number' ? Math.floor(p.total) : 9)); const current = typeof p.current === 'number' ? p.current : -1; content = p.mode === 'bar' ? <label>{str('label') || 'Прогресс'}<progress max={total} value={Math.max(0, Math.min(total, current))} /></label> : <Segments label={str('label') || 'Прогресс'} states={Array.from({ length: total }, (_, i) => i < current ? 'done' : i === current ? 'current' : 'pending')} />; break; }
    case 'collapsible-answers': content = <Collapsible title={str('title') || undefined}>{str('answer')}</Collapsible>; break;
    case 'night-code-card': content = <NightCard><pre>{str('code')}</pre></NightCard>; break;
    case 'step-pills': content = <StepPills steps={strings('steps').map((label, i) => ({ label, state: i < Number(p.current) ? 'done' : i === p.current ? 'current' : 'pending' }))} />; break;
    default: content = <p role="status">нужен блок {block.type}</p>;
  }
  return <div className="format-block">{content}{block.writeBack && <Button variant="outlined" onClick={() => context.intent(block.writeBack!.intent, { code, checked, answer })}>Отправить JERY: {block.writeBack.intent}</Button>}</div>;
}
export function PlainText({ text, numbered }: { text: string; numbered: boolean }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [word, setWord] = useState('');
  return <Card><p>{text.split(/(?<=[.!?])\s+/).map((sentence, i) => <span key={i} className={selected === i ? 'sentence-selected' : ''}>{sentence.split(/(\s+)/).map((token, j) => /\S/.test(token) ? <button className="word" key={j} onClick={() => setWord(token)}>{token}</button> : token)}<button aria-label={`Выбрать предложение ${i + 1}`} onClick={() => setSelected(i)}>{numbered ? <sup>{i + 1}</sup> : '▸'}</button>{' '}</span>)}</p>{word && <p role="status">{word}</p>}</Card>;
}
