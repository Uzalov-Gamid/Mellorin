import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export interface Config {
  vault_path: string;
  claude_path: string;
  theme: string;
  jery_can_edit_vault: boolean;
  jery_ticktick: TickTickMode;
}
export interface ChatDelta { text: string }
export interface ChatError { message: string }
export type ChatDone = Record<string, never>;

export const getConfig = (): Promise<Config> => invoke<Config>("config_get");
export const startSubprocess = (): Promise<void> => invoke<void>("subprocess_start");
export const sendMessage = (message: string): Promise<void> => invoke<void>("subprocess_send", { message });
export const stopSubprocess = (): Promise<void> => invoke<void>("subprocess_stop");
export const getStatus = (): Promise<boolean> => invoke<boolean>("subprocess_status");
export const translate = (word: string, sentence: string): Promise<string> => invoke<string>("translate", { word, sentence });
export const vocabAdd = (word: string, sentence: string): Promise<void> => invoke<void>("vocab_add", { word, sentence });
export const onChatDelta = (handler: (payload: ChatDelta) => void): Promise<UnlistenFn> => listen<ChatDelta>("chat-delta", e => handler(e.payload));
export const onChatDone = (handler: () => void): Promise<UnlistenFn> => listen<ChatDone>("chat-done", () => handler());
export const onChatError = (handler: (payload: ChatError) => void): Promise<UnlistenFn> => listen<ChatError>("chat-error", e => handler(e.payload));
export const onExit = (handler: () => void): Promise<UnlistenFn> => listen<null>("subprocess-exit", () => handler());

export interface VaultSubject { name: string; skills: string[] }
export const vaultSubjects = (): Promise<VaultSubject[]> => invoke<VaultSubject[]>("vault_subjects");

export interface Explanation { phrases: { text: string; ru: string }[] }
export type VocabStatus = "learning" | "focus" | "known";
export const explainSentence = (sentence: string): Promise<Explanation> => invoke<Explanation>("explain_sentence", { sentence });
export const vocabSetStatus = (word: string, status: VocabStatus): Promise<void> => invoke<void>("vocab_set_status", { word, status });

export const setEditPermission = (enabled: boolean): Promise<void> => invoke("config_set_edit_permission", { enabled });

export type TickTickMode = "full" | "read" | "off";
export type TickTickStatus = "connected" | "needs_authentication" | "not_found" | "unavailable";
export const setTickTick = (mode: TickTickMode): Promise<void> => invoke("config_set_ticktick", { mode });
export const getTickTickStatus = (): Promise<TickTickStatus> => invoke("ticktick_status");
