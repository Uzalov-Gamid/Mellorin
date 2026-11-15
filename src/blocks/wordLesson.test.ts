import { expect, it } from 'vitest';
import { normalizeDictation, parseWordLesson, studyKey } from './wordLesson';
function fixture() {
  const choice = { choices: ['one', 'two', 'three', 'four'], answer: 0 };
  return { version: 1, id: 'synthetic', preparedOn: '2026-11-15', words: Array.from({ length: 10 }, (_, i) => ({ word: `word${i}`, translation: `перевод${i}`, source: i % 2 ? 'vocabulary/mywords-list.md' : 'Learning/English/vocabulary/mywords-list.md', status: 'focus', translationChoice: choice, sentenceGap: { ...choice, sentence: 'A ___ here.' }, reverseTranslation: choice, dictation: [`word${i}`] })) };
}
it('accepts ten sourced words with optional provenance omitted', () => {
  expect(parseWordLesson(JSON.stringify(fixture())).words).toHaveLength(10);
});
it('rejects malformed, oversized, duplicate, missing and unsafe lesson data', () => {
  for (const edit of [
    (v: any) => { v.version = 2; },
    (v: any) => { v.words.pop(); },
    (v: any) => { v.words[1].word = 'WORD0'; },
    (v: any) => { v.words[0].source = '../secret'; },
    (v: any) => { v.preparedOn = '2026-02-30'; },
    (v: any) => { v.words[0].translationChoice.answer = 4; },
    (v: any) => { v.words[0].translationChoice.choices = ['same','same','x','y']; },
    (v: any) => { v.words[0].sentenceGap.sentence = 'no gap'; },
    (v: any) => { v.words[0].dictation = []; },
    (v: any) => { v.words[0] = null; },
  ]) { const value = fixture(); edit(value); expect(() => parseWordLesson(JSON.stringify(value))).toThrow(); }
  expect(() => parseWordLesson('{')).toThrow();
  expect(() => parseWordLesson(' '.repeat(131073))).toThrow('128 KiB');
});
it('normalizes dictation without accepting a different spelling', () => {
  expect(normalizeDictation('  HELLO   World ')).toBe('hello world');
  expect(normalizeDictation('words!')).not.toBe(normalizeDictation('words'));
});
it('guards keyboard input and maps the four Cyrillic answers', () => {
  const event = (key: string, rest = {}) => ({ key, target: null, ...rest }) as KeyboardEvent;
  expect(['а','б','в','г'].map(k => studyKey(event(k)))).toEqual([0,1,2,3]);
  expect(studyKey(event('Enter'))).toBe('next');
  for (const rest of [{ isComposing: true }, { repeat: true }, { ctrlKey: true }, { metaKey: true }, { altKey: true }, { target: { closest: () => ({}) } }]) expect(studyKey(event('а', rest))).toBeNull();
  expect(studyKey(event('x'))).toBeNull();
});
