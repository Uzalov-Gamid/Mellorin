import type { LearningSnapshot } from "../learning";
import { Button, Card } from "../ui";
export function StateHome({ snapshot, loading, onRefresh }: { snapshot: LearningSnapshot; loading: boolean; onRefresh: () => void }) {
  return <section className="empty-screen"><h1>Главная</h1><Card variant="paper"><p>{loading ? "Читаю состояние…" : snapshot.state || snapshot.today ? "Состояние хранилища загружено" : "Файлов состояния пока нет. Попроси JERY обновить их."}</p>
    <p>{snapshot.state ? `Предметов: ${snapshot.state.subjects.length}` : "Прогресс: нет данных"}</p>
    <p>{snapshot.today ? `${snapshot.today.date} · задач: ${snapshot.today.tasks.length}` : "Задачи: нет данных"}</p>
    {snapshot.errors.map(error => <p role="alert" key={error}>{error}</p>)}<Button variant="outlined" onClick={onRefresh}>Обновить с JERY</Button>
  </Card></section>;
}
