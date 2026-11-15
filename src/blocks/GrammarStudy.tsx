import { useEffect, useState } from 'react';
import { vaultReadText } from '../learning';
import { useBlocks } from './context';
import { GRAMMAR_PATH, GRAMMAR_PREPARE, GRAMMAR_ANSWER, GRAMMAR_HOMEWORK, parseGrammarLesson, type GrammarLesson, type GrammarRun } from './grammarLesson';
import './grammar.css';
function Runs({ runs }: { runs: GrammarRun[] }) { return <>{runs.map((r,i)=><span key={i} className={r.role ? `grammar-${r.role}` : undefined}>{r.text}</span>)}</>; }
export function GrammarStudy() {
  const { intent, canSend = false, intentError } = useBlocks();
  const [lesson,setLesson]=useState<GrammarLesson|null>(null), [part,setPart]=useState(0), [selected,setSelected]=useState<number|null>(null), [submitted,setSubmitted]=useState(false);
  const [error,setError]=useState(''), [reload,setReload]=useState(0), [note,setNote]=useState<{path:string;text:string}|null>(null), [noteError,setNoteError]=useState('');
  useEffect(()=> {
    let active=true;
    void vaultReadText(GRAMMAR_PATH).then(parseGrammarLesson).then(next=> {
      if (!active) return;
      setLesson(next); if (!lesson || next.id !== lesson.id || next.source !== lesson.source) { setPart(next.part); setNote(null); } setSelected(null); setSubmitted(false); setError('');
    }).catch(()=> { if(active) setError('Урок недоступен или данные неверны. Последний корректный урок сохранён. Проверь данные и загрузи ещё раз.'); });
    return ()=>{active=false;};
    // A file read never starts JERY; only an explicit reload adopts changes.
  },[reload]);
  const current=lesson?.parts[part];
  return <section className="grammar-study" aria-label="English Grammar">
    <header><div>English › Грамматика{lesson && <> › <span>{lesson.title}</span></>}</div>{lesson && <small>{lesson.subtitle}</small>}</header>
    {error && <p role="alert">{error}</p>}{intentError && <p role="alert">{intentError}</p>}
    {!lesson || !current ? <><p>Нет подготовленного урока. JERY прочитает процесс и реальные источники.</p><div className="grammar-actions"><button disabled={!canSend} onClick={()=>{if(canSend) intent(GRAMMAR_PREPARE,null);}}>Подготовить урок с JERY</button><button onClick={()=>setReload(n=>n+1)}>Загрузить урок</button></div></> : <>
      <div className="grammar-steps">{lesson.steps.map((s,i)=><span key={s.id} className={i===lesson.stage?'now':i<lesson.stage?'done':''}>{i<lesson.stage?'✓ ':i===lesson.stage?'● ':'○ '}{s.id==='theory'?`${s.label} ${part+1} из 4`:s.label}</span>)}</div>
      <div className="grammar-columns"><section className="grammar-paper grammar-theory" data-qa-card>
        <div><h2>{current.title}</h2><div className="grammar-subtitle">{current.subtitle}</div></div>
        {current.paragraphs.map((p,i)=><p key={i}><Runs runs={p}/></p>)}
        <table><thead><tr>{current.headers.map((h,i)=><th key={i}>{h}</th>)}</tr></thead><tbody>{current.rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}><Runs runs={c}/></td>)}</tr>)}</tbody></table>
        <div className="grammar-trap">{current.trap}</div>
        <div className="grammar-navigation"><button disabled={part===0} onClick={()=>setPart(n=>Math.max(0,n-1))}>‹ Часть {Math.max(1,part)}</button><button className="grammar-primary" disabled={part===3} onClick={()=>setPart(n=>Math.min(3,n+1))}>Часть {Math.min(4,part+2)} ›</button><span>{current.hint}</span></div>
      </section><aside>
        <section className="grammar-paper grammar-card" data-qa-card><div className="grammar-cap">◆ ПРАКТИКА В ЧАТЕ</div><div>{lesson.practice.question}</div>
          <div className="grammar-options">{lesson.practice.options.map((o,i)=><button key={o} aria-pressed={selected===i} className={submitted && lesson.practice.answer && selected===i ? (i===lesson.practice.answer.index?'grammar-correct':'grammar-wrong') : selected===i?'grammar-selected':''} onClick={()=>{setSelected(i);setSubmitted(false);}}>{o}</button>)}</div>
          <button className="grammar-send" disabled={!canSend || selected===null || submitted} onClick={()=>{if(canSend && selected!==null) { intent(GRAMMAR_ANSWER,{lessonId:lesson.id,practice:lesson.practice.id,source:lesson.practice.source,question:lesson.practice.question,answer:lesson.practice.options[selected]}); setSubmitted(true); }}}>Ответить JERY</button>
          {submitted && <p role="status">{lesson.practice.answer ? `${selected===lesson.practice.answer.index?'Верно.':'Проверь ответ.'} ${lesson.practice.answer.explanation}` : 'Ответ отправлен JERY. Ожидаем разбор в чате.'}</p>}
        </section>
        <section className="grammar-paper grammar-card" data-qa-card><div className="grammar-cap">◆ ДОМАШКА · УЧЕБНИК НА iPAD</div><div className="grammar-homework">{lesson.homework.map((h,i)=><div key={i}><span>{h.pages}</span><span className={h.status==='checked'?'grammar-success':'grammar-warning'}>{h.status==='checked'?'✓ проверено':'○ жду «готово»'}</span></div>)}</div><p className="grammar-hint">{lesson.homeworkHint}</p></section>
        <section className="grammar-paper grammar-card" data-qa-card><div className="grammar-cap">◆ КОНСПЕКТ</div><div className="grammar-note-name">{lesson.note.path.split('/').pop()}{lesson.note.status==='waiting' && <span className="grammar-warning"> · появится после теории</span>}</div>{lesson.note.status==='ready' && <button className="grammar-note-link" onClick={()=>{ const path=lesson.note.path; setNoteError(''); void vaultReadText(path).then(text=>{setNote({path,text});}).catch(()=>setNoteError('Не удалось открыть конспект в хранилище.')); }}>Открыть конспект ›</button>}{noteError && <p role="alert">{noteError}</p>}</section>
      </aside></div>
      <details className="grammar-sources"><summary>Источники и загрузка урока</summary><button disabled={!canSend} onClick={()=>{if(canSend) intent(GRAMMAR_PREPARE,null);}}>Подготовить урок с JERY</button><p>{lesson.source}</p><p>Теория: {current.source}</p><p>Практика: {lesson.practice.source}</p>{lesson.practice.answer && <p>Ответ: {lesson.practice.answer.source}</p>}{lesson.homework.map((h,i)=><div key={i}><p>{h.pages}: {h.source}</p><button className="grammar-check" disabled={!canSend} onClick={()=>{if(canSend) intent(GRAMMAR_HOMEWORK,{lessonId:lesson.id,pages:h.pages,source:h.source});}}>Попросить проверку: {h.pages}</button></div>)}<button onClick={()=>setReload(n=>n+1)}>Загрузить урок</button></details>
      {note && <section className="grammar-note" role="dialog" aria-label="Конспект грамматики"><h2>{note.path}</h2><button onClick={()=>setNote(null)}>Закрыть конспект</button><pre>{note.text}</pre></section>}
    </>}
  </section>;
}
