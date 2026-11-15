export type Data = null | boolean | number | string | Data[] | { [key: string]: Data };
export interface Block { type: string; props: Record<string, Data>; writeBack?: { intent: string } }
export interface Format { version: 1; steps: { id: string; title: string; blocks: Block[] }[] }
export const simpleName = (s: string) => /^[a-z][a-z0-9-]{0,63}$/.test(s);
export function parseFormat(source: string): Format {
  if (source.length > 262144) throw Error('format: exceeds 256 KiB');
  const value: unknown = JSON.parse(source);
  let nodes = 0;
  function bounded(v: unknown, depth = 0): void {
    if (++nodes > 10000 || depth > 8) throw Error('format: structure too large or deep');
    if (typeof v === 'string' && v.length > 20000) throw Error('format: string exceeds 20000 characters');
    if (typeof v === 'number' && !Number.isFinite(v)) throw Error('format: invalid number');
    if (v && typeof v === 'object') {
      if (Object.keys(v).length > 100) throw Error('format: collection exceeds 100 entries');
      Object.values(v).forEach(item => bounded(item, depth + 1));
    }
  }
  bounded(value);
  const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
  if (!object(value) || value.version !== 1 || !Array.isArray(value.steps) || !value.steps.length) throw Error('format: expected version 1 and nonempty steps');
  const ids = new Set<string>();
  value.steps.forEach((step, i) => {
    if (!object(step) || typeof step.id !== 'string' || !simpleName(step.id) || ids.has(step.id) || typeof step.title !== 'string' || !Array.isArray(step.blocks)) throw Error(`steps[${i}]: expected unique simple id, title, blocks`);
    ids.add(step.id);
    step.blocks.forEach((block, j) => {
      const path = `steps[${i}].blocks[${j}]`;
      if (!object(block) || typeof block.type !== 'string' || !simpleName(block.type) || !object(block.props)) throw Error(`${path}: expected simple type and props object`);
      if (block.writeBack !== undefined && (!object(block.writeBack) || Object.keys(block.writeBack).join() !== 'intent' || typeof block.writeBack.intent !== 'string' || !block.writeBack.intent.trim() || block.writeBack.intent.length > 500)) throw Error(`${path}.writeBack: only a nonempty intent (max 500) is allowed; no paths`);
    });
  });
  return value as unknown as Format;
}
