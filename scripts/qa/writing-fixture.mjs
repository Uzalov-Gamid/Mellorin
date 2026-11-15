// Synthetic text copied from the public design mockup; never reads a vault.
const source = 'Learning/English/writing/process.md';
const draft = 'Yesterday I use my phone for two hours. I am agree that it is convenient, but it takes my time. In the evening I watch videos and could not stop.';
const corrections = [
  ['Yesterday I use my phone', 'Yesterday I used my phone', 'Вчера = Past Simple, use → used'],
  ['am agree', 'agree', 'agree уже глагол, be не нужен'],
  ['convenient', 'convenient', 'Уточни по смыслу, что именно удобно.'],
  ['I watch', 'I watched', 'Повтор ошибки с 1: время'],
];
export const writingLesson = {
  version:1,id:'qa-writing',title:'My phone yesterday',source,
  target:{min:100,max:120,source},
  plan:['что делал','почему','вывод'].map(text=>({text,source})),
  watchOut:['Past Simple','am agree'].map(text=>({text,source})),draft,
  review:{lessonId:'qa-writing',draft,errors:corrections.map(([before,after,why])=>({start:draft.indexOf(before),end:draft.indexOf(before)+before.length,before,after,why})),mainErrors:[1,4]},
};
