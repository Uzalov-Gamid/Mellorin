import { describe, it, expect } from 'vitest';
import { parseReply } from '../blocks/protocol';
import { exactDiff, parseChange } from './proposal';
const format = JSON.stringify({ version: 1, steps: [{ id: 'read', title: '', blocks: [] }] });
const proposal = { target: 'formats/english-reading.json', before: format, after: format, process: 'Learning/English/Reading/process.md', process_before: null, rule: 'Number sentences' };
describe('format change protocol', () => {
  it('parses every streaming boundary without exposing proposal text', () => {
    const source = '```mellorin-change\n' + JSON.stringify(proposal) + '\n```';
    for (let i=0;i<=source.length;i++) expect(parseReply(source.slice(0,i),true).text).toBe('');
    expect(parseReply(source).changes).toEqual([proposal]);
    expect(parseReply(source.slice(0,-3)).errors).toHaveLength(1);
  });
  it('rejects unsafe paths, invalid formats, extra fields and executable writeback', () => {
    for (const bad of [{...proposal,target:'../x'}, {...proposal,process:'Learning/Other/Reading/process.md'}, {...proposal,after:'{}'}, {...proposal,code:'run'}, {...proposal,rule:'<!-- mellorin:end -->'}]) expect(() => parseChange(bad)).toThrow();
  });
  it('shows exact final newline differences and missing files', () => {
    expect(exactDiff('a','a\n','x')).toContain('-a\n\\ No newline at end of file\n+a\n');
    expect(exactDiff(null,'a\n','x')).toContain('--- /dev/null\n+++ x\n@@ -0,0 +1,1 @@\n+a\n');
  });
});
