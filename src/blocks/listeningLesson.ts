export const LISTENING_PATH = '.mellorin/english-listening.json';
export const LISTENING_DIR = 'Learning/English/listening';
export const LISTENING_PREPARE = 'Подготовь .mellorin/english-listening.json по протоколу English Listening v1 в .mellorin/README.md. Прочитай Learning/English/listening/process.md и выбранный пользователем урок. Используй только предоставленное пользователем аудио http/https, три настоящих вопроса и полный исходный Script. Не выдумывай данные и не меняй practice. Если источников недостаточно, объясни, что нужно.';
export interface ListeningLesson { version: 1; id: string; title: string; source: string; audioUrl: string; questions: [string, string, string]; script: string }
export function listeningSource(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 240 && /^Learning\/English\/listening\/[^/\\\x00-\x1f]+\.md$/.test(value) && !value.split('/').some(p => p === '..' || p === '.');
}
export function parseListeningLesson(text: string): ListeningLesson {
  if (text.length > 131072) throw Error('Listening: максимум 128 KiB');
  const v = JSON.parse(text);
  const str = (x: unknown, max: number) => typeof x === 'string' && !!x.trim() && x.length <= max;
  if (!v || v.version !== 1 || !str(v.id, 100) || !str(v.title, 300) || !listeningSource(v.source) || !str(v.script, 60000) || !Array.isArray(v.questions) || v.questions.length !== 3 || !v.questions.every((q: unknown) => str(q, 2000)) || new Set(v.questions).size !== 3 || !str(v.audioUrl, 2048)) throw Error('Listening: нужны version 1, id, title, source, audioUrl, три разных questions и script');
  const url = new URL(v.audioUrl);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw Error('Listening: нужен URL http/https без пароля');
  return { version: 1, id: v.id, title: v.title, source: v.source, audioUrl: url.href, questions: v.questions, script: v.script };
}
export interface PastListening { source: string; title: string; practice: boolean | null }
export function pastListening(source: string, text: string): PastListening {
  if (!listeningSource(source) || text.length > 131072) throw Error('Listening: неверный исходный файл');
  const front = text.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---(?:\n|$)/)?.[1];
  const flag = front?.match(/^practice:\s*(true|false)\s*$/m)?.[1];
  const title = front?.match(/^title:\s*(.+)\s*$/m)?.[1]?.replace(/^['"]|['"]$/g, '') || source.split('/').pop()!.slice(0, -3);
  return { source, title: title.slice(0, 300), practice: flag === undefined ? null : flag === 'true' };
}
