import { describe, expect, it } from 'vitest';
import { parseReply } from './protocol';
const block = { type: 'quiz', props: { question: 'Перевод?', choices: ['берег', 'банк'] } };
const fence = '```mellorin\n' + JSON.stringify(block) + '\n```';
describe('JERY reply protocol', () => {
  it('extracts one block or a list while preserving surrounding text', () => {
    expect(parseReply('До\n' + fence + '\nПосле')).toEqual({ text: 'До\nПосле', blocks: [block], errors: [] });
    expect(parseReply('```mellorin\n' + JSON.stringify([block, block]) + '\n```').blocks).toEqual([block, block]);
  });
  it('handles every partial streaming boundary without exposing JSON', () => {
    const reply = 'До\n' + fence + '\nПосле';
    for (let i = 0; i <= reply.length; i++) {
      const partial = parseReply(reply.slice(0, i), true);
      expect(partial.text).not.toContain('mellorin');
      expect(partial.text).not.toContain('question');
      expect(partial.errors).toEqual([]);
      expect(partial.blocks.length).toBe(i >= reply.indexOf('\nПосле') ? 1 : 0);
    }
  });
  it('preserves ordinary code and protocol examples nested in code', () => {
    const text = '```text\n' + fence + '\n```\nnormal';
    expect(parseReply(text).text).toBe(text);
    expect(parseReply(text).blocks).toEqual([]);
  });
  it('reports malformed, truncated, oversized and unsafe blocks without leaking JSON', () => {
    for (const body of ['invalid', JSON.stringify({ type: '../escape', props: {} }), JSON.stringify({ ...block, writeBack: { path: '/tmp/x' } }), JSON.stringify({ type: 'text', props: { text: 'x'.repeat(20001) } })]) {
      const reply = parseReply('```mellorin\n' + body + '\n```');
      expect(reply.blocks).toEqual([]); expect(reply.errors).toHaveLength(1); expect(reply.text).toBe('');
    }
    expect(parseReply('```mellorin\n{}').errors).toHaveLength(1);
  });
  it('handles CRLF, tilde fences, multiple blocks and normal inline text', () => {
    expect(parseReply(fence.split('\n').join('\r\n')).blocks).toEqual([block]);
    expect(parseReply(fence.split('```').join('~~~') + '\n' + fence).blocks).toEqual([block, block]);
    expect(parseReply('say mellorin {hello}').text).toBe('say mellorin {hello}');
  });
});
