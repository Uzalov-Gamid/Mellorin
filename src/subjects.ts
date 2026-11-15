import type { VaultSubject } from "./subprocess";
export interface Skill { id: string; name: string }
export interface Subject { id: string; name: string; letter: string; skills: Skill[] }
const skills = (items: [string, string][]): Skill[] => items.map(([id, name]) => ({ id, name }));
export const SUBJECTS: Subject[] = [
  { id: "english", name: "English", letter: "E", skills: skills([["reading", "Чтение"], ["listening", "Аудирование"], ["words", "Слова"], ["speaking", "Говорение"], ["writing", "Письмо"], ["grammar", "Грамматика"], ["overview", "Обзор"]]) },
  { id: "devops", name: "DevOps", letter: "D", skills: skills([["topic", "Тема"], ["pool", "Пул вопросов"], ["labs", "Лабы"], ["school", "Школа 21"], ["overview", "Обзор"]]) },
  { id: "arabic", name: "Арабский", letter: "А", skills: skills([["words", "Чтение слов"], ["letters", "Буквы и семьи"], ["overview", "Обзор"]]) },
  { id: "c", name: "C", letter: "C", skills: skills([["lesson", "Занятие"], ["plan", "Этапы"]]) },
  { id: "sql", name: "SQL", letter: "S", skills: skills([["start", "Начало"]]) },
];
const alias: Record<string, string> = { vocabulary: "words", school21: "school" };
export function resolveSubjects(found: VaultSubject[]): Subject[] {
  if (!found.length) return SUBJECTS;
  return found.map(folder => {
    const id = folder.name.toLowerCase();
    const known = SUBJECTS.find(subject => subject.id === id);
    if (known) {
      const extra = folder.skills.filter(skill => !known.skills.some(item => item.id === (alias[skill] || skill))).map(skill => ({ id: skill, name: skill }));
      return { ...known, skills: [...known.skills, ...extra] };
    }
    return { id, name: folder.name, letter: folder.name[0], skills: folder.skills.length ? folder.skills.map(skill => ({ id: skill, name: skill })) : [{ id: "start", name: "Начало" }] };
  }).sort((a, b) => {
    const order = (id: string) => { const index = SUBJECTS.findIndex(subject => subject.id === id); return index < 0 ? SUBJECTS.length : index; };
    return order(a.id) - order(b.id) || a.name.localeCompare(b.name);
  });
}
