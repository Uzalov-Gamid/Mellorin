import { useEffect, useRef, useState } from 'react';
import { vaultList, vaultReadText } from '../learning';
import { useBlocks } from './context';
import { LISTENING_DIR, LISTENING_PATH, LISTENING_PREPARE, listeningSource, parseListeningLesson, pastListening, type ListeningLesson as Lesson, type PastListening } from './listeningLesson';
const steps = ['вопросы', 'слушаю без Script', 'разбор ответов', 'Script + слушаю', 'читаю без аудио', 'пересказ 3 предложения', 'слова'];
export function ListeningLesson() {
  const { intent, canSend = false, intentError } = useBlocks();
  const [lesson, setLesson] = useState<Lesson | null>(null), [error, setError] = useState('');
  const [past, setPast] = useState<PastListening[]>([]), [pastError, setPastError] = useState('');
  const [stage, setStage] = useState(0), [answers, setAnswers] = useState(['', '', '']);
  const [retell, setRetell] = useState(['', '', '']), [words, setWords] = useState('');
  const [reload, setReload] = useState(0), [speed, setSpeed] = useState('1');
  const [audioError, setAudioError] = useState('');
  const audio = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    let active = true;
    void vaultReadText(LISTENING_PATH).then(parseListeningLesson).then(next => {
      if (active) { setLesson(next); setError(''); setStage(0); setAnswers(['', '', '']); setRetell(['', '', '']); setWords(''); setSpeed('1'); setAudioError(''); }
    }).catch(reason => { if (active) setError(`Урок недоступен: ${String(reason)}. Последний корректный урок сохранён.`); });
    void (async () => {
      try {
        const entries = (await vaultList(LISTENING_DIR)).filter(e => !e.is_dir && e.name !== 'process.md' && listeningSource(`${LISTENING_DIR}/${e.name}`));
        if (entries.length > 100) throw Error('Слишком много уроков (максимум 100)');
        const result: PastListening[] = [], errors: string[] = [];
        for (const entry of entries) {
          const source = `${LISTENING_DIR}/${entry.name}`;
          try { result.push(pastListening(source, await vaultReadText(source))); } catch (reason) { errors.push(`${entry.name}: ${String(reason)}`); }
        }
        if (active) { setPast(result); setPastError(errors.join('\n')); }
      } catch (reason) { if (active) setPastError(`Прошлые уроки недоступны: ${String(reason)}`); }
    })();
    return () => { active = false; };
  }, [reload]);
  function send(action: string, value: Record<string, string | string[]>) {
    if (canSend && lesson) intent(`${action} English Listening. Следуй Learning/English/listening/process.md; сообщи результат в чате.`, { lessonId: lesson.id, source: lesson.source, ...value });
  }
  function advance() { audio.current?.pause(); setStage(s => Math.min(6, s + 1)); }
  const pastPanel = <section className="listening-paper listening-past"><h3>Прошлые уроки</h3>{pastError && <p role="alert">{pastError}</p>}{!past.length && <p>Нет доступных прошлых уроков.</p>}{past.map(p => <div key={p.source}><button disabled={!canSend} onClick={() => { if (canSend) intent('Открой прошлый урок English Listening по указанному исходному файлу; не меняй активный урок без моей просьбы.', { source: p.source }); }}>{p.title}</button><span>{p.practice === true ? '✓ practice' : p.practice === false ? '○ хвост' : 'practice не указан'}</span></div>)}</section>;
  return <section className="listening-lesson" aria-label="English Listening">
    <header>English › Аудирование{lesson && ` › ${lesson.title}`}</header>
    {error && <p role="alert">{error}</p>}
    <div className="listening-actions"><button disabled={!canSend} onClick={() => { if (canSend) intent(LISTENING_PREPARE, null); }}>Подготовить урок с JERY</button><button onClick={() => { audio.current?.pause(); setReload(n => n + 1); }}>Загрузить готовый урок</button></div>
    {intentError && <p role="alert">{intentError}</p>}
    {!lesson ? <p>Нет подготовленного урока. Укажи JERY урок и ссылку на аудио, затем загрузи готовый файл.</p> : <>
      <div className="words-steps">{steps.map((s, i) => <span key={s} className={i === stage ? 'now' : i < stage ? 'done' : ''}>{i < stage ? '✓ ' : i === stage ? '● ' : '○ '}{s}</span>)}</div>
      <div className="listening-columns"><article className="listening-paper">
        <h2>{steps[stage]}</h2>
        {stage < 4 && <div className="listening-player"><audio key={lesson.audioUrl} ref={audio} controls preload="none" src={lesson.audioUrl} aria-label="Аудио урока" onError={() => setAudioError('Аудио недоступно. Проверь ссылку на аудиофайл.')} onLoadedMetadata={() => { if (audio.current) audio.current.playbackRate = Number(speed); }} />
          <label>Скорость <select value={speed} onChange={e => { setSpeed(e.target.value); if (audio.current) audio.current.playbackRate = Number(e.target.value); }}>{['0.75', '1', '1.25', '1.5', '2'].map(s => <option key={s} value={s}>{s}×</option>)}</select></label>
          <small>{new URL(lesson.audioUrl).hostname} · Script доступен с шага 4</small>{audioError && <p role="alert">{audioError}</p>}</div>}
        <h3>Три вопроса до прослушивания</h3><ol>{lesson.questions.map((q, i) => <li key={q}>{q}{(stage === 1 || stage === 2) && <label>Ответ {i + 1}<textarea maxLength={4000} value={answers[i]} onChange={e => setAnswers(old => old.map((v, j) => i === j ? e.target.value : v))} /></label>}</li>)}</ol>
        {stage === 2 && <button disabled={!canSend || answers.some(a => !a.trim())} onClick={() => send('Проверь ответы', { questions: lesson.questions, answers })}>Отправить ответы JERY</button>}
        {stage === 4 && <p>Прочитай Script без аудио.</p>}
        {stage === 5 && <><p>Перескажи в трёх предложениях. Можно использовать системную диктовку в полях.</p>{retell.map((v, i) => <label key={i}>Предложение {i + 1}<textarea maxLength={2000} value={v} onChange={e => setRetell(old => old.map((t, j) => i === j ? e.target.value : t))} /></label>)}<button disabled={!canSend || retell.some(t => !t.trim())} onClick={() => send('Проверь пересказ из трёх предложений', { sentences: retell })}>Отправить пересказ JERY</button></>}
        {stage === 6 && <><label>Слова из урока<textarea value={words} maxLength={4000} onChange={e => setWords(e.target.value)} /></label><button disabled={!canSend || !words.trim()} onClick={() => send('Разбери выбранные слова; согласуй запись в словарь', { words })}>Отправить слова JERY</button></>}
        {stage < 6 && <button onClick={advance}>Дальше</button>}
      </article><aside>
        {stage < 3 ? <div className="listening-script locked">Script появится на шаге 4</div> : <article className="listening-script"><h2>Script</h2><p>{lesson.script}</p></article>}
        {pastPanel}
      </aside></div>
    </>}
    {!lesson && pastPanel}
  </section>;
}
