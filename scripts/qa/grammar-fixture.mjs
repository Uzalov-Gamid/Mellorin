// Public mockup text only; no personal vault reads.
const source='Learning/English/grammar/process.md';
const run=(text,role)=>({text,...(role?{role}:{})});
const cell=(text)=>[run(text)];
const part={title:'Как строится Past Simple',subtitle:'часть 2: утверждение',source,paragraphs:[],headers:['ФОРМА','ПРАВИЛО','ПРИМЕР'],rows:[
  [cell('обычный'),[run('глагол + '),run('ed','accent')],[run('work → work'),run('ed','accent')]],
  [cell('на e'),[run('глагол + '),run('d','accent')],[run('like → like'),run('d','accent')]],
  [cell('согл. + y'),[run('y → '),run('ied','accent')],[run('study → stud'),run('ied','accent')]],
],trap:'Ловушка: «am agree» и «I use» про вчера. Время стоит в глаголе, а не в be.',hint:'правило не усвоено, пока в практике есть ошибки'};
export const grammarLesson={version:1,id:'qa-grammar',title:'Past Simple · правильные глаголы',subtitle:'понедельник · New Round-Up 2, Unit 14',source,
  steps:['хвост','теория','конспект','практика в чате','домашка на iPad'].map((label,i)=>({id:['tail','theory','conspect','practice','homework'][i],label})),stage:1,part:1,
  parts:Array.from({length:4},(_,i)=>({...part,subtitle:i===1?part.subtitle:`часть ${i+1}: синтетическая проверка навигации`})),
  practice:{id:'qa-practice',question:'Yesterday she ______ (play) tennis.',source,options:['plays','played','playing'],answer:{index:1,source,explanation:'Синтетический ключ: played.'}},
  homework:[{pages:'стр. 86, упр. 1–3',status:'checked',source},{pages:'стр. 87, упр. 4–5',status:'waiting',source}],
  homeworkHint:'Apple Pencil в Books · скажи «проверь домашку, стр. 87», я посмотрю файл в iCloud',
  note:{path:'Learning/English/grammar/notes/topic-14-past-simple-regular.md',status:'waiting'},
};
