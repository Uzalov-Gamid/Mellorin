import { expect, it } from 'vitest';
import { grammarSource, parseGrammarLesson } from './grammarLesson';
const source='Learning/English/grammar/process.md';
export const fixture={version:1,id:'synthetic',title:'Synthetic grammar',subtitle:'Synthetic source',source,stage:1,part:1,steps:['tail','theory','conspect','practice','homework'].map(id=>({id,label:id})),parts:Array.from({length:4},(_,i)=>({title:`Part ${i+1}`,subtitle:`часть ${i+1}`,source,paragraphs:[],headers:['Форма'],rows:[[[{text:'example',role:'accent'}]]],trap:'Synthetic trap',hint:'Synthetic hint'})),practice:{id:'q1',question:'Synthetic question',source,options:['one','two']},homework:[{pages:'стр. 1',status:'waiting',source}],homeworkHint:'External process',note:{path:'Learning/English/grammar/notes/topic-01.md',status:'ready'}};
it('accepts sourced semantic data, four parts and optional actual answer key',()=>{
  expect(parseGrammarLesson(JSON.stringify(fixture)).parts).toHaveLength(4);
  expect(parseGrammarLesson(JSON.stringify({...fixture,practice:{...fixture.practice,answer:{index:1,source,explanation:'Sourced answer'}}})).practice.answer?.index).toBe(1);
});
it('allows legitimate nested English notes/process/errors and rejects traversal and arbitrary locations',()=>{
  for(const p of [source,'Learning/English/errors.md','Learning/English/grammar/notes/topic-01.md','Learning/English/notes/grammar/topic.md']) expect(grammarSource(p)).toBe(true);
  for(const p of ['../process.md','Learning/English/grammar/../errors.md','Learning/English/.hidden/note.md','Learning/English//note.md','Learning/English/%2e%2e/note.md','Learning/English/grammar/x\\y.md','Learning/English/grammar/x\n.md','Learning/English/grammar/x.md#x','Learning/English/grammar/x.md?x','Learning/English/grammar/ note.md','Learning/English/grammar/.. /x.md','Learning/DevOps/process.md','/Learning/English/errors.md']) expect(grammarSource(p)).toBe(false);
});
it('rejects missing provenance, oversized or malformed lessons, false statuses and styling/code',()=>{
  for(const patch of [null,{...fixture,parts:fixture.parts.slice(0,3)},{...fixture,stage:5},{...fixture,part:-1},{...fixture,steps:fixture.steps.slice().reverse()},{...fixture,homework:[{pages:'x',status:'done',source}]},{...fixture,practice:{...fixture.practice,answer:{index:9,source,explanation:'x'}}},{...fixture,practice:{...fixture.practice,options:['x','x']}},{...fixture,practice:{...fixture.practice,source:'other.md'}},{...fixture,note:{path:'https://example.com/x.md',status:'ready'}},{...fixture,html:'<script>x</script>'},{...fixture,title:'<b>x</b>'},{...fixture,parts:[{...fixture.parts[0],rows:[[[{text:'x',role:'#fff'}]]]},...fixture.parts.slice(1)]},{...fixture,parts:[{...fixture.parts[0],rows:[[[{text:'x',font:'serif'}]]]},...fixture.parts.slice(1)]},{...fixture,parts:[{...fixture.parts[0],rows:[]},...fixture.parts.slice(1)]}]) expect(()=>parseGrammarLesson(JSON.stringify(patch))).toThrow();
  expect(()=>parseGrammarLesson('{broken')).toThrow();expect(()=>parseGrammarLesson(' '.repeat(131073))).toThrow();
});
