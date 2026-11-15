import { useEffect, useRef, useState } from "react";
import { translate, vocabAdd } from "./subprocess";

function WordPopup({ word, sentence, onSaved, onClose }: {
  word: string; sentence: string; onSaved: () => void; onClose: () => void;
}) {
  const [translation, setTranslation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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
  async function markUnknown() {
    setSaving(true);
    setError(null);
    try { await vocabAdd(word, sentence); if (active.current) onSaved(); }
    catch (reason) { if (active.current) setError(`Не удалось сохранить: ${String(reason)}`); }
    finally { if (active.current) setSaving(false); }
  }
  return <span className="word-popup" role="dialog" aria-label={`Перевод: ${word}`}>
    <span className="word-popup-word">{word}</span>
    <span aria-live="polite">{translation ?? (error ? "" : "Переводим…")}</span>
    {error && <span role="alert">{error}</span>}
    <button className="word-popup-btn" disabled={saving} onClick={markUnknown}>{saving ? "Сохраняем…" : "Отметить как незнакомое"}</button>
    <button className="word-popup-btn" onClick={onClose}>Закрыть</button>
  </span>;
}

export function TextViewer() {
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(true);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [popup, setPopup] = useState<string | null>(null);
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (editing) return <div className="viewer">
    <div className="viewer-header"><span className="viewer-title">Чтение текста</span></div>
    <textarea className="viewer-input" aria-label="Текст для чтения" value={text} onChange={e => setText(e.target.value)} placeholder="Вставьте английский текст…" rows={12} />
    <div className="viewer-toolbar"><button className="btn-primary" disabled={!text.trim()} onClick={() => { setPopup(null); setEditing(false); }}>Читать →</button></div>
  </div>;
  return <div className="viewer">
    <div className="viewer-header">
      <span className="viewer-title">Чтение текста</span>
      <button className="btn-sm" onClick={() => { setPopup(null); setEditing(true); }}>Изменить текст</button>
      {unknown.length > 0 && <span className="viewer-unknown-count">Незнакомых слов: {unknown.length}</span>}
    </div>
    <div className="viewer-text">{sentences.map((sentence, sentenceIndex) => <span className="sentence-wrap" key={sentenceIndex}>
      {(sentence.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*|[^\p{L}\p{N}]+/gu) ?? []).map((token, tokenIndex) => {
        const id = `${sentenceIndex}-${tokenIndex}`;
        if (!/[\p{L}\p{N}]/u.test(token)) return <span key={id}>{token}</span>;
        return <span className="word-wrap" key={id}>
          <button className={`word ${unknown.includes(token.toLowerCase()) ? "word-unknown" : popup === id ? "word-selected" : "word-normal"}`}
            onClick={() => setPopup(popup === id ? null : id)} aria-expanded={popup === id}>{token}</button>
          {popup === id && <WordPopup key={id} word={token} sentence={sentence} onClose={() => setPopup(null)} onSaved={() => {
            setUnknown(previous => previous.includes(token.toLowerCase()) ? previous : [...previous, token.toLowerCase()]);
            setPopup(null);
          }} />}
        </span>;
      })}{" "}
    </span>)}</div>
    {unknown.length > 0 && <div className="vocab-panel"><div className="vocab-title">Незнакомые слова</div><div className="vocab-list">
      {unknown.map(word => <span className="vocab-word" key={word}>{word}</span>)}
    </div></div>}
  </div>;
}
