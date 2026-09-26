// app/api/cifra/route.ts
//
// Busca e faz parse de uma cifra específica do Cifra Club dado um slug.
// Retorna: tom original, título real, artista real, e a cifra no formato
// {Acorde} que o nosso motor de transposição já entende.
//
// Nada é armazenado — cada request é um fetch novo. Os dados ficam só
// na memória do cliente durante aquela sessão.

import { NextRequest, NextResponse } from 'next/server';
import { buscarCifraNaFonte } from '@/lib/cifra-source';

const SLUG_VALIDO = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*){1,2}$/i;
const TAMANHO_MAXIMO_HTML = 2_000_000;
const TIMEOUT_CIFRA_MS = 8_000;

export const runtime = 'edge';
export const preferredRegion = 'gru1';

export interface CifraResult {
  titulo: string;
  artista: string;
  tomOriginal: string | null;
  cifra: string; // no formato {Acorde}Letra da linha
  slug: string;
  simplificada: boolean; // se veio da versão simplificada do Cifra Club
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ erro: 'slug obrigatório' }, { status: 400 });
  }
  if (slug.length > 200 || !SLUG_VALIDO.test(slug)) {
    return NextResponse.json({ erro: 'slug inválido' }, { status: 400 });
  }

  // ?simplificada=1 busca a versão de acordes simplificados do Cifra Club
  // (acordes mais fáceis e sem tablatura), servida em /{slug}/simplificada.html
  const simplificada = ['1', 'true', 'sim'].includes(
    (request.nextUrl.searchParams.get('simplificada') || '').toLowerCase()
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_CIFRA_MS);

  try {
    const response = await buscarCifraNaFonte(slug, simplificada, controller.signal);

    if (!response.ok) {
      console.warn('[cifra] Fonte indisponível', { status: response.status, origem: new URL(response.url).hostname });
      return NextResponse.json(
        { erro: response.status === 404
          ? 'Esta cifra não foi encontrada na fonte.'
          : 'A fonte de cifras está indisponível no momento. Tente novamente em alguns instantes.' },
        { status: response.status === 404 ? 404 : 503 }
      );
    }

    const html = await response.text();
    if (html.length > TAMANHO_MAXIMO_HTML) {
      return NextResponse.json({ erro: 'A página da cifra excedeu o tamanho esperado' }, { status: 502 });
    }
    const resultado = response.url.includes('r.jina.ai')
      ? parsearCifraMarkdown(html, slug)
      : parsearCifra(html, slug);

    if (!resultado) {
      return NextResponse.json({ erro: 'Não foi possível extrair a cifra' }, { status: 422 });
    }

    return NextResponse.json({ ...resultado, simplificada });
  } catch (erro) {
    console.error('[cifra] Erro ao buscar:', erro);
    return NextResponse.json(
      { erro: 'Não foi possível acessar o Cifra Club agora. Tente novamente em alguns segundos.' },
      { status: 503 }
    );
  } finally {
    clearTimeout(timeout);
  }
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
  const padroes = [
    /data-anchor=["']--chord-tone["'][^>]*>\s*([A-G][#b]?)\s*<\/button>/i,
    /Tom(?:<!--[\s\S]{0,20}?-->)?\s*:\s*<\/span>[\s\S]{0,200}?>([A-G][#b]?)\s*<\/button>/i,
    /\btom:\s*<[^>]+>\s*([A-G][#b]?)\s*<\/[^>]+>/i,
    /\btom:\s*([A-G][#b]?)\b/i,
    /\[tom:?\s*([A-G][#b]?)\]/i,
  ];

  for (const padrao of padroes) {
    const match = html.match(padrao);
    if (match) return match[1];
  }
  return null;
}

function resolverTomOriginal(tomExtraido: string | null, cifra: string): string | null {
  if (tomExtraido) return tomExtraido;
  // Fallback conservador: é melhor usar o primeiro acorde real da cifra do que
  // assumir C silenciosamente e transpor toda a música pelo intervalo errado.
  return cifra.match(/\{([A-G][#b]?)/)?.[1] ?? null;
}

function parsearCifra(html: string, slug: string): Omit<CifraResult, 'simplificada'> | null {
  const tomExtraido = extrairTomOriginal(html);

  // --- Título e artista (com decode de entidades HTML) ---
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  let titulo = 'Sem título';
  let artista = 'Artista desconhecido';

  if (titleMatch) {
    // Formato típico: "Evidências - Chitãozinho & Xororó - Cifra Club"
    const titleDecoded = decodeEntities(titleMatch[1]);
    const partes = titleDecoded.split(' - ');
    if (partes.length >= 2) {
      titulo = partes[0].trim().replace(/\s+\((?:acordes|chords)\)$/i, '');
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
      const tomOriginal = resolverTomOriginal(tomExtraido, cifraFormatada);
      if (!tomOriginal) return null;
      return { titulo, artista, tomOriginal, cifra: cifraFormatada, slug };
    }
    
    // Fallback 3: tentar encontrar qualquer texto grande entre divs
    const allTextMatch = html.match(/<div[^>]*>([\s\S]{200,}?)<\/div>/);
    if (allTextMatch) {
      const conteudo = limparConteudoHtml(allTextMatch[1]);
      if (conteudo.length >= 100) {
        const cifraFormatada = converterParaFormatoInterno(conteudo.split('\n'));
        if (cifraFormatada.length >= 20) {
          const tomOriginal = resolverTomOriginal(tomExtraido, cifraFormatada);
          if (!tomOriginal) return null;
          return { titulo, artista, tomOriginal, cifra: cifraFormatada, slug };
        }
      }
    }
    
    return null;
  }

  // Seleciona o <pre> (ou <code>) mais longo (conteúdo bruto)
  const preMatch = preMatches.reduce((best, cur) =>
    cur[1].length > best[1].length ? cur : best
  );

  // O HTML novo do Cifra Club guarda o nome do acorde no atributo
  // `data-chord-name` do <b>. Preserve esse dado antes de remover as tags;
  // sem isso os acordes ficam misturados ao texto e perdem a formatação.
  const preComAcordesMarcados = preMatch[1].replace(
    /<b[^>]*data-chord-name=["']([^"']+)["'][^>]*>[\s\S]*?<\/b>/gi,
    (_match, acorde: string) => `{${acorde.trim()}}`,
  );
  const cifraFormatada = converterParaFormatoInterno(
    limparConteudoHtml(preComAcordesMarcados).split('\n')
  );

  if (cifraFormatada.length < 20) return null;

  const tomOriginal = resolverTomOriginal(tomExtraido, cifraFormatada);
  if (!tomOriginal) return null;

  return { titulo, artista, tomOriginal, cifra: cifraFormatada, slug };
}

/** Interpreta o Markdown retornado pela camada de leitura da página pública. */
function parsearCifraMarkdown(markdown: string, slug: string): Omit<CifraResult, 'simplificada'> | null {
  const titleMatch = markdown.match(/^Title:\s*(.+?)\s+-\s+(.+?)\s+-\s+Cifra Club\s*$/mi);
  const titulo = titleMatch?.[1]?.replace(/\s+\((?:acordes|chords)\)$/i, '').trim() || 'Sem título';
  const artista = titleMatch?.[2]?.trim().replace(/\s+&\s+/g, ' e ') || 'Artista desconhecido';
  const bruto = markdown.split(/^Markdown Content:\s*$/im)[1] || '';
  // O Cifra Club passou a variar o cabeçalho conforme a cifra: algumas
  // respostas têm "Tom:" vazio, outras nem exibem esse campo, e os
  // marcadores ([Intro], [Refrão]...) podem ficar na mesma linha dos acordes.
  // Por isso o início deve ser encontrado pelo primeiro marcador de seção,
  // nunca pelo menu ou por uma linha isolada de "Tom:".
  const inicio = encontrarInicioDaCifra(bruto);
  if (inicio < 0) return null;
  const conteudo = bruto.slice(inicio);
  const fim = encontrarFimDaCifra(conteudo);
  const cifraBruta = fim >= 0 ? conteudo.slice(0, fim) : conteudo;
  const tom = bruto.match(/^Tom:\s*([A-G][#b]?m?)\s*$/im)?.[1] ?? null;
  const linhas = cifraBruta.split(/\r?\n/)
    .map(linha => linha
      .replace(/\*\*([^*]+)\*\*/g, (_, token: string) => REGEX_ACORDE.test(token.trim()) ? `{${token.trim()}}` : token)
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\s+(?=\[[^\]]+\])/g, '\n')
      .trimEnd())
    .flatMap(linha => linha.split('\n'))
    .filter(linha => !/^\[tab\b/i.test(linha) && !/^parte\s+\d+\s+de\s+\d+/i.test(linha) && !/^\d+\s*bpm$/i.test(linha.trim()) && !/^tempo\s+\d+:/i.test(linha.trim()) && !/^batida /i.test(linha.trim()));
  const cifra = linhas.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (cifra.length < 20) return null;
  const tomResolvido = tom ?? cifra.match(/\{([A-G][#b]?(?:m|maj|min)?)\}/)?.[1] ?? null;
  return { titulo, artista, tomOriginal: tomResolvido, cifra, slug };
}

function normalizarMarcador(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function ehMarcadorDeSecao(valor: string): boolean {
  const marcador = normalizarMarcador(valor);
  return /^(?:intro|vers(?:o|e)|coro|chorus|refrao(?:\s+final)?|pre[- ]?refrao|ponte|bridge|solo|final|outro|hook|parte(?:\s+\d+|\s+(?:primeira|segunda|terceira|quarta))?|primeira parte|segunda parte|terceira parte|quarta parte|estrofe|verse|pre-chorus)(?:\s+\d+)?$/i.test(marcador);
}

function encontrarInicioDaCifra(bruto: string): number {
  const marcadores = /\[([^\]]+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = marcadores.exec(bruto))) {
    if (ehMarcadorDeSecao(match[1])) return match.index;
  }

  // Algumas cifras não têm seções. Nesse formato o primeiro acorde em
  // negrito seguido de texto é o início mais seguro depois do cabeçalho.
  const tom = bruto.match(/^Tom:.*$/im);
  const inicioBusca = tom?.index !== undefined ? tom.index + tom[0].length : 0;
  const restante = bruto.slice(inicioBusca);
  const primeiraLinhaComAcorde = restante.search(/^\s*\*\*[A-G][#b]?[A-Za-z0-9+#/()º°-]*\*\*/im);
  return primeiraLinhaComAcorde >= 0 ? inicioBusca + primeiraLinhaComAcorde : -1;
}

function encontrarFimDaCifra(conteudo: string): number {
  let deslocamento = 0;
  for (const linha of conteudo.split(/\r?\n/)) {
    const limpa = normalizarMarcador(linha.replace(/^#+\s*/, ''));
    if (limpa === 'informacoes da musica') return deslocamento;
    deslocamento += linha.length + 1;
  }
  return -1;
}

/** Remove tags HTML mantendo texto e quebras de linha, depois decodifica entidades */
function limparConteudoHtml(raw: string): string {
  const semTags = raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  return decodeEntities(semTags);
}

// Regex para reconhecer um acorde musical válido
const REGEX_ACORDE = /^([A-G][#b]?(?:m|maj|min|dim|aug|sus|add|dom)?(?:\d+)?(?:[+#]|º|°)?(?:\/[A-G][#b]?)?(?:\([^)]*\))?)$/;

/** Verifica se uma string é um acorde ou lista de acordes (linha de acordes) */
function ehLinhaDeAcordes(linha: string): boolean {
  const trimada = linha.trim();
  if (!trimada) return false;
  if (trimada.startsWith('[') && trimada.endsWith(']')) return false;
  if (trimada.includes('|') || /^[EBGDA]\|/.test(trimada)) return false;

  const tokens = trimada.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;

  return tokens.every((t) => REGEX_ACORDE.test(t));
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
  if (/^\[riff/i.test(t)) return true;
  if (/^\[solo/i.test(t)) return true;
  if (/^\[ponte/i.test(t)) return true;
  if (/^parte\s+\d+\s+de\s+\d+/i.test(t)) return true;
  if (/^part\s+\d+\s+of\s+\d+/i.test(t)) return true;
  return false;
}

/** Converte linhas de acordes+letra do formato CC para nosso formato {Acorde} */
function converterParaFormatoInterno(linhas: string[]): string {
  const saida: string[] = [];
  let i = 0;

  const linhasFiltradas: string[] = linhas.filter(l => !ehLinhaLixo(l));

  i = 0;
  while (i < linhasFiltradas.length) {
    const linhaAtual = linhasFiltradas[i];
    const proximaLinha = linhasFiltradas[i + 1] || '';
    const trimada = linhaAtual.trim();

    if (trimada.startsWith('[') && trimada.endsWith(']')) {
      const interno = trimada.slice(1, -1).trim().toLowerCase();
      const ehMarcadorLimpo = /^(intro|verso|coro|refrao|refrão|bridge|pre.refrao|pre-refrao|solo|final|outro|chorus|verse|hook|primeira parte|segunda parte|primeira|segunda|terceira|parte \d|estrofe)/i.test(interno);
      if (ehMarcadorLimpo) saida.push(linhaAtual);
      i += 1;
      continue;
    }

    if (ehLinhaDeAcordes(linhaAtual)) {
      if (proximaLinha.trim() && !ehLinhaDeAcordes(proximaLinha) && !proximaLinha.trim().startsWith('[')) {
        saida.push(mesclarAcordesComLetra(linhaAtual, proximaLinha));
        i += 2;
      } else {
        i += 1;
      }
      continue;
    }

    saida.push(linhaAtual);
    i += 1;
  }

  return saida.join('\n').replace(/\n{3,}/g, '\n\n').trim();
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
    if (REGEX_ACORDE.test(m[1])) {
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
