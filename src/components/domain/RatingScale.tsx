import React from 'react';

interface RatingScaleProps {
  name: string;
  legend: string;
  value: number;
  onChange: (val: number) => void;
  error?: string;
}

export const RatingScale: React.FC<RatingScaleProps> = ({ name, legend, value, onChange, error }) => {
  const options = [1, 2, 3, 4, 5];

  return (
    <fieldset className="space-y-2 border-0 p-0 m-0">
      <legend className="text-sm font-medium text-[#151B22] mb-1">{legend}</legend>

      <div className="flex items-center justify-between gap-2 max-w-sm">
        {options.map(num => {
          const isSelected = value === num;
          const inputId = `${name}-opt-${num}`;

          return (
            <label
              key={num}
              htmlFor={inputId}
              className={`flex-1 flex items-center justify-center min-w-[44px] min-h-[44px] rounded-2xl font-bold text-base border transition-all cursor-pointer select-none ${
                isSelected
                  ? 'bg-[linear-gradient(135deg,#55AEB8_0%,#357984_100%)] text-white border-[#357984] shadow-md scale-105'
                  : 'bg-[#FFFFFF] text-[#151B22] border-[#E2E9EC] hover:bg-[#F2F7F8] hover:border-[#CCD9DE]'
              }`}
            >
              <input
                type="radio"
                id={inputId}
                name={name}
                value={num}
                checked={isSelected}
                onChange={() => onChange(num)}
                aria-describedby={error ? `${name}-error` : undefined}
                className="sr-only" // Oculto visualmente pero accesible por lectores de pantalla y teclado
              />
              <span>{num}</span>
            </label>
          );
        })}
      </div>

      {error && (
        <p id={`${name}-error`} className="text-xs text-[#C95F59] mt-1 font-medium">
          {error}
        </p>
      )}
    </fieldset>
  );
};
