import { useEffect, useRef, useState } from 'react';
import { vaultReadText } from '../learning';
import { useBlocks } from './context';
import { parseWordLesson, normalizeDictation, studyKey, WORD_LESSON_PATH, WORDS_PREPARE, WORDS_RESULT, type WordLesson } from './wordLesson';
const steps = ['карточки', 'выбор перевода', 'слово в предложение', 'обратный перевод', 'диктант', 'итог'];
interface Outcome { word: string; source: string; step: number; answer: string; correct: boolean }
export function WordStudy() {
  const { intent, canSend = true, intentError } = useBlocks();
  const [lesson, setLesson] = useState<WordLesson | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [stage, setStage] = useState(0), [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false), [typed, setTyped] = useState('');
  const [outcomes, setOutcomes] = useState<Outcome[]>([]), [sent, setSent] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const root = useRef<HTMLElement>(null);
  const started = useRef(false);
  useEffect(() => {
    let active = true, pending = false;
    async function refresh() {
      if (pending || started.current) return;
      pending = true;
      try { const next = parseWordLesson(await vaultReadText(WORD_LESSON_PATH)); if (active && !started.current) { setLesson(next); setError(''); } }
      catch (reason) { if (active && !started.current) setError(`Урок недоступен: ${String(reason)}. Последние корректные данные сохранены, если были загружены.`); }
      finally { pending = false; }
    }
    void refresh(); const timer = setInterval(() => { void refresh(); }, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [reload]);
  const word = lesson?.words[index];
  const outcome = outcomes.find(o => o.step === stage && o.word === word?.word);
  function answer(choice: number | string) {
    if (!word || stage === 0 || stage === 5 || outcome) return;
    started.current = true;
    const q = stage === 1 ? word.translationChoice : stage === 2 ? word.sentenceGap : word.reverseTranslation;
    const correct = stage === 4 ? word.dictation.some(a => normalizeDictation(a) === normalizeDictation(String(choice))) : choice === q.answer;
    setOutcomes(old => [...old, { word: word.word, source: word.source, step: stage, answer: typeof choice === 'number' ? q.choices[choice] : choice, correct }]);
  }
  function next() {
    if (!word || (stage === 0 ? !revealed : !outcome) || stage === 5) return;
    started.current = true;
    if (index === 9) { setStage(stage + 1); setIndex(0); } else setIndex(index + 1);
    setRevealed(false); setTyped(''); setSpeechError('');
  }
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (!root.current || root.current.closest('[hidden]')) return;
      const action = studyKey(event); if (action === null) return;
      if (action === 'next') { event.preventDefault(); next(); }
      else if (stage >= 1 && stage <= 3) { event.preventDefault(); answer(action); }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  });
  function speak() {
    setSpeechError('');
    try {
      if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') throw Error('unavailable');
      const speech = new SpeechSynthesisUtterance(word!.word); speech.lang = 'en-US';
      const voice = window.speechSynthesis.getVoices().find(v => /^en[-_]/i.test(v.lang)); if (voice) speech.voice = voice;
      speech.onerror = () => setSpeechError('Произношение недоступно. Можно открыть YouGlish.');
      window.speechSynthesis.cancel(); window.speechSynthesis.speak(speech);
    } catch { setSpeechError('Произношение недоступно. Можно открыть YouGlish.'); }
  }
  const quiz = word && (stage === 1 ? word.translationChoice : stage === 2 ? word.sentenceGap : word.reverseTranslation);
  return <section className="word-study" ref={root} aria-label="English Words">
    <header>English › Слова › Урок на сегодня</header>
    {error && <p role="alert">{error}</p>}
    {!lesson ? <><p>Нет подготовленного урока из 10 слов. Нужны исходный список и данные JERY.</p><button disabled={!canSend} onClick={() => intent(WORDS_PREPARE, null)}>Подготовить урок с JERY</button></> : <>
      <p>{lesson.words.length} слов · {lesson.preparedOn} · сначала focus, потом свежие</p>
      <div className="words-steps">{steps.map((s, i) => <span key={s} className={i === stage ? 'now' : i < stage ? 'done' : ''}>{i < stage ? '✓ ' : ''}{s}</span>)}</div>
      {stage < 5 && word && <>
        <div className="words-dots" aria-label={`Слово ${index + 1} из 10`}>{lesson.words.map((w, i) => { const o = outcomes.find(a => a.word === w.word && a.step === stage); return <span key={w.word} aria-label={`${i + 1}: ${o ? o.correct ? 'верно' : 'ошибка' : i === index ? 'текущее' : 'ожидает'}`} className={o ? o.correct ? 'correct' : 'wrong' : i === index ? 'current' : ''} />; })}</div>
        <article className="words-paper">
          <div className="words-heading"><strong>{stage === 4 ? 'Диктант: послушай слово' : stage === 3 ? word.translation : stage === 2 ? word.sentenceGap.sentence : word.word}</strong>{stage < 3 && word.ipa && <span>{word.ipa}</span>}</div>
          {(stage === 0 || stage === 4) && <button onClick={speak}>▸ слушать</button>}
          {(stage !== 4 || outcome) && <a target="_blank" rel="noreferrer" href={`https://youglish.com/pronounce/${encodeURIComponent(word.word)}/english`}>▸ YouGlish</a>}
          {speechError && <p role="status">{speechError}</p>}{speechError && stage === 4 && !outcome && <button onClick={() => answer('')}>Пропустить: звук недоступен</button>}
          {stage === 0 && <><button onClick={() => { started.current = true; setRevealed(true); }}>Показать перевод</button>{revealed && <p>{word.translation}</p>}{word.example ? <blockquote>{word.exampleSource && `${word.exampleSource}: `}{word.example}</blockquote> : <p>Пример в источнике не указан.</p>}</>}
          {stage >= 1 && stage <= 3 && quiz && <div className="words-options">{quiz.choices.map((c, i) => <button key={c} disabled={!!outcome} className={outcome && (i === quiz.answer ? 'correct' : outcome.answer === c ? 'wrong' : '') || ''} onClick={() => answer(i)}>{['а', 'б', 'в', 'г'][i]} · {c}</button>)}</div>}
          {stage === 4 && <form onSubmit={e => { e.preventDefault(); if (typed.trim()) answer(typed); }}><label>Напиши услышанное слово<input value={typed} maxLength={100} disabled={!!outcome} onChange={e => setTyped(e.target.value)} /></label><button disabled={!!outcome || !typed.trim()}>Проверить</button></form>}
          {outcome && <p role="status" className={outcome.correct ? 'words-correct' : 'words-wrong'}>{outcome.correct ? 'Верно' : `Ошибка. Ответ: ${stage === 4 ? word.dictation.join(' / ') : quiz?.choices[quiz.answer]}`}</p>}
          <button disabled={stage === 0 ? !revealed : !outcome} onClick={next}>Дальше ↵</button>
        </article>
      </>}
      {stage === 5 && <article className="words-paper"><h2>Итог</h2><p>{outcomes.filter(o => o.correct).length} / {outcomes.length} верных ответов</p>{lesson.words.map(w => <p key={w.word}>{w.word}: {outcomes.filter(o => o.word === w.word && o.correct).length} / 4</p>)}<button disabled={!canSend || (sent && !intentError)} onClick={() => { setSent(true); intent(WORDS_RESULT, { lessonId: lesson.id, preparedOn: lesson.preparedOn, outcomes: outcomes.map(o => ({ ...o })) }); }}>{sent ? intentError ? 'Повторить отправку результата' : 'Результат передан JERY' : 'Отправить результат JERY'}</button><p>Статусы меняет JERY после отправки результата. Подтверждение записи появится в чате.</p>{intentError && <p role="alert">{intentError}</p>}<button onClick={() => { started.current = false; setLesson(null); setStage(0); setIndex(0); setOutcomes([]); setSent(false); setRevealed(false); setTyped(''); setReload(v => v + 1); }}>Загрузить новый урок</button></article>}
    </>}
  </section>;
}
