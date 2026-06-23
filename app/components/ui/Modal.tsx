// app/components/ui/Modal.tsx
'use client';

import { ReactNode, useEffect } from 'react';

interface ModalProps {
  aberto: boolean;
  onFechar: () => void;
  titulo: string;
  children: ReactNode;
}

/**
 * Modal base do design system. Fecha com Esc, clique fora, ou botão X -
 * três formas de saída, porque travar o usuário dentro de um modal sem
 * saída clara é uma das fontes mais comuns de frustração em SaaS.
 */
export default function Modal({ aberto, onFechar, titulo, children }: ModalProps) {
  useEffect(() => {
    if (!aberto) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar();
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5"
      onClick={onFechar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[var(--radius-lg)] border border-border bg-panel p-6 shadow-[var(--shadow-md)]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="modal-titulo" className="font-display text-lg font-bold">
            {titulo}
          </h2>
          <button
            onClick={onFechar}
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-dim transition hover:bg-bg-soft"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
