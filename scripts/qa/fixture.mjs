// Synthetic only. Never read a user's configured vault in browser QA.
export const reading = 'On Monday I decided to leave my phone in the kitchen. I usually check it before I get out of bed, and it makes me tired. This morning I made tea and looked out of the window instead. It was quiet, and I felt curious about my own thoughts.';
export const readingPhrases = {phrases:[{text:'This morning',ru:'этим утром'},{text:'I made tea',ru:'я заварил чай'},{text:'and looked out of the window',ru:'и смотрел в окно'},{text:'instead',ru:'вместо этого'}]};
const trail = ['reading','listening','words','speaking','writing','grammar','vocab','notes','overview'];
export const snapshot = {
  state: {version:1, subjects:[
    {id:'english', name:'English', percent:62, stage:'A2 → B1', trail:trail.map((id,i)=>({id,label:['Чтение','Аудирование','Слова','Говорение','Письмо','Грамматика','Словарь','Конспекты','Обзор'][i],status:i<2?'passed':i===2?'current':'future'})), tails:[{title:'Учебный разбор',date:'2026-11-13'},{title:'Повторение примера',date:'2026-11-07'}]},
    ...[['devops','DevOps',41],['arabic','Арабский',24],['c','C',18],['sql','SQL',0]].map(([id,name,percent])=>({id,name,percent,stage:id==='sql'?'плана ещё нет':'учебный этап',trail:[],tails:[]})),
  ], dates:[{title:'Учебная цель',date:'2027-02-08'},{title:'Следующая цель',date:'2027-06-01'},{title:'Проверка знаний'}],sessions:[{date:'2026-11-09',subject:'english',count:4},{date:'2026-11-10',subject:'english',count:6},{date:'2026-11-11',subject:'english',count:5}],repeats:[{title:'Слова · карточки',subject:'english',count:12,screen:'english/words'},{title:'Вопросы · повторение',subject:'devops',count:3}],errors:[{title:'Учебная ошибка',subject:'english',count:4}]},
  today:{version:1,date:'2026-11-15',tasks:[{id:'listening',title:'Учебное аудирование',hint:'сначала три вопроса',subject:'english',skill:'listening',tag:'deep',done:false},{id:'devops',title:'Учебная тема · этап 14',hint:'сначала два вопроса',subject:'devops',done:false},{id:'c',title:'Учебная задача · цикл',hint:'теория и практика',subject:'c',time:'45 минут',done:false},{id:'words',title:'Повторение слов',subject:'english',skill:'words',completedAt:'8:40',done:true}]}, errors:[],
};
export const wordLesson = {version:1,id:'qa-words',preparedOn:'2026-11-15',words:Array.from({length:10},(_,i)=>({
  word:['morning','quiet','river','notice','world','breakfast','change','day','phone','bank'][i],translation:`Перевод ${i+1}`,source:'Learning/English/vocabulary/mywords-list.md',status:'focus',ipa:'/ˈmɔːnɪŋ/',example:'A quiet morning.',
  translationChoice:{choices:['утро','вечер','ночь','день'],answer:0},sentenceGap:{sentence:'A quiet ___.',choices:['morning','river','world','phone'],answer:0},reverseTranslation:{choices:['morning','river','world','phone'],answer:0},dictation:['morning'],
}))};
export const listeningLesson = {version:1,id:'qa-listening',title:'A quiet morning',source:'Learning/English/listening/2026-11-15-qa.md',audioUrl:'http://127.0.0.1:1420/qa-audio.wav',questions:['What time does the day start?','What is for breakfast?','Where does the speaker go?'],script:'I wake up early. I eat breakfast. Then I walk by the river.'};
