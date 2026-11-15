import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const invoke = vi.hoisted(() => vi.fn().mockResolvedValue("demo"));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
import { vaultReadText, vaultList } from "./learning";
import { StateHome } from "./shell/StateHome";
import { REFRESH_PROMPT, TODAY_PROMPT } from "./prompts";
describe("vault state integration", () => {
  it("uses precise relative paths in IPC", async () => {
    await vaultReadText("formats/english-reading.json"); await vaultList("formats");
    expect(invoke).toHaveBeenCalledWith("vault_read_text", { relPath: "formats/english-reading.json" });
    expect(invoke).toHaveBeenCalledWith("vault_list", { relDir: "formats" });
  });
  it("shows missing and invalid state clearly without invented totals", () => {
    const html = renderToStaticMarkup(<StateHome snapshot={{ state: null, today: null, errors: ["invalid JSON"] }} loading={false} onRefresh={vi.fn()} />);
    expect(html).toContain("Файлов состояния пока нет"); expect(html).toContain("invalid JSON"); expect(html).not.toContain("задач: 0");
    expect(TODAY_PROMPT).toContain(REFRESH_PROMPT);
  });
});
