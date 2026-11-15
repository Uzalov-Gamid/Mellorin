import { describe, expect, it } from 'vitest';
import { parseFormat } from './schema';
import builtin from '../../formats/english-reading.json';
const format = (block: unknown) => JSON.stringify({ version: 1, steps: [{ id: 'read', title: 'Read', blocks: [block] }] });
describe('format v1 data validation', () => {
  it('composes the bundled reading from three independent blocks', () => {
    expect(parseFormat(JSON.stringify(builtin)).steps[0].blocks.map(b => b.type)).toEqual(['text', 'phrase-breakdown', 'word-card']);
  });
  it('accepts unknown simple block types and explicit intent only', () => {
    expect(parseFormat(format({ type: 'future-block', props: {}, writeBack: { intent: 'Review' } })).steps[0].blocks[0].type).toBe('future-block');
    for (const writeBack of [{ path: '../private' }, { intent: 'Review', path: 'file' }, 'file', {}]) expect(() => parseFormat(format({ type: 'text', props: {}, writeBack }))).toThrow('writeBack');
  });
  it('rejects malformed, unbounded and recursive data with useful errors', () => {
    expect(() => parseFormat('{')).toThrow();
    expect(() => parseFormat('{"version":2,"steps":[]}')).toThrow('version 1');
    expect(() => parseFormat(format({ type: '../bad', props: {} }))).toThrow('simple type');
    expect(() => parseFormat(format({ type: 'text', props: { text: 'a'.repeat(20001) } }))).toThrow('string');
    expect(() => parseFormat(format({ type: 'text', props: { items: Array(101).fill('a') } }))).toThrow('100 entries');
    let deep: unknown = 'a'; for (let i = 0; i < 10; i++) deep = { nested: deep };
    expect(() => parseFormat(format({ type: 'text', props: { deep } }))).toThrow('deep');
    expect(() => parseFormat(' '.repeat(262145))).toThrow('256 KiB');
  });
});
