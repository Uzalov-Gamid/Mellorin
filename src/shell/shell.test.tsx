import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { JeryStrip } from "./JeryStrip";
import type { Jery } from "../useJery";
import { ScreenPanels, screenFromHash } from "../screens";

const jery: Jery = { messages: [{ role: "assistant", text: "Последний ответ" }], input: "", setInput: vi.fn(), running: false, ready: true, busy: false, loading: false, error: null, toggleConnection: vi.fn(), send: vi.fn(), sendText: vi.fn() };
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
