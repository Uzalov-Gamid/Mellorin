import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { JeryStrip } from "./JeryStrip";
import type { Jery } from "../useJery";
import { ScreenPanels, screenFromHash } from "../screens";

const jery: Jery = { reply: { text: "", blocks: [], errors: [] }, messages: [{ role: "assistant", text: "Последний ответ" }], input: "", setInput: vi.fn(), running: false, ready: true, busy: false, loading: false, error: null, toggleConnection: vi.fn(), send: vi.fn(), sendText: vi.fn() };
describe("shell", () => {
  it("resolves supported hashes and safely falls back", () => {
    expect(screenFromHash("#/english/reading")).toBe("english/reading");
    expect(screenFromHash("#unknown")).toBe("english/reading");
  });
  it("keeps chat input available while disconnected and exposes expansion state", () => {
    const html = renderToStaticMarkup(<JeryStrip jery={jery} expanded={false} onToggle={vi.fn()} />);
    expect(html).toContain("Последний ответ");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('placeholder="Ответ голосом или текстом…"');
    expect(html).not.toContain('<input aria-label="Ответ JERY" placeholder="Ответ голосом или текстом…" disabled');
  });
});

it("keeps reading mounted while another subject is selected", () => {
  const html = renderToStaticMarkup(<ScreenPanels active="devops/topic" />);
  expect(html).toContain('class="tab-panel" hidden=""');
  expect(html).toContain('aria-label="Текст для чтения"');
});

import { AppShell } from "./AppShell";
it("shows only the current screen context action and reserves a draggable top bar", () => {
  const render = (active: string) => renderToStaticMarkup(<AppShell sidebar={null} jery={jery} expanded={false} onToggleChat={vi.fn()} onToday={vi.fn()} active={active} onNewText={vi.fn()}>{null}</AppShell>);
  expect(render("home")).toContain("⟳ Обновить");
  expect(render("home")).not.toContain("› Сегодня");
  expect(render("english/reading")).toContain("+ Новый текст");
  expect(render("english/reading")).not.toContain("⟳ Обновить");
  expect(render("english/words")).toContain('href="#english/vocabulary"');
  expect(render("devops/topic")).not.toContain("+ Новый текст");
  expect(render("home")).toContain('data-tauri-drag-region="true"');
});
