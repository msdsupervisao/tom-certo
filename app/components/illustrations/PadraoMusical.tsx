// app/components/illustrations/PadraoMusical.tsx
//
// Padrão decorativo com motivos musicais (violão estilizado, notas,
// símbolos de acorde) repetidos em baixa opacidade. Usado como textura
// de fundo na área de leitura da cifra, nunca atrás do texto em si -
// a legibilidade da letra/acordes sempre tem prioridade sobre a estética.
export default function PadraoMusical({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="currentColor">
        {/* Violão estilizado, canto superior esquerdo */}
        <g transform="translate(20 30) rotate(-12)">
          <ellipse cx="30" cy="70" rx="26" ry="34" />
          <ellipse cx="30" cy="70" rx="11" ry="14" fill="none" stroke="currentColor" strokeWidth="2" />
          <rect x="22" y="-10" width="16" height="80" rx="6" />
          <rect x="18" y="-22" width="24" height="16" rx="4" />
        </g>

        {/* Notas musicais soltas */}
        <g transform="translate(250 40)">
          <circle cx="0" cy="40" r="9" />
          <rect x="7" y="-10" width="4" height="50" />
          <path d="M11 -10 q20 4 16 22 q-4 -14 -16 -14 z" />
        </g>
        <g transform="translate(310 140) scale(0.8)">
          <circle cx="0" cy="40" r="9" />
          <rect x="7" y="-5" width="4" height="45" />
          <path d="M11 -5 q18 4 14 20 q-3 -12 -14 -12 z" />
        </g>

        {/* Símbolo de acorde (diagrama simplificado) */}
        <g transform="translate(60 220)" opacity="0.9">
          <rect x="0" y="0" width="70" height="80" rx="4" fill="none" stroke="currentColor" strokeWidth="3" />
          <line x1="0" y1="20" x2="70" y2="20" stroke="currentColor" strokeWidth="2" />
          <line x1="0" y1="40" x2="70" y2="40" stroke="currentColor" strokeWidth="2" />
          <line x1="0" y1="60" x2="70" y2="60" stroke="currentColor" strokeWidth="2" />
          <line x1="14" y1="0" x2="14" y2="80" stroke="currentColor" strokeWidth="2" />
          <line x1="28" y1="0" x2="28" y2="80" stroke="currentColor" strokeWidth="2" />
          <line x1="42" y1="0" x2="42" y2="80" stroke="currentColor" strokeWidth="2" />
          <line x1="56" y1="0" x2="56" y2="80" stroke="currentColor" strokeWidth="2" />
          <circle cx="14" cy="30" r="6" />
          <circle cx="42" cy="50" r="6" />
        </g>

        {/* Ondas sonoras, canto inferior direito */}
        <g transform="translate(260 280)">
          <rect x="0" y="20" width="6" height="30" rx="3" />
          <rect x="14" y="5" width="6" height="60" rx="3" />
          <rect x="28" y="15" width="6" height="40" rx="3" />
          <rect x="42" y="0" width="6" height="70" rx="3" />
          <rect x="56" y="25" width="6" height="20" rx="3" />
        </g>
      </g>
    </svg>
  );
}
