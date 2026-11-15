import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import type { ReactElement, ReactNode } from 'react';
const runtime = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, effects: [] as (() => void)[], cleanups: [] as (() => void)[], invoke: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: runtime.invoke }));
vi.mock('react', async original => ({ ...await original<typeof import('react')>(),
  useContext: () => ({ message: '', data: null, intent: vi.fn() }),
  useState: (initial: unknown) => { const i = runtime.cursor++; if (!(i in runtime.slots)) runtime.slots[i] = initial; return [runtime.slots[i], (next: unknown) => { runtime.slots[i] = typeof next === 'function' ? next(runtime.slots[i]) : next; }]; },
  useRef: (initial: unknown) => { const i = runtime.cursor++; if (!(i in runtime.slots)) runtime.slots[i] = { current: initial }; return runtime.slots[i]; },
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => { const i = runtime.cursor++; const old = runtime.slots[i] as unknown[] | undefined; if (!old || deps.some((v, j) => v !== old[j])) { runtime.cleanups[i]?.(); runtime.effects.push(() => { const cleanup = effect(); if (cleanup) runtime.cleanups[i] = cleanup; }); } runtime.slots[i] = deps; },
}));
import { FormatScreen } from './FormatScreen';
import { ReadingText, ReadingPhrases, ReadingWord, WordPopup } from '../TextViewer';
import { BlockView } from './index';
import type { BlockContextValue } from './context';
import builtin from '../../formats/english-reading.json';
type Props = { children?: ReactNode; onClick?: (e: { stopPropagation: () => void }) => void; onChange?: (e: { target: { value: string } }) => void; 'aria-label'?: string; block?: { type: string } };
function elements(node: ReactNode): ReactElement<Props>[] { if (Array.isArray(node)) return node.flatMap(elements); if (!node || typeof node !== 'object' || !('props' in node)) return []; const el = node as ReactElement<Props>; return [el, ...elements(el.props.children)]; }
function render() { runtime.cursor = 0; const tree = FormatScreen({}); runtime.effects.splice(0).forEach(e => e()); return tree; }
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('window', new EventTarget()); runtime.slots = []; runtime.cleanups = []; runtime.effects = []; runtime.invoke.mockReset(); });
afterEach(() => { runtime.cleanups.forEach(f => f()); vi.useRealTimers(); vi.unstubAllGlobals(); });
it('polls layout without losing pasted reading, selected sentence or selected word; deduplicates requests', async () => {
  let source = JSON.stringify(builtin);
  runtime.invoke.mockImplementation((command: string) => {
    if (command === 'vault_read_text') return Promise.resolve(source);
    if (command === 'explain_sentence') return Promise.resolve({ phrases: [{ text: 'Hello world.', ru: 'Привет мир.' }] });
    return Promise.resolve();
  });
  render(); await flush();
  let tree = render(); let context = tree.props.value as BlockContextValue;
  elements(ReadingText(context.reading, false)).find(e => e.type === 'textarea')!.props.onChange!({ target: { value: 'Hello world.' } });
  context = render().props.value;
  elements(ReadingText(context.reading, false)).find(e => e.props.children === 'Читать →')!.props.onClick!({ stopPropagation() {} });
  context = render().props.value;
  const text = ReadingText(context.reading, false);
  elements(text).find(e => e.props['aria-label'] === 'Разобрать предложение 1')!.props.onClick!({ stopPropagation() {} });
  elements(text).find(e => e.props.children === 'Hello')!.props.onClick!({ stopPropagation() {} });
  render(); await flush(); context = render().props.value;
  expect(context.reading.explanation?.phrases[0].ru).toBe('Привет мир.');
  expect(ReadingPhrases(context.reading)).toBeTruthy();
  expect(elements(ReadingText(context.reading, false)).some(e => e.type === WordPopup)).toBe(false);
  expect(ReadingWord(context.reading)?.type).toBe(WordPopup);
  source = JSON.stringify({ version: 1, steps: [{ id: 'reading', title: 'Updated', blocks: [...builtin.steps[0].blocks, { type: 'future-block', props: {} }, { type: 'future-block', props: {} }] }] });
  window.dispatchEvent(new Event('mellorin-format-changed')); await flush(); render(); await flush();
  tree = render(); context = tree.props.value;
  expect(context.reading.text).toBe('Hello world.'); expect(context.reading.editing).toBe(false); expect(context.reading.selected).toBe(0); expect(context.reading.popup).not.toBeNull();
  expect(elements(tree).filter(e => e.type === BlockView)).toHaveLength(5);
  expect(runtime.invoke.mock.calls.filter(([command]) => command === 'format_request_block')).toHaveLength(1);
  vi.advanceTimersByTime(5000); await flush(); render(); await flush();
  expect(runtime.invoke.mock.calls.filter(([command]) => command === 'format_request_block')).toHaveLength(1);
  source = '{broken'; vi.advanceTimersByTime(5000); await flush(); tree = render();
  expect(elements(tree).some(e => e.props.children && String(e.props.children).includes('Не удалось прочитать формат'))).toBe(true);
  expect(elements(tree).filter(e => e.type === BlockView)).toHaveLength(5);
  runtime.cleanups.forEach(f => f()); expect(vi.getTimerCount()).toBe(0);
});
it('keeps bundled reading available with clear seed/read errors', async () => {
  runtime.invoke.mockRejectedValue(Error('synthetic failure'));
  render(); await flush(); const tree = render();
  expect(elements(tree).filter(e => e.type === BlockView).map(e => e.props.block?.type)).toEqual(['text', 'phrase-breakdown', 'word-card']);
  expect(elements(tree).some(e => String(e.props.children).includes('Не удалось подготовить формат'))).toBe(true);
});
