import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const runtime = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, effects: [] as (() => void | (() => void))[], cleanups: [] as (() => void)[], intent: vi.fn() }));
vi.mock('react', async original => ({ ...await original<typeof import('react')>(),
  useState: (initial: unknown) => { const i = runtime.cursor++; if (!(i in runtime.slots)) runtime.slots[i] = initial; return [runtime.slots[i], (next: unknown) => { runtime.slots[i] = typeof next === 'function' ? next(runtime.slots[i]) : next; }]; },
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => { const i = runtime.cursor++; const old = runtime.slots[i] as unknown[] | undefined; if (!old || deps.some((v, j) => v !== old[j])) { runtime.cleanups[i]?.(); runtime.effects.push(() => { const cleanup = effect(); if (cleanup) runtime.cleanups[i] = cleanup; }); } runtime.slots[i] = deps; },
}));
vi.mock('./context', () => ({ useBlocks: () => ({ message: '<script>JERY</script>', intent: runtime.intent }) }));
import { BlockView, PlainText, safeAudio } from './index';
import type { Block } from './schema';
type Props = { children?: ReactNode; onClick?: () => void; onChange?: (e: { target: { value?: string; checked?: boolean } }) => void; checked?: boolean; value?: string };
function elements(node: ReactNode): ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== 'object' || !('props' in node)) return [];
  const el = node as ReactElement<Props>; return [el, ...elements(el.props.children)];
}
function render(block: Block) { runtime.cursor = 0; const tree = BlockView({ block }); runtime.effects.splice(0).forEach(e => e()); return tree; }
function click(tree: ReactNode, text: string) { const element = elements(tree).find(e => e.props.children === text); expect(element).toBeDefined(); element!.props.onClick!(); }
const block = (type: string, props: Block['props'] = {}): Block => ({ type, props });
beforeEach(() => { runtime.slots = []; runtime.cleanups = []; runtime.effects = []; runtime.intent.mockReset(); });
afterEach(() => { runtime.cleanups.forEach(f => f()); vi.useRealTimers(); });
describe('interactive blocks', () => {
  it('reveals flashcards only after a click', () => {
    const b = block('flashcard', { front: 'Question', back: 'Secret' });
    expect(renderToStaticMarkup(render(b))).not.toContain('Secret');
    click(render(b), 'Показать ответ'); expect(renderToStaticMarkup(render(b))).toContain('Secret');
  });
  it('gives quiz feedback and sends an intent only on explicit click', () => {
    const b = { ...block('quiz', { question: 'Choose', choices: ['yes', 'no'], answer: 'yes' }), writeBack: { intent: 'Review' } };
    click(render(b), 'no'); expect(renderToStaticMarkup(render(b))).toContain('Попробуйте ещё раз');
    click(render(b), 'yes'); expect(renderToStaticMarkup(render(b))).toContain('Верно');
    expect(runtime.intent).not.toHaveBeenCalled();
    elements(render(b)).filter(e => e.props.onClick).slice(-1)[0].props.onClick!();
    expect(runtime.intent).toHaveBeenCalledWith('Review', expect.objectContaining({ answer: 'yes' }));
  });
  it('edits code without executing it and toggles checkboxes', () => {
    const code = block('code', { label: 'Query' });
    elements(render(code)).find(e => e.type === 'textarea')!.props.onChange!({ target: { value: '<script>alert(1)</script>' } });
    expect(renderToStaticMarkup(render(code))).toContain('&lt;script&gt;');
    runtime.slots = [];
    const list = block('checklist', { items: ['first'] });
    elements(render(list)).find(e => e.type === 'input')!.props.onChange!({ target: { checked: true } });
    expect(elements(render(list)).find(e => e.type === 'input')!.props.checked).toBe(true);
  });
  it('counts down, pauses, resets, and cleans up timer intervals', () => {
    vi.useFakeTimers(); const b = block('timer', { seconds: 3 });
    click(render(b), 'Старт'); render(b); vi.advanceTimersByTime(1000);
    expect(renderToStaticMarkup(render(b))).toContain('2 с');
    click(render(b), 'Пауза'); render(b); vi.advanceTimersByTime(2000);
    expect(renderToStaticMarkup(render(b))).toContain('2 с');
    click(render(b), 'Сбросить'); expect(renderToStaticMarkup(render(b))).toContain('3 с');
    click(render(b), 'Старт'); render(b); runtime.cleanups.forEach(f => f()); expect(vi.getTimerCount()).toBe(0);
  });
  it('rejects unsafe audio protocols and escapes code/text', () => {
    for (const url of ['javascript:alert(1)', 'file:///tmp/a', 'data:audio/wav,a', '/relative']) expect(safeAudio(url)).toBeUndefined();
    expect(safeAudio('https://example.com/a.mp3')).toBe('https://example.com/a.mp3');
    expect(renderToStaticMarkup(render(block('audio-player', { url: 'file:///a' })))).toContain('нужен URL');
    expect(renderToStaticMarkup(render(block('night-code-card', { code: '<script>bad</script>' })))).toContain('&lt;script&gt;');
  });
  it.each(['table', 'progress', 'step-pills', 'collapsible-answers', 'word-card', 'phrase-breakdown', 'audio-player', 'unknown-type'])('renders %s safely', type => {
    const html = renderToStaticMarkup(render(block(type, { total: 9, title: 'Answer', answer: '<unsafe>' })));
    expect(html.length).toBeGreaterThan(0);
    if (type === 'progress') { expect(html.match(/ui-segment ui-pending/g)).toHaveLength(9); expect(html).not.toContain('ui-current'); }
    if (type === 'unknown-type') expect(html).toContain('нужен блок unknown-type');
  });
});

it('makes plain text words and numbered sentences clickable and escaped', () => {
  const plain = () => { runtime.cursor = 0; return PlainText({ text: 'Hello world.', numbered: true }); };
  expect(renderToStaticMarkup(plain())).toContain('<sup>1</sup>');
  click(plain(), 'Hello'); expect(renderToStaticMarkup(plain())).toContain('role="status">Hello');
  elements(plain()).find(e => (e.props as Record<string, unknown>)['aria-label'] === 'Выбрать предложение 1')!.props.onClick!();
  expect(renderToStaticMarkup(plain())).toContain('sentence-selected');
});
