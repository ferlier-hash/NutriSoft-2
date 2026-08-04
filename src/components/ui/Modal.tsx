import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151B22]/40 backdrop-blur-sm animate-fade-in"
    >
      <div
        className="relative w-full max-w-lg bg-[#FFFFFF] border border-[#E2E9EC] rounded-2xl shadow-xl overflow-hidden p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E9EC]">
          <h2 id="modal-title" className="text-lg font-semibold text-[#151B22]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana modal"
            className="p-2 text-[#66727D] hover:text-[#151B22] hover:bg-[#F2F7F8] rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="pt-4">{children}</div>
      </div>
    </div>
  );
};
