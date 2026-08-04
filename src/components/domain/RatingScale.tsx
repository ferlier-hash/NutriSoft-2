import React from 'react';

interface RatingScaleProps {
  name: string;
  legend: string;
  value: number | null;
  onChange: (val: number) => void;
  error?: string;
}

export const RatingScale: React.FC<RatingScaleProps> = ({ name, legend, value, onChange, error }) => {
  const options = [1, 2, 3, 4, 5];

  return (
    <fieldset aria-invalid={!!error} className="space-y-2 border-0 p-0 m-0">
      <legend className="text-sm font-semibold text-text-primary mb-1">{legend}</legend>

      <div className="flex items-center justify-between gap-2 max-w-sm">
        {options.map(num => {
          const isSelected = value === num;
          const inputId = `${name}-opt-${num}`;

          return (
            <label
              key={num}
              htmlFor={inputId}
              className={`flex-1 flex items-center justify-center min-w-[44px] min-h-[44px] rounded-2xl font-bold text-base border transition-all cursor-pointer select-none focus-within:ring-2 focus-within:ring-brand-strong focus-within:ring-offset-2 ${
                isSelected
                  ? 'bg-brand-strong text-white border-brand-strong shadow-md scale-105'
                  : 'bg-surface text-text-primary border-border-subtle hover:bg-surface-subtle hover:border-border-hover'
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
                className="sr-only"
              />
              <span>{num}</span>
            </label>
          );
        })}
      </div>

      {error && (
        <p id={`${name}-error`} className="text-xs text-[#902A24] font-semibold mt-1">
          {error}
        </p>
      )}
    </fieldset>
  );
};
