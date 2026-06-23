// app/components/ui/Card.tsx
'use client';

import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interativo?: boolean; // aplica hover de elevação - usar quando o card todo é clicável
  padding?: 'sm' | 'md' | 'lg';
}

const PADDING: Record<NonNullable<CardProps['padding']>, string> = {
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
};

export default function Card({
  children,
  interativo = false,
  padding = 'md',
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] border border-border bg-panel shadow-[var(--shadow-sm)] ${PADDING[padding]} ${
        interativo
          ? 'cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--color-secondary)] hover:shadow-[var(--shadow-md)]'
          : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
