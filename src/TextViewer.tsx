import { useState } from "react";

type WordState = "normal" | "selected" | "unknown";

interface WordData {
  id: string;
  text: string;
  state: WordState;
}

interface SentenceData {
  id: string;
  raw: string;
  words: WordData[] | null;
}

function tokenize(text: string): string[] {
  return text.match(/[\w']+|[.,!?;:—–-]+|\s+/g) ?? [text];
}

function buildSentences(text: string): SentenceData[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .map((s, i) => ({ id: `s${i}`, raw: s, words: null }));
}

interface WordPopupProps {
  word: string;
  onMarkUnknown: () => void;
  onClose: () => void;
}

function WordPopup({ word, onMarkUnknown, onClose }: WordPopupProps) {
  return (
    <span className="word-popup" onMouseLeave={onClose}>
      <span className="word-popup-word">{word}</span>
      <button className="word-popup-btn" onClick={onMarkUnknown}>
        mark unknown
      </button>
    </span>
  );
}

export function TextViewer() {
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(true);
  const [sentences, setSentences] = useState<SentenceData[]>([]);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [popup, setPopup] = useState<{ sentId: string; wordId: string } | null>(null);

  function startReading() {
    if (!text.trim()) return;
    setSentences(buildSentences(text));
    setEditing(false);
  }

  function expandSentence(sentId: string) {
    setSentences((prev) =>
      prev.map((s) => {
        if (s.id !== sentId || s.words) return s;
        const tokens = tokenize(s.raw);
        const words: WordData[] = tokens.map((t, i) => ({
          id: `${sentId}-w${i}`,
          text: t,
          state: unknown.includes(t.toLowerCase()) ? "unknown" : "normal",
        }));
        return { ...s, words };
      })
    );
  }

  function markUnknown(sentId: string, wordId: string) {
    setSentences((prev) =>
      prev.map((s) => {
        if (s.id !== sentId || !s.words) return s;
        const words = s.words.map((w) =>
          w.id === wordId ? { ...w, state: "unknown" as WordState } : w
        );
        const word = s.words.find((w) => w.id === wordId);
        if (word) {
          setUnknown((u) =>
            u.includes(word.text.toLowerCase()) ? u : [...u, word.text.toLowerCase()]
          );
        }
        return { ...s, words };
      })
    );
    setPopup(null);
  }

  if (editing) {
    return (
      <div className="viewer">
        <div className="viewer-header">
          <span className="viewer-title">Text viewer</span>
        </div>
        <textarea
          className="viewer-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste any text here..."
          rows={12}
        />
        <div className="viewer-toolbar">
          <button className="btn-primary" onClick={startReading} disabled={!text.trim()}>
            read →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="viewer">
      <div className="viewer-header">
        <span className="viewer-title">Text viewer</span>
        <button className="btn-sm" onClick={() => setEditing(true)}>new text</button>
        {unknown.length > 0 && (
          <span className="viewer-unknown-count">{unknown.length} unknown</span>
        )}
      </div>

      <div className="viewer-text">
        {sentences.map((s) => (
          <span key={s.id} className="sentence-wrap">
            {s.words === null ? (
              <span
                className="sentence"
                onClick={() => expandSentence(s.id)}
                title="Click to expand"
              >
                {s.raw}{" "}
              </span>
            ) : (
              <span className="sentence sentence-expanded">
                {s.words.map((w) => {
                  const isWord = /\w/.test(w.text);
                  if (!isWord) return <span key={w.id}>{w.text}</span>;
                  return (
                    <span
                      key={w.id}
                      className={`word word-${w.state}`}
                      onClick={() =>
                        setPopup(
                          popup?.wordId === w.id ? null : { sentId: s.id, wordId: w.id }
                        )
                      }
                    >
                      {w.text}
                      {popup?.sentId === s.id && popup?.wordId === w.id && (
                        <WordPopup
                          word={w.text}
                          onMarkUnknown={() => markUnknown(s.id, w.id)}
                          onClose={() => setPopup(null)}
                        />
                      )}
                    </span>
                  );
                })}
                {" "}
              </span>
            )}
          </span>
        ))}
      </div>

      {unknown.length > 0 && (
        <div className="vocab-panel">
          <div className="vocab-title">Unknown words</div>
          <div className="vocab-list">
            {unknown.map((w) => (
              <span key={w} className="vocab-word">{w}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
