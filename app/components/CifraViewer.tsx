// app/components/CifraViewer.tsx
'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ChordDiagram from '@/app/components/ChordDiagram';
import { ehAcorde } from '@/lib/music-theory';
import { extrairAcordesEPosicoes, quebrarLinhaCifra } from '@/lib/cifra-format';

interface CifraViewerProps {
  cifra: string;
  tamanhoFonte?: number;
  velocidade: number;
  duasColunas: boolean;
  onVelocidadeChange: (velocidade: number) => void;
  onColunasChange: (duasColunas: boolean) => void;
}

interface DiagramaAtivo {
  acorde: string;
  x: number;
  y: number;
}

const VELOCIDADE_MIN = 0.1;
const VELOCIDADE_MAX = 1.5;
const VELOCIDADE_PASSO = 0.1;
const PIXELS_POR_SEGUNDO = 60;

function isAcorde(palavra: string): boolean {
  return ehAcorde(palavra);
}

function ehLinhaDeAcordes(linha: string): boolean {
  const trimada = linha.trim();
  if (!trimada) return false;
  if (/^\[.*\]$/.test(trimada)) return false;
  const palavras = trimada.split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return false;
  return palavras.every(isAcorde);
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

export default function CifraViewer({ cifra, tamanhoFonte = 15, velocidade, duasColunas, onVelocidadeChange, onColunasChange }: CifraViewerProps) {
  const linhas = cifra.split('\n');
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const acumuladorRef = useRef(0);
  const ultimoFrameRef = useRef<number | null>(null);
  const posicaoRef = useRef({ maximo: 0, progresso: 0 });

  const [rolando, setRolando] = useState(false);
  const [diagramaAtivo, setDiagramaAtivo] = useState<DiagramaAtivo | null>(null);
  const [colunasPorLinha, setColunasPorLinha] = useState(32);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let ativo = true;
    const medir = () => {
      if (!ativo) return;
      const estilo = getComputedStyle(el);
      const contexto = document.createElement('canvas').getContext('2d');
      if (contexto) contexto.font = `${estilo.fontSize} ${estilo.fontFamily}`;
      const caractere = contexto?.measureText('M').width || tamanhoFonte * 0.6;
      let largura = el.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight);
      if (duasColunas) largura = (largura - 2 * parseFloat(getComputedStyle(document.documentElement).fontSize)) / 2;
      setColunasPorLinha(Math.max(8, Math.floor(largura / caractere)));
    };
    medir();
    const observer = new ResizeObserver(medir);
    observer.observe(el);
    void document.fonts.ready.then(medir);
    return () => { ativo = false; observer.disconnect(); };
  }, [tamanhoFonte, duasColunas]);

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
  }, [cifra, duasColunas, tamanhoFonte, colunasPorLinha]);

  function ajustarVelocidade(delta: number) {
    onVelocidadeChange(Math.round(Math.min(VELOCIDADE_MAX, Math.max(VELOCIDADE_MIN, velocidade + delta)) * 10) / 10);
  }

  return (
    <div className="area-impressao relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-panel">
      <div className="no-print relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <button
          onClick={() => setRolando(r => !r)}
          style={{ background: 'var(--tc-gold)', color: '#0D0D0D' }}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition hover:opacity-90 active:scale-95"
        >
          {rolando ? '⏸ Pausar' : '▶ Rolar'}
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onColunasChange(!duasColunas)}
            aria-label="Alternar entre uma e duas colunas"
            aria-pressed={duasColunas}
            className="flex h-10 w-10 items-center justify-center rounded-full border transition active:scale-95"
            style={duasColunas
              ? { borderColor: 'var(--tc-gold-border)', color: 'var(--tc-gold)', background: 'var(--tc-gold-dim)' }
              : { borderColor: 'var(--tc-border)', color: 'var(--tc-txt2)' }
            }
            title="Alternar entre 1 e 2 colunas"
          >
            {duasColunas ? '1' : '2'}
          </button>
          <button aria-label="Diminuir velocidade da rolagem" onClick={() => ajustarVelocidade(-VELOCIDADE_PASSO)} disabled={velocidade <= VELOCIDADE_MIN}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-lg font-bold text-text-dim transition hover:bg-bg-soft active:scale-95 disabled:opacity-30">−</button>
          <span className="w-12 text-center text-sm font-semibold tabular-nums text-text-dim">{velocidade.toFixed(1)}x</span>
          <button aria-label="Aumentar velocidade da rolagem" onClick={() => ajustarVelocidade(VELOCIDADE_PASSO)} disabled={velocidade >= VELOCIDADE_MAX}
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
              colunas={colunasPorLinha}
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

function LinhaDaCifra({ linha, colunas, versaoAnim, onAcordeHover, onAcordeLeave }: {
  linha: string;
  colunas: number;
  versaoAnim: number;
  onAcordeHover: (acorde: string, x: number, y: number) => void;
  onAcordeLeave: () => void;
}) {
  const { acordes } = extrairAcordesEPosicoes(linha);

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
    return <div className="mt-3 first:mt-0">
      {quebrarLinhaCifra(linha, colunas).map(({ letraLimpa, acordes }, indice) => {
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
      <div key={indice} className="cifra-linha" style={{ breakInside: 'avoid' }}>
        <div className="whitespace-pre font-bold" style={{ color: 'var(--tc-gold)' }}>
          {partes.map((p, i) => p.acorde
            ? <AcordeSpan key={`${i}-${versaoAnim}`} acorde={p.acorde} texto={p.texto} animar={versaoAnim > 0} onHover={onAcordeHover} onLeave={onAcordeLeave} />
            : <span key={i}>{p.texto}</span>
          )}
        </div>
        {letraLimpa.trim() && <div className="whitespace-pre" style={{ color: 'var(--tc-txt)' }}>{letraLimpa}</div>}
      </div>
    );
      })}
    </div>;
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
      style={{ color: 'var(--tc-gold)', cursor: 'pointer', borderRadius: 3, transition: 'all 0.15s' }}
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
