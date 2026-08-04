import React from 'react';
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
  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#151B22]/40 backdrop-blur-xs animate-fade-in" />
        <DialogPrimitive.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-[#FFFFFF] border border-[#E2E9EC] rounded-2xl shadow-xl p-6 outline-none">
          <div className="flex items-center justify-between pb-4 border-b border-[#E2E9EC]">
            <div>
              <DialogPrimitive.Title className="text-lg font-bold text-[#151B22]">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-xs text-[#66727D] mt-0.5">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>

            <DialogPrimitive.Close
              aria-label="Cerrar ventana modal"
              className="p-2 text-[#66727D] hover:text-[#151B22] hover:bg-[#F2F7F8] rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
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
