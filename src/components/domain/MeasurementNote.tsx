import { useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import { Dialog } from '../ui/Dialog';

/** Compact, keyboard/touch accessible access to a revision's optional note. */
export function MeasurementNote({ note }: { note?: string | null }) {
  const [open, setOpen] = useState(false);
  if (!note?.trim()) return null;
  return <>
    <button type="button" aria-label="Ver nota de la medición" aria-haspopup="dialog" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong">
      <span className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface-subtle px-2 py-0.5 text-[10px] font-semibold tracking-wide text-text-secondary hover:text-brand-strong">
        <MessageSquareText className="h-3 w-3" aria-hidden="true" />NOTA
      </span>
    </button>
    <Dialog isOpen={open} onClose={() => setOpen(false)} title="Nota de la medición">
      <p className="whitespace-pre-wrap break-words text-sm text-text-primary">{note}</p>
    </Dialog>
  </>;
}
