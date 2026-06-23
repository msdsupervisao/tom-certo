'use client';

const DIAGRAMAS: Record<string, number[]> = {
  'C':   [-1, 3, 2, 0, 1, 0],
  'D':   [-1, -1, 0, 2, 3, 2],
  'E':   [0, 2, 2, 1, 0, 0],
  'F':   [1, 1, 2, 3, 3, 1],
  'G':   [3, 2, 0, 0, 0, 3],
  'A':   [-1, 0, 2, 2, 2, 0],
  'B':   [-1, 2, 4, 4, 4, 2],
  'Am':  [-1, 0, 2, 2, 1, 0],
  'Em':  [0, 2, 2, 0, 0, 0],
  'Dm':  [-1, -1, 0, 2, 3, 1],
  'Bm':  [-1, 2, 4, 4, 3, 2],
  'Fm':  [1, 1, 1, 1, 0, -1],
  'A7':  [-1, 0, 2, 0, 2, 0],
  'B7':  [-1, 2, 1, 2, 0, 2],
  'C7':  [-1, 3, 2, 3, 1, 0],
  'D7':  [-1, -1, 0, 2, 1, 2],
  'E7':  [0, 2, 0, 1, 0, 0],
  'F7':  [1, 1, 2, 1, 3, 1],
  'G7':  [3, 2, 0, 0, 0, 1],
  'Am7': [-1, 0, 2, 0, 1, 0],
  'Em7': [0, 2, 2, 0, 3, 0],
  'Dm7': [-1, -1, 0, 2, 1, 1],
  'Cmaj7': [-1, 3, 2, 0, 0, 0],
  'Gmaj7': [3, 2, 0, 0, 0, 2],
  'Fmaj7': [-1, -1, 3, 2, 1, 0],
  'Amaj7': [-1, 0, 2, 1, 2, 0],
  'Asus2': [-1, 0, 2, 2, 0, 0],
  'Asus4': [-1, 0, 2, 2, 3, 0],
  'Dsus2': [-1, -1, 0, 2, 3, 0],
  'Dsus4': [-1, -1, 0, 2, 3, 3],
  'Esus4': [0, 2, 2, 2, 0, 0],
  'Gsus4': [3, 3, 0, 0, 1, 3],
  'C#':  [-1, 4, 3, 1, 2, 1],
  'D#':  [-1, -1, 1, 3, 4, 3],
  'F#':  [2, 2, 3, 4, 4, 2],
  'G#':  [4, 3, 1, 1, 1, 4],
  'A#':  [-1, 1, 3, 3, 3, 1],
  'C#m': [-1, 4, 6, 6, 5, 4],
  'D#m': [-1, -1, 1, 3, 4, 2],
  'F#m': [2, 2, 4, 4, 3, 2],
  'G#m': [4, 6, 6, 4, 4, 4],
  'A#m': [-1, 1, 3, 3, 2, 1],
};

interface Props {
  acorde: string;
  x: number;
  y: number;
}

export default function ChordDiagram({ acorde, x, y }: Props) {
  const casas = DIAGRAMAS[acorde] || tentarVariacoes(acorde);

  const CASAS = 4;
  const CORDAS = 6;
  const ESPACAMENTO = 22;
  const LARGURA = (CORDAS - 1) * ESPACAMENTO;
  const ALTURA = CASAS * ESPACAMENTO;
  const MARGEM_TOP = 28;
  const MARGEM_ESQ = 20;
  const LARGURA_TOTAL = LARGURA + MARGEM_ESQ * 2;
  const ALTURA_TOTAL = ALTURA + MARGEM_TOP + 20;

  const tooltipX = Math.max(8, x - LARGURA_TOTAL / 2);
  const tooltipY = y - ALTURA_TOTAL - 12;

  if (!casas) {
    return (
      <div
        style={{
          position: 'fixed',
          left: tooltipX,
          top: tooltipY,
          zIndex: 9999,
          background: 'var(--bg-panel, #1e1e2e)',
          border: '1px solid var(--border, #333)',
          borderRadius: 10,
          padding: '10px 14px',
          fontSize: 12,
          color: 'var(--text-dim, #aaa)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {acorde} — diagrama não disponível
      </div>
    );
  }

  const casaMinima = Math.min(...casas.filter((c) => c > 0));
  const casaBase = casaMinima > 4 ? casaMinima - 1 : 1;
  const mostrarNumeroCasa = casaBase > 1;

  return (
    <div
      style={{
        position: 'fixed',
        left: tooltipX,
        top: tooltipY,
        zIndex: 9999,
        background: 'var(--bg-panel, #1e1e2e)',
        border: '1px solid var(--border, #444)',
        borderRadius: 12,
        padding: '8px 10px',
        boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, marginBottom: 4, color: 'var(--violeta, #a78bfa)' }}>
        {acorde}
      </div>
      <svg
        width={LARGURA_TOTAL}
        height={ALTURA_TOTAL}
        style={{ display: 'block' }}
      >
        {/* Linhas horizontais (casas) */}
        {Array.from({ length: CASAS + 1 }).map((_, i) => (
          <line
            key={`h${i}`}
            x1={MARGEM_ESQ}
            y1={MARGEM_TOP + i * ESPACAMENTO}
            x2={MARGEM_ESQ + LARGURA}
            y2={MARGEM_TOP + i * ESPACAMENTO}
            stroke="var(--border, #555)"
            strokeWidth={i === 0 ? 3 : 1}
          />
        ))}

        {/* Linhas verticais (cordas) */}
        {Array.from({ length: CORDAS }).map((_, i) => (
          <line
            key={`v${i}`}
            x1={MARGEM_ESQ + i * ESPACAMENTO}
            y1={MARGEM_TOP}
            x2={MARGEM_ESQ + i * ESPACAMENTO}
            y2={MARGEM_TOP + ALTURA}
            stroke="var(--border, #555)"
            strokeWidth={1}
          />
        ))}

        {/* Número da casa */}
        {mostrarNumeroCasa && (
          <text
            x={MARGEM_ESQ - 14}
            y={MARGEM_TOP + ESPACAMENTO / 2 + 4}
            fontSize={10}
            fill="var(--text-dim, #aaa)"
          >
            {casaBase}
          </text>
        )}

        {/* Dedos, X e O — corda 6 (índice 0) à esquerda */}
        {casas.map((casa, cordaIdx) => {
          const cx = MARGEM_ESQ + cordaIdx * ESPACAMENTO;

          if (casa === -1) {
            return (
              <text key={cordaIdx} x={cx - 4} y={MARGEM_TOP - 8} fontSize={11} fill="#e74c3c" fontWeight="bold">
                ✕
              </text>
            );
          }
          if (casa === 0) {
            return (
              <circle key={cordaIdx} cx={cx} cy={MARGEM_TOP - 9} r={5} fill="none" stroke="var(--text-dim, #aaa)" strokeWidth={1.5} />
            );
          }

          const casaRelativa = casa - casaBase + 1;
          const cy = MARGEM_TOP + (casaRelativa - 0.5) * ESPACAMENTO;

          return (
            <circle key={cordaIdx} cx={cx} cy={cy} r={9} fill="var(--violeta, #a78bfa)" />
          );
        })}
      </svg>
    </div>
  );
}

function tentarVariacoes(acorde: string): number[] | null {
  const variacoes = [
    acorde.replace(/maj7|maj9|add9|sus[24]|dim|aug|\/.*$/g, ''),
    acorde.replace(/[0-9]/g, ''),
    acorde.replace(/m.*$/, 'm'),
    acorde[0],
  ];
  for (const v of variacoes) {
    if (DIAGRAMAS[v]) return DIAGRAMAS[v];
  }
  return null;
}