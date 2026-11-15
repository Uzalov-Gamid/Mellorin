import { invoke } from "@tauri-apps/api/core";
export type Preferences = { vault_path: string; claude_path: string; theme: string; text_size: number };
export type Diagnostics = { data_directory: string; vault_found: boolean; learning_found: boolean; cli_available: boolean };
export const saveSettings = (preferences: Preferences): Promise<void> => invoke("settings_save", { preferences });
export const getDiagnostics = (): Promise<Diagnostics> => invoke("settings_diagnostics");
