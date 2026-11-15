import { useReading } from '../TextViewer';
import type { Jery } from '../useJery';
import { BlockContext } from './context';
import { BlockView } from './index';

export function JeryBlocks({ jery }: { jery: Jery }) {
  const reading = useReading();
  return <BlockContext.Provider value={{ canSend: jery.ready && !jery.busy && !jery.loading, intentError: jery.error, reading, message: jery.reply.text, data: null, intent: (intent, value) => { void jery.sendText(`${intent}\nДанные ответа: ${JSON.stringify(value)}`, intent); } }}>
    <section aria-label="Материал JERY" className="jery-blocks">
      {jery.reply.errors.map((error, i) => <p key={i} role="alert">{error}</p>)}
      <fieldset disabled={!jery.ready || jery.busy || jery.loading} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        {jery.reply.blocks.map((block, i) => <BlockView key={`${i}:${JSON.stringify(block)}`} block={block} />)}
      </fieldset>
    </section>
  </BlockContext.Provider>;
}
