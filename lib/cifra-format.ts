export interface LinhaCifra {
  letraLimpa: string;
  acordes: { nome: string; posicao: number }[];
}

export function extrairAcordesEPosicoes(linha: string): LinhaCifra {
  const acordes: LinhaCifra['acordes'] = [];
  let letraLimpa = '';
  let cursor = 0;
  for (const match of linha.matchAll(/\{([^}]+)\}/g)) {
    letraLimpa += linha.slice(cursor, match.index);
    acordes.push({ nome: match[1], posicao: letraLimpa.length });
    cursor = match.index! + match[0].length;
  }
  letraLimpa += linha.slice(cursor);
  return { letraLimpa, acordes };
}

/** Quebra letra e acordes na mesma coluna, sem separar os símbolos de um acorde. */
export function quebrarLinhaCifra(linha: string, colunas: number): LinhaCifra[] {
  const { letraLimpa, acordes } = extrairAcordesEPosicoes(linha);
  const largura = Math.max(8, Math.floor(colunas));
  const tamanho = Math.max(letraLimpa.length, ...acordes.map(a => a.posicao + a.nome.length));
  if (!tamanho) return [{ letraLimpa, acordes }];
  const linhas: LinhaCifra[] = [];
  let inicio = 0;
  while (inicio < tamanho) {
    let fim = Math.min(inicio + largura, tamanho);
    if (fim < tamanho && letraLimpa[fim] && letraLimpa[fim] !== ' ') {
      const espaco = letraLimpa.lastIndexOf(' ', fim);
      if (espaco > inicio) fim = espaco + 1;
    }
    let cortado = acordes.find(a => a.posicao >= inicio && a.posicao < fim && a.posicao + a.nome.length > fim);
    while (cortado) {
      if (cortado.posicao === inicio) {
        fim = cortado.posicao + cortado.nome.length;
        break;
      }
      // Leva a palavra junto quando o acorde está no meio dela. Reavalia
      // a borda, pois recuar pode alcançar outro acorde da mesma linha.
      const espaco = letraLimpa.lastIndexOf(' ', cortado.posicao - 1);
      fim = espaco >= inicio ? espaco + 1 : cortado.posicao;
      cortado = acordes.find(a => a.posicao >= inicio && a.posicao < fim && a.posicao + a.nome.length > fim);
    }
    linhas.push({
      letraLimpa: letraLimpa.slice(inicio, fim),
      acordes: acordes.filter(a => a.posicao >= inicio && a.posicao < fim)
        .map(a => ({ ...a, posicao: a.posicao - inicio })),
    });
    inicio = fim;
  }
  return linhas;
}
