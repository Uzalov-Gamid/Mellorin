import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { vaultReadText } from '../learning';
import { useBlocks } from './context';
import { WRITING_PATH, WRITING_PREPARE, WRITING_REVIEW, WRITING_RESULT, boundReview, parseWritingLesson, wordCount, type WritingLesson } from './writingLesson';
import './writing.css';
const steps = ['задание', 'текст', 'разбор', 'rewrite', 'исправленная версия'];
export function WritingStudy() {
  const { intent, canSend = false, intentError } = useBlocks();
  const [lesson, setLesson] = useState<WritingLesson | null>(null);
  const [draft, setDraft] = useState(''), [originalDraft, setOriginalDraft] = useState<string | null>(null);
  const [error, setError] = useState(''), [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    void vaultReadText(WRITING_PATH).then(parseWritingLesson).then(next => {
      if (!active) return;
      if (lesson && (lesson.id !== next.id || lesson.source !== next.source)) { setError('Задание изменилось. Текущий текст сохранён; верни исходный id/source для загрузки разбора.'); return; }
      setLesson(next); if (!lesson) setDraft(next.draft); setError('');
    }).catch(() => { if (active) setError('Задание или разбор недоступны. Последние корректные данные и твой текст сохранены. Проверь файл и загрузи ещё раз.'); });
    return () => { active = false; };
    // Only explicit reload adopts data; typing and navigation never request JERY.
  }, [reload]);
  const review = originalDraft === null ? boundReview(lesson, draft) : undefined;
  const stale = originalDraft === null && !!lesson?.review && !review;
  const stage = originalDraft !== null ? 3 : review ? 2 : draft.trim() ? 1 : 0;
  const marked: ReactNode[] = [];
  if (review) {
    let end = 0;
    review.errors.forEach((e, i) => { marked.push(review.draft.slice(end, e.start), <span key={i}><mark>{e.before}</mark><sup>{i + 1}</sup></span>); end = e.end; });
    marked.push(review.draft.slice(end));
  }
  return <section className="writing-study" aria-label="English Writing">
    <header><div>English › Письмо{lesson && <> › <span>{lesson.title}</span></>}</div><small>пишешь сам, печатая: диктовка прячет орфографию</small></header>
    {error && <p role="alert">{error}</p>}{intentError && <p role="alert">{intentError}</p>}
    {!lesson ? <><p>Нет подготовленного задания. JERY прочитает процесс и реальные материалы.</p><div className="writing-actions"><button disabled={!canSend} onClick={() => { if (canSend) intent(WRITING_PREPARE, null); }}>Запросить задание у JERY</button><button onClick={() => setReload(n => n + 1)}>Загрузить задание</button></div></> : <>
      <div className="writing-steps">{steps.map((s, i) => <span key={s} className={i === stage ? 'now' : i < stage ? 'done' : ''}>{i < stage ? '✓ ' : i === stage ? '● ' : '○ '}{s}</span>)}</div>
      <div className="writing-columns"><section className="writing-paper writing-draft" data-qa-card>
        <div className="writing-caption"><span>◆ МОЙ ТЕКСТ</span><output>{wordCount(draft)} слов · цель {lesson.target.min}–{lesson.target.max}</output></div>
        {review ? <><p className="writing-marked" aria-label="Текст с отмеченными ошибками">{marked}</p><button onClick={() => setOriginalDraft(draft)}>Изменить текст</button></> : <label className="writing-input">{originalDraft === null ? 'Мой текст' : 'Исправленная версия'}<textarea value={draft} maxLength={20000} onChange={e => setDraft(e.target.value)} spellCheck={false} /></label>}
        <div className="writing-plan">План: {lesson.plan.map((p, i) => <span key={i} title={p.source}>{['¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹', '¹⁰'][i]} {p.text}{i < lesson.plan.length - 1 ? ' · ' : ''}</span>)} · «Watch out»: {lesson.watchOut.map((p, i) => <span className="writing-before" key={i} title={p.source}>{p.text}{i < lesson.watchOut.length - 1 ? ', ' : ''}</span>)}</div>
        <details className="writing-sources"><summary>Источники задания</summary><p>{lesson.source}</p><p>Цель: {lesson.target.source}</p>{[...lesson.plan, ...lesson.watchOut].map((p, i) => <p key={i}>{p.text}: {p.source}</p>)}</details>
      </section><aside className="writing-review">
        <div className="writing-cap">◆ РАЗБОР{review && ` · ${review.errors.length} ОТМЕЧЕНО`}</div>
        {stale && <p role="status">Разбор относится к другой версии текста. Отметки скрыты; отправь текущий текст на проверку.</p>}
        {review ? <>{review.errors.map((e, i) => <article className="writing-paper writing-error" key={i} data-qa-card><div className="writing-number">{i + 1}</div><div><span className="writing-before">было</span> {e.before}</div><div><span className="writing-after">надо</span> {e.after || 'убрать'}</div><div className="writing-why">почему: {e.why}</div></article>)}
          <div className="writing-main">{review.errors.length ? `Главные ошибки: ${review.mainErrors.join(' и ')}. ${review.mainErrors.map(n => review.errors[n - 1].why).join(' ')}` : 'JERY не отметил ошибок в этой версии.'}</div>
          <button className="writing-primary" onClick={() => setOriginalDraft(draft)}>Дальше: переписать текст ↵</button>
        </> : <><p>{originalDraft === null ? 'Разбор появится после проверки JERY и загрузки готовых данных.' : 'Перепиши текст целиком, затем отправь исправленную версию JERY.'}</p><button className="writing-primary" disabled={!canSend || !draft.trim() || (originalDraft !== null && draft === originalDraft)} onClick={() => {
          if (!canSend || !draft.trim() || !lesson) return;
          if (originalDraft === null) intent(WRITING_REVIEW, { lessonId: lesson.id, source: lesson.source, draft });
          else if (draft !== originalDraft) intent(WRITING_RESULT, { lessonId: lesson.id, source: lesson.source, originalDraft, draft });
        }}>{originalDraft === null ? 'Отправить текст на проверку' : 'Отправить исправленную версию JERY'}</button></>}
        <button onClick={() => setReload(n => n + 1)}>Загрузить разбор JERY</button>
        {originalDraft !== null && <button onClick={() => setOriginalDraft(null)}>Вернуться к проверке текста</button>}
      </aside></div>
    </>}
  </section>;
}
