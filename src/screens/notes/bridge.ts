import { invoke } from "@tauri-apps/api/core";
import type { Catalog } from "./model";
let pending: Promise<Catalog> | undefined;
export const loadNotes = (refresh = false) => {
  if (refresh || !pending) pending = invoke<Catalog>("notes_catalog").catch(error => { pending = undefined; throw error; });
  return pending;
};
export const loadAttachment = (path: string) => invoke<{ mime: string; bytes: number[] }>("notes_attachment", { path });
