// lib/pitch-detection.ts
//
// Engine de detecção de pitch por autocorrelação.
// Esta é a MESMA lógica validada no teste isolado (pitch-test/index.html)
// que atingiu 70-90% de acerto em condições reais. Portada para TS,
// sem trocar o algoritmo - reescrever a engine sem reteste é o tipo de
// risco que a gente quer evitar depois de já ter validado o que funciona.

export interface ResultadoDeteccao {
  frequencia: number;
  confianca: number;
  motivo: 'ok' | 'silencio' | 'sem_pico_claro';
}

/**
 * Detecta a frequência fundamental de um buffer de áudio usando autocorrelação.
 * Compara o sinal com versões deslocadas de si mesmo; quando a defasagem
 * corresponde ao período da onda, a correlação é máxima.
 */
export function detectarPitchAutocorrelacao(
  buffer: Float32Array,
  sampleRate: number
): ResultadoDeteccao {
  const tamanho = buffer.length;

  let somaQuadrados = 0;
  for (let i = 0; i < tamanho; i++) {
    somaQuadrados += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(somaQuadrados / tamanho);

  if (rms < 0.01) {
    return { frequencia: -1, confianca: 0, motivo: 'silencio' };
  }

  // Faixa de frequência humana cantada: ~70Hz (voz grave) a ~1000Hz (voz aguda/falsete)
  const freqMinima = 70;
  const freqMaxima = 1000;
  const periodoMaximo = Math.floor(sampleRate / freqMinima);
  const periodoMinimo = Math.floor(sampleRate / freqMaxima);

  let melhorCorrelacao = 0;
  let melhorPeriodo = -1;

  for (let periodo = periodoMinimo; periodo <= periodoMaximo; periodo++) {
    let correlacao = 0;
    let normalizacao = 0;

    for (let i = 0; i < tamanho - periodo; i++) {
      correlacao += buffer[i] * buffer[i + periodo];
      normalizacao += buffer[i] * buffer[i];
    }

    if (normalizacao > 0) {
      correlacao = correlacao / normalizacao;
    }

    if (correlacao > melhorCorrelacao) {
      melhorCorrelacao = correlacao;
      melhorPeriodo = periodo;
    }
  }

  if (melhorPeriodo === -1 || melhorCorrelacao < 0.3) {
    return { frequencia: -1, confianca: melhorCorrelacao, motivo: 'sem_pico_claro' };
  }

  const frequenciaDetectada = sampleRate / melhorPeriodo;

  return {
    frequencia: frequenciaDetectada,
    confianca: melhorCorrelacao,
    motivo: 'ok',
  };
}

export type NivelConfianca = 'alta' | 'media' | 'baixa';

export function classificarConfianca(valor: number): NivelConfianca {
  if (valor > 0.8) return 'alta';
  if (valor > 0.5) return 'media';
  return 'baixa';
}

/**
 * Dado um histórico de notas detectadas ao longo da gravação, retorna
 * a nota mais frequente (moda) e o quão estável foi essa detecção.
 * Isso é mais robusto que confiar num único instante: se o usuário
 * variar levemente a voz, a moda ainda captura o tom predominante.
 */
export function calcularNotaMaisEstavel(historicoDeNotas: string[]): {
  nota: string;
  estabilidadePercentual: number;
} | null {
  if (historicoDeNotas.length === 0) return null;

  const contagem: Record<string, number> = {};
  historicoDeNotas.forEach((n) => {
    contagem[n] = (contagem[n] || 0) + 1;
  });

  const [notaMaisFrequente, ocorrencias] = Object.entries(contagem).sort(
    (a, b) => b[1] - a[1]
  )[0];

  return {
    nota: notaMaisFrequente,
    estabilidadePercentual: Math.round((ocorrencias / historicoDeNotas.length) * 100),
  };
}
