import type { LearningSnapshot, TodayTask } from "../learning";
import type { Subject } from "../subjects";
import { SUBJECTS } from "../subjects";
import { dayTasks, daysBetween, localDate, weekActivity } from "../homeData";
import { Button, Card, Pill, Ring } from "../ui";
export function StateHome({ snapshot, loading, onRefresh, subjects = SUBJECTS, onStart, onToggle, busy = false }: {
  snapshot: LearningSnapshot; loading: boolean; onRefresh: () => void; subjects?: Subject[];
  onStart?: (task: TodayTask) => void; onToggle?: (task: TodayTask) => void; busy?: boolean;
}) {
  const { state, today } = snapshot, now = new Date(), date = localDate(now);
  const tasks = dayTasks(today, now), week = weekActivity(state, now);
  const tails = state?.subjects.flatMap(subject => (subject.tails || []).map(tail => ({ ...tail, subject: subject.name }))) || [];
  const tailsKnown = subjects.every(subject => state?.subjects.find(item => item.id === subject.id)?.tails !== undefined);
  const max = Math.max(1, ...week.map(day => day.count ?? 0));
  const name = (id: string) => subjects.find(subject => subject.id === id)?.name || id;
  const empty = (text: string) => <p className="home-empty">{text}</p>;
  return <div className="home-page">
    <header className="home-heading"><div><div className="caption">ГЛАВНАЯ</div><h1>{new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(now)}</h1></div>
      <span>{tasks ? `Задач на сегодня: ${tasks.length}` : "Задачи: нет данных"} · {tailsKnown ? `хвостов: ${tails.length}` : "хвосты: нет данных"}</span></header>
    {loading && empty("Читаю состояние…")}
    {!loading && !state && !today && empty("Файлов состояния пока нет. Попроси JERY обновить их.")}
    {snapshot.errors.map(error => <p role="alert" key={error}>{error}</p>)}
    <div className="home-primary">
      <Card variant="paper"><div className="home-card-title"><h2>◆ Сегодня · из TickTick</h2><Button variant="outlined" disabled={busy} onClick={onRefresh}>Обновить с JERY</Button></div>
        {!tasks ? empty(today ? `Файл задач от ${today.date}. Обнови данные на сегодня.` : "Задачи на сегодня ещё не загружены.") : tasks.length === 0 ? empty("На сегодня нет задач в файле состояния.") : tasks.map((task, index) => <div className={`home-task ${task.done ? "home-task-done" : ""}`} key={task.id}>
          <input type="checkbox" checked={task.done} disabled={busy || !onToggle} aria-label={`${task.done ? "Вернуть в работу" : "Завершить"}: ${task.title}`} onChange={() => onToggle?.(task)} />
          <div className="home-task-text"><div>{task.title}</div>{task.hint && <small>{task.hint}</small>}{task.completedAt && <small>{task.completedAt}</small>}</div>
          <Pill>{name(task.subject)}</Pill><small>{task.time || task.tag || "без времени"}</small>
          {!task.done && <Button variant={index === 0 ? "filled" : "outlined"} disabled={busy || !onStart} onClick={() => onStart?.(task)}>Начать ›</Button>}
        </div>)}
      </Card>
      <Card><h2>Ближайшие даты</h2>{state?.dates?.length ? state.dates.map((item, index) => <div className="home-date" key={index}><strong>{item.date ? daysBetween(date, item.date) : "—"}</strong><div>{item.title}<small>{item.date || "дата не задана"}</small></div></div>) : empty("Даты целей ещё не загружены.")}</Card>
    </div>
    <section><h2 className="home-section-title">Прогресс по предметам</h2><div className="home-subjects">{subjects.map(subject => {
      const progress = state?.subjects.find(item => item.id === subject.id);
      const skill = progress?.trail.find(item => item.status === "current")?.id || subject.skills[0]?.id || "start";
      return <a className="home-subject-link" href={`#${subject.id}/${skill}`} key={subject.id}><Card><Ring size={64} value={progress?.percent ?? 0} label={`${subject.name}: ${progress?.percent ?? "нет данных"}`}>{progress?.percent === undefined ? "—" : `${progress.percent}%`}</Ring><h3>{subject.name}</h3>
        <p>{progress?.stage || "Прогресс ещё не загружен"}</p>{progress?.tails ? progress.tails.length ? <span className="home-tail-badge">Хвостов: {progress.tails.length}</span> : <span className="home-success">✓ без хвостов</span> : <small>Хвосты: нет данных</small>}
      </Card></a>;
    })}</div></section>
    <div className="home-secondary">
      <Card><h2>Повторы сегодня</h2>{state?.repeats?.length ? state.repeats.map((item, index) => <div className="home-row" key={index}><span>{item.title}<small>{name(item.subject)}</small></span>{item.count !== undefined && <strong>{item.count}</strong>}{item.screen && <a href={`#${item.screen}`} aria-label={`Открыть: ${item.title}`}>›</a>}</div>) : empty(state?.repeats ? "Повторов в состоянии нет." : "Данные повторов ещё не загружены.")}</Card>
      <Card><h2>Неделя · занятий в день</h2>{!state?.sessions && empty("Данные занятий ещё не загружены.")}<div className="home-week">{week.map(day => <div className={`home-week-day ${day.today ? "home-week-today" : ""}`} key={day.date} title={`${day.date}: ${day.count ?? "нет данных"}`}><span>{day.count ?? "—"}</span><i style={{ height: `${(day.count ?? 0) / max * 72}px` }} /><small>{day.label}</small></div>)}</div></Card>
      <Card><h2>Хвосты и ошибки</h2>{tails.length ? tails.map((tail, index) => <div className="home-row" key={index}><span>{tail.title}<small>{tail.subject}</small></span><small>{tail.date ? `${daysBetween(tail.date, date)} д` : "возраст: —"}</small></div>) : empty(tailsKnown ? "Хвостов нет." : "Данные хвостов ещё не загружены.")}
        {[...(state?.errors || [])].sort((a, b) => b.count - a.count).map((item, index) => <div className="home-row home-error" key={index}><span>{item.title}<small>{name(item.subject)}</small></span><strong>{item.count}</strong></div>)}{!state?.errors && empty("Данные ошибок ещё не загружены.")}
      </Card>
    </div>
    <p className="home-source">Источник: .mellorin/state.json и .mellorin/today.json · опрос каждые 5 секунд</p>
  </div>;
}
