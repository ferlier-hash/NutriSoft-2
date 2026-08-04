import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  highlighted?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', highlighted = false, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-5 border transition-all duration-200 ${
        highlighted
          ? 'bg-[linear-gradient(135deg,#E9F8F7_0%,#EEF7FB_58%,#FCF9E8_100%)] border-[#BDE9EA] shadow-xs'
          : 'bg-[#FFFFFF] border-[#E2E9EC] hover:border-[#CCD9DE] shadow-2xs'
      } ${className}`}
    >
      {children}
    </div>
  );
};
