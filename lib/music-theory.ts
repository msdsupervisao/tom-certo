// lib/music-theory.ts
//
// Núcleo de teoria musical: nomes de notas, conversão frequência -> nota,
// e a lógica de transposição de acordes (a parte "fácil de acertar 100%"
// da arquitetura - é álgebra modular simples, sem ambiguidade).

export const NOMES_NOTAS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
] as const;

export type NomeNota = typeof NOMES_NOTAS[number];

/** Aceita também bemóis, acidentes Unicode e as grafias B#/Cb e E#/Fb. */
export function indiceDaNota(nota: string): number | null {
  const match = nota.match(/^([A-G])([#b♯♭]?)$/);
  if (!match) return null;
  const naturais: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const acidente = ['#', '♯'].includes(match[2]) ? 1 : ['b', '♭'].includes(match[2]) ? -1 : 0;
  return (naturais[match[1]] + acidente + 12) % 12;
}

/** Valida um tom completo; o modo menor permanece na apresentação. */
export function ehTomValido(tom: string): boolean {
  return /^[A-G][#b♯♭]?m?$/.test(tom);
}

const MODIFICADOR = '(?:maj|min|dim|aug|sus|add|dom|omit|no|m|M|[0-9+#bº°øØΔ♯♭-]|/\\d+)';
const SUFIXO_ACORDE = new RegExp(`^${MODIFICADOR}*(?:\\((?:${MODIFICADOR}|,)+\\)${MODIFICADOR}*)*$`);

function decomporAcorde(acorde: string) {
  const match = acorde.match(/^([A-G][#b♯♭]?)(.*?)(?:\/([A-G][#b♯♭]?))?$/);
  if (!match || !SUFIXO_ACORDE.test(match[2])) return null;
  return { raiz: match[1], sufixo: match[2], baixo: match[3] };
}

/** Mesma gramática na importação, na transposição e no leitor. */
export function ehAcorde(acorde: string): boolean {
  return decomporAcorde(acorde) !== null;
}

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
  if (!Number.isFinite(frequencia) || frequencia <= 0) return null;

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
  notaOriginal: string,
  notaDetectada: string
): number | null {
  if (!ehTomValido(notaOriginal) || !ehTomValido(notaDetectada)) return null;
  const indiceOriginal = indiceDaNota(notaOriginal.replace(/m$/, ''))!;
  const indiceDetectado = indiceDaNota(notaDetectada.replace(/m$/, ''))!;

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
  if (!Number.isInteger(semitons) || semitons % 12 === 0) return acorde;
  const partes = decomporAcorde(acorde);
  if (!partes) return acorde;
  return transporNotaUnica(partes.raiz, semitons) + partes.sufixo
    + (partes.baixo ? '/' + transporNotaUnica(partes.baixo, semitons) : '');
}

function transporNotaUnica(nota: string, semitons: number): string {
  const indice = indiceDaNota(nota);
  if (indice === null) return nota;
  return NOMES_NOTAS[((indice + semitons) % 12 + 12) % 12];
}

export function transporTom(tom: string, semitons: number): string {
  return ehTomValido(tom) ? transporAcorde(tom, semitons) : tom;
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
