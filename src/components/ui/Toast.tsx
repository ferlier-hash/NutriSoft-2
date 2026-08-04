import React, { createContext, useContext, useState } from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
}

interface ToastContextType {
  showToast: (title: string, description?: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (title: string, description?: string, type: ToastType = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setToasts(prev => [...prev, { id, title, description, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}

        <ToastPrimitive.Viewport
          aria-label="Notificaciones del sistema"
          className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm m-0 list-none outline-none pointer-events-none"
        >
          {toasts.map(toast => (
            <ToastPrimitive.Root
              key={toast.id}
              onOpenChange={open => {
                if (!open) removeToast(toast.id);
              }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl transition-all duration-200 w-full ${
                toast.type === 'error'
                  ? 'bg-[#FCEBEA] border-[#F8C4C1] text-[#902A24]'
                  : toast.type === 'info'
                  ? 'bg-[#EAEFFC] border-[#C6D4F8] text-[#2D3F99]'
                  : 'bg-[#E8F5EE] border-[#BDE3CC] text-[#1E5235]'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {toast.type === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-[#902A24]" />
                ) : toast.type === 'info' ? (
                  <Info className="w-5 h-5 text-[#2D3F99]" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-[#1E5235]" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <ToastPrimitive.Title className="font-bold text-xs text-[#151B22]">
                  {toast.title}
                </ToastPrimitive.Title>
                {toast.description && (
                  <ToastPrimitive.Description className="text-xs text-[#66727D] mt-0.5 break-words">
                    {toast.description}
                  </ToastPrimitive.Description>
                )}
              </div>

              <ToastPrimitive.Close
                aria-label="Cerrar notificación"
                className="p-1 rounded-full text-[#66727D] hover:text-[#151B22] hover:bg-black/5 min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          ))}
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe ser utilizado dentro de ToastProvider');
  }
  return context;
};
