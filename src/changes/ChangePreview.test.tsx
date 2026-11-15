import { beforeEach, expect, it, vi } from 'vitest';
import type { ReactElement, ReactNode } from 'react';
const state = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, preview: vi.fn(), apply: vi.fn(), rollback: vi.fn(), recover: vi.fn() }));
vi.mock('react', async original => ({ ...await original<typeof import('react')>(), useState: (initial: unknown) => { const i = state.cursor++; if (!(i in state.slots)) state.slots[i] = initial; return [state.slots[i], (v: unknown) => { state.slots[i] = v; }]; }, useRef: (initial: unknown) => { const i=state.cursor++; if (!(i in state.slots)) state.slots[i]={current:initial}; return state.slots[i]; }, useEffect: (fn: () => void) => { const i=state.cursor++; if (!(i in state.slots)) {state.slots[i]=true;fn();} } }));
vi.mock('./bridge', () => ({ previewChange: state.preview, applyChange: state.apply, rollbackChange: state.rollback, recoverChange: state.recover }));
import { ChangePreview } from './ChangePreview';
const format = '{"version":1,"steps":[{"id":"read","title":"","blocks":[]}]}';
const proposal = {target:'formats/english-reading.json',before:format,after:format,process:'Learning/English/Reading/process.md',process_before:null,rule:'Number sentences'};
type Props = {children?: ReactNode; disabled?: boolean; onClick?: () => void};
function nodes(n: ReactNode): ReactElement<Props>[] { if (Array.isArray(n)) return n.flatMap(nodes); if (!n || typeof n !== 'object' || !('props' in n)) return []; const e=n as ReactElement<Props>; return [e,...nodes(e.props.children)]; }
function render(streaming=false, onChange=vi.fn()) { state.cursor=0; return nodes(ChangePreview({proposal, streaming,onChange})); }
beforeEach(() => { state.slots=[]; state.cursor=0; vi.clearAllMocks(); state.preview.mockResolvedValue({proposal,process_after:'rule'}); state.apply.mockResolvedValue({id:'saved'}); });
it('only previews on mount; apply requires a click and duplicate clicks are locked', async () => {
  render(); await Promise.resolve(); const button=render().find(e => e.props.children === 'Применить')!; expect(button.props.disabled).toBe(false); expect(state.apply).not.toHaveBeenCalled(); button.props.onClick!(); button.props.onClick!(); await Promise.resolve(); expect(state.apply).toHaveBeenCalledTimes(1); expect(state.apply).toHaveBeenCalledWith(proposal);
});
it('blocks streaming actions and routes revision only through its button', async () => {
  const revise=vi.fn(); render(true,revise); await Promise.resolve(); const tree=render(true,revise); expect(tree.find(e=>e.props.children==='Применить')!.props.disabled).toBe(true); tree.find(e=>e.props.children==='Применить')!.props.onClick!(); expect(state.apply).not.toHaveBeenCalled(); const ready=render(false,revise); ready.find(e=>e.props.children==='Изменить')!.props.onClick!(); expect(revise).toHaveBeenCalledWith(proposal); expect(state.apply).not.toHaveBeenCalled();
});
