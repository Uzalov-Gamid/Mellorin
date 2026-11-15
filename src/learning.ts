import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { REFRESH_PROMPT } from "./prompts";
export interface TrailItem { id: string; label: string; status: "passed" | "current" | "future"; text?: string }
export interface SubjectState { id: string; name: string; percent?: number; stage?: string; next?: string; trail: TrailItem[]; tails?: { title: string; date?: string }[] }
export interface LearningState {
  version: 1; subjects: SubjectState[];
  dates?: { title: string; date?: string }[];
  sessions?: { date: string; subject: string; skill?: string; count?: number }[];
  repeats?: { title: string; subject: string; count?: number; screen?: string }[];
  errors?: { title: string; subject: string; count: number; screen?: string }[];
}
export interface TodayTask { id: string; title: string; subject: string; skill?: string; hint?: string; time?: string; tag?: string; done: boolean; completedAt?: string }
export interface TodayState { version: 1; date: string; tasks: TodayTask[] }
export interface LearningSnapshot { state: LearningState | null; today: TodayState | null; errors: string[] }
export interface VaultEntry { name: string; is_dir: boolean }
export const vaultReadText = (relPath: string): Promise<string> => invoke("vault_read_text", { relPath });
export const vaultList = (relDir: string): Promise<VaultEntry[]> => invoke("vault_list", { relDir });
export const learningSnapshot = (): Promise<LearningSnapshot> => invoke("learning_snapshot");
export function useVaultState() {
  const [snapshot, setSnapshot] = useState<LearningSnapshot>({ state: null, today: null, errors: [] });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true, pending = false;
    let initError: string | null = null;
    async function refresh() {
      if (pending) return; pending = true;
      try {
        const result = await learningSnapshot();
        if (active) setSnapshot({ ...result, errors: [...(initError ? [initError] : []), ...result.errors] });
      } catch (reason) { if (active) setSnapshot({ state: null, today: null, errors: [String(reason)] }); }
      finally { pending = false; if (active) setLoading(false); }
    }
    void invoke("learning_init", { prompt: REFRESH_PROMPT }).catch((reason: unknown) => { initError = `Не удалось записать инструкцию JERY: ${String(reason)}`; }).then(refresh);
    const timer = window.setInterval(() => { void refresh(); }, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  return { snapshot, loading };
}
