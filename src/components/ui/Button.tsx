import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'brand';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#357984] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer min-h-[44px] px-4 py-2 text-sm';

  const variants = {
    // Primary usa el gradiente claro autorizado con texto oscuro #151B22
    primary:
      'bg-[linear-gradient(90deg,#AEE5E8_0%,#CDEAF5_52%,#F5E6A4_100%)] text-[#151B22] font-semibold hover:opacity-95 shadow-sm active:scale-[0.98]',
    brand:
      'bg-[#55AEB8] text-[#151B22] font-semibold hover:bg-[#357984] hover:text-white shadow-sm active:scale-[0.98]',
    secondary:
      'bg-[#F2F7F8] text-[#151B22] border border-[#E2E9EC] hover:bg-[#EDF8F7] hover:border-[#CCD9DE]',
    outline:
      'bg-transparent text-[#151B22] border border-[#E2E9EC] hover:bg-[#F2F7F8] hover:border-[#CCD9DE]',
    ghost:
      'bg-transparent text-[#66727D] hover:text-[#151B22] hover:bg-[#F2F7F8]',
    destructive:
      'bg-[#FCEBEA] text-[#C95F59] border border-[#F8C4C1] hover:bg-[#C95F59] hover:text-white',
  };

  const sizes = {
    sm: 'text-xs min-h-[36px] px-3 py-1.5 rounded-lg',
    md: 'text-sm min-h-[44px] px-4 py-2.5 rounded-xl',
    lg: 'text-base min-h-[50px] px-6 py-3 rounded-xl',
  };

  return (
    <button
      type={type}
      className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
      {...props}
    >
      {children}
    </button>
  );
};
