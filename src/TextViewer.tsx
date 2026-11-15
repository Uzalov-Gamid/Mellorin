import { useEffect, useRef, useState } from "react";
import { translate, vocabAdd, explainSentence, vocabSetStatus, type Explanation, type VocabStatus } from "./subprocess";

export function WordPopup({ word, sentence, initialStatus = null, onSaved, onClose }: {
  word: string; sentence: string; initialStatus?: VocabStatus | null; onSaved: (status?: VocabStatus) => void; onClose: () => void;
}) {
  const [translation, setTranslation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<VocabStatus | null>(initialStatus);
  const [speechError, setSpeechError] = useState("");
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  useEffect(() => {
    let active = true;
    translate(word, sentence).then(result => { if (active) setTranslation(result); })
      .catch((reason: unknown) => { if (active) setError(`Не удалось перевести: ${String(reason)}`); });
    return () => { active = false; };
  }, [word, sentence]);
  async function markUnknown(next: VocabStatus = "learning") {
    setSaving(true);
    setError(null);
    try {
      await vocabAdd(word, sentence);
      if (next !== "learning") await vocabSetStatus(word, next);
      if (active.current) { setStatus(next); onSaved(next); }
    }
    catch (reason) { if (active.current) setError(`Не удалось сохранить: ${String(reason)}`); }
    finally { if (active.current) setSaving(false); }
  }
  function speak() {
    const synthesis = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    const voice = synthesis?.getVoices().find(item => /^en(?:-|$)/i.test(item.lang));
    if (!synthesis || !voice || typeof SpeechSynthesisUtterance === "undefined") {
      setSpeechError("Английский голос недоступен"); return;
    }
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.voice = voice; utterance.lang = voice.lang;
    utterance.onerror = () => { if (active.current) setSpeechError("Не удалось воспроизвести произношение"); };
    synthesis.cancel(); synthesis.speak(utterance); setSpeechError("");
  }
  return <span className="word-popup" onClick={event => event.stopPropagation()} role="dialog" aria-label={`Перевод: ${word}`}>
    <span className="word-popup-word">{word}</span>
    <span aria-live="polite">{translation ?? (error ? "" : "Переводим…")}</span>
    {error && <span role="alert">{error}</span>}
    <button className="word-popup-btn" disabled={saving} onClick={() => markUnknown()}>{saving ? "Сохраняем…" : "Отметить как незнакомое"}</button>
    <button className="word-popup-btn" onClick={speak}>▸ Послушать произношение</button>
    {speechError && <span role="status">{speechError}</span>}
    <span className="word-statuses">{(["learning", "focus", "known"] as const).map(value => <button key={value} className="word-popup-btn" aria-pressed={status === value} disabled={saving} onClick={() => markUnknown(value)}>{value}</button>)}</span>
    {status && <span className="word-saved" role="status">добавлено в vocabulary/mywords-list.md · {status}</span>}
    <button className="word-popup-btn" onClick={onClose}>Закрыть</button>
  </span>;
}

export function TextViewer() {
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(true);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<Record<string, VocabStatus>>({});
  const [popup, setPopup] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [phraseAttempt, setPhraseAttempt] = useState(0);
  const [phraseError, setPhraseError] = useState<string | null>(null);
  useEffect(() => {
    if (selected === null) return;
    let active = true;
    setExplanation(null); setPhraseError(null);
    const sentence = text.split(/(?<=[.!?])\s+/).filter(Boolean)[selected];
    explainSentence(sentence).then(result => { if (active) setExplanation(result); })
      .catch((reason: unknown) => { if (active) setPhraseError(`Не удалось разобрать: ${String(reason)}`); });
    return () => { active = false; };
  }, [selected, text, phraseAttempt]);
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (editing) return <div className="viewer">
    <div className="viewer-header"><span className="viewer-title">Чтение текста</span></div>
    <textarea className="viewer-input" aria-label="Текст для чтения" value={text} onChange={e => setText(e.target.value)} placeholder="Вставьте английский текст…" rows={12} />
    <div className="viewer-toolbar"><button className="btn-primary" disabled={!text.trim()} onClick={() => { setPopup(null); setSelected(null); setEditing(false); }}>Читать →</button></div>
  </div>;
  return <div className="viewer reading-viewer">
    <div className="reading-meta"><div>English › Чтение › <span>Текст для чтения</span></div><div className="reading-pills"><span>уровень — · {text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)?.length ?? 0} слов</span><span>шаг — из 9</span></div></div>
    <div className="reading-tracker" role="group" aria-label="Шаги чтения: текущий шаг неизвестен">{Array.from({ length: 9 }, (_, index) => <span key={index} />)}</div>
    <article className="reading-paper">
    <div className="viewer-header">
      <h1>Текст для чтения</h1>
      <button className="btn-sm" onClick={() => { setPopup(null); setSelected(null); setEditing(true); }}>Изменить текст</button>
      {unknown.length > 0 && <span className="viewer-unknown-count">Незнакомых слов: {unknown.length}</span>}
    </div>
    <p className="reading-hint">клик по слову: в словарь · номер предложения: разбор на фразы</p>
    <div className="viewer-text">{sentences.map((sentence, sentenceIndex) => <span className="sentence-wrap" key={sentenceIndex}><span className={selected === sentenceIndex ? "sentence sentence-selected" : "sentence"} onClick={() => setSelected(sentenceIndex)}>
      {(sentence.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*|[^\p{L}\p{N}]+/gu) ?? []).map((token, tokenIndex) => {
        const id = `${sentenceIndex}-${tokenIndex}`;
        if (!/[\p{L}\p{N}]/u.test(token)) return <span key={id}>{token}</span>;
        return <span className="word-wrap" key={id}>
          <button className={`word ${unknown.includes(token.toLowerCase()) ? "word-unknown" : popup === id ? "word-selected" : "word-normal"}`}
            onClick={event => { event.stopPropagation(); setPopup(popup === id ? null : id); }} aria-expanded={popup === id}>{token}</button>
          {popup === id && <WordPopup key={id} word={token} sentence={sentence} initialStatus={statuses[token]} onClose={() => setPopup(null)} onSaved={status => {
            if (status) setStatuses(previous => ({ ...previous, [token]: status }));
            setUnknown(previous => status === "known" ? previous.filter(word => word !== token.toLowerCase()) : previous.includes(token.toLowerCase()) ? previous : [...previous, token.toLowerCase()]);
          }} />}
        </span>;
      })}</span><sup><button aria-label={`Разобрать предложение ${sentenceIndex + 1}`} aria-pressed={selected === sentenceIndex} onClick={() => setSelected(sentenceIndex)}>{sentenceIndex + 1}</button></sup>{" "}
    </span>)}</div>
    {selected !== null && <section className="phrase-breakdown" aria-live="polite"><div className="caption">ПРЕДЛОЖЕНИЕ {selected + 1} · ФРАЗЫ</div>
      {phraseError ? <div><p role="alert">{phraseError}</p><button className="btn-sm" onClick={() => setPhraseAttempt(value => value + 1)}>Повторить разбор</button></div> : explanation ? <div className="phrase-list">{explanation.phrases.map((phrase, index) => <div className="phrase" key={index}><div>{phrase.text}</div><div>{phrase.ru}</div></div>)}</div> : <p>Разбираем…</p>}
    </section>}
    </article>
    {unknown.length > 0 && <div className="vocab-panel"><div className="vocab-title">Незнакомые слова</div><div className="vocab-list">
      {unknown.map(word => <span className="vocab-word" key={word}>{word}</span>)}
    </div></div>}
  </div>;
}
