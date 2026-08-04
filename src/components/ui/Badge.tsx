import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'high' | 'medium' | 'normal' | 'active' | 'suspended' | 'pending' | 'info';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'info', className = '' }) => {
  const styles = {
    high: 'bg-[#FCEBEA] text-[#902A24] border-[#F8C4C1]',
    medium: 'bg-[#FDF6E2] text-[#845712] border-[#F4E3B4]',
    normal: 'bg-[#E8F5EE] text-[#1E5235] border-[#BDE3CC]',
    active: 'bg-[#E8F5EE] text-[#1E5235] border-[#BDE3CC]',
    suspended: 'bg-[#FCEBEA] text-[#902A24] border-[#F8C4C1]',
    pending: 'bg-[#FDF6E2] text-[#845712] border-[#F4E3B4]',
    info: 'bg-[#EAEFFC] text-[#2D3F99] border-[#C6D4F8]',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
