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
import { GrammarStudy } from './GrammarStudy';
const source='Learning/English/grammar/process.md';
const fixture={version:1,id:'synthetic',title:'Synthetic grammar',subtitle:'Synthetic source',source,stage:1,part:1,steps:['tail','theory','conspect','practice','homework'].map(id=>({id,label:id})),parts:Array.from({length:4},(_,i)=>({title:`Part ${i+1}`,subtitle:`часть ${i+1}`,source,paragraphs:[],headers:['Форма'],rows:[[[{text:'example',role:'accent'}]]],trap:'Synthetic trap',hint:'Synthetic hint'})),practice:{id:'q1',question:'Synthetic question',source,options:['one','two']},homework:[{pages:'стр. 1',status:'waiting',source}],homeworkHint:'External process',note:{path:'Learning/English/grammar/notes/topic-01.md',status:'ready'}};
type Props = { children?: ReactNode; onClick?: () => void; disabled?: boolean; role?: string; 'aria-pressed'?: boolean; className?: string };
function elements(node: ReactNode): ReactElement<Props>[] { if (Array.isArray(node)) return node.flatMap(elements); if (!node || typeof node !== 'object' || !('props' in node)) return []; const el = node as ReactElement<Props>; return [el, ...elements(el.props.children)]; }
function render() { runtime.cursor=0; const tree=GrammarStudy();runtime.effects.splice(0).forEach(e=>e());return elements(tree); }
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
function button(label:string) { return render().find(e=>e.type==='button' && e.props.children===label)!; }
function click(label:string) { const b=button(label); expect(b).toBeTruthy();expect(b.props.disabled).not.toBe(true);b.props.onClick!(); }
function next() {render().find(e=>e.type==='button' && e.props.className==='grammar-primary')!.props.onClick!();}
function heading(){return render().find(e=>e.type==='h2')?.props.children;}
beforeEach(()=>{runtime.slots=[];runtime.effects=[];runtime.cleanups=[];runtime.intent.mockReset();runtime.canSend=true;runtime.intentError=null;runtime.read.mockReset().mockResolvedValue(JSON.stringify(fixture));});
afterEach(()=>{runtime.cleanups.forEach(f=>f());});
it('shows one part, respects boundaries and retains state on navigation renders without messages',async()=>{
  render();await flush();expect(heading()).toBe('Part 2');next();expect(heading()).toBe('Part 3');next();expect(heading()).toBe('Part 4');
  expect(render().find(e=>e.props.className==='grammar-primary')?.props.disabled).toBe(true);
  for(let i=0;i<3;i++)render();expect(heading()).toBe('Part 4');expect(runtime.intent).not.toHaveBeenCalled();
});
it('submits selected answer explicitly, never grades without sourced key and resets stale selection on successful reload',async()=>{
  render();await flush();expect(button('Ответить JERY').props.disabled).toBe(true);click('two');expect(runtime.intent).not.toHaveBeenCalled();
  runtime.canSend=false;expect(button('Ответить JERY').props.disabled).toBe(true);runtime.canSend=true;click('Ответить JERY');
  expect(runtime.intent.mock.calls[0][1]).toEqual({lessonId:'synthetic',practice:'q1',source:fixture.source,question:fixture.practice.question,answer:'two'});
  expect(render().find(e=>e.props.role==='status')?.props.children).toContain('Ожидаем');
  runtime.read.mockResolvedValue(JSON.stringify({...fixture,practice:{...fixture.practice,id:'q2',answer:{index:0,source:fixture.source,explanation:'Actual key'}}}));
  click('Загрузить урок');render();await flush();expect(button('Ответить JERY').props.disabled).toBe(true);expect(render().some(e=>e.props.role==='status')).toBe(false);
});
it('retains last valid lesson on malformed reload; explicitly adopts another lesson with fresh state',async()=>{
  render();await flush();next();click('two');runtime.read.mockResolvedValue('{broken');click('Загрузить урок');render();await flush();
  expect(heading()).toBe('Part 3');expect(button('two').props['aria-pressed']).toBe(true);expect(render().some(e=>e.props.role==='alert')).toBe(true);
  runtime.read.mockResolvedValue(JSON.stringify({...fixture,id:'other'}));click('Загрузить урок');render();await flush();expect(heading()).toBe('Part 2');expect(button('two').props['aria-pressed']).toBe(false);expect(runtime.intent).not.toHaveBeenCalled();
});
it('opens bounded note read-only with errors and requests homework without changing status',async()=>{
  render();await flush();runtime.read.mockRejectedValueOnce(Error('missing'));click('Открыть конспект ›');await flush();expect(render().some(e=>e.props.role==='alert')).toBe(true);
  runtime.read.mockResolvedValueOnce('# Synthetic note');click('Открыть конспект ›');await flush();expect(runtime.read).toHaveBeenLastCalledWith(fixture.note.path);expect(render().some(e=>e.type==='pre' && e.props.children==='# Synthetic note')).toBe(true);click('Закрыть конспект');
  const check=render().find(e=>e.type==='button' && e.props.className==='grammar-check')!;check.props.onClick!();expect(runtime.intent.mock.calls[0][1].pages).toBe('стр. 1');expect(render().some(e=>e.props.children==='○ жду «готово»')).toBe(true);
});
it('empty state preparation is explicit and errors remain visible',async()=>{
  runtime.read.mockRejectedValueOnce(Error('missing'));render();await flush();expect(runtime.intent).not.toHaveBeenCalled();runtime.canSend=false;expect(button('Подготовить урок с JERY').props.disabled).toBe(true);runtime.canSend=true;click('Подготовить урок с JERY');expect(runtime.intent.mock.calls[0][0]).toContain('grammar/process.md');runtime.intentError='offline';expect(render().some(e=>e.props.children==='offline')).toBe(true);
});
