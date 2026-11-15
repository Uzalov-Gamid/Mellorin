export const GRAMMAR_PATH = '.mellorin/english-grammar.json';
export const GRAMMAR_PREPARE = 'Подготовь English Grammar v1 по .mellorin/README.md. Сначала прочитай Learning/English/grammar/process.md и реальные заметки/errors. Следуй процессу: хвост → теория по одной части → конспект → практика в чате → домашка на iPad. Запиши только sourced bounded .mellorin/english-grammar.json; не меняй process.md, не придумывай урок или проверку PDF. Если источников нет, спроси меня.';
export const GRAMMAR_ANSWER = 'Разбери выбранный ответ English Grammar по lessonId, practice и source из payload, следуя Learning/English/grammar/process.md. Не считай ответ проверенным без источника. Объясни в чате; записи и внешняя домашка остаются процессом JERY.';
export const GRAMMAR_HOMEWORK = 'Проверь указанную домашку English Grammar по реальному процессу Learning/English/grammar/process.md. Используй lessonId/pages/source из payload. Я явно прошу проверку; не отмечай PDF проверенным без фактического доступа и проверки. Обнови данные English Grammar v1 только по результату.';
export const grammarStages = ['tail', 'theory', 'conspect', 'practice', 'homework'] as const;
export interface GrammarRun { text: string; role?: 'accent' | 'success' | 'warning' | 'danger' | 'muted' | 'highlight' }
export interface GrammarPart { title: string; subtitle: string; source: string; paragraphs: GrammarRun[][]; headers: string[]; rows: GrammarRun[][][]; trap: string; hint: string }
export interface GrammarLesson {
  version: 1; id: string; title: string; subtitle: string; source: string;
  steps: { id: typeof grammarStages[number]; label: string }[]; stage: number; part: number;
  parts: GrammarPart[];
  practice: { id: string; question: string; source: string; options: string[]; answer?: { index: number; source: string; explanation: string } };
  homework: { pages: string; status: 'waiting' | 'checked'; source: string }[]; homeworkHint: string;
  note: { path: string; status: 'waiting' | 'ready' };
}
export function grammarSource(v: unknown): v is string {
  if (typeof v !== 'string' || v.length > 240 || !v.startsWith('Learning/English/') || !v.endsWith('.md') || /[\\\x00-\x1f\x7f%?#:]/.test(v)) return false;
  const parts = v.split('/');
  return parts.length <= 10 && parts.every(p => !!p && !p.startsWith('.') && p.trim() === p);
}
export function parseGrammarLesson(text: string): GrammarLesson {
  const fail = (): never => { throw Error('Grammar: неверные данные или источники'); };
  if (text.length > 131072) return fail();
  const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
  const str = (v: unknown, max = 1000): v is string => typeof v === 'string' && !!v.trim() && v.length <= max && !/[<>\x00-\x08]/.test(v);
  function shape(v: unknown, keys: string[]): asserts v is Record<string, unknown> { if (!obj(v) || Object.keys(v).some(k => !keys.includes(k))) fail(); }
  function runs(v: unknown): GrammarRun[] {
    if (!Array.isArray(v) || v.length < 1 || v.length > 20) return fail();
    return v.map(r => { shape(r, ['text', 'role']); if (!str(r.text) || (r.role !== undefined && !['accent','success','warning','danger','muted','highlight'].includes(String(r.role)))) return fail(); return r as unknown as GrammarRun; });
  }
  const v: unknown = JSON.parse(text);
  shape(v, ['version','id','title','subtitle','source','steps','stage','part','parts','practice','homework','homeworkHint','note']);
  if (v.version !== 1 || !str(v.id,100) || !str(v.title,300) || !str(v.subtitle,300) || !grammarSource(v.source) || !Number.isInteger(v.stage) || Number(v.stage)<0 || Number(v.stage)>4 || !Number.isInteger(v.part) || Number(v.part)<0 || Number(v.part)>3 || !Array.isArray(v.steps) || v.steps.length !== 5 || !Array.isArray(v.parts) || v.parts.length !== 4) return fail();
  v.steps.forEach((s,i) => { shape(s,['id','label']); if (s.id !== grammarStages[i] || !str(s.label,60)) fail(); });
  v.parts.forEach(p => {
    shape(p,['title','subtitle','source','paragraphs','headers','rows','trap','hint']);
    if (!str(p.title,300) || !str(p.subtitle,300) || !grammarSource(p.source) || !str(p.trap,2000) || !str(p.hint,500) || !Array.isArray(p.paragraphs) || p.paragraphs.length>8 || !Array.isArray(p.headers) || p.headers.length<1 || p.headers.length>4 || !p.headers.every(h=>str(h,100)) || !Array.isArray(p.rows) || p.rows.length<1 || p.rows.length>12) fail();
    (p.paragraphs as unknown[]).forEach(runs);
    (p.rows as unknown[]).forEach(row=> { if (!Array.isArray(row) || row.length !== (p.headers as unknown[]).length) fail(); (row as unknown[]).forEach(runs); });
  });
  const p=v.practice; shape(p,['id','question','source','options','answer']);
  if (!str(p.id,100) || !str(p.question,2000) || !grammarSource(p.source) || !Array.isArray(p.options) || p.options.length<2 || p.options.length>6 || !p.options.every(o=>str(o,300)) || new Set(p.options).size !== p.options.length) fail();
  if (p.answer !== undefined) { const a=p.answer; shape(a,['index','source','explanation']); if (!Number.isInteger(a.index) || Number(a.index)<0 || Number(a.index)>=(p.options as unknown[]).length || !grammarSource(a.source) || !str(a.explanation,2000)) fail(); }
  if (!Array.isArray(v.homework) || v.homework.length>12 || !str(v.homeworkHint,1000)) fail();
  (v.homework as unknown[]).forEach(h=> { shape(h,['pages','status','source']); if (!str(h.pages,200) || !['waiting','checked'].includes(String(h.status)) || !grammarSource(h.source)) fail(); });
  shape(v.note,['path','status']); if (!grammarSource(v.note.path) || !['waiting','ready'].includes(String(v.note.status))) fail();
  return v as unknown as GrammarLesson;
}
