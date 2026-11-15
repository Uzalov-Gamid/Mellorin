import { parseFormat } from '../blocks/schema';
export interface ChangeProposal { target: string; before: string | null; after: string; process: string; process_before: string | null; rule: string }
export function parseChange(value: unknown): ChangeProposal {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('change: expected object');
  const p = value as ChangeProposal;
  if (Object.keys(p).sort().join() !== 'after,before,process,process_before,rule,target') throw Error('change: unexpected fields');
  if (typeof p.target !== 'string' || typeof p.process !== 'string') throw Error('change: paths required');
  const parts = /^Learning\/([A-Za-z][A-Za-z0-9-]{0,63})\/([A-Za-z][A-Za-z0-9-]{0,63})\/process\.md$/.exec(p.process);
  if (!parts || p.target !== `formats/${parts[1].toLowerCase()}-${parts[2].toLowerCase()}.json` || !/^formats\/[a-z][a-z0-9-]{0,63}\.json$/.test(p.target)) throw Error('change: invalid subject/skill paths');
  if (typeof p.after !== 'string' || !(p.before === null || typeof p.before === 'string') || !(p.process_before === null || typeof p.process_before === 'string')) throw Error('change: exact file strings or null required');
  parseFormat(p.after); if (p.before !== null) parseFormat(p.before);
  if ((p.process_before?.length ?? 0) > 262144 || typeof p.rule !== 'string' || !p.rule.trim() || p.rule.length > 20000 || p.rule.includes('<!-- mellorin:')) throw Error('change: invalid rule');
  return p;
}
/** A lossless whole-file unified diff: every removed/added line is visible, including final newline state. */
export function exactDiff(before: string | null, after: string | null, path: string): string {
  const lines = (s: string | null, prefix: string) => s === null || s === '' ? '' : s.split('\n').map((line, i, all) => i === all.length - 1 && line === '' ? '' : `${prefix}${line}\n${i === all.length - 1 ? '\\ No newline at end of file\n' : ''}`).join('');
  const count = (s: string | null) => !s ? 0 : s.split('\n').length - (s.endsWith('\n') ? 1 : 0);
  return `--- ${before === null ? '/dev/null' : path}\n+++ ${after === null ? '/dev/null' : path}\n@@ -${count(before) ? 1 : 0},${count(before)} +${count(after) ? 1 : 0},${count(after)} @@\n${lines(before, '-')}${lines(after, '+')}`;
}
