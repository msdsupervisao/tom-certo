// app/components/ui/Button.tsx
'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

type Variante = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Tamanho = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamanho?: Tamanho;
  carregando?: boolean;
  icone?: ReactNode;
  children: ReactNode;
}

const ESTILOS_VARIANTE: Record<Variante, string> = {
  primary: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]',
  secondary: 'bg-[var(--color-secondary)] text-white hover:bg-[var(--color-secondary-hover)]',
  outline: 'border border-border bg-transparent text-text hover:bg-bg-soft',
  ghost: 'bg-transparent text-text hover:bg-bg-soft',
  danger: 'bg-[var(--color-error)] text-white hover:opacity-90',
};

const ESTILOS_TAMANHO: Record<Tamanho, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

/**
 * Botão base do design system. Cobre os 5 estados de uso mais comuns:
 * variante visual (hierarquia de ação), tamanho, loading e ícone opcional.
 * Foco visível sempre presente — não removemos o outline padrão de acessibilidade.
 */
export default function Button({
  variante = 'primary',
  tamanho = 'md',
  carregando = false,
  icone,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || carregando}
      className={`inline-flex items-center justify-center rounded-[var(--radius-md)] font-semibold transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary)] disabled:cursor-not-allowed disabled:opacity-40 ${ESTILOS_VARIANTE[variante]} ${ESTILOS_TAMANHO[tamanho]} ${className}`}
      {...props}
    >
      {carregando ? (
        <Spinner />
      ) : (
        icone && <span className="shrink-0">{icone}</span>
      )}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
