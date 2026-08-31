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
import { NOMES_NOTAS, type NomeNota } from './music-theory';

export interface ResultadoDeteccao {
  frequencia: number;
  /** Clarity do MPM (0..1): quão "limpo"/periódico é o tom. */
  confianca: number;
  motivo: 'ok' | 'silencio' | 'sem_pico_claro';
}

// Faixa da voz cantada (grave ~70Hz a falsete ~1100Hz).
const FREQ_MINIMA = 70;
const FREQ_MAXIMA = 1100;
// Piso de nível só para pular silêncio real e poupar CPU. NÃO cortamos por
// clarity aqui: o motor devolve a clarity e cada chamador decide o limiar
// (afinador aceita mais frouxo; o "cantar" pondera pela clarity na votação).
const RMS_MINIMO = 0.004;

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

  if (!frequencia || frequencia < FREQ_MINIMA || frequencia > FREQ_MAXIMA) {
    return { frequencia: -1, confianca: clarity ?? 0, motivo: 'sem_pico_claro' };
  }

  return { frequencia, confianca: clarity ?? 0, motivo: 'ok' };
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

// Perfis de tonalidade de Krumhansl-Kessler (tônica no índice 0). Representam
// a "importância" perceptual de cada grau dentro de uma tonalidade maior/menor.
const PERFIL_MAIOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const PERFIL_MENOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const BONUS_CADENCIA_TONICA = 0.1;
const MARGEM_CONFIANCA_ALTA = 0.12;

function correlacaoPearson(a: number[], b: number[]): number {
  const n = a.length;
  const mediaA = a.reduce((s, x) => s + x, 0) / n;
  const mediaB = b.reduce((s, x) => s + x, 0) / n;
  let num = 0, denA = 0, denB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - mediaA;
    const db = b[i] - mediaB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  return den === 0 ? 0 : num / den;
}

export interface ResultadoTom {
  /** Tônica do tom detectado (classe de tom), ex.: "G". */
  nota: NomeNota;
  modo: 'maior' | 'menor';
  /** Combina aderência ao perfil e separação do segundo colocado, 0..100. */
  confianca: number;
}

/**
 * Detecta o TOM de uma melodia cantada pelo algoritmo de Krumhansl-Schmuckler.
 *
 * Monta o histograma de classes de tom da voz (ponderado pela clarity de cada
 * quadro — notas sustentadas pesam mais, como a duração) e correlaciona com os
 * 24 perfis de tonalidade (12 maiores + 12 menores). Uma pista cadencial leve
 * favorece a última nota válida como tônica, útil em trechos curtos. Diferente
 * da "nota mais frequente", isso tolera uma voz que percorre a melodia.
 * Ref.: Krumhansl & Schmuckler (1990) — método padrão de key-finding em MIR.
 */
export function detectarTomDaMelodia(amostras: AmostraDeTom[]): ResultadoTom | null {
  if (amostras.length === 0) return null;

  const histograma = new Array(12).fill(0);
  for (const { nota, confianca } of amostras) {
    const idx = NOMES_NOTAS.indexOf(nota as (typeof NOMES_NOTAS)[number]);
    if (idx >= 0) histograma[idx] += confianca > 0 ? confianca : 0;
  }
  if (histograma.reduce((s, x) => s + x, 0) === 0) return null;

  let notaFinal = -1;
  for (let i = amostras.length - 1; i >= 0; i--) {
    notaFinal = NOMES_NOTAS.indexOf(amostras[i].nota as NomeNota);
    if (notaFinal >= 0) break;
  }

  const candidatos: Array<{
    corr: number;
    pontuacao: number;
    tonica: number;
    modo: 'maior' | 'menor';
  }> = [];

  for (let tonica = 0; tonica < 12; tonica++) {
    for (const [modo, perfil] of [['maior', PERFIL_MAIOR], ['menor', PERFIL_MENOR]] as const) {
      // Perfil da tonalidade com essa tônica: peso do grau p = perfil[(p - tônica)].
      const perfilNaTonica = perfil.map((_, p) => perfil[(p - tonica + 12) % 12]);
      const corr = correlacaoPearson(histograma, perfilNaTonica);
      const pontuacao = corr + (tonica === notaFinal ? BONUS_CADENCIA_TONICA : 0);
      candidatos.push({ corr, pontuacao, tonica, modo });
    }
  }

  candidatos.sort((a, b) => b.pontuacao - a.pontuacao);
  const [melhor, segundo] = candidatos;
  const margem = Math.max(0, melhor.pontuacao - segundo.pontuacao);
  const separacao = Math.min(1, margem / MARGEM_CONFIANCA_ALTA);
  const confianca = Math.max(0, Math.min(1, melhor.corr * 0.8 + separacao * 0.2));

  return {
    nota: NOMES_NOTAS[melhor.tonica],
    modo: melhor.modo,
    confianca: Math.round(confianca * 100),
  };
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
