import type { LearningState, TodayState } from "./learning";
export function localDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export function daysBetween(from: string, to: string): number {
  const utc = (date: string) => { const [year, month, day] = date.split("-").map(Number); return Date.UTC(year, month - 1, day); };
  return Math.round((utc(to) - utc(from)) / 86400000);
}
export function dayTasks(today: TodayState | null | undefined, now = new Date()) {
  return today?.date === localDate(now) ? today.tasks : null;
}
export function weekActivity(state: LearningState | null | undefined, now = new Date()) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  const today = localDate(now);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday); day.setDate(day.getDate() + index);
    const date = localDate(day), future = date > today;
    const count = state?.sessions && !future ? state.sessions.filter(session => session.date === date).reduce((sum, session) => sum + (session.count ?? 1), 0) : null;
    return { date, label: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][index], today: date === today, future, count };
  });
}
