// Synthetic only. Never read a user's configured vault in browser QA.
export const reading = 'Phone-free mornings help us notice the world. A quiet breakfast can change the day. He sat on the bank of the river.';
const trail = ['reading','listening','words','speaking','writing','grammar','vocab','notes','overview'];
export const snapshot = {
  state: {version:1, subjects:[
    {id:'english', name:'English', percent:62, stage:'A2 → B1', trail:trail.map((id,i)=>({id,label:['Чтение','Аудирование','Слова','Говорение','Письмо','Грамматика','Словарь','Конспекты','Обзор'][i],status:i<2?'passed':i===2?'current':'future'})), tails:[]},
    ...[['devops','DevOps',41],['arabic','Арабский',24],['c','C',18],['sql','SQL',0]].map(([id,name,percent])=>({id,name,percent,trail:[]})),
  ], dates:[],sessions:[],repeats:[],errors:[]},
  today:{version:1,date:'2026-11-15',tasks:[{id:'reading',title:'Чтение',subject:'english',skill:'reading',done:false}]}, errors:[],
};
export const wordLesson = {version:1,id:'qa-words',preparedOn:'2026-11-15',words:Array.from({length:10},(_,i)=>({
  word:['morning','quiet','river','notice','world','breakfast','change','day','phone','bank'][i],translation:`Перевод ${i+1}`,source:'Learning/English/vocabulary/mywords-list.md',status:'focus',ipa:'/ˈmɔːnɪŋ/',example:'A quiet morning.',
  translationChoice:{choices:['утро','вечер','ночь','день'],answer:0},sentenceGap:{sentence:'A quiet ___.',choices:['morning','river','world','phone'],answer:0},reverseTranslation:{choices:['morning','river','world','phone'],answer:0},dictation:['morning'],
}))};
export const listeningLesson = {version:1,id:'qa-listening',title:'A quiet morning',source:'Learning/English/listening/2026-11-15-qa.md',audioUrl:'http://127.0.0.1:1420/qa-audio.wav',questions:['What time does the day start?','What is for breakfast?','Where does the speaker go?'],script:'I wake up early. I eat breakfast. Then I walk by the river.'};
