// lib/pitch-detection.ts
//
// Engine de detecção de pitch pelo McLeod Pitch Method (MPM), via `pitchy`.
// Substitui a autocorrelação crua anterior, que pegava o pico MÁXIMO da
// correlação — fonte clássica de ERRO DE OITAVA — e dependia de um piso de
// RMS fixo que descartava quase tudo no microfone do celular.
//
// MPM usa a NSDF (autocorrelação normalizada) + interpolação parabólica:
// mata erro de oitava, crava o período com precisão sub-amostra e devolve
// um "clarity" (0..1) que é uma medida de confiança de verdade — usada aqui
// para aceitar/rejeitar cada quadro.
// Refs: McLeod & Wyvill (2005); de Cheveigné & Kawahara, YIN (2002).

import { PitchDetector } from 'pitchy';

export interface ResultadoDeteccao {
  frequencia: number;
  /** Clarity do MPM (0..1): quão "limpo"/periódico é o tom. */
  confianca: number;
  motivo: 'ok' | 'silencio' | 'sem_pico_claro';
}

// Faixa da voz cantada (grave ~70Hz a falsete ~1100Hz).
const FREQ_MINIMA = 70;
const FREQ_MAXIMA = 1100;
// Abaixo disso o quadro é ruído, não tom. MPM costuma dar >0.9 num tom claro.
const CLARITY_MINIMA = 0.9;
// Piso de nível só para pular silêncio real e poupar CPU; o corte fino é a clarity.
const RMS_MINIMO = 0.005;

// O detector do pitchy é criado para um tamanho de buffer fixo; reaproveitamos
// entre quadros (recriar a cada frame seria desperdício).
let cacheDetector: { tamanho: number; detector: PitchDetector<Float32Array> } | null = null;
function obterDetector(tamanho: number): PitchDetector<Float32Array> {
  if (!cacheDetector || cacheDetector.tamanho !== tamanho) {
    cacheDetector = { tamanho, detector: PitchDetector.forFloat32Array(tamanho) };
  }
  return cacheDetector.detector;
}

/**
 * Detecta a frequência fundamental de um buffer de áudio no domínio do tempo
 * usando o McLeod Pitch Method.
 */
export function detectarPitch(
  buffer: Float32Array,
  sampleRate: number
): ResultadoDeteccao {
  let somaQuadrados = 0;
  for (let i = 0; i < buffer.length; i++) {
    somaQuadrados += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(somaQuadrados / buffer.length);
  if (rms < RMS_MINIMO) {
    return { frequencia: -1, confianca: 0, motivo: 'silencio' };
  }

  const detector = obterDetector(buffer.length);
  const [frequencia, clarity] = detector.findPitch(buffer, sampleRate);

  if (
    !frequencia ||
    frequencia < FREQ_MINIMA ||
    frequencia > FREQ_MAXIMA ||
    clarity < CLARITY_MINIMA
  ) {
    return { frequencia: -1, confianca: clarity ?? 0, motivo: 'sem_pico_claro' };
  }

  return { frequencia, confianca: clarity, motivo: 'ok' };
}

/**
 * Alias de compatibilidade — o nome antigo ainda é importado em alguns lugares.
 * @deprecated use `detectarPitch`.
 */
export const detectarPitchAutocorrelacao = detectarPitch;

export type NivelConfianca = 'alta' | 'media' | 'baixa';

export function classificarConfianca(valor: number): NivelConfianca {
  if (valor > 0.95) return 'alta';
  if (valor > 0.9) return 'media';
  return 'baixa';
}

export interface AmostraDeTom {
  /** Nome da nota SEM oitava (classe de tom), ex.: "G", "C#". */
  nota: string;
  /** Confiança (clarity) daquele quadro. */
  confianca: number;
}

/**
 * Escolhe o tom predominante da gravação por VOTAÇÃO PONDERADA pela confiança.
 *
 * Duas decisões deixam isso robusto vs. o método antigo (moda simples):
 *  1. As amostras vêm por CLASSE DE TOM (sem oitava) — então um eventual erro
 *     de oitava residual não divide o voto entre "G3" e "G4".
 *  2. Cada quadro pesa pela sua clarity — quadros mais limpos mandam mais.
 *
 * A "estabilidade" retornada é a fração do peso total que foi para a nota
 * vencedora (0..100): alta = a voz ficou consistente naquele tom.
 */
export function calcularTomPredominante(amostras: AmostraDeTom[]): {
  nota: string;
  estabilidadePercentual: number;
} | null {
  if (amostras.length === 0) return null;

  const pesoPorNota: Record<string, number> = {};
  let pesoTotal = 0;
  for (const { nota, confianca } of amostras) {
    const peso = confianca > 0 ? confianca : 0;
    pesoPorNota[nota] = (pesoPorNota[nota] || 0) + peso;
    pesoTotal += peso;
  }
  if (pesoTotal === 0) return null;

  const [notaVencedora, pesoVencedor] = Object.entries(pesoPorNota).sort(
    (a, b) => b[1] - a[1]
  )[0];

  return {
    nota: notaVencedora,
    estabilidadePercentual: Math.round((pesoVencedor / pesoTotal) * 100),
  };
}
