// lib/music-theory.ts
//
// Núcleo de teoria musical: nomes de notas, conversão frequência -> nota,
// e a lógica de transposição de acordes (a parte "fácil de acertar 100%"
// da arquitetura - é álgebra modular simples, sem ambiguidade).

export const NOMES_NOTAS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
] as const;

export type NomeNota = typeof NOMES_NOTAS[number];

export interface NotaDetectada {
  nome: NomeNota;
  oitava: number;
  cents: number;
  frequencia: number;
}

/**
 * Converte uma frequência em Hz para a nota musical mais próxima.
 * Usa A4 = 440Hz como referência padrão (afinação concertista).
 */
export function frequenciaParaNota(frequencia: number): NotaDetectada | null {
  if (frequencia <= 0) return null;

  const A4 = 440;
  const semitomEntreA4 = 12 * Math.log2(frequencia / A4);
  const semitomArredondado = Math.round(semitomEntreA4);
  const centsDeDesvio = Math.round((semitomEntreA4 - semitomArredondado) * 100);

  let indiceNota = (9 + semitomArredondado) % 12;
  if (indiceNota < 0) indiceNota += 12;

  const oitava = 4 + Math.floor((9 + semitomArredondado) / 12);

  return {
    nome: NOMES_NOTAS[indiceNota],
    oitava,
    cents: centsDeDesvio,
    frequencia,
  };
}

/**
 * Calcula o intervalo em semitons entre o tom original da música
 * e o tom detectado na voz do usuário. Resultado pode ser negativo
 * (transpor para baixo) ou positivo (transpor para cima).
 */
export function calcularIntervaloSemitons(
  notaOriginal: NomeNota,
  notaDetectada: NomeNota
): number {
  const indiceOriginal = NOMES_NOTAS.indexOf(notaOriginal);
  const indiceDetectado = NOMES_NOTAS.indexOf(notaDetectada);

  let intervalo = indiceDetectado - indiceOriginal;

  // Normaliza para o caminho mais curto: prefere transposições
  // entre -6 e +6 semitons em vez de, por exemplo, +11 quando -1 é mais natural.
  if (intervalo > 6) intervalo -= 12;
  if (intervalo < -6) intervalo += 12;

  return intervalo;
}

/**
 * Transpõe um único acorde (ex: "G", "Am", "C#7", "Dm7/F") por N semitons.
 * Preserva sufixos (m, 7, maj7, sus4, etc) e baixo de inversão (depois da barra).
 */
export function transporAcorde(acorde: string, semitons: number): string {
  if (semitons === 0) return acorde;

  // Regex captura: nota raiz (com sustenido/bemol opcional), sufixo, e baixo opcional após "/"
  const match = acorde.match(/^([A-G])(#|b)?([^/]*)(\/([A-G])(#|b)?)?$/);
  if (!match) return acorde; // não reconhecido como acorde - retorna sem alterar

  const [, raiz, acidente, sufixo, , baixoRaiz, baixoAcidente] = match;

  const raizTransposta = transporNotaUnica(raiz, acidente, semitons);

  let resultado = raizTransposta + sufixo;

  if (baixoRaiz) {
    const baixoTransposto = transporNotaUnica(baixoRaiz, baixoAcidente, semitons);
    resultado += '/' + baixoTransposto;
  }

  return resultado;
}

function transporNotaUnica(raiz: string, acidente: string | undefined, semitons: number): string {
  // Normaliza bemol para o sustenido equivalente para simplificar o índice
  const mapaBemolParaSustenido: Record<string, string> = {
    Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#',
  };

  const notaCompleta = raiz + (acidente || '');
  const notaNormalizada = mapaBemolParaSustenido[notaCompleta] || notaCompleta;

  const indiceAtual = NOMES_NOTAS.indexOf(notaNormalizada as NomeNota);
  if (indiceAtual === -1) return notaCompleta; // fallback de segurança

  let novoIndice = (indiceAtual + semitons) % 12;
  if (novoIndice < 0) novoIndice += 12;

  return NOMES_NOTAS[novoIndice];
}

/**
 * Transpõe uma cifra inteira. A cifra é representada como texto onde
 * acordes aparecem marcados entre chaves, ex: "{G}Quando eu {Am}penso em você"
 * Esse formato facilita renderizar e editar sem ambiguidade entre acorde e letra.
 */
export function transporCifraCompleta(textoCifra: string, semitons: number): string {
  if (semitons === 0) return textoCifra;

  return textoCifra.replace(/\{([^}]+)\}/g, (_match, acorde) => {
    return `{${transporAcorde(acorde, semitons)}}`;
  });
}
