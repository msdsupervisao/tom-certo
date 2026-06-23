// lib/guitar-tuning.ts
//
// Referências de afinação padrão do violão (EADGBE). Frequências em Hz
// na oitava convencional de cada corda, afinação concertista A4=440Hz.

export interface CordaViolao {
  nome: string; // ex: "E" (Mi grave)
  numero: number; // 1 (mais aguda/fina) a 6 (mais grave/grossa)
  frequencia: number;
}

export const CORDAS_VIOLAO: CordaViolao[] = [
  { nome: 'E', numero: 6, frequencia: 82.41 },  // Mi grave (mais grossa)
  { nome: 'A', numero: 5, frequencia: 110.0 },
  { nome: 'D', numero: 4, frequencia: 146.83 },
  { nome: 'G', numero: 3, frequencia: 196.0 },
  { nome: 'B', numero: 2, frequencia: 246.94 },
  { nome: 'E', numero: 1, frequencia: 329.63 }, // Mi agudo (mais fina)
];

export interface ResultadoAfinacao {
  corda: CordaViolao;
  centsDeDesvio: number; // negativo = grave, positivo = agudo
  status: 'afinada' | 'um_pouco_desafinada' | 'desafinada';
}

/**
 * Dado uma frequência detectada, identifica a corda mais próxima
 * e calcula o desvio em cents (1 semitom = 100 cents) para indicar
 * se está grave, afinada ou aguda demais.
 */
export function compararComCordaMaisProxima(
  frequenciaDetectada: number
): ResultadoAfinacao {
  let cordaMaisProxima = CORDAS_VIOLAO[0];
  let menorDiferencaCents = Infinity;

  for (const corda of CORDAS_VIOLAO) {
    const cents = 1200 * Math.log2(frequenciaDetectada / corda.frequencia);
    if (Math.abs(cents) < Math.abs(menorDiferencaCents)) {
      menorDiferencaCents = cents;
      cordaMaisProxima = corda;
    }
  }

  let status: ResultadoAfinacao['status'] = 'afinada';
  if (Math.abs(menorDiferencaCents) > 25) status = 'desafinada';
  else if (Math.abs(menorDiferencaCents) > 8) status = 'um_pouco_desafinada';

  return {
    corda: cordaMaisProxima,
    centsDeDesvio: Math.round(menorDiferencaCents),
    status,
  };
}
