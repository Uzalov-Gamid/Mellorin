import { parseFormat, type Block } from './schema';

export interface Reply { text: string; blocks: Block[]; errors: string[] }
/** Reparse the accumulated reply so every possible delta boundary is equivalent. */
export function parseReply(source: string, streaming = false): Reply {
  const result: Reply = { text: '', blocks: [], errors: [] };
  const lines = source.split('\n');
  let fence: string | null = null;
  let fenceLength = 3;
  let body: string[] = [];
  let ordinaryFence: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const newline = i < lines.length - 1 ? '\n' : '';
    if (fence) {
      if (new RegExp(`^ {0,3}${fence}{${fenceLength},}\\s*$`).test(line)) {
        try {
          const json = body.join('\n');
          if (json.length > 262144) throw Error('reply section exceeds 256 KiB');
          const value: unknown = JSON.parse(json);
          const blocks = Array.isArray(value) ? value : [value];
          const format = parseFormat(JSON.stringify({ version: 1, steps: [{ id: 'reply', title: '', blocks }] }));
          if (result.blocks.length + blocks.length > 100) throw Error('more than 100 reply blocks');
          result.blocks.push(...format.steps[0].blocks);
        } catch (reason) { result.errors.push(`Не удалось прочитать блок JERY: ${String(reason)}`); }
        fence = null; body = [];
      } else body.push(line);
      continue;
    }
    const opening = line.match(/^ {0,3}(`{3,}|~{3,})([^\n]*)$/);
    if (ordinaryFence) {
      result.text += line + newline;
      if (opening && opening[1][0] === ordinaryFence && !opening[2].trim()) ordinaryFence = null;
      continue;
    }
    if (opening && opening[2].trim() === 'mellorin') {
      fence = opening[1][0]; fenceLength = opening[1].length;
      continue;
    }
    // An unfinished opening line must never flash protocol text in the chat.
    if (streaming && i === lines.length - 1 && /^ {0,3}(`{1,}|~{1,})(m(?:e(?:l(?:l(?:o(?:r(?:i(?:n)?)?)?)?)?)?)?)?$/.test(line)) continue;
    if (opening) ordinaryFence = opening[1][0];
    result.text += line + newline;
  }
  if (fence && !streaming) result.errors.push('Незавершённый блок JERY');
  return result;
}
