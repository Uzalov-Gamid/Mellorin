import { invoke } from '@tauri-apps/api/core';
import { parseChange, type ChangeProposal } from './proposal';
export interface ChangePreviewData { proposal: ChangeProposal; process_after: string }
export interface ChangeRecord { id: string; target: string; process: string; before: string | null; after: string | null; process_before: string | null; process_after: string | null }
export const previewChange = (proposal: ChangeProposal) => invoke<ChangePreviewData>('change_preview', { proposal: parseChange(proposal) });
export const applyChange = (proposal: ChangeProposal) => invoke<ChangeRecord>('change_apply', { proposal: parseChange(proposal) });
export const rollbackChange = (id: string) => invoke<ChangeRecord>('change_rollback', { id });
export const recoverChange = () => invoke<void>('change_recover');
export const changeHistory = () => invoke<ChangeRecord[]>('change_history');
