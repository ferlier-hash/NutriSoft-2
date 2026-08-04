import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'high' | 'medium' | 'normal' | 'active' | 'suspended' | 'pending' | 'info';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'normal', className }) => {
  const baseStyles = 'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full tracking-wide';

  const variants = {
    high: 'bg-[#FCEBEA] text-[#C95F59] border border-[#F8C4C1]',
    medium: 'bg-[#FDF6E2] text-[#C98A27] border border-[#F6E5B3]',
    normal: 'bg-[#EDF8F7] text-[#357984] border border-[#BDE9EA]',
    active: 'bg-[#E8F5EE] text-[#39835A] border border-[#BDE3CC]',
    suspended: 'bg-[#FCEBEA] text-[#C95F59] border border-[#F8C4C1]',
    pending: 'bg-[#FDF6E2] text-[#C98A27] border border-[#F6E5B3]',
    info: 'bg-[#EAEFFC] text-[#5267C7] border border-[#C6D4F8]',
  };

  const getIcon = () => {
    switch (variant) {
      case 'high':
      case 'suspended':
        return <AlertCircle className="w-3 h-3" aria-hidden="true" />;
      case 'medium':
      case 'pending':
        return <AlertTriangle className="w-3 h-3" aria-hidden="true" />;
      case 'active':
        return <CheckCircle2 className="w-3 h-3" aria-hidden="true" />;
      case 'info':
      case 'normal':
      default:
        return <Info className="w-3 h-3" aria-hidden="true" />;
    }
  };

  return (
    <span className={twMerge(clsx(baseStyles, variants[variant], className))}>
      {getIcon()}
      {children}
    </span>
  );
};
