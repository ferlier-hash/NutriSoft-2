import React, { useId } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
}) => {
  const generatedId = useId();
  const descriptionId = description ? `dialog-desc-${generatedId}` : undefined;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#151B22]/40 backdrop-blur-xs animate-fade-in" />
        <DialogPrimitive.Content
          aria-describedby={descriptionId}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2rem)] sm:w-full max-w-lg max-h-[85vh] overflow-y-auto bg-surface border border-border-subtle rounded-2xl shadow-xl p-6 outline-none"
        >
          <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
            <div>
              <DialogPrimitive.Title className="text-lg font-bold text-text-primary">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description id={descriptionId} className="text-xs text-text-secondary mt-0.5">
                  {description}
                </DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">
                  {title}
                </DialogPrimitive.Description>
              )}
            </div>

            <DialogPrimitive.Close
              aria-label="Cerrar ventana modal"
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-subtle rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-strong"
            >
              <X className="w-5 h-5" />
            </DialogPrimitive.Close>
          </div>

          <div className="pt-4">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
