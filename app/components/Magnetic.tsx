'use client';

import { useRef, type CSSProperties, type ReactNode } from 'react';

interface MagneticProps {
  children: ReactNode;
  /** Fração do deslocamento do cursor aplicada ao elemento (0–1). */
  strength?: number;
  /** Deslocamento máximo em px, para não sair "voando". */
  max?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Envolve um filho e o "puxa" levemente na direção do cursor enquanto o
 * mouse passa por cima — efeito magnético sutil inspirado no OriginKit.
 *
 * Usa apenas eventos de mouse, então em telas de toque nada acontece
 * (o dedo não gera hover) e o layout fica intacto. O retorno é suave via
 * transição CSS. Respeita prefers-reduced-motion ignorando o movimento.
 */
export default function Magnetic({
  children,
  strength = 0.28,
  max = 14,
  className,
  style,
}: MagneticProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduzido = useRef<boolean>(
    typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );

  function mover(e: React.MouseEvent) {
    const el = ref.current;
    if (!el || reduzido.current) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const x = Math.max(-max, Math.min(max, dx * strength));
    const y = Math.max(-max, Math.min(max, dy * strength));
    el.style.transform = `translate(${x}px, ${y}px)`;
  }

  function sair() {
    const el = ref.current;
    if (el) el.style.transform = 'translate(0px, 0px)';
  }

  return (
    <span
      ref={ref}
      onMouseMove={mover}
      onMouseLeave={sair}
      className={className}
      style={{
        display: 'inline-flex',
        transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: 'transform',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
