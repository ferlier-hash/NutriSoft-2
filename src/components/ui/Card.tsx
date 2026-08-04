import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  highlighted?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, highlighted = false }) => {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-[#FFFFFF] border border-[#E2E9EC] rounded-2xl p-5 shadow-[0_2px_8px_rgba(21,27,34,0.03)] transition-all',
          highlighted && 'bg-[linear-gradient(135deg,#E9F8F7_0%,#EEF7FB_58%,#FCF9E8_100%)] border-[#BDE9EA]',
          className
        )
      )}
    >
      {children}
    </div>
  );
};
