import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { dayTasks, daysBetween, localDate, weekActivity } from "./homeData";
import { StateHome } from "./shell/StateHome";
import type { LearningSnapshot } from "./learning";
describe("Home data", () => {
  const now = new Date(2026, 10, 15, 23, 59);
  it("uses local calendar days, excludes stale tasks and future sessions", () => {
    expect(localDate(now)).toBe("2026-11-15");
    expect(dayTasks({ version: 1, date: "2026-11-14", tasks: [] }, now)).toBeNull();
    expect(daysBetween("2026-11-15", "2027-06-01")).toBe(198);
    const week = weekActivity({ version: 1, subjects: [], sessions: [{ date: "2026-11-09", subject: "english" }, { date: "2026-11-15", subject: "c", count: 2 }] }, now);
    expect(week[0].date).toBe("2026-11-09"); expect(week[0].count).toBe(1); expect(week[6].count).toBe(2);
    expect(weekActivity(null, now)[0].count).toBeNull();
    expect(weekActivity({ version: 1, subjects: [], sessions: [] }, new Date(2026, 10, 9))[1].count).toBeNull();
  });
  it("renders available figures and keeps unavailable subjects unknown", () => {
    const snapshot: LearningSnapshot = { state: { version: 1, subjects: [{ id: "english", name: "English", percent: 25, trail: [], tails: [] }], dates: [{ title: "Synthetic goal" }], repeats: [{ title: "Synthetic repeat", subject: "english", count: 3 }] }, today: null, errors: [] };
    const html = renderToStaticMarkup(<StateHome snapshot={snapshot} loading={false} onRefresh={vi.fn()} />);
    expect(html).toContain("25%"); expect(html).toContain("Прогресс ещё не загружен"); expect(html).toContain("дата не задана"); expect(html).toContain("Synthetic repeat"); expect(html).not.toContain("62%");
  });
});

it("dispatches task actions and waits for authoritative state updates", async () => {
  const task = { id: "demo", title: "Synthetic task", subject: "english", skill: "reading", done: false };
  const onStart = vi.fn(), onToggle = vi.fn();
  const tree = StateHome({ snapshot: { state: null, today: { version: 1, date: localDate(), tasks: [task] }, errors: [] }, loading: false, onRefresh: vi.fn(), onStart, onToggle });
  type Element = { props: { children?: unknown; onClick?: () => void; onChange?: () => void; type?: string; checked?: boolean } };
  function walk(node: unknown): Element[] {
    if (Array.isArray(node)) return node.flatMap(walk);
    if (!node || typeof node !== "object" || !("props" in node)) return [];
    const element = node as Element; return [element, ...walk(element.props.children)];
  }
  const elements = walk(tree);
  elements.find(item => item.props.children === "Начать ›")?.props.onClick?.();
  const checkbox = elements.find(item => item.props.type === "checkbox")!;
  checkbox.props.onChange?.();
  expect(onStart).toHaveBeenCalledWith(task); expect(onToggle).toHaveBeenCalledWith(task);
  expect(checkbox.props.checked).toBe(false);
});
