import { useMemo, useState } from 'react';
import type { Jery } from '../useJery';
import { ChangePreview } from './ChangePreview';
import { ChangeHistory } from './ChangeHistory';
import type { ChangeProposal } from './proposal';

export function JeryChanges({ jery }: { jery: Jery }) {
  const serialized = JSON.stringify(jery.reply.changes ?? []);
  const proposals = useMemo(() => JSON.parse(serialized) as ChangeProposal[], [serialized]);
  const [revision, setRevision] = useState(0);
  const [history, setHistory] = useState(false);
  function changed() {
    window.dispatchEvent(new Event('mellorin-format-changed'));
    setRevision(value => value + 1);
  }
  return <>
    {proposals.map((proposal, index) => <ChangePreview key={`${jery.messages.length}:${serialized}:${index}`} proposal={proposal} streaming={jery.loading || jery.busy}
      onApplied={changed} onChange={proposal => { void jery.sendText(`Измени предложение для ${proposal.target}. Сначала спроси, какую правку я хочу. Ничего не применяй.`); }} />)}
    <button className="btn-sm" aria-expanded={history} onClick={() => setHistory(value => !value)}>История форматов</button>
    {history && <ChangeHistory revision={revision} onApplied={changed} />}
  </>;
}
