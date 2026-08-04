import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  highlighted?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', highlighted = false }) => {
  return (
    <div
      className={`rounded-2xl p-5 border transition-all duration-200 ${
        highlighted
          ? 'bg-[linear-gradient(135deg,#E9F8F7_0%,#EEF7FB_58%,#FCF9E8_100%)] border-border-subtle shadow-xs'
          : 'bg-surface border-border-subtle hover:border-border-hover shadow-2xs'
      } ${className}`}
    >
      {children}
    </div>
  );
};
