export const WRITING_PATH = '.mellorin/english-writing.json';
export const WRITING_PROCESS = 'Learning/English/writing/process.md';
export const WRITING_PREPARE = `Подготовь задание English Writing по протоколу English Writing v1 в .mellorin/README.md. Сначала прочитай ${WRITING_PROCESS} и реальные материалы writing. Запиши только .mellorin/english-writing.json; не заменяй process.md. Возьми тему, цель, план и Watch out из источников; если данных нет, спроси меня. Не сочиняй мой текст или разбор.`;
export const WRITING_REVIEW = `Проверь EXACT draft из payload по ${WRITING_PROCESS}. Прочитай протокол English Writing v1 в .mellorin/README.md. Запиши review в .mellorin/english-writing.json с тем же lessonId и побуквенно тем же draft, точными UTF-16 start/end, before/after/why и одной-двумя главными ошибками. Не подменяй мой текст, не меняй process.md; без ошибок mainErrors пуст.`;
export const WRITING_RESULT = `Разбери мою исправленную версию English Writing по ${WRITING_PROCESS}. Исходный разбор привязан к originalDraft, новая версия — draft. Сообщи итог в чате; записи в sessions/errors/progress выполняй только по реальному процессу. Не заменяй process.md.`;
export interface SourcedText { text: string; source: string }
export interface WritingError { start: number; end: number; before: string; after: string; why: string }
export interface WritingReview { lessonId: string; draft: string; errors: WritingError[]; mainErrors: number[] }
export interface WritingLesson { version: 1; id: string; title: string; source: string; target: { min: number; max: number; source: string }; plan: SourcedText[]; watchOut: SourcedText[]; draft: string; review?: WritingReview }
export function writingSource(v: unknown): v is string {
  return typeof v === 'string' && v.length <= 240 && /^Learning\/English\/writing\/[^/\\\x00-\x1f]+\.md$/.test(v) && !v.split('/').some(p => p === '.' || p === '..');
}
export function wordCount(text: string): number { return text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)?.length ?? 0; }
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, max: number): v is string => typeof v === 'string' && !!v.trim() && v.length <= max;
export function parseWritingLesson(text: string): WritingLesson {
  if (text.length > 131072) throw Error('Writing: максимум 128 KiB');
  const v: unknown = JSON.parse(text);
  const fail = (): never => { throw Error('Writing: неверные данные задания или точная привязка разбора'); };
  if (!object(v) || v.version !== 1 || !str(v.id, 100) || !str(v.title, 300) || !writingSource(v.source) || !object(v.target)) return fail();
  const t = v.target;
  if (!Number.isInteger(t.min) || !Number.isInteger(t.max) || Number(t.min) < 1 || Number(t.max) < Number(t.min) || Number(t.max) > 10000 || !writingSource(t.source)) return fail();
  function sourced(items: unknown, min: number): SourcedText[] {
    if (!Array.isArray(items) || items.length < min || items.length > 10) return fail();
    return items.map(x => { if (!object(x) || !str(x.text, 1000) || !writingSource(x.source)) return fail(); return { text: x.text, source: x.source }; });
  }
  if (typeof v.draft !== 'string' || v.draft.length > 20000) return fail();
  const lesson: WritingLesson = { version: 1, id: v.id, title: v.title, source: v.source, target: { min: Number(t.min), max: Number(t.max), source: t.source }, plan: sourced(v.plan, 1), watchOut: sourced(v.watchOut, 0), draft: v.draft };
  if (v.review !== undefined) {
    const r = v.review;
    if (!object(r) || r.lessonId !== v.id || !str(r.draft, 20000) || !Array.isArray(r.errors) || r.errors.length > 40 || !Array.isArray(r.mainErrors)) return fail();
    let end = 0;
    const draft = r.draft;
    const errors = r.errors.map(x => {
      if (!object(x) || !Number.isInteger(x.start) || !Number.isInteger(x.end) || Number(x.start) < end || Number(x.end) <= Number(x.start) || Number(x.end) > draft.length || !str(x.before, 2000) || typeof x.after !== 'string' || x.after.length > 2000 || !str(x.why, 2000) || draft.slice(Number(x.start), Number(x.end)) !== x.before) return fail();
      end = Number(x.end);
      return { start: Number(x.start), end, before: x.before, after: x.after, why: x.why };
    });
    const main = r.mainErrors;
    if ((errors.length ? main.length < 1 || main.length > 2 : main.length !== 0) || new Set(main).size !== main.length || !main.every(n => Number.isInteger(n) && n >= 1 && n <= errors.length)) return fail();
    lesson.review = { lessonId: v.id, draft, errors, mainErrors: main };
  }
  return lesson;
}
export function boundReview(lesson: WritingLesson | null, draft: string): WritingReview | undefined {
  return lesson?.review?.lessonId === lesson?.id && lesson?.review?.draft === draft ? lesson.review : undefined;
}
