import { beforeEach, describe, expect, it, vi } from "vitest";
import { type ReactElement, type ReactNode } from "react";

// A hook renderer keeps these interaction tests independent of a browser/DOM package.
const runtime = vi.hoisted(() => ({
  slots: [] as unknown[], cursor: 0, effects: [] as (() => void | (() => void))[],
  cleanups: [] as (() => void)[],
  invoke: vi.fn(), listeners: new Map<string, (event: { payload: unknown }) => void>(),
}));
vi.mock("react", async importOriginal => {
  const original = await importOriginal<typeof import("react")>();
  return { ...original,
    useState: <T,>(initial: T) => {
      const index = runtime.cursor++;
      const slots = runtime.slots;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (next: T | ((previous: T) => T)) => {
        slots[index] = typeof next === "function" ? (next as (previous: T) => T)(slots[index] as T) : next;
      }];
    },
    useRef: <T,>(initial: T) => {
      const index = runtime.cursor++;
      if (!(index in runtime.slots)) runtime.slots[index] = { current: initial };
      return runtime.slots[index];
    },
    useEffect: (effect: () => void | (() => void), deps: unknown[]) => {
      const index = runtime.cursor++;
      const previous = runtime.slots[index] as unknown[] | undefined;
      if (!previous || deps.some((dep, i) => dep !== previous[i])) runtime.effects.push(effect);
      runtime.slots[index] = deps;
    },
  };
});
vi.mock("@tauri-apps/api/core", () => ({ invoke: runtime.invoke }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn((event: string, callback: (event: { payload: unknown }) => void) => {
  runtime.listeners.set(event, callback);
  return Promise.resolve(vi.fn());
}) }));
import { Chat } from "./Chat";
import { useJery } from "./useJery";
import { useVaultState, type LearningSnapshot } from "./learning";
import { WordPopup, TextViewer } from "./TextViewer";

type Props = {
  children?: ReactNode; className?: string; disabled?: boolean;
  onClick?: (event?: { stopPropagation: () => void }) => void | Promise<void>;
  onChange?: (event: { target: { value: string } }) => void;
  onKeyDown?: (event: { key: string; shiftKey: boolean; nativeEvent: { isComposing: boolean }; preventDefault: () => void }) => void;
};
function elements(node: ReactNode): ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as ReactElement<Props>;
  return [element, ...elements(element.props.children)];
}
function content(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(content).join("");
  if (node && typeof node === "object" && "props" in node) return content((node as ReactElement<Props>).props.children);
  return "";
}
function render(component: () => ReactElement) {
  runtime.cursor = 0;
  const tree = component();
  runtime.effects.splice(0).forEach(effect => {
    const cleanup = effect();
    if (cleanup) runtime.cleanups.push(cleanup);
  });
  return tree;
}
function find(tree: ReactNode, predicate: (element: ReactElement<Props>) => boolean) {
  const element = elements(tree).find(predicate);
  if (!element) throw new Error("Element not found");
  return element;
}
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
beforeEach(() => {
  runtime.cleanups.splice(0).forEach(cleanup => cleanup());
  runtime.slots = []; runtime.effects = []; runtime.listeners.clear(); runtime.invoke.mockReset();
  runtime.invoke.mockImplementation((command: string) => Promise.resolve(command === "subprocess_status" ? false : undefined));
});
describe("Chat IPC interactions", () => {
  it("starts without arguments, appends deltas to one bubble, finishes and shows errors", async () => {
    let tree = render(Chat); await flush(); tree = render(Chat);
    await find(tree, e => content(e) === "Подключиться" && e.type === "button").props.onClick?.();
    expect(runtime.invoke).toHaveBeenCalledWith("subprocess_start");
    tree = render(Chat);
    find(tree, e => e.type === "textarea").props.onChange?.({ target: { value: "Привет" } });
    tree = render(Chat);
    find(tree, e => e.type === "textarea").props.onKeyDown?.({ key: "Enter", shiftKey: false, nativeEvent: { isComposing: false }, preventDefault: vi.fn() });
    await flush();
    expect(runtime.invoke).toHaveBeenCalledWith("subprocess_send", { message: "Привет" });
    runtime.listeners.get("chat-delta")?.({ payload: { text: "Добрый " } });
    runtime.listeners.get("chat-delta")?.({ payload: { text: "день" } });
    tree = render(Chat);
    expect(elements(tree).filter(e => e.props.className === "msg msg-assistant")).toHaveLength(1);
    expect(content(tree)).toContain("Добрый день");
    expect(find(tree, e => e.type === "textarea").props.disabled).toBe(true);
    runtime.listeners.get("chat-done")?.({ payload: {} });
    tree = render(Chat);
    expect(find(tree, e => e.type === "textarea").props.disabled).toBe(false);
    runtime.listeners.get("chat-error")?.({ payload: { message: "Сбой процесса" } });
    expect(content(render(Chat))).toContain("Сбой процесса");
  });
});
describe("Chat connection lifecycle", () => {
  it("keeps the UI disconnected when the process exits before start resolves", async () => {
    let tree = render(Chat); await flush(); tree = render(Chat);
    let resolveStart: () => void = () => {};
    runtime.invoke.mockImplementation((command: string) => command === "subprocess_start"
      ? new Promise<void>(resolve => { resolveStart = resolve; }) : Promise.resolve(false));
    const starting = find(tree, e => e.type === "button" && content(e) === "Подключиться").props.onClick?.();
    runtime.listeners.get("subprocess-exit")?.({ payload: null });
    resolveStart(); await starting;
    tree = render(Chat);
    expect(content(tree)).toContain("Подключиться");
    expect(find(tree, e => e.type === "textarea").props.disabled).toBe(true);
  });
  it("does not overwrite an exit event with an older status response", async () => {
    let resolveStatus: (running: boolean) => void = () => {};
    runtime.invoke.mockImplementation(() => new Promise<boolean>(resolve => { resolveStatus = resolve; }));
    render(Chat); await flush();
    runtime.listeners.get("subprocess-exit")?.({ payload: null });
    resolveStatus(true); await flush();
    expect(content(render(Chat))).toContain("Подключиться");
  });
});
describe("TextViewer IPC interactions", () => {
  it("translates in context and marks a word only after vocab_add succeeds", async () => {
    let tree = render(TextViewer);
    find(tree, e => e.type === "textarea").props.onChange?.({ target: { value: "Hello world." } });
    tree = render(TextViewer);
    await find(tree, e => e.type === "button" && content(e) === "Читать →").props.onClick?.();
    tree = render(TextViewer);
    await find(tree, e => e.type === "button" && content(e) === "Hello").props.onClick?.({ stopPropagation: vi.fn() });
    tree = render(TextViewer);
    const popup = find(tree, e => typeof e.type === "function");
    const viewerSlots = runtime.slots;
    runtime.slots = [];
    let resolveTranslation: (value: string) => void = () => {};
    let resolveSave: () => void = () => {};
    runtime.invoke.mockImplementation((command: string) => command === "translate"
      ? new Promise<string>(resolve => { resolveTranslation = resolve; })
      : new Promise<void>(resolve => { resolveSave = resolve; }));
    const popupComponent = () => (popup.type as (props: Props) => ReactElement)(popup.props);
    let popupTree = render(popupComponent);
    expect(content(popupTree)).toContain("Переводим…");
    expect(runtime.invoke).toHaveBeenCalledWith("translate", { word: "Hello", sentence: "Hello world." });
    resolveTranslation("Привет"); await flush(); popupTree = render(popupComponent);
    expect(content(popupTree)).toContain("Привет");
    const saving = find(popupTree, e => e.type === "button" && content(e) === "Отметить как незнакомое").props.onClick?.();
    expect(runtime.invoke).toHaveBeenCalledWith("vocab_add", { word: "Hello", sentence: "Hello world." });
    expect(content(render(popupComponent))).toContain("Сохраняем…");
    resolveSave(); await saving;
    runtime.slots = viewerSlots;
    tree = render(TextViewer);
    expect(find(tree, e => e.type === "button" && content(e) === "Hello").props.className).toContain("word-unknown");
  });
});

describe("Word popup lifecycle", () => {
  it("ignores a pending save completion after its popup is unmounted", async () => {
    let tree = render(TextViewer);
    find(tree, e => e.type === "textarea").props.onChange?.({ target: { value: "Hello world." } });
    tree = render(TextViewer);
    await find(tree, e => e.type === "button" && content(e) === "Читать →").props.onClick?.();
    tree = render(TextViewer);
    await find(tree, e => e.type === "button" && content(e) === "Hello").props.onClick?.({ stopPropagation: vi.fn() });
    const popup = find(render(TextViewer), e => typeof e.type === "function");
    runtime.slots = [];
    let resolveSave: () => void = () => {};
    runtime.invoke.mockImplementation((command: string) => command === "translate" ? Promise.resolve("Привет")
      : new Promise<void>(resolve => { resolveSave = resolve; }));
    const onSaved = vi.fn();
    const component = () => (popup.type as (props: Props) => ReactElement)({ ...popup.props, onSaved } as Props);
    const popupTree = render(component);
    const saving = find(popupTree, e => e.type === "button" && content(e) === "Отметить как незнакомое").props.onClick?.();
    runtime.cleanups.splice(0).forEach(cleanup => cleanup());
    resolveSave(); await saving;
    expect(onSaved).not.toHaveBeenCalled();
  });
});


describe("JERY shell actions", () => {
  it("connects once before sending a user initiated Today request", async () => {
    let jery: ReturnType<typeof useJery>;
    const Harness = () => { jery = useJery(); return <div />; };
    render(Harness); await flush(); render(Harness);
    await jery!.sendText("прочитай TickTick, что у меня сегодня");
    expect(runtime.invoke.mock.calls.map(call => call[0])).toEqual(["subprocess_status", "subprocess_start", "subprocess_send"]);
    render(Harness);
    expect(jery!.messages[0].text).toBe("прочитай TickTick, что у меня сегодня");
    runtime.listeners.get("chat-delta")?.({ payload: { text: "Сегодня" } });
    runtime.listeners.get("chat-done")?.({ payload: {} });
    render(Harness);
    expect(jery!.messages[1].text).toBe("Сегодня");
    expect(jery!.loading).toBe(false);
  });
  it("sends structured answer data while showing the user's intent in chat", async () => {
    let jery: ReturnType<typeof useJery>;
    const Harness = () => { jery = useJery(); return <div />; };
    render(Harness); await flush(); render(Harness);
    await jery!.sendText('Review result\nData: {"outcomes":[1,2]}', 'Review result');
    expect(runtime.invoke).toHaveBeenCalledWith("subprocess_send", { message: 'Review result\nData: {"outcomes":[1,2]}' });
    render(Harness);
    expect(jery!.messages[0].text).toBe('Review result');
  });
  it("does not send or connect twice while connection is pending", async () => {
    let jery: ReturnType<typeof useJery>;
    const Harness = () => { jery = useJery(); return <div />; };
    render(Harness); await flush(); render(Harness);
    let connected: () => void = () => {};
    runtime.invoke.mockImplementation((command: string) => command === "subprocess_start" ? new Promise<void>(resolve => { connected = resolve; }) : Promise.resolve());
    const first = jery!.sendText("one");
    await jery!.sendText("two"); connected(); await first;
    expect(runtime.invoke.mock.calls.filter(call => call[0] === "subprocess_start")).toHaveLength(1);
    expect(runtime.invoke.mock.calls.filter(call => call[0] === "subprocess_send")).toHaveLength(1);
  });
});


describe("Reading design interactions", () => {
  it("numbers sentences, keeps unknown progress neutral and requests a phrase breakdown", async () => {
    runtime.invoke.mockImplementation(() => Promise.resolve({ phrases: [{ text: "Hello world", ru: "Привет мир" }] }));
    let tree = render(TextViewer);
    find(tree, e => e.type === "textarea").props.onChange?.({ target: { value: "Hello world. Next sentence!" } });
    tree = render(TextViewer);
    await find(tree, e => e.type === "button" && content(e) === "Читать →").props.onClick?.();
    tree = render(TextViewer);
    expect(content(tree)).toContain("уровень —");
    expect(content(tree)).toContain("шаг — из 9");
    expect(elements(tree).filter(e => e.type === "sup")).toHaveLength(2);
    await find(tree, e => e.type === "button" && content(e) === "1").props.onClick?.();
    render(TextViewer); await flush(); tree = render(TextViewer);
    expect(runtime.invoke).toHaveBeenCalledWith("explain_sentence", { sentence: "Hello world." });
    expect(content(tree)).toContain("Привет мир");
    expect(elements(tree).some(e => e.props.className === "sentence sentence-selected")).toBe(true);
  });
  it("persists known status after adding the entry and handles unavailable speech", async () => {
    runtime.invoke.mockImplementation((command: string) => Promise.resolve(command === "translate" ? "Привет" : undefined));
    const saved = vi.fn();
    const component = () => WordPopup({ word: "Hello", sentence: "Hello world.", onSaved: saved, onClose: vi.fn() });
    let tree = render(component); await flush(); tree = render(component);
    await find(tree, e => e.type === "button" && content(e) === "known").props.onClick?.();
    expect(runtime.invoke.mock.calls.slice(-2)).toEqual([["vocab_add", { word: "Hello", sentence: "Hello world." }], ["vocab_set_status", { word: "Hello", status: "known" }]]);
    expect(saved).toHaveBeenCalledWith("known");
    tree = render(component);
    await find(tree, e => e.type === "button" && content(e).includes("Послушать")).props.onClick?.();
    expect(content(render(component))).toContain("Английский голос недоступен");
    expect(content(render(component))).toContain("добавлено в vocabulary/mywords-list.md");
  });
});

describe("Reading failure handling", () => {
  it("shows explanation failures without changing the reading text", async () => {
    runtime.invoke.mockRejectedValue(new Error("invalid JSON"));
    let tree = render(TextViewer);
    find(tree, e => e.type === "textarea").props.onChange?.({ target: { value: "Keep this." } });
    tree = render(TextViewer);
    await find(tree, e => e.type === "button" && content(e) === "Читать →").props.onClick?.();
    tree = render(TextViewer);
    await find(tree, e => e.type === "button" && content(e) === "1").props.onClick?.();
    render(TextViewer); await flush(); tree = render(TextViewer);
    expect(content(tree)).toContain("Не удалось разобрать: Error: invalid JSON");
    expect(content(tree)).toContain("Keep this.");
    runtime.invoke.mockResolvedValue({ phrases: [{ text: "Keep this", ru: "Сохрани это" }] });
    await find(tree, e => e.type === "button" && content(e) === "Повторить разбор").props.onClick?.();
    render(TextViewer); await flush();
    expect(content(render(TextViewer))).toContain("Сохрани это");
  });
  it("does not report a status saved when the status command fails", async () => {
    runtime.invoke.mockImplementation((command: string) => command === "vocab_set_status" ? Promise.reject("write failed") : Promise.resolve("Привет"));
    const saved = vi.fn();
    const component = () => WordPopup({ word: "Hello", sentence: "Hello.", onSaved: saved, onClose: vi.fn() });
    const tree = render(component);
    await find(tree, e => e.type === "button" && content(e) === "focus").props.onClick?.();
    expect(saved).not.toHaveBeenCalled();
    expect(content(render(component))).toContain("Не удалось сохранить: write failed");
  });
  it("uses an available English voice for pronunciation", async () => {
    const voice = { lang: "en-GB" };
    const speak = vi.fn();
    vi.stubGlobal("window", { speechSynthesis: { getVoices: () => [{ lang: "ru-RU" }, voice], cancel: vi.fn(), speak } });
    vi.stubGlobal("SpeechSynthesisUtterance", class { text: string; constructor(text: string) { this.text = text; } });
    try {
      const tree = render(() => WordPopup({ word: "Hello", sentence: "Hello.", onSaved: vi.fn(), onClose: vi.fn() }));
      await find(tree, e => e.type === "button" && content(e).includes("Послушать")).props.onClick?.();
      expect(speak).toHaveBeenCalledWith(expect.objectContaining({ text: "Hello", lang: "en-GB", voice }));
    } finally { vi.unstubAllGlobals(); }
  });
});


describe("learning state polling", () => {
  it("initializes instructions, refreshes files and disposes its timer", async () => {
    let tick: () => void = () => {};
    const clear = vi.fn();
    vi.stubGlobal("window", { setInterval: (callback: () => void) => { tick = callback; return 42; }, clearInterval: clear });
    let state: ReturnType<typeof useVaultState>;
    let result: LearningSnapshot = { state: { version: 1, subjects: [] }, today: null, errors: [] as string[] };
    runtime.invoke.mockImplementation((command: string) => Promise.resolve(command === "learning_snapshot" ? result : undefined));
    const Harness = () => { state = useVaultState(); return <div />; };
    try {
      render(Harness); await flush(); render(Harness);
      expect(runtime.invoke).toHaveBeenCalledWith("learning_init", { prompt: expect.stringContaining(".mellorin/state.json") });
      expect(state!.snapshot.state?.subjects).toEqual([]);
      expect(state!.loading).toBe(false);
      result = { state: null, today: null, errors: ["invalid JSON"] };
      tick(); await flush(); render(Harness);
      expect(state!.snapshot.errors).toEqual(["invalid JSON"]);
      runtime.cleanups.splice(0).forEach(cleanup => cleanup());
      expect(clear).toHaveBeenCalledWith(42);
    } finally { vi.unstubAllGlobals(); }
  });
});


describe("JERY structured stream lifecycle", () => {
  it("hides fragmented JSON, exposes validated material, and preserves it after completion", async () => {
    const { useJery } = await import("./useJery");
    let current: ReturnType<typeof useJery>;
    const view = () => { current = useJery(); return <div />; };
    render(view); await flush(); render(view);
    await current!.sendText("demo");
    const response = 'Hello\n```mellorin\n{"type":"quiz","props":{"question":"Demo","choices":["yes","no"],"answer":"yes"}}\n```\nReady';
    for (const char of response) {
      runtime.listeners.get("chat-delta")?.({ payload: { text: char } });
      render(view);
      expect(current!.messages[1].text).not.toContain('"type"');
      expect(current!.messages[1].text).not.toContain('mellorin');
    }
    expect(current!.reply.blocks[0].type).toBe("quiz");
    expect(current!.reply.text).toBe("Hello\nReady");
    runtime.listeners.get("chat-done")?.({ payload: {} }); render(view);
    expect(current!.loading).toBe(false);
    expect(current!.reply.blocks).toHaveLength(1);
    await current!.sendText("next"); render(view);
    expect(current!.reply.blocks).toHaveLength(0);
    runtime.listeners.get("chat-delta")?.({ payload: { text: '```mellorin\n{}' } });
    runtime.listeners.get("chat-error")?.({ payload: { message: 'interrupted' } }); render(view);
    expect(current!.reply.errors).toHaveLength(1);
    expect(current!.messages[3].text).not.toContain('{}');
  });
});
