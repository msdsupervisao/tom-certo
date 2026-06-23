// app/components/CifraViewer.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import PadraoMusical from '@/app/components/illustrations/PadraoMusical';

interface CifraViewerProps {
  cifra: string;
  tamanhoFonte?: number; // em px, permite zoom controlado pelo usuário
}

interface AcordePosicionado {
  nome: string;
  posicao: number; // índice de caractere na linha de letra (sem marcações)
}

const VELOCIDADE_MIN = 0.1;
const VELOCIDADE_MAX = 1.5;
const VELOCIDADE_PASSO = 0.1;
const VELOCIDADE_INICIAL = 0.5;

/**
 * Renderiza a cifra no formato padrão do mercado (Cifra Club / Ultimate Guitar):
 * uma linha de acordes posicionada ACIMA da letra, alinhada por coluna de
 * caractere, e a letra limpa abaixo - sem nenhuma marcação misturada nela.
 * Depende de fonte monoespaçada para o alinhamento de coluna funcionar.
 *
 * Inclui rolagem automática (0.1 a 1.5, em passos de 0.1) para uso "modo show",
 * com as mãos ocupadas no instrumento.
 */
export default function CifraViewer({ cifra, tamanhoFonte = 15 }: CifraViewerProps) {
  const linhas = cifra.split('\n');
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const acumuladorRef = useRef(0); // guarda a fração de pixel entre frames

  const [rolando, setRolando] = useState(false);
  const [velocidade, setVelocidade] = useState(VELOCIDADE_INICIAL);
  const [duasColunas, setDuasColunas] = useState(false);

  useEffect(() => {
    if (!rolando) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      acumuladorRef.current = 0;
      return;
    }

    function passo() {
      const el = containerRef.current;
      if (el) {
        // scrollTop só aceita incrementos inteiros de forma confiável em todo
        // navegador. Em velocidades baixas (ex: 0.1px/frame), aplicar direto
        // resultava em "nada acontece" até a fração acumular um pixel inteiro
        // por conta própria - o que em 0.1 e 0.2 praticamente nunca ocorria
        // de forma perceptível. Acumulamos a fração manualmente aqui.
        acumuladorRef.current += velocidade;
        const deslocamentoInteiro = Math.floor(acumuladorRef.current);

        if (deslocamentoInteiro >= 1) {
          el.scrollTop += deslocamentoInteiro;
          acumuladorRef.current -= deslocamentoInteiro;
        }

        // Chegou ao fim: para automaticamente em vez de ficar tentando rolar
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
      {/* Textura decorativa: motivos de cifra/violão, bem sutil, atrás de tudo.
          Mais visível no tema claro, que foi o pedido original. */}
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
            <LinhaDaCifra key={i} linha={linha} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LinhaDaCifra({ linha }: { linha: string }) {
  const { letraLimpa, acordes } = extrairAcordesEPosicoes(linha);

  // Linha sem nenhum acorde: não desperdiça espaço com uma linha vazia em cima
  if (acordes.length === 0) {
    return <div className="whitespace-pre">{letraLimpa || '\u00A0'}</div>;
  }

  // Monta a linha de acordes: espaços até cada posição, depois o nome do acorde
  let linhaDeAcordes = '';
  acordes.forEach((acorde) => {
    while (linhaDeAcordes.length < acorde.posicao) linhaDeAcordes += ' ';
    linhaDeAcordes += acorde.nome;
  });

  return (
    <div className="mt-3 first:mt-0">
      <div className="whitespace-pre font-bold text-violeta">
        {linhaDeAcordes}
      </div>
      <div className="whitespace-pre">{letraLimpa || '\u00A0'}</div>
    </div>
  );
}

/**
 * Separa uma linha como "{G}Quando eu {Am}penso" em:
 * - letraLimpa: "Quando eu penso" (sem marcações)
 * - acordes: [{nome: "G", posicao: 0}, {nome: "Am", posicao: 9}]
 * A posição é calculada em relação ao texto JÁ limpo, que é o que
 * garante o alinhamento visual correto entre as duas linhas.
 */
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
