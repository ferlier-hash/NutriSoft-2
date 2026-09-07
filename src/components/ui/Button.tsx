import React from 'react';
import { Slot } from '@radix-ui/react-slot';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'brand' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  asChild?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  asChild = false,
  className = '',
  children,
  ...props
}) => {
  const Component = asChild ? Slot : 'button';

  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none outline-none focus-visible:ring-2 focus-visible:ring-[#357984] focus-visible:ring-offset-2 min-h-[44px] min-w-[44px] px-4';

  const variantStyles = {
    primary:
      'bg-[image:var(--grad-primary-button)] text-[#151B22] font-semibold hover:opacity-95 shadow-xs',
    brand: 'bg-brand-primary text-[#151B22] font-semibold hover:bg-brand-strong hover:text-white shadow-xs',
    secondary: 'bg-[#F2F7F8] text-[#151B22] hover:bg-[#E2E9EC] border border-[#E2E9EC]',
    outline: 'border border-[#CCD9DE] text-[#151B22] hover:bg-[#F2F7F8]',
    ghost: 'text-[#66727D] hover:text-[#151B22] hover:bg-[#F2F7F8]',
    destructive: 'bg-[#FCEBEA] text-[#C95F59] hover:bg-[#F8C4C1] border border-[#F8C4C1]',
  };

  const sizeStyles = {
    sm: 'text-xs py-1.5 px-3 min-h-[36px]',
    md: 'text-xs py-2 px-4 min-h-[44px]',
    lg: 'text-sm py-2.5 px-5 min-h-[48px]',
  };

  return (
    <Component
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};
