import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  highlighted?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', highlighted = false, onClick }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      className={`rounded-2xl p-5 border transition-all duration-200 ${
        highlighted
          ? 'bg-[linear-gradient(135deg,#E9F8F7_0%,#EEF7FB_58%,#FCF9E8_100%)] border-[#BDE9EA] shadow-xs'
          : 'bg-[#FFFFFF] border-[#E2E9EC] hover:border-[#CCD9DE] shadow-2xs'
      } ${onClick ? 'outline-none focus-visible:ring-2 focus-visible:ring-[#357984]' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
