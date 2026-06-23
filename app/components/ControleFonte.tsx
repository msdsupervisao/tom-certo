// app/components/ControleFonte.tsx
'use client';

interface ControleFonteProps {
  tamanho: number;
  onAumentar: () => void;
  onDiminuir: () => void;
}

export default function ControleFonte({
  tamanho,
  onAumentar,
  onDiminuir,
}: ControleFonteProps) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-panel p-1">
      <button
        onClick={onDiminuir}
        disabled={tamanho <= 12}
        className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-text-dim transition hover:bg-bg-soft disabled:opacity-30"
        aria-label="Diminuir fonte"
      >
        A−
      </button>
      <button
        onClick={onAumentar}
        disabled={tamanho >= 24}
        className="flex h-8 w-8 items-center justify-center rounded-full text-base font-bold text-text-dim transition hover:bg-bg-soft disabled:opacity-30"
        aria-label="Aumentar fonte"
      >
        A+
      </button>
    </div>
  );
}
