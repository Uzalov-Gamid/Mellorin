import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import type { ReactElement, ReactNode } from 'react';
const runtime = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, effects: [] as (() => void)[], cleanups: [] as (() => void)[], read: vi.fn(), intent: vi.fn(), canSend: true, intentError: null as string | null }));
vi.mock('../learning', () => ({ vaultReadText: runtime.read }));
vi.mock('./context', () => ({ useBlocks: () => ({ intent: runtime.intent, canSend: runtime.canSend, intentError: runtime.intentError }) }));
vi.mock('react', async original => ({ ...await original<typeof import('react')>(),
  useState: (initial: unknown) => { const i = runtime.cursor++; if (!(i in runtime.slots)) runtime.slots[i] = initial; return [runtime.slots[i], (next: unknown) => { runtime.slots[i] = typeof next === 'function' ? next(runtime.slots[i]) : next; }]; },
  useRef: (initial: unknown) => { const i = runtime.cursor++; if (!(i in runtime.slots)) runtime.slots[i] = { current: initial }; return runtime.slots[i]; },
  useEffect: (effect: () => void | (() => void), deps?: unknown[]) => { const i = runtime.cursor++; const old = runtime.slots[i] as unknown[] | undefined; if (!deps || !old || deps.some((v, j) => v !== old[j])) { runtime.cleanups[i]?.(); runtime.effects.push(() => { const cleanup = effect(); if (cleanup) runtime.cleanups[i] = cleanup; }); } runtime.slots[i] = deps; },
}));
import { WordStudy } from './WordStudy';
const choice = { choices: ['one', 'two', 'three', 'four'], answer: 0 };
const lesson = { version: 1, id: 'synthetic', preparedOn: '2026-11-15', words: Array.from({ length: 10 }, (_, i) => ({ word: `word${i}`, translation: `перевод${i}`, source: 'vocabulary/mywords-list.md', status: 'focus', translationChoice: choice, sentenceGap: { ...choice, sentence: 'A ___ here.' }, reverseTranslation: choice, dictation: [`word${i}`] })) };
type Props = { children?: ReactNode; onClick?: () => void; onChange?: (e: { target: { value: string } }) => void; onSubmit?: (e: { preventDefault: () => void }) => void; disabled?: boolean; role?: string; className?: string; ref?: { current: unknown } };
function elements(node: ReactNode): ReactElement<Props>[] { if (Array.isArray(node)) return node.flatMap(elements); if (!node || typeof node !== 'object' || !('props' in node)) return []; const el = node as ReactElement<Props>; return [el, ...elements(el.props.children)]; }
let hidden = false;
function render() { runtime.cursor = 0; const tree = WordStudy(); (tree as unknown as { ref: { current: unknown } }).ref.current = { closest: () => hidden ? {} : null, contains: () => false }; runtime.effects.splice(0).forEach(e => e()); return elements(tree); }
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
function click(label: string) { const button = render().find(e => e.type === 'button' && e.props.children === label)!; expect(button).toBeTruthy(); expect(button.props.disabled).not.toBe(true); button.props.onClick!(); }
beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('window', new EventTarget()); hidden = false; runtime.slots = []; runtime.effects = []; runtime.cleanups = []; runtime.intent.mockReset(); runtime.canSend = true; runtime.intentError = null; runtime.read.mockReset().mockResolvedValue(JSON.stringify(lesson)); });
afterEach(() => { runtime.cleanups.forEach(f => f()); vi.useRealTimers(); vi.unstubAllGlobals(); });
it('completes cards and all quiz rounds; sends forty actual outcomes only on explicit submission', async () => {
  render(); await flush(); expect(runtime.intent).not.toHaveBeenCalled();
  for (let i = 0; i < 10; i++) { expect(render().find(e => e.props.children === 'Дальше ↵')?.props.disabled).toBe(true); click('Показать перевод'); click('Дальше ↵'); }
  for (let stage = 1; stage <= 3; stage++) for (let i = 0; i < 10; i++) {
    const options = render().filter(e => e.type === 'button' && Array.isArray(e.props.children) && e.props.children.includes(' · '));
    options[i === 0 ? 1 : 0].props.onClick!();
    expect(render().some(e => e.props.className === 'words-wrong')).toBe(i === 0);
    click('Дальше ↵');
  }
  for (let i = 0; i < 10; i++) {
    expect(render().some(e => e.type === 'a')).toBe(false);
    render().find(e => e.type === 'input')!.props.onChange!({ target: { value: ` WORD${i} ` } });
    render().find(e => e.type === 'form')!.props.onSubmit!({ preventDefault() {} }); click('Дальше ↵');
  }
  expect(runtime.intent).not.toHaveBeenCalled();
  runtime.canSend = false;
  expect(render().find(e => e.props.children === 'Отправить результат JERY')?.props.disabled).toBe(true);
  runtime.canSend = true;
  click('Отправить результат JERY');
  const payload = runtime.intent.mock.calls[0][1];
  expect(payload.lessonId).toBe('synthetic'); expect(payload.outcomes).toHaveLength(40);
  expect(payload.outcomes.filter((o: {correct: boolean}) => o.correct)).toHaveLength(37);
  expect(render().find(e => e.props.children === 'Результат передан JERY')?.props.disabled).toBe(true);
  vi.advanceTimersByTime(20000); await flush(); expect(runtime.read).toHaveBeenCalledTimes(1);
});
it('keeps last valid lesson on malformed refresh and provides explicit preparation for missing data', async () => {
  runtime.read.mockRejectedValueOnce(Error('missing')); render(); await flush();
  expect(render().some(e => e.props.role === 'alert')).toBe(true);
  expect(runtime.intent).not.toHaveBeenCalled(); click('Подготовить урок с JERY'); expect(runtime.intent).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(5000); await flush(); expect(render().some(e => e.props.children === 'word0')).toBe(true);
  runtime.read.mockResolvedValue('{broken'); vi.advanceTimersByTime(5000); await flush();
  expect(render().some(e => e.props.children === 'word0')).toBe(true); expect(render().some(e => e.props.role === 'alert')).toBe(true);
});
it('handles unavailable speech and ignores keys on hidden panels', async () => {
  render(); await flush(); click('▸ слушать');
  expect(render().some(e => String(e.props.children).includes('Произношение недоступно'))).toBe(true);
  click('Показать перевод'); hidden = true;
  const key = new Event('keydown'); Object.defineProperty(key, 'key', { value: 'Enter' }); window.dispatchEvent(key);
  expect(render().some(e => e.props.children === 'word0')).toBe(true);
  hidden = false; window.dispatchEvent(key);
  expect(render().some(e => e.props.children === 'word1')).toBe(true);
});

it('does not advance Words when Enter targets a button outside the lesson', async () => {
  render(); await flush(); click('Показать перевод');
  const event = new Event('keydown');
  Object.defineProperty(event, 'key', { value: 'Enter' });
  Object.defineProperty(event, 'target', { value: { closest: () => ({}) } });
  window.dispatchEvent(event);
  expect(render().some(e => e.props.children === 'word0')).toBe(true);
});
