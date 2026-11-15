import { expect, it } from 'vitest';
import { boundReview, parseWritingLesson, wordCount, writingSource } from './writingLesson';
const source = 'Learning/English/writing/process.md';
export const fixture = { version: 1, id: 'synthetic-writing', title: 'Synthetic writing', source, target: { min: 100, max: 120, source }, plan: [{ text: 'Опиши вчерашний день', source }], watchOut: [{ text: 'Past Simple', source }], draft: 'Yesterday I walk.', review: { lessonId: 'synthetic-writing', draft: 'Yesterday I walk.', errors: [{ start: 12, end: 16, before: 'walk', after: 'walked', why: 'Вчера: Past Simple.' }], mainErrors: [1] } };
it('binds review to exact draft, including whitespace, case and newlines', () => {
  const lesson = parseWritingLesson(JSON.stringify(fixture));
  expect(boundReview(lesson, fixture.draft)?.errors[0].before).toBe('walk');
  for (const draft of [fixture.draft + ' ', fixture.draft + '\n', fixture.draft.toLowerCase(), 'Yesterday I walked.']) expect(boundReview(lesson, draft)).toBeUndefined();
  expect(boundReview({ ...lesson, id: 'another' }, fixture.draft)).toBeUndefined();
  expect(boundReview(null, fixture.draft)).toBeUndefined();
});
it('rejects mismatched quotes, overlapping or out-of-range spans, foreign ids and invalid main errors', () => {
  for (const patch of [
    { lessonId: 'other' }, { errors: [{ ...fixture.review.errors[0], before: 'Walk' }] },
    { errors: [{ ...fixture.review.errors[0], start: -1 }] }, { errors: [{ ...fixture.review.errors[0], end: 500 }] },
    { errors: [fixture.review.errors[0], fixture.review.errors[0]] },
    { mainErrors: [] }, { mainErrors: [2] }, { mainErrors: [1, 1] }, { errors: [], mainErrors: [1] },
  ]) expect(() => parseWritingLesson(JSON.stringify({ ...fixture, review: { ...fixture.review, ...patch } }))).toThrow();
  expect(parseWritingLesson(JSON.stringify({ ...fixture, review: { ...fixture.review, errors: [], mainErrors: [] } })).review?.errors).toEqual([]);
});
it('uses UTF-16 ranges and handles repeated words without guessing the location', () => {
  const draft = '𐐀 walk, walk.';
  const lesson = parseWritingLesson(JSON.stringify({ ...fixture, draft, review: { ...fixture.review, draft, errors: [{ ...fixture.review.errors[0], start: 9, end: 13 }] } }));
  expect(lesson.review?.errors[0].start).toBe(9);
});
it('bounds structures, requires sourced instructions and rejects traversal', () => {
  for (const patch of [null, [], { ...fixture, target: { min: 0, max: 120, source } }, { ...fixture, target: { min: 100, max: 10, source } }, { ...fixture, plan: [] }, { ...fixture, watchOut: [{ text: 'x', source: '../process.md' }] }, { ...fixture, draft: 'a'.repeat(20001) }, { ...fixture, review: null }]) expect(() => parseWritingLesson(JSON.stringify(patch))).toThrow();
  for (const path of ['Learning/English/writing/../process.md', 'Learning/English/writing/..\\process.md', 'Learning/English/writing/x\n.md', '/Learning/English/writing/process.md']) expect(writingSource(path)).toBe(false);
  expect(() => parseWritingLesson(' '.repeat(131073))).toThrow();
  expect(() => parseWritingLesson('{broken')).toThrow();
  const lesson = parseWritingLesson(JSON.stringify({ ...fixture, arbitraryHTML: '<script>x</script>' }));
  expect(lesson).not.toHaveProperty('arbitraryHTML');
});
it('counts actual Unicode words with contractions and hyphens', () => {
  expect(wordCount('')).toBe(0); expect(wordCount('  Hello,\nworld!  ')).toBe(2);
  expect(wordCount("I don't like phone-free mornings. 123 Привет.")).toBe(7);
});
