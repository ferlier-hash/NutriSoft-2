import { useState, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from './Button';
import { Dialog } from './Dialog';

export function MobileActions({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const actionTitle = title.startsWith('Acciones de ') ? title : `Acciones de ${title}`;
  return <div className={`sm:hidden ${className}`}>
    <Button type="button" size="sm" variant="secondary" aria-label={actionTitle} onClick={() => setOpen(true)}>
      <MoreHorizontal className="h-5 w-5"/>Acciones
    </Button>
    <Dialog isOpen={open} onClose={() => setOpen(false)} title={actionTitle} description="Elegí qué querés hacer.">
      <div className="grid gap-2" onClickCapture={() => setOpen(false)}>{children}</div>
    </Dialog>
  </div>;
}
