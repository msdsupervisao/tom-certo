// app/components/CifraViewer.tsx
'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
const VELOCIDADE_INICIAL = 0.2;
const PIXELS_POR_SEGUNDO = 60;

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
  const ultimoFrameRef = useRef<number | null>(null);
  const posicaoRef = useRef({ maximo: 0, progresso: 0 });

  const [rolando, setRolando] = useState(false);
  const [velocidade, setVelocidade] = useState(VELOCIDADE_INICIAL);
  const [duasColunas, setDuasColunas] = useState(false);
  const [diagramaAtivo, setDiagramaAtivo] = useState<DiagramaAtivo | null>(null);

  // Anima os acordes quando a cifra muda (transposição / versão simplificada),
  // sem disparar no primeiro render para não animar o carregamento inicial.
  const primeiroRenderRef = useRef(true);
  const [versaoAnim, setVersaoAnim] = useState(0);
  useEffect(() => {
    if (primeiroRenderRef.current) {
      primeiroRenderRef.current = false;
      return;
    }
    setVersaoAnim((v) => v + 1);
  }, [cifra]);

  useEffect(() => {
    if (!rolando) {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      acumuladorRef.current = 0;
      ultimoFrameRef.current = null;
      return;
    }
    function passo(timestamp: number) {
      const el = containerRef.current;
      if (el) {
        const maximo = Math.max(0, el.scrollHeight - el.clientHeight);
        if (maximo <= 1) {
          setRolando(false);
          return;
        }

        const anterior = ultimoFrameRef.current ?? timestamp;
        const deltaMs = Math.min(64, timestamp - anterior);
        ultimoFrameRef.current = timestamp;
        acumuladorRef.current += velocidade * PIXELS_POR_SEGUNDO * (deltaMs / 1000);
        const inteiro = Math.floor(acumuladorRef.current);
        if (inteiro >= 1) {
          el.scrollTop = Math.min(maximo, el.scrollTop + inteiro);
          acumuladorRef.current -= inteiro;
        }
        if (maximo - el.scrollTop <= 1) {
          el.scrollTop = maximo;
          setRolando(false);
          return;
        }
      }
      animationFrameRef.current = requestAnimationFrame(passo);
    }
    animationFrameRef.current = requestAnimationFrame(passo);
    return () => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      ultimoFrameRef.current = null;
    };
  }, [rolando, velocidade]);

  // Mantém o mesmo ponto relativo da música quando fonte, cifra ou colunas
  // mudam. O navegador recalcula a altura e reposicionamos antes de pintar.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const novoMaximo = Math.max(0, el.scrollHeight - el.clientHeight);
    if (posicaoRef.current.maximo > 0 && novoMaximo > 0) {
      el.scrollTop = posicaoRef.current.progresso * novoMaximo;
    }

    const guardarPosicao = () => {
      const maximo = Math.max(0, el.scrollHeight - el.clientHeight);
      posicaoRef.current = {
        maximo,
        progresso: maximo > 0 ? Math.min(1, el.scrollTop / maximo) : 0,
      };
    };
    guardarPosicao();
    el.addEventListener('scroll', guardarPosicao, { passive: true });
    return () => {
      guardarPosicao();
      el.removeEventListener('scroll', guardarPosicao);
    };
  }, [cifra, duasColunas, tamanhoFonte]);

  function ajustarVelocidade(delta: number) {
    setVelocidade(v => Math.round(Math.min(VELOCIDADE_MAX, Math.max(VELOCIDADE_MIN, v + delta)) * 10) / 10);
  }

  return (
    <div className="area-impressao relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-panel">
      <div className="no-print relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <button
          onClick={() => setRolando(r => !r)}
          style={{ background: 'var(--tc-gold)', color: '#0D0D0D' }}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition hover:opacity-90 active:scale-95"
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
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-lg font-bold text-text-dim transition hover:bg-bg-soft active:scale-95 disabled:opacity-30">−</button>
          <span className="w-12 text-center text-sm font-semibold tabular-nums text-text-dim">{velocidade.toFixed(1)}x</span>
          <button onClick={() => ajustarVelocidade(VELOCIDADE_PASSO)} disabled={velocidade >= VELOCIDADE_MAX}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-lg font-bold text-text-dim transition hover:bg-bg-soft active:scale-95 disabled:opacity-30">+</button>
        </div>
      </div>

      <div
        ref={containerRef}
        tabIndex={0}
        aria-label="Cifra com rolagem"
        className="cifra-scroll relative z-10 min-h-0 flex-1 overflow-auto p-5 font-mono md:p-6"
        style={{ fontSize: `${tamanhoFonte}px`, lineHeight: 1.7, overscrollBehavior: 'contain', scrollPaddingBottom: '18vh' }}
      >
        <div style={duasColunas
          ? { columns: 2, columnGap: '2rem', paddingBottom: 'max(64px, 18vh)' }
          : { paddingBottom: 'max(64px, 18vh)' }
        }>
          {linhas.map((linha, i) => (
            <LinhaDaCifra
              key={i}
              linha={linha}
              versaoAnim={versaoAnim}
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

function LinhaDaCifra({ linha, versaoAnim, onAcordeHover, onAcordeLeave }: {
  linha: string;
  versaoAnim: number;
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
        <div className="whitespace-pre-wrap break-words font-bold" style={{ color: 'var(--tc-gold)', overflowWrap: 'anywhere' }}>
          {partes.map((p, i) => p.acorde
            ? <AcordeSpan key={`${i}-${versaoAnim}`} acorde={p.acorde} texto={p.texto} animar={versaoAnim > 0} onHover={onAcordeHover} onLeave={onAcordeLeave} />
            : <span key={i}>{p.texto}</span>
          )}
        </div>
        <div className="whitespace-pre-wrap break-words" style={{ color: 'var(--tc-txt)', overflowWrap: 'anywhere' }}>{letraLimpa || '\u00A0'}</div>
      </div>
    );
  }

  // Linha de texto puro — detecta acordes por palavras
  if (ehLinhaDeAcordes(linha)) {
    const partes = splitLinhaEmAcordes(linha);
    return (
      <div className="mt-3 first:mt-0">
        <div className="whitespace-pre-wrap break-words font-bold" style={{ color: 'var(--tc-gold)', overflowWrap: 'anywhere' }}>
          {partes.map((p, i) => p.acorde
            ? <AcordeSpan key={`${i}-${versaoAnim}`} acorde={p.acorde} texto={p.texto} animar={versaoAnim > 0} onHover={onAcordeHover} onLeave={onAcordeLeave} />
            : <span key={i}>{p.texto}</span>
          )}
        </div>
      </div>
    );
  }

  // Linha de letra normal
  return <div className="whitespace-pre-wrap break-words" style={{ color: 'var(--tc-txt)', overflowWrap: 'anywhere' }}>{linha || '\u00A0'}</div>;
}

function AcordeSpan({ acorde, texto, animar, onHover, onLeave }: {
  acorde: string; texto: string;
  animar?: boolean;
  onHover: (acorde: string, x: number, y: number) => void;
  onLeave: () => void;
}) {
  return (
    <span
      className={animar ? 'tc-acorde-anim' : undefined}
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
