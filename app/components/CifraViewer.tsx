// app/components/CifraViewer.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import ChordDiagram from '@/app/components/ChordDiagram';

interface CifraViewerProps {
  cifra: string;
  tamanhoFonte?: number;
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

function isAcorde(palavra: string): boolean {
  return /^[A-G][#b]?(?:M|m|maj|min|dim|aug|sus|add)?[0-9]*(\([^)]*\))?(\/[A-G][#b]?)?$/.test(palavra);
}

function ehLinhaDeAcordes(linha: string): boolean {
  const trimada = linha.trim();
  if (!trimada) return false;
  if (/^\[.*\]$/.test(trimada)) return false;
  const palavras = trimada.split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return false;
  const qtdAcordes = palavras.filter(p => isAcorde(p)).length;
  return qtdAcordes / palavras.length >= 0.5;
}

function splitLinhaEmAcordes(linha: string): { texto: string; acorde?: string }[] {
  const partes: { texto: string; acorde?: string }[] = [];
  const tokens = linha.split(/(\s+)/);
  for (const token of tokens) {
    if (token.trim() && isAcorde(token.trim())) {
      partes.push({ texto: token, acorde: token.trim() });
    } else {
      partes.push({ texto: token });
    }
  }
  return partes;
}

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
        const inteiro = Math.floor(acumuladorRef.current);
        if (inteiro >= 1) {
          el.scrollTop += inteiro;
          acumuladorRef.current -= inteiro;
        }
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
          setRolando(false);
          return;
        }
      }
      animationFrameRef.current = requestAnimationFrame(passo);
    }
    animationFrameRef.current = requestAnimationFrame(passo);
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [rolando, velocidade]);

  function ajustarVelocidade(delta: number) {
    setVelocidade(v => Math.round(Math.min(VELOCIDADE_MAX, Math.max(VELOCIDADE_MIN, v + delta)) * 10) / 10);
  }

  return (
    <div className="area-impressao relative overflow-hidden rounded-2xl border border-border bg-panel">
      <div className="no-print relative z-10 flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <button
          onClick={() => setRolando(r => !r)}
          style={{ background: 'var(--tc-gold)', color: '#0D0D0D' }}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition hover:opacity-90"
        >
          {rolando ? '⏸ Pausar' : '▶ Rolar'}
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDuasColunas(d => !d)}
            className="flex h-10 w-10 items-center justify-center rounded-full border transition active:scale-95"
            style={duasColunas
              ? { borderColor: 'var(--tc-gold-border)', color: 'var(--tc-gold)', background: 'var(--tc-gold-dim)' }
              : { borderColor: 'var(--tc-border)', color: 'var(--tc-txt2)' }
            }
            title="Alternar entre 1 e 2 colunas"
          >
            {duasColunas ? '1' : '2'}
          </button>
          <button onClick={() => ajustarVelocidade(-VELOCIDADE_PASSO)} disabled={velocidade <= VELOCIDADE_MIN}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-lg font-bold text-text-dim transition hover:bg-bg-soft disabled:opacity-30">−</button>
          <span className="w-12 text-center text-sm font-semibold tabular-nums text-text-dim">{velocidade.toFixed(1)}x</span>
          <button onClick={() => ajustarVelocidade(VELOCIDADE_PASSO)} disabled={velocidade >= VELOCIDADE_MAX}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-lg font-bold text-text-dim transition hover:bg-bg-soft disabled:opacity-30">+</button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative z-10 max-h-[100vh] overflow-y-auto p-5 font-mono md:p-6"
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

      {diagramaAtivo && (
        <ChordDiagram acorde={diagramaAtivo.acorde} x={diagramaAtivo.x} y={diagramaAtivo.y} />
      )}
    </div>
  );
}

function LinhaDaCifra({ linha, onAcordeHover, onAcordeLeave }: {
  linha: string;
  onAcordeHover: (acorde: string, x: number, y: number) => void;
  onAcordeLeave: () => void;
}) {
  const { letraLimpa, acordes } = extrairAcordesEPosicoes(linha);

  // Linha de seção [Intro], [Verso] etc
  if (/^\s*\[.*\]\s*$/.test(linha)) {
    return (
      <div style={{ color: 'var(--tc-txt3)', fontSize: '0.85em', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginTop: 16, marginBottom: 4, fontFamily: 'var(--font-ui)' }}>
        {linha.replace(/[\[\]]/g, '')}
      </div>
    );
  }

  // Linha com acordes no formato {acorde}
  if (acordes.length > 0) {
    let linhaDeAcordes = '';
    acordes.forEach(a => { while (linhaDeAcordes.length < a.posicao) linhaDeAcordes += ' '; linhaDeAcordes += a.nome; });
    const partes: { texto: string; acorde?: string }[] = [];
    let cursor = 0;
    acordes.forEach(a => {
      if (a.posicao > cursor) partes.push({ texto: ' '.repeat(a.posicao - cursor) });
      partes.push({ texto: a.nome, acorde: a.nome });
      cursor = a.posicao + a.nome.length;
    });
    if (cursor < linhaDeAcordes.length) partes.push({ texto: linhaDeAcordes.slice(cursor) });

    return (
      <div className="mt-3 first:mt-0">
        <div className="whitespace-pre font-bold" style={{ color: 'var(--tc-gold)' }}>
          {partes.map((p, i) => p.acorde
            ? <AcordeSpan key={i} acorde={p.acorde} texto={p.texto} onHover={onAcordeHover} onLeave={onAcordeLeave} />
            : <span key={i}>{p.texto}</span>
          )}
        </div>
        <div className="whitespace-pre" style={{ color: 'var(--tc-txt)' }}>{letraLimpa || '\u00A0'}</div>
      </div>
    );
  }

  // Linha de texto puro — detecta acordes por palavras
  if (ehLinhaDeAcordes(linha)) {
    const partes = splitLinhaEmAcordes(linha);
    return (
      <div className="mt-3 first:mt-0">
        <div className="whitespace-pre font-bold" style={{ color: 'var(--tc-gold)' }}>
          {partes.map((p, i) => p.acorde
            ? <AcordeSpan key={i} acorde={p.acorde} texto={p.texto} onHover={onAcordeHover} onLeave={onAcordeLeave} />
            : <span key={i}>{p.texto}</span>
          )}
        </div>
      </div>
    );
  }

  // Linha de letra normal
  return <div className="whitespace-pre" style={{ color: 'var(--tc-txt)' }}>{linha || '\u00A0'}</div>;
}

function AcordeSpan({ acorde, texto, onHover, onLeave }: {
  acorde: string; texto: string;
  onHover: (acorde: string, x: number, y: number) => void;
  onLeave: () => void;
}) {
  return (
    <span
      style={{ color: 'var(--tc-gold)', cursor: 'pointer', borderRadius: 3, padding: '0 2px', transition: 'all 0.15s' }}
      onMouseEnter={e => {
        const el = e.target as HTMLElement;
        el.style.background = 'var(--tc-gold)';
        el.style.color = '#0D0D0D';
        const rect = el.getBoundingClientRect();
        onHover(acorde, rect.left + rect.width / 2, rect.top);
      }}
      onMouseLeave={e => {
        const el = e.target as HTMLElement;
        el.style.background = 'transparent';
        el.style.color = 'var(--tc-gold)';
        onLeave();
      }}
    >
      {texto}
    </span>
  );
}

function extrairAcordesEPosicoes(linha: string): { letraLimpa: string; acordes: { nome: string; posicao: number }[] } {
  const acordes: { nome: string; posicao: number }[] = [];
  let letraLimpa = '';
  let i = 0;
  while (i < linha.length) {
    if (linha[i] === '{') {
      const fechamento = linha.indexOf('}', i);
      if (fechamento !== -1) {
        acordes.push({ nome: linha.slice(i + 1, fechamento), posicao: letraLimpa.length });
        i = fechamento + 1;
        continue;
      }
    }
    letraLimpa += linha[i];
    i++;
  }
  return { letraLimpa, acordes };
}
