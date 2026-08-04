import React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';

interface SwitchProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({
  id,
  checked,
  onCheckedChange,
  label,
  disabled = false,
}) => {
  return (
    <div className="inline-flex items-center gap-2">
      <div className="relative inline-flex items-center justify-center min-h-[44px] min-w-[44px]">
        <SwitchPrimitive.Root
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          className="w-11 h-6 bg-[#CCD9DE] data-[state=checked]:bg-[#55AEB8] rounded-full relative transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#357984] focus-visible:ring-offset-2 shrink-0 p-0.5"
        >
          <SwitchPrimitive.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform duration-100 translate-x-0.5 data-[state=checked]:translate-x-5 shadow-sm" />
        </SwitchPrimitive.Root>
      </div>
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-[#151B22] cursor-pointer">
          {label}
        </label>
      )}
    </div>
  );
};
