import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ReactElement, ReactNode } from 'react';
const runtime = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, effects: [] as (() => unknown)[], cleanup: undefined as undefined | (() => void), invoke: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: runtime.invoke }));
vi.mock('react', async original => ({ ...await original<typeof import('react')>(),
  useState: (initial: unknown) => { const i = runtime.cursor++; if (!(i in runtime.slots)) runtime.slots[i] = initial; return [runtime.slots[i], (value: unknown) => { runtime.slots[i] = typeof value === 'function' ? value(runtime.slots[i]) : value; }]; },
  useEffect: (effect: () => unknown) => { const i = runtime.cursor++; if (!(i in runtime.slots)) { runtime.slots[i] = true; runtime.effects.push(effect); } },
}));
import { RequestsInbox } from './RequestsInbox';
type Props = { children?: ReactNode; 'aria-label'?: string; onClick?: () => void; role?: string };
function nodes(n: ReactNode): ReactElement<Props>[] { if (Array.isArray(n)) return n.flatMap(nodes); if (!n || typeof n !== 'object' || !('props' in n)) return []; const e=n as ReactElement<Props>; return [e,...nodes(e.props.children)]; }
function render() { runtime.cursor = 0; const tree = nodes(RequestsInbox()); runtime.effects.splice(0).forEach(effect => { runtime.cleanup = effect() as () => void; }); return tree; }
async function flush() { await Promise.resolve(); await Promise.resolve(); }
beforeEach(() => { vi.useFakeTimers(); runtime.slots=[]; runtime.effects=[]; runtime.invoke.mockReset(); });
afterEach(() => { runtime.cleanup?.(); vi.useRealTimers(); });
it('shows real counts, displays note examples and polls completed requests away', async () => {
  const body = '# Synthetic missing block\nFormat: formats/english-reading.json\nExample: {"type":"map"}';
  runtime.invoke.mockResolvedValue({ open: [{ name: '2026-11-15-map.md', body }] });
  expect(render().find(e => e.type === 'button')!.props['aria-label']).toContain('…');
  await flush(); let tree = render(); expect(tree[0].props['aria-label']).toBe('Заявки блоков: 1');
  tree[0].props.onClick!(); tree = render(); expect(tree.some(e => e.type === 'pre' && e.props.children === body)).toBe(true);
  runtime.invoke.mockResolvedValue({ open: [] }); vi.advanceTimersByTime(5000); await flush(); tree=render();
  expect(tree[0].props['aria-label']).toBe('Заявки блоков: 0'); expect(tree.some(e => e.props.children === 'Открытых заявок нет.')).toBe(true);
  expect(runtime.invoke).toHaveBeenCalledWith('requests_snapshot');
});
it('shows an unknown count and diagnostic instead of retaining a false total on read failure', async () => {
  runtime.invoke.mockRejectedValue(Error('outside vault'));
  render(); await flush(); let tree=render(); expect(tree[0].props['aria-label']).toBe('Заявки блоков: ?');
  tree[0].props.onClick!(); tree=render(); expect(tree.some(e => e.props.role === 'alert')).toBe(true);
});
