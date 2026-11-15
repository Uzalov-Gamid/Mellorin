import { describe, expect, it, vi } from "vitest";
import { type ReactElement, type ReactNode } from "react";
const runtime = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, effects: [] as (() => unknown)[], getConfig: vi.fn(), setEditPermission: vi.fn(), setTickTick: vi.fn(), getTickTickStatus: vi.fn() }));
vi.mock("../subprocess", () => runtime);
vi.mock("react", async original => ({ ...await original<typeof import("react")>(),
  useState: (initial: unknown) => { const index = runtime.cursor++; if (!(index in runtime.slots)) runtime.slots[index] = initial; return [runtime.slots[index], (next: unknown) => { runtime.slots[index] = next; }]; },
  useEffect: (effect: () => unknown) => { if (!runtime.cursor++) runtime.effects.push(effect); else if (!runtime.effects.length) runtime.effects.push(effect); },
}));
import { VaultSettings } from "./VaultSettings";
type Props = { children?: ReactNode; checked?: boolean; onChange?: (event: {target: {checked: boolean; value?: string}}) => void; role?: string; value?: string };
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
    runtime.getTickTickStatus.mockResolvedValue("connected");
    runtime.getConfig.mockResolvedValue({ vault_path: "/synthetic", jery_can_edit_vault: true, jery_ticktick: "full" });
    runtime.setEditPermission.mockRejectedValueOnce(new Error("save failed")).mockResolvedValueOnce(undefined);
    render(); runtime.effects.forEach(effect => effect()); await flush();
    let toggle = render().find(item => item.type === "input")!;
    expect(toggle.props.checked).toBe(true);
    toggle.props.onChange!({ target: { checked: false } }); await flush();
    expect(runtime.setEditPermission).toHaveBeenCalledWith(false);
    const failed = render(); expect(failed.find(item => item.type === "input")!.props.checked).toBe(true);
    expect(failed.some(item => item.props.role === "alert")).toBe(true);
    toggle = failed.find(item => item.type === "input")!;
    toggle.props.onChange!({ target: { checked: false } }); await flush();
    expect(render().find(item => item.type === "input")!.props.checked).toBe(false);
    runtime.setTickTick.mockRejectedValueOnce(new Error("mode save failed")).mockResolvedValueOnce(undefined);
    let select = render().find(item => item.type === "select")!;
    select.props.onChange!({target: {checked: false, value: "read"}}); await flush();
    expect(render().find(item => item.type === "select")!.props.value).toBe("full");
    select = render().find(item => item.type === "select")!;
    select.props.onChange!({target: {checked: false, value: "read"}}); await flush();
    expect(runtime.setTickTick).toHaveBeenCalledWith("read");
    expect(render().find(item => item.type === "select")!.props.value).toBe("read");
  });
});
