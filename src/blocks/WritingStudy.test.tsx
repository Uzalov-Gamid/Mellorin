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
import { WritingStudy } from './WritingStudy';
const source = 'Learning/English/writing/process.md';
const fixture = { version: 1, id: 'synthetic-writing', title: 'Synthetic writing', source, target: { min: 100, max: 120, source }, plan: [{ text: 'Опиши вчерашний день', source }], watchOut: [{ text: 'Past Simple', source }], draft: 'Yesterday I walk.', review: { lessonId: 'synthetic-writing', draft: 'Yesterday I walk.', errors: [{ start: 12, end: 16, before: 'walk', after: 'walked', why: 'Вчера: Past Simple.' }], mainErrors: [1] } };
type Props = { children?: ReactNode; onClick?: () => void; onChange?: (e: { target: { value: string } }) => void; disabled?: boolean; role?: string; value?: string; 'aria-label'?: string };
function elements(node: ReactNode): ReactElement<Props>[] { if (Array.isArray(node)) return node.flatMap(elements); if (!node || typeof node !== 'object' || !('props' in node)) return []; const el = node as ReactElement<Props>; return [el, ...elements(el.props.children)]; }
function render() { runtime.cursor = 0; const tree = WritingStudy(); runtime.effects.splice(0).forEach(e => e()); return elements(tree); }
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
function click(label: string) { const b = render().find(e => e.type === 'button' && e.props.children === label)!; expect(b).toBeTruthy(); expect(b.props.disabled).not.toBe(true); b.props.onClick!(); }
function type(value: string) { render().find(e => e.type === 'textarea')!.props.onChange!({ target: { value } }); }
beforeEach(() => { runtime.slots = []; runtime.effects = []; runtime.cleanups = []; runtime.intent.mockReset(); runtime.canSend = true; runtime.intentError = null; runtime.read.mockReset().mockResolvedValue(JSON.stringify(fixture)); });
afterEach(() => { runtime.cleanups.forEach(f => f()); });
it('shows numbered exact review, starts rewrite locally and submits actual original/correction only on click', async () => {
  render(); await flush();
  expect(render().filter(e => e.type === 'mark').map(e => e.props.children)).toEqual(['walk']);
  expect(render().filter(e => e.type === 'sup').map(e => e.props.children)).toEqual([1]);
  expect(runtime.intent).not.toHaveBeenCalled(); click('Дальше: переписать текст ↵');
  expect(render().find(e => e.type === 'textarea')?.props.value).toBe(fixture.draft);
  expect(render().some(e => e.type === 'mark')).toBe(false);
  expect(render().find(e => e.props.children === 'Отправить исправленную версию JERY')?.props.disabled).toBe(true);
  type('Yesterday I walked.'); runtime.canSend = false;
  expect(render().find(e => e.props.children === 'Отправить исправленную версию JERY')?.props.disabled).toBe(true);
  runtime.canSend = true; click('Отправить исправленную версию JERY');
  expect(runtime.intent.mock.calls[0][1]).toEqual({ lessonId: fixture.id, source, originalDraft: fixture.draft, draft: 'Yesterday I walked.' });
});
it('hides stale highlights after edits and never restores them from an old review reload', async () => {
  render(); await flush(); click('Изменить текст'); type(fixture.draft + ' '); click('Вернуться к проверке текста');
  expect(render().some(e => e.type === 'mark')).toBe(false);
  expect(render().some(e => e.props.role === 'status')).toBe(true);
  click('Загрузить разбор JERY'); render(); await flush();
  expect(render().find(e => e.type === 'textarea')?.props.value).toBe(fixture.draft + ' ');
  expect(render().some(e => e.type === 'mark')).toBe(false); expect(runtime.intent).not.toHaveBeenCalled();
  click('Отправить текст на проверку'); expect(runtime.intent.mock.calls[0][1].draft).toBe(fixture.draft + ' ');
  runtime.intentError = 'offline'; expect(render().some(e => e.props.children === 'offline')).toBe(true);
});
it('retains last valid review on malformed reload and preserves rewrite across reload/navigation renders', async () => {
  render(); await flush(); runtime.read.mockResolvedValue('{broken'); click('Загрузить разбор JERY'); render(); await flush();
  expect(render().some(e => e.type === 'mark')).toBe(true); expect(render().some(e => e.props.role === 'alert')).toBe(true);
  click('Дальше: переписать текст ↵'); type('My actual rewrite.');
  for (let i = 0; i < 3; i++) render();
  click('Загрузить разбор JERY'); render(); await flush();
  expect(render().find(e => e.type === 'textarea')?.props.value).toBe('My actual rewrite.'); expect(runtime.intent).not.toHaveBeenCalled();
});
it('does not replace an active draft with a different assignment', async () => {
  render(); await flush(); click('Изменить текст'); type('Keep this draft.');
  runtime.read.mockResolvedValue(JSON.stringify({ ...fixture, id: 'different', review: undefined }));
  click('Загрузить разбор JERY'); render(); await flush();
  expect(render().find(e => e.type === 'textarea')?.props.value).toBe('Keep this draft.');
  expect(render().some(e => e.props.role === 'alert')).toBe(true);
});
it('offers empty-state explicit preparation, then loads assignment without calling JERY', async () => {
  runtime.read.mockRejectedValueOnce(Error('missing')); render(); await flush(); expect(runtime.intent).not.toHaveBeenCalled();
  runtime.canSend = false; expect(render().find(e => e.props.children === 'Запросить задание у JERY')?.props.disabled).toBe(true);
  runtime.canSend = true; click('Запросить задание у JERY'); expect(runtime.intent.mock.calls[0][0]).toContain('Learning/English/writing/process.md');
  click('Загрузить задание'); render(); await flush(); expect(render().some(e => e.type === 'mark')).toBe(true);
  expect(runtime.intent).toHaveBeenCalledTimes(1);
});
