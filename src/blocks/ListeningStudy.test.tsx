import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import type { ReactElement, ReactNode } from 'react';
const runtime = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, effects: [] as (() => void)[], cleanups: [] as (() => void)[], read: vi.fn(), list: vi.fn(), intent: vi.fn(), canSend: true, intentError: null as string | null }));
vi.mock('../learning', () => ({ vaultReadText: runtime.read, vaultList: runtime.list }));
vi.mock('./context', () => ({ useBlocks: () => ({ intent: runtime.intent, canSend: runtime.canSend, intentError: runtime.intentError }) }));
vi.mock('react', async original => ({ ...await original<typeof import('react')>(),
  useState: (initial: unknown) => { const i = runtime.cursor++; if (!(i in runtime.slots)) runtime.slots[i] = initial; return [runtime.slots[i], (next: unknown) => { runtime.slots[i] = typeof next === 'function' ? next(runtime.slots[i]) : next; }]; },
  useRef: (initial: unknown) => { const i = runtime.cursor++; if (!(i in runtime.slots)) runtime.slots[i] = { current: initial }; return runtime.slots[i]; },
  useEffect: (effect: () => void | (() => void), deps?: unknown[]) => { const i = runtime.cursor++; const old = runtime.slots[i] as unknown[] | undefined; if (!deps || !old || deps.some((v, j) => v !== old[j])) { runtime.cleanups[i]?.(); runtime.effects.push(() => { const cleanup = effect(); if (cleanup) runtime.cleanups[i] = cleanup; }); } runtime.slots[i] = deps; },
}));
import { ListeningLesson } from './ListeningStudy';
const lesson = { version: 1, id: 'fixture', title: 'Fixture', source: 'Learning/English/listening/fixture.md', audioUrl: 'http://127.0.0.1:8765/tone.wav', questions: ['One?', 'Two?', 'Three?'], script: 'SECRET transcript.' };
type Props = { children?: ReactNode; onClick?: () => void; onChange?: (e: { target: { value: string } }) => void; disabled?: boolean; role?: string; src?: string; preload?: string; controls?: boolean; ref?: { current: unknown } };
function elements(node: ReactNode): ReactElement<Props>[] { if (Array.isArray(node)) return node.flatMap(elements); if (!node || typeof node !== 'object' || !('props' in node)) return []; const el = node as ReactElement<Props>; return [el, ...elements(el.props.children)]; }
function render() { runtime.cursor = 0; const tree = ListeningLesson(); runtime.effects.splice(0).forEach(e => e()); return elements(tree); }
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
function click(label: string) { const b = render().find(e => e.type === 'button' && e.props.children === label)!; expect(b).toBeTruthy(); expect(b.props.disabled).not.toBe(true); b.props.onClick!(); }
beforeEach(() => { runtime.slots = []; runtime.effects = []; runtime.cleanups = []; runtime.intent.mockReset(); runtime.canSend = true; runtime.intentError = null; runtime.read.mockReset().mockResolvedValue(JSON.stringify(lesson)); runtime.list.mockReset().mockResolvedValue([]); });
afterEach(() => { runtime.cleanups.forEach(f => f()); });
it('gates transcript until step four, uses real native media controls and speed, and removes audio for reading', async () => {
  render(); await flush();
  for (let i = 0; i < 3; i++) { expect(render().some(e => e.props.children === lesson.script)).toBe(false); if (i < 2) click('Дальше'); }
  const media = render().find(e => e.type === 'audio')!;
  expect(media.props).toMatchObject({ controls: true, preload: 'none', src: lesson.audioUrl });
  const native = { playbackRate: 1, pause: vi.fn() }; (media as unknown as { ref: { current: unknown } }).ref.current = native;
  render().find(e => e.type === 'select')!.props.onChange!({ target: { value: '1.5' } }); expect(native.playbackRate).toBe(1.5);
  click('Дальше'); expect(render().some(e => e.props.children === lesson.script)).toBe(true); expect(native.pause).toHaveBeenCalled();
  click('Дальше'); expect(render().some(e => e.type === 'audio')).toBe(false);
  expect(runtime.intent).not.toHaveBeenCalled();
});
it('sends answers, retelling and words only on explicit ready clicks', async () => {
  render(); await flush(); click('Дальше');
  render().filter(e => e.type === 'textarea').forEach((e, i) => e.props.onChange!({ target: { value: `answer ${i}` } })); click('Дальше');
  runtime.canSend = false; expect(render().find(e => e.props.children === 'Отправить ответы JERY')!.props.disabled).toBe(true);
  runtime.canSend = true; click('Отправить ответы JERY'); expect(runtime.intent.mock.calls[0][1].answers).toEqual(['answer 0', 'answer 1', 'answer 2']);
  click('Дальше'); click('Дальше'); click('Дальше');
  render().filter(e => e.type === 'textarea').forEach((e, i) => e.props.onChange!({ target: { value: `Sentence ${i}.` } })); click('Отправить пересказ JERY');
  click('Дальше'); render().find(e => e.type === 'textarea')!.props.onChange!({ target: { value: 'fixture' } }); click('Отправить слова JERY');
  expect(runtime.intent).toHaveBeenCalledTimes(3); runtime.intentError = 'offline'; expect(render().some(e => e.props.children === 'offline')).toBe(true);
});
it('freezes loaded lesson, retains it on invalid reload, and shows missing-file preparation', async () => {
  render(); await flush(); runtime.read.mockResolvedValue('{broken'); render(); expect(runtime.read).toHaveBeenCalledTimes(1);
  click('Загрузить готовый урок'); render(); await flush(); expect(render().some(e => Array.isArray(e.props.children) && e.props.children.includes(' › Fixture'))).toBe(true); expect(render().some(e => e.props.role === 'alert')).toBe(true);
  expect(runtime.intent).not.toHaveBeenCalled();
});
it('offers explicit preparation without automatic model calls for missing files', async () => {
  runtime.read.mockRejectedValue(Error('missing')); render(); await flush(); expect(render().some(e => e.props.role === 'alert')).toBe(true); expect(runtime.intent).not.toHaveBeenCalled(); click('Подготовить урок с JERY'); expect(runtime.intent).toHaveBeenCalledTimes(1);
});
it('uses source practice flags and sends past source only on click', async () => {
  runtime.list.mockResolvedValue([{ name: 'fixture.md', is_dir: false }, { name: 'process.md', is_dir: false }, { name: '../secret.md', is_dir: false }]);
  runtime.read.mockImplementation((path: string) => Promise.resolve(path === lesson.source ? '---\ntitle: Past fixture\npractice: false\n---\nOld text' : JSON.stringify(lesson)));
  render(); await flush(); expect(render().some(e => e.props.children === '○ хвост')).toBe(true); expect(runtime.intent).not.toHaveBeenCalled();
  click('Past fixture'); expect(runtime.intent.mock.calls[0][1]).toEqual({ source: lesson.source });
  expect(runtime.read.mock.calls.map(c => c[0])).toEqual(['.mellorin/english-listening.json', lesson.source]);
});

it('resets native position and rate when a valid lesson is reloaded with the same audio URL', async () => {
  render(); await flush();
  const media = render().find(e => e.type === 'audio')!;
  const native = { playbackRate: 1.5, readyState: 1, currentTime: 12, pause: vi.fn() };
  (media as unknown as { ref: { current: unknown } }).ref.current = native;
  click('Загрузить готовый урок'); render(); await flush();
  expect(native.playbackRate).toBe(1); expect(native.currentTime).toBe(0); expect(native.pause).toHaveBeenCalled();
});
