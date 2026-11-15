import { describe, expect, it, vi } from "vitest";
import { type ReactElement, type ReactNode } from "react";
const runtime = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, effects: [] as (() => unknown)[], getConfig: vi.fn(), setEditPermission: vi.fn(), setTickTick: vi.fn(), getTickTickStatus: vi.fn(), getDiagnostics: vi.fn(), saveSettings: vi.fn() }));
vi.mock("../subprocess", () => runtime);
vi.mock("../screens/settings/bridge", () => runtime);
vi.mock("react", async original => ({ ...await original<typeof import("react")>(),
  useState: (initial: unknown) => { const index = runtime.cursor++; if (!(index in runtime.slots)) runtime.slots[index] = initial; return [runtime.slots[index], (next: unknown) => { runtime.slots[index] = next; }]; },
  useEffect: (effect: () => unknown) => { if (!runtime.cursor++) runtime.effects.push(effect); else if (!runtime.effects.length) runtime.effects.push(effect); },
}));
import { VaultSettings } from "./VaultSettings";
type Props = { children?: ReactNode; checked?: boolean; onChange?: (event: {target: {checked: boolean; value?: string}}) => void; role?: string; value?: string; type?: string; "aria-pressed"?: boolean; "aria-label"?: string; onClick?: () => void };
function elements(node: ReactNode): ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as ReactElement<Props>; return [element, ...elements(element.props.children)];
}
function render() { runtime.cursor = 0; return elements(VaultSettings({ onClose() {} })); }
async function flush() { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); }
describe("vault permission", () => {
  it("loads permission, preserves it after failed persistence and updates after success", async () => {
    runtime.slots = []; runtime.effects = [];
    vi.stubGlobal("document", {documentElement: {style: {setProperty: vi.fn()}}});
    runtime.getTickTickStatus.mockResolvedValue("connected");
    runtime.getDiagnostics.mockResolvedValue({vault_found: true, learning_found: true, cli_available: true});
    runtime.getConfig.mockResolvedValue({ vault_path: "/synthetic", jery_can_edit_vault: true, jery_ticktick: "full" });
    runtime.setEditPermission.mockRejectedValueOnce(new Error("save failed")).mockResolvedValueOnce(undefined);
    render(); runtime.effects.forEach(effect => effect()); await flush();
    let toggle = render().find(item => item.type === "input" && item.props.type === "checkbox")!;
    expect(toggle.props.checked).toBe(true);
    toggle.props.onChange!({ target: { checked: false } }); await flush();
    expect(runtime.setEditPermission).toHaveBeenCalledWith(false);
    const failed = render(); expect(failed.find(item => item.type === "input" && item.props.type === "checkbox")!.props.checked).toBe(true);
    expect(failed.some(item => item.props.role === "alert")).toBe(true);
    toggle = failed.find(item => item.type === "input" && item.props.type === "checkbox")!;
    toggle.props.onChange!({ target: { checked: false } }); await flush();
    expect(render().find(item => item.type === "input" && item.props.type === "checkbox")!.props.checked).toBe(false);
    runtime.setTickTick.mockRejectedValueOnce(new Error("mode save failed")).mockResolvedValueOnce(undefined);
    let mode = render().find(item => item.props.children === "только читать")!;
    mode.props.onClick!(); await flush();
    expect(render().find(item => item.props.children === "читать и менять")!.props["aria-pressed"]).toBe(true);
    mode = render().find(item => item.props.children === "только читать")!;
    mode.props.onClick!(); await flush();
    expect(runtime.setTickTick).toHaveBeenCalledWith("read");
    expect(render().find(item => item.props.children === "только читать")!.props["aria-pressed"]).toBe(true);
    runtime.saveSettings.mockRejectedValueOnce(new Error("path save failed")).mockResolvedValueOnce(undefined);
    render().find(item => item.props.children === "Сохранить")!.props.onClick!(); await flush();
    expect(render().some(item => item.props.role === "alert")).toBe(true);
    render().find(item => item.props.children === "Сохранить")!.props.onClick!(); await flush();
    expect(runtime.saveSettings).toHaveBeenCalledWith({vault_path: "/synthetic", claude_path: "claude", theme: "light", text_size: 14});
    expect(render().some(item => item.props.role === "alert")).toBe(false);
    runtime.saveSettings.mockRejectedValueOnce(new Error("size save failed")).mockResolvedValueOnce(undefined);
    render().find(item => item.props["aria-label"] === "Размер текста")!.props.onChange!({target: {checked: false, value: "18"}}); await flush();
    expect(render().find(item => item.props["aria-label"] === "Размер текста")!.props.value).toBe(14);
    render().find(item => item.props["aria-label"] === "Размер текста")!.props.onChange!({target: {checked: false, value: "18"}}); await flush();
    expect(render().find(item => item.props["aria-label"] === "Размер текста")!.props.value).toBe(18);
  });
});
