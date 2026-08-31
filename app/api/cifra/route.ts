// app/api/cifra/route.ts
//
// Busca e faz parse de uma cifra específica do Cifra Club dado um slug.
// Retorna: tom original, título real, artista real, e a cifra no formato
// {Acorde} que o nosso motor de transposição já entende.
//
// Nada é armazenado — cada request é um fetch novo. Os dados ficam só
// na memória do cliente durante aquela sessão.

import { NextRequest, NextResponse } from 'next/server';

const SLUG_VALIDO = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*){1,2}$/i;
const TAMANHO_MAXIMO_HTML = 2_000_000;
const TIMEOUT_CIFRA_MS = 8_000;

export interface CifraResult {
  titulo: string;
  artista: string;
  tomOriginal: string;
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

  const url = simplificada
    ? `https://www.cifraclub.com.br/${slug}/simplificada.html`
    : `https://www.cifraclub.com.br/${slug}/`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_CIFRA_MS);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        Referer: 'https://www.cifraclub.com.br/',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { erro: `Cifra Club retornou ${response.status}` },
        { status: response.status }
      );
    }

    const html = await response.text();
    if (html.length > TAMANHO_MAXIMO_HTML) {
      return NextResponse.json({ erro: 'A página da cifra excedeu o tamanho esperado' }, { status: 502 });
    }
    const resultado = parsearCifra(html, slug);

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

  const cifraFormatada = converterParaFormatoInterno(
    limparConteudoHtml(preMatch[1]).split('\n')
  );

  if (cifraFormatada.length < 20) return null;

  const tomOriginal = resolverTomOriginal(tomExtraido, cifraFormatada);
  if (!tomOriginal) return null;

  return { titulo, artista, tomOriginal, cifra: cifraFormatada, slug };
}

/** Remove tags HTML mantendo texto e quebras de linha, depois decodifica entidades */
function limparConteudoHtml(raw: string): string {
  const semTags = raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  return decodeEntities(semTags);
}

// Regex para reconhecer um acorde musical válido
const REGEX_ACORDE = /^([A-G][#b]?(?:m|maj|min|dim|aug|sus|add|dom)?(?:\d+)?(?:\/[A-G][#b]?)?(?:\([^)]*\))?)$/;

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
