// app/components/CifraViewer.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import PadraoMusical from '@/app/components/illustrations/PadraoMusical';
import ChordDiagram from '@/app/components/ChordDiagram';

interface CifraViewerProps {
  cifra: string;
  tamanhoFonte?: number;
}

interface AcordePosicionado {
  nome: string;
  posicao: number;
}

interface DiagramaAtivo {
  acorde: string;
  x: number;
  y: number;
}

const VELOCIDADE_MIN = 0.1;
const VELOCIDADE_MAX = 1.5;
const VELOCIDADE_PASSO = 0.1;
const VELOCIDADE_INICIAL = 0.5;

export default function CifraViewer({ cifra, tamanhoFonte = 15 }: CifraViewerProps) {
  const linhas = cifra.split('\n');
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const acumuladorRef = useRef(0);

  const [rolando, setRolando] = useState(false);
  const [velocidade, setVelocidade] = useState(VELOCIDADE_INICIAL);
  const [duasColunas, setDuasColunas] = useState(false);
  const [diagramaAtivo, setDiagramaAtivo] = useState<DiagramaAtivo | null>(null);

  useEffect(() => {
    if (!rolando) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      acumuladorRef.current = 0;
      return;
    }

    function passo() {
      const el = containerRef.current;
      if (el) {
        acumuladorRef.current += velocidade;
        const deslocamentoInteiro = Math.floor(acumuladorRef.current);
        if (deslocamentoInteiro >= 1) {
          el.scrollTop += deslocamentoInteiro;
          acumuladorRef.current -= deslocamentoInteiro;
        }
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
          setRolando(false);
          return;
        }
      }
      animationFrameRef.current = requestAnimationFrame(passo);
    }

    animationFrameRef.current = requestAnimationFrame(passo);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [rolando, velocidade]);

  function ajustarVelocidade(delta: number) {
    setVelocidade((v) =>
      Math.round(Math.min(VELOCIDADE_MAX, Math.max(VELOCIDADE_MIN, v + delta)) * 10) / 10
    );
  }

  return (
    <div className="area-impressao relative overflow-hidden rounded-2xl border border-border bg-panel">
      <PadraoMusical className="padrao-musical-fundo pointer-events-none absolute -right-8 -top-8 z-0 h-64 w-64" />

      <div className="no-print relative z-10 flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <button
          onClick={() => setRolando((r) => !r)}
          className="flex items-center gap-1.5 rounded-full bg-violeta px-3.5 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          {rolando ? '⏸ Pausar' : '▶ Rolagem automática'}
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setDuasColunas(d => !d)}
            className={`flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition ${duasColunas ? 'border-violeta bg-violeta text-white' : 'border-border text-text-dim hover:bg-bg-soft'}`}
            title="Alternar duas colunas"
          >
            ⊞ {duasColunas ? '1 col' : '2 col'}
          </button>
          <button
            onClick={() => ajustarVelocidade(-VELOCIDADE_PASSO)}
            disabled={velocidade <= VELOCIDADE_MIN}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-sm font-bold text-text-dim transition hover:bg-bg-soft disabled:opacity-30"
            aria-label="Diminuir velocidade"
          >
            −
          </button>
          <span className="w-10 text-center text-xs tabular-nums text-text-dim">
            {velocidade.toFixed(1)}x
          </span>
          <button
            onClick={() => ajustarVelocidade(VELOCIDADE_PASSO)}
            disabled={velocidade >= VELOCIDADE_MAX}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-sm font-bold text-text-dim transition hover:bg-bg-soft disabled:opacity-30"
            aria-label="Aumentar velocidade"
          >
            +
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative z-10 max-h-[60vh] overflow-y-auto p-5 font-mono md:p-6"
        style={{ fontSize: `${tamanhoFonte}px`, lineHeight: 1.7 }}
      >
        <div style={duasColunas ? { columns: 2, columnGap: '2rem' } : {}}>
          {linhas.map((linha, i) => (
            <LinhaDaCifra
              key={i}
              linha={linha}
              onAcordeHover={(acorde, x, y) => setDiagramaAtivo({ acorde, x, y })}
              onAcordeLeave={() => setDiagramaAtivo(null)}
            />
          ))}
        </div>
      </div>

      {/* Diagrama flutuante */}
      {diagramaAtivo && (
        <ChordDiagram
          acorde={diagramaAtivo.acorde}
          x={diagramaAtivo.x}
          y={diagramaAtivo.y}
        />
      )}
    </div>
  );
}

function LinhaDaCifra({
  linha,
  onAcordeHover,
  onAcordeLeave,
}: {
  linha: string;
  onAcordeHover: (acorde: string, x: number, y: number) => void;
  onAcordeLeave: () => void;
}) {
  const { letraLimpa, acordes } = extrairAcordesEPosicoes(linha);

  if (acordes.length === 0) {
    return <div className="whitespace-pre">{letraLimpa || '\u00A0'}</div>;
  }

  let linhaDeAcordes = '';
  acordes.forEach((acorde) => {
    while (linhaDeAcordes.length < acorde.posicao) linhaDeAcordes += ' ';
    linhaDeAcordes += acorde.nome;
  });

  // Reconstrói a linha de acordes como spans clicáveis
  const partes: { texto: string; acorde?: string }[] = [];
  let cursor = 0;
  acordes.forEach((acorde) => {
    if (acorde.posicao > cursor) {
      partes.push({ texto: ' '.repeat(acorde.posicao - cursor) });
    }
    partes.push({ texto: acorde.nome, acorde: acorde.nome });
    cursor = acorde.posicao + acorde.nome.length;
  });
  if (cursor < linhaDeAcordes.length) {
    partes.push({ texto: linhaDeAcordes.slice(cursor) });
  }

  return (
    <div className="mt-3 first:mt-0">
      <div className="whitespace-pre font-bold text-violeta">
        {partes.map((parte, i) =>
          parte.acorde ? (
            <span
              key={i}
              className="cursor-pointer rounded px-0.5 transition hover:bg-violeta hover:text-white"
              onMouseEnter={(e) => {
                const rect = (e.target as HTMLElement).getBoundingClientRect();
                onAcordeHover(parte.acorde!, rect.left + rect.width / 2, rect.top);
              }}
              onMouseLeave={onAcordeLeave}
            >
              {parte.texto}
            </span>
          ) : (
            <span key={i}>{parte.texto}</span>
          )
        )}
      </div>
      <div className="whitespace-pre">{letraLimpa || '\u00A0'}</div>
    </div>
  );
}

function extrairAcordesEPosicoes(linha: string): {
  letraLimpa: string;
  acordes: AcordePosicionado[];
} {
  const acordes: AcordePosicionado[] = [];
  let letraLimpa = '';
  let i = 0;

  while (i < linha.length) {
    if (linha[i] === '{') {
      const fechamento = linha.indexOf('}', i);
      if (fechamento !== -1) {
        const nomeAcorde = linha.slice(i + 1, fechamento);
        acordes.push({ nome: nomeAcorde, posicao: letraLimpa.length });
        i = fechamento + 1;
        continue;
      }
    }
    letraLimpa += linha[i];
    i++;
  }

  return { letraLimpa, acordes };
}