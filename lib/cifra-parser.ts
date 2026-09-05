import { ehAcorde, ehTomValido } from './music-theory';

export interface CifraResult {
  titulo: string;
  artista: string;
  tomOriginal: string | null;
  capotraste: number | null;
  cifra: string; // no formato {Acorde}Letra da linha
  slug: string;
  simplificada: boolean; // se veio da versão simplificada do Cifra Club
}

/** Decodifica entidades HTML comuns (incluindo acentos em português) */
function decodeEntities(s: string): string {
  const map: Record<string, string> = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
    '&nbsp;': ' ',
    // vogais com acento
    '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í', '&oacute;': 'ó', '&uacute;': 'ú',
    '&Aacute;': 'Á', '&Eacute;': 'É', '&Iacute;': 'Í', '&Oacute;': 'Ó', '&Uacute;': 'Ú',
    '&agrave;': 'à', '&egrave;': 'è', '&ograve;': 'ò', '&ugrave;': 'ù',
    '&Agrave;': 'À', '&Egrave;': 'È', '&Ograve;': 'Ò', '&Ugrave;': 'Ù',
    '&acirc;': 'â', '&ecirc;': 'ê', '&icirc;': 'î', '&ocirc;': 'ô', '&ucirc;': 'û',
    '&Acirc;': 'Â', '&Ecirc;': 'Ê', '&Icirc;': 'Î', '&Ocirc;': 'Ô', '&Ucirc;': 'Û',
    '&atilde;': 'ã', '&otilde;': 'õ', '&Atilde;': 'Ã', '&Otilde;': 'Õ',
    '&ccedil;': 'ç', '&Ccedil;': 'Ç',
    '&ntilde;': 'ñ', '&Ntilde;': 'Ñ',
    '&auml;': 'ä', '&ouml;': 'ö', '&uuml;': 'ü',
    '&szlig;': 'ß',
  };
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&[a-zA-Z]+;/g, (m) => map[m] ?? m)
}

function extrairTomOriginal(html: string): string | null {
  const semComentarios = html.replace(/<!--[\s\S]*?-->/g, '');
  const padroes = [
    /data-anchor=["']--chord-tone["'][^>]*>\s*([A-G][#b♯♭]?m?)\s*(?:\(com forma de [A-G][#b♯♭]?m?\))?\s*<\/button>/i,
    /Tom(?:<!--[\s\S]{0,20}?-->)?\s*:\s*<\/span>[\s\S]{0,200}?>([A-G][#b♯♭]?m?)\s*<\/button>/i,
    /\btom:\s*<[^>]+>\s*([A-G][#b♯♭]?m?)\s*<\/[^>]+>/i,
    /\btom:\s*([A-G][#b♯♭]?m?)(?=\s|<|$)/i,
    /\[tom:?\s*([A-G][#b♯♭]?m?)\]/i,
  ];

  for (const padrao of padroes) {
    const match = semComentarios.match(padrao);
    if (match) {
      const tom = match[1][0].toUpperCase() + match[1].slice(1);
      if (ehTomValido(tom)) return tom;
    }
  }
  return null;
}

function extrairCapotraste(html: string): number | null {
  const botao = html.match(/data-anchor=["']--chord-capo["'][^>]*>([\s\S]*?)<\/button>/i);
  if (!botao) return null;
  const casa = limparConteudoHtml(botao[1]).trim().match(/^(\d{1,2})[ªº]?\s+casa$/i);
  if (!casa) return null;
  const numero = Number(casa[1]);
  return numero >= 1 && numero <= 24 ? numero : null;
}

export function parsearCifra(html: string, slug: string): Omit<CifraResult, 'simplificada'> | null {
  const tomExtraido = extrairTomOriginal(html);
  const capotraste = extrairCapotraste(html);

  // --- Título e artista (com decode de entidades HTML) ---
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  let titulo = 'Sem título';
  let artista = 'Artista desconhecido';

  if (titleMatch) {
    // Formato típico: "Evidências - Chitãozinho & Xororó - Cifra Club"
    const titleDecoded = decodeEntities(titleMatch[1]);
    const partes = titleDecoded.split(' - ');
    if (partes.length >= 2) {
      titulo = partes[0].trim();
      // Remove "Cifra Club" do final, pega somente o nome do artista
      artista = partes
        .slice(1)
        .join(' - ')
        .replace(/\s*[-–]\s*Cifra Club\s*$/i, '')
        .replace(/Cifra Club/i, '')
        .trim()
        // Normaliza & para "e" em nomes de artistas (ex: "Jorge & Mateus" → "Jorge e Mateus")
        .replace(/\s+&\s+/g, ' e ');
    }
  }

  // --- Corpo da cifra ---
  // Pega TODOS os <pre> e usa o mais longo (que é o corpo da cifra de fato).
  // Algumas páginas têm <pre> pequenos com metadados, exemplos, etc.
  let preMatches = [...html.matchAll(/<pre[^>]*>([\s\S]*?)<\/pre>/gi)];

  // Fallback 1: Se não encontrou <pre>, tenta <code>
  if (preMatches.length === 0) {
    preMatches = [...html.matchAll(/<code[^>]*>([\s\S]*?)<\/code>/gi)];
  }

  if (preMatches.length === 0) {
    // Fallback 2: tentar localizar dentro de uma div com classe cifra, chord, tab, etc
    const divMatch = html.match(/<div[^>]+class="[^"]*(?:cifra|chord|tab|corda)[^"]*"[^>]*>([\s\S]{100,}?)<\/div>/i);
    if (divMatch) {
      const conteudo = limparConteudoHtml(divMatch[1]);
      if (conteudo.length < 50) return null;
      const cifraFormatada = converterParaFormatoInterno(conteudo.split('\n'));
      if (cifraFormatada.length < 20) return null;
      return { titulo, artista, tomOriginal: tomExtraido, capotraste, cifra: cifraFormatada, slug };
    }

    // Fallback 3: tentar encontrar qualquer texto grande entre divs
    const allTextMatch = html.match(/<div[^>]*>([\s\S]{200,}?)<\/div>/);
    if (allTextMatch) {
      const conteudo = limparConteudoHtml(allTextMatch[1]);
      if (conteudo.length >= 100) {
        const cifraFormatada = converterParaFormatoInterno(conteudo.split('\n'));
        if (cifraFormatada.length >= 20) {
          return { titulo, artista, tomOriginal: tomExtraido, capotraste, cifra: cifraFormatada, slug };
        }
      }
    }

    return null;
  }

  // Seleciona o <pre> (ou <code>) mais longo (conteúdo bruto)
  const preMatch = preMatches.reduce((best, cur) =>
    cur[1].length > best[1].length ? cur : best
  );

  const cifraFormatada = converterParaFormatoInterno(
    limparConteudoHtml(preMatch[1]).split('\n')
  );

  if (cifraFormatada.length < 20) return null;

  // O primeiro acorde pode ser outro grau: não inventa a tonalidade ausente.
  return { titulo, artista, tomOriginal: tomExtraido, capotraste, cifra: cifraFormatada, slug };
}

/** Remove tags HTML mantendo texto e quebras de linha, depois decodifica entidades */
function limparConteudoHtml(raw: string): string {
  const semTags = raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  return decodeEntities(semTags);
}

const MARCADOR_SECAO = /^\s*\[(intro|verso|coro|refr[aã]o|bridge|pr[eé][- ]?refr[aã]o|solo|riff|ponte|final|outro|chorus|verse|hook|primeira(?: parte)?|segunda(?: parte)?|terceira(?: parte)?|parte \d+|estrofe)[^\]]*\]/i;
const SEPARADOR_ACORDES = /^(?:[|:]+|[()\[\]]|\/?\d+x|\(\d+x\))$/i;

/** Verifica se uma string é um acorde ou lista de acordes (linha de acordes) */
function ehLinhaDeAcordes(linha: string): boolean {
  const trimada = linha.trim();
  if (!trimada) return false;
  if (trimada.startsWith('[') && trimada.endsWith(']')) return false;
  if (ehLinhaDeTablatura(trimada)) return false;

  const tokens = trimada.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;

  return tokens.some(ehAcorde) && tokens.every((t) => ehAcorde(t) || SEPARADOR_ACORDES.test(t));
}

/** Verifica se uma linha é tablatura (ex: E|--2--3--) */
function ehLinhaDeTablatura(linha: string): boolean {
  return /^[EBGDAe]\s*\|/.test(linha.trim()) || /^\|[-\d\s|hpbr/\\]+\|?\s*$/.test(linha.trim());
}

/** Verifica se uma linha deve ser completamente descartada */
function ehLinhaLixo(linha: string): boolean {
  const t = linha.trim();
  if (!t) return false;
  if (ehLinhaDeTablatura(linha)) return true;
  if (/^\[tab/i.test(t)) return true;
  if (/^parte\s+\d+\s+de\s+\d+/i.test(t)) return true;
  if (/^part\s+\d+\s+of\s+\d+/i.test(t)) return true;
  return false;
}

/** Converte linhas de acordes+letra do formato CC para nosso formato {Acorde} */
export function converterParaFormatoInterno(linhas: string[]): string {
  const saida: string[] = [];
  let i = 0;

  const linhasFiltradas = linhas.map(l => l.replace(/\r$/, '')).filter(l => !ehLinhaLixo(l));

  i = 0;
  while (i < linhasFiltradas.length) {
    const linhaAtual = linhasFiltradas[i];
    const proximaLinha = linhasFiltradas[i + 1] || '';
    const trimada = linhaAtual.trim();

    const secao = linhaAtual.match(MARCADOR_SECAO);
    if (secao) {
      saida.push(secao[0].trim());
      const acordesDaSecao = linhaAtual.slice(secao[0].length).trim();
      if (acordesDaSecao) saida.push(marcarAcordes(acordesDaSecao));
      i += 1;
      continue;
    }

    if (trimada.startsWith('[') && trimada.endsWith(']')) {
      i += 1;
      continue;
    }

    if (ehLinhaDeAcordes(linhaAtual)) {
      if (proximaLinha.trim() && !ehLinhaDeAcordes(proximaLinha) && !proximaLinha.trim().startsWith('[')) {
        saida.push(mesclarAcordesComLetra(linhaAtual, proximaLinha));
        i += 2;
      } else {
        // Introduções, finais e sequências instrumentais também são transpostas.
        saida.push(marcarAcordes(linhaAtual));
        i += 1;
      }
      continue;
    }

    saida.push(linhaAtual);
    i += 1;
  }

  return saida.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function marcarAcordes(linha: string): string {
  // Espaços reservam a largura do acorde nas linhas instrumentais.
  return linha.replace(/\S+/g, token => ehAcorde(token) ? `{${token}}${' '.repeat(token.length)}` : token);
}

/**
 * Mescla uma linha de acordes com a linha de letra correspondente.
 * Ex: "    E         B/D#" + "Quando eu digo" → "{E}Quando eu {B/D#}digo"
 */
function mesclarAcordesComLetra(linhaAcordes: string, linhaLetra: string): string {
  const acordesPosicionados: { acorde: string; col: number }[] = [];
  const regexAcorde = /(\S+)/g;
  let m;
  while ((m = regexAcorde.exec(linhaAcordes)) !== null) {
    if (ehAcorde(m[1])) {
      acordesPosicionados.push({ acorde: m[1], col: m.index });
    }
  }

  if (acordesPosicionados.length === 0) return linhaLetra;

  let resultado = linhaLetra;
  const ordenados = [...acordesPosicionados].sort((a, b) => b.col - a.col);

  for (const { acorde, col } of ordenados) {
    while (resultado.length < col) resultado += ' ';
    resultado = resultado.slice(0, col) + `{${acorde}}` + resultado.slice(col);
  }

  return resultado;
}
