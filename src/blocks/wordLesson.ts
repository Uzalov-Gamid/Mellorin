export const WORD_LESSON_PATH = '.mellorin/english-words.json';
export const WORDS_PREPARE = 'Подготовь .mellorin/english-words.json по протоколу English Words v1 в .mellorin/README.md. Прочитай Learning/English/vocabulary/process.md и Learning/English/vocabulary/mywords-list.md; также поддержи существующий vocabulary/mywords-list.md без переноса данных. Выбери 10 реальных слов: сначала focus, затем добавленные вчера и 3–4 дня назад, затем самые старые learning. Сам вычисли даты и приоритеты. Не выдумывай слова, IPA, примеры или прогресс; если данных недостаточно, объясни, что нужно. Статусы пока не меняй.';
export const WORDS_RESULT = 'Проверь результат English Words v1 и обнови статусы только в исходных Markdown-файлах каждого слова согласно process.md. Не переноси слова и не меняй формат. Сообщи, что записано.';
export interface Choice { choices: string[]; answer: number }
export interface StudyWord { word: string; translation: string; source: string; status: 'focus' | 'learning'; added?: string; ipa?: string; example?: string; exampleSource?: string; translationChoice: Choice; sentenceGap: Choice & { sentence: string }; reverseTranslation: Choice; dictation: string[] }
export interface WordLesson { version: 1; id: string; preparedOn: string; words: StudyWord[] }
const sources = ['Learning/English/vocabulary/mywords-list.md', 'vocabulary/mywords-list.md'];
export function parseWordLesson(text: string): WordLesson {
  if (text.length > 131072) throw Error('English Words: максимум 128 KiB');
  const value = JSON.parse(text);
  const fail = (path: string): never => { throw Error(`English Words: неверное поле ${path}`); };
  const str = (x: unknown, path: string, max = 2000) => { if (typeof x !== 'string' || !x.trim() || x.length > max) fail(path); };
  const date = (x: unknown, path: string) => { str(x, path, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(x as string) || !Number.isFinite(Date.parse(x as string)) || new Date(x as string).toISOString().slice(0, 10) !== x) fail(path); };
  if (!value || value.version !== 1) fail('version');
  str(value.id, 'id', 100); date(value.preparedOn, 'preparedOn');
  if (!Array.isArray(value.words) || value.words.length !== 10) fail('words (нужно ровно 10)');
  const seen = new Set<string>();
  value.words.forEach((w: StudyWord, i: number) => {
    const p = `words[${i}]`; if (!w || typeof w !== 'object') fail(p);
    str(w.word, `${p}.word`, 100); str(w.translation, `${p}.translation`);
    if (seen.has(w.word.toLowerCase())) fail(`${p}.word (дубликат)`); seen.add(w.word.toLowerCase());
    if (!sources.includes(w.source)) fail(`${p}.source`);
    if (!['focus', 'learning'].includes(w.status)) fail(`${p}.status`);
    if (w.added !== undefined) date(w.added, `${p}.added`);
    for (const key of ['ipa', 'example', 'exampleSource'] as const) if (w[key] !== undefined) str(w[key], `${p}.${key}`);
    for (const key of ['translationChoice', 'sentenceGap', 'reverseTranslation'] as const) {
      const q = w[key]; if (!q || !Array.isArray(q.choices) || q.choices.length !== 4 || new Set(q.choices).size !== 4 || !Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) fail(`${p}.${key}`);
      q.choices.forEach(c => str(c, `${p}.${key}.choices`));
    }
    str(w.sentenceGap.sentence, `${p}.sentenceGap.sentence`);
    if (!w.sentenceGap.sentence.includes('___')) fail(`${p}.sentenceGap.sentence (нужен ___)`);
    if (!Array.isArray(w.dictation) || !w.dictation.length || w.dictation.length > 10) fail(`${p}.dictation`);
    w.dictation.forEach(c => str(c, `${p}.dictation`, 100));
  });
  return value;
}
export const normalizeDictation = (text: string) => text.normalize('NFKC').trim().toLocaleLowerCase('en').replace(/\s+/g, ' ');
export function studyKey(event: KeyboardEvent): number | 'next' | null {
  const target = event.target as HTMLElement | null;
  if (event.isComposing || event.repeat || event.altKey || event.ctrlKey || event.metaKey || target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])')) return null;
  if (event.key === 'Enter') return 'next';
  const index = ['а', 'б', 'в', 'г'].indexOf(event.key.toLowerCase());
  return index < 0 ? null : index;
}
