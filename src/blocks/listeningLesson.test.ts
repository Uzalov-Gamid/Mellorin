import { expect, it } from 'vitest';
import { parseListeningLesson, pastListening, listeningSource } from './listeningLesson';
export const fixture = { version: 1, id: 'synthetic', title: 'Synthetic lesson', source: 'Learning/English/listening/synthetic.md', audioUrl: 'http://127.0.0.1:8765/tone.wav', questions: ['Question one?', 'Question two?', 'Question three?'], script: 'SECRET transcript.' };
it('accepts a bounded sourced lesson and local synthetic audio', () => {
  expect(parseListeningLesson(JSON.stringify(fixture))).toEqual(fixture);
});
it('rejects malformed, unsafe and incomplete lessons', () => {
  for (const change of [{ version: 2 }, { source: '../secret.md' }, { source: 'Learning/English/listening/../secret.md' }, { audioUrl: 'file:///tmp/audio.wav' }, { audioUrl: 'https://user:pass@example.com/a' }, { questions: ['one'] }, { script: '' }, { script: 'a'.repeat(60001) }]) expect(() => parseListeningLesson(JSON.stringify({ ...fixture, ...change }))).toThrow();
  for (const text of ['', '{broken', 'null', 'a'.repeat(131073)]) expect(() => parseListeningLesson(text)).toThrow();
  expect(listeningSource('Learning/English/listening/../../x.md')).toBe(false);
});
it('reads actual boolean practice without inventing completion', () => {
  expect(pastListening(fixture.source, '---\ntitle: A real title\npractice: true\n---\nText')).toMatchObject({ title: 'A real title', practice: true });
  expect(pastListening(fixture.source, '---\npractice: false\n---\nText').practice).toBe(false);
  expect(pastListening(fixture.source, 'practice: true').practice).toBeNull();
  expect(pastListening(fixture.source, '---\npractice: "true"\n---\n').practice).toBeNull();
});
