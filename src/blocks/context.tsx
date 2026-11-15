import { createContext, useContext } from 'react';
import type { Reading } from '../TextViewer';
import type { Data } from './schema';
export interface BlockContextValue { canSend?: boolean; intentError?: string | null; reading: Reading; message: string; data: Data; intent: (intent: string, value: Data) => void }
export const BlockContext = createContext<BlockContextValue | null>(null);
export function useBlocks() {
  const context = useContext(BlockContext);
  if (!context) throw Error('Blocks require BlockContext');
  return context;
}
