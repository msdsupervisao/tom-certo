// app/components/ui/Input.tsx
'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  rotulo?: string;
  erro?: string;
  sucesso?: string;
  dica?: string;
  icone?: React.ReactNode;
}

/**
 * Input base com 3 estados de feedback visual: neutro, erro e sucesso.
 * O estado é determinado pela presença de `erro` ou `sucesso` - nunca os
 * dois ao mesmo tempo, já que são mutuamente exclusivos por definição.
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ rotulo, erro, sucesso, dica, icone, className = '', id, ...props }, ref) => {
    const inputId = id || props.name;
    const corDaBorda = erro
      ? 'border-[var(--color-error)] focus:border-[var(--color-error)]'
      : sucesso
        ? 'border-[var(--color-success)] focus:border-[var(--color-success)]'
        : 'border-border focus:border-[var(--color-secondary)]';

    return (
      <div className="w-full">
        {rotulo && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-text">
            {rotulo}
          </label>
        )}
        <div className="relative">
          {icone && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim">
              {icone}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full rounded-[var(--radius-md)] border-2 bg-panel px-4 py-2.5 text-base text-text outline-none transition-colors placeholder:text-text-dim ${corDaBorda} ${icone ? 'pl-10' : ''} ${className}`}
            aria-invalid={!!erro}
            aria-describedby={erro ? `${inputId}-erro` : dica ? `${inputId}-dica` : undefined}
            {...props}
          />
        </div>
        {erro && (
          <p id={`${inputId}-erro`} className="mt-1.5 text-sm text-[var(--color-error)]">
            {erro}
          </p>
        )}
        {!erro && sucesso && (
          <p className="mt-1.5 text-sm text-[var(--color-success)]">{sucesso}</p>
        )}
        {!erro && !sucesso && dica && (
          <p id={`${inputId}-dica`} className="mt-1.5 text-sm text-text-dim">
            {dica}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
