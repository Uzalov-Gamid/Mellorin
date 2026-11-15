import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

export type OutputHandler = (line: string) => void;
export type ExitHandler = () => void;

export async function startSubprocess(claudePath: string): Promise<void> {
  await invoke("subprocess_start", { claudePath });
}

export async function sendMessage(message: string): Promise<void> {
  await invoke("subprocess_send", { message });
}

export async function stopSubprocess(): Promise<void> {
  await invoke("subprocess_stop");
}

export async function getStatus(): Promise<boolean> {
  return invoke("subprocess_status");
}

export function onOutput(handler: OutputHandler): Promise<UnlistenFn> {
  return listen<string>("subprocess-output", (e) => handler(e.payload));
}

export function onExit(handler: ExitHandler): Promise<UnlistenFn> {
  return listen<void>("subprocess-exit", () => handler());
}
