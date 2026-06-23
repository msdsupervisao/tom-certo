// app/components/illustrations/SilhuetasShow.tsx
//
// Ilustração original: silhuetas genéricas de uma banda em performance
// (vocalista, guitarrista, baixista). Não representa nenhuma pessoa real -
// é desenho vetorial original, livre de qualquer questão de direito de
// imagem ou copyright de fotografia de show.
export default function SilhuetasShow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 300"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMaxYMid meet"
    >
      {/* Vocalista ao centro, microfone erguido */}
      <g fill="currentColor">
        <ellipse cx="400" cy="120" rx="22" ry="26" />
        <path d="M378 145 q22 -8 44 0 l10 90 q-32 14 -64 0 z" />
        <rect x="396" y="60" width="8" height="55" rx="3" />
        <circle cx="400" cy="55" r="10" />
        <path d="M378 160 q-30 10 -38 55 l14 4 q10 -38 30 -48 z" />
        <path d="M422 160 q30 10 38 55 l-14 4 q-10 -38 -30 -48 z" />
      </g>

      {/* Guitarrista à esquerda, instrumento inclinado */}
      <g fill="currentColor" opacity="0.85">
        <ellipse cx="160" cy="140" rx="20" ry="24" />
        <path d="M140 162 q20 -6 40 0 l8 85 q-28 12 -56 0 z" />
        <path d="M120 175 q-22 18 -26 60 l12 4 q6 -36 22 -50 z" />
        <path d="M188 175 q26 8 30 58 l-12 3 q-6 -32 -24 -44 z" />
        {/* corpo da guitarra */}
        <ellipse cx="215" cy="225" rx="26" ry="34" transform="rotate(25 215 225)" />
        <rect x="150" y="178" width="95" height="9" rx="4" transform="rotate(-25 150 178)" />
      </g>

      {/* Baixista à direita, postura mais relaxada */}
      <g fill="currentColor" opacity="0.85">
        <ellipse cx="630" cy="135" rx="20" ry="24" />
        <path d="M610 157 q20 -6 40 0 l6 88 q-26 12 -52 0 z" />
        <path d="M592 170 q-20 22 -22 62 l12 3 q4 -38 18 -52 z" />
        <path d="M656 170 q24 14 24 60 l-12 2 q-4 -34 -20 -48 z" />
        <ellipse cx="685" cy="232" rx="24" ry="32" transform="rotate(20 685 232)" />
        <rect x="600" y="180" width="90" height="8" rx="4" transform="rotate(-22 600 180)" />
      </g>
    </svg>
  );
}
