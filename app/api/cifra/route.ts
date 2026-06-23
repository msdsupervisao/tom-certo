// app/api/cifra/route.ts
//
// Busca e faz parse de uma cifra específica do Cifra Club dado um slug.
// Retorna: tom original, título real, artista real, e a cifra no formato
// {Acorde} que o nosso motor de transposição já entende.
//
// Nada é armazenado — cada request é um fetch novo. Os dados ficam só
// na memória do cliente durante aquela sessão.

import { NextRequest, NextResponse } from 'next/server';

export interface CifraResult {
  titulo: string;
  artista: string;
  tomOriginal: string;
  cifra: string; // no formato {Acorde}Letra da linha
  slug: string;
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ erro: 'slug obrigatório' }, { status: 400 });
  }

  const url = `https://www.cifraclub.com.br/${slug}/`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        Accept: 'text/html,application/xhtml+xml',
        Referer: 'https://www.cifraclub.com.br/',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { erro: `Cifra Club retornou ${response.status}` },
        { status: response.status }
      );
    }

    const html = await response.text();
    const resultado = parsearCifra(html, slug);

    if (!resultado) {
      return NextResponse.json({ erro: 'Não foi possível extrair a cifra' }, { status: 422 });
    }

    return NextResponse.json(resultado);
  } catch (erro) {
    console.error('[cifra] Erro ao buscar:', erro);
    return NextResponse.json({ erro: 'Falha ao carregar cifra' }, { status: 500 });
  }
}

function parsearCifra(html: string, slug: string): CifraResult | null {
  // --- Tom original ---
  // O Cifra Club exibe: tom: E (pode ser qualquer nota, com # ou b)
  const tomMatch = html.match(/tom:\s*<[^>]+>([A-G][#b]?)<\/[^>]+>/i)
    || html.match(/\btom:\s*([A-G][#b]?)\b/i);
  const tomOriginal = tomMatch ? tomMatch[1] : 'C';

  // --- Título e artista ---
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  let titulo = 'Sem título';
  let artista = 'Artista desconhecido';

  if (titleMatch) {
    // Formato típico: "Evidências - Chitãozinho & Xororó - Cifra Club"
    const partes = titleMatch[1].split(' - ');
    if (partes.length >= 2) {
      titulo = partes[0].trim();
      artista = partes[1].replace('Cifra Club', '').trim();
    }
  }

  // --- Corpo da cifra ---
  // O Cifra Club entrega a cifra dentro de uma tag <pre> ou dentro de
  // um elemento com classe específica. Tenta as duas abordagens.
  const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (!preMatch) return null;

  const conteudoRaw = preMatch[1];

  // Limpa tags HTML mantendo o texto e quebras de linha
  const conteudoLimpo = conteudoRaw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));

  // Converte o formato do Cifra Club para o nosso formato {Acorde}
  // O CC usa linhas de acordes (somente acordes) acima de linhas de letra.
  // Ex:
  //   "        E              B/D#"   ← linha de acordes
  //   "Quando eu digo que deixei"     ← linha de letra
  //
  // Detecta se uma linha é de acordes: contém só tokens que são acordes válidos e espaços.
  const linhas = conteudoLimpo.split('\n');
  const cifraFormatada = converterParaFormatoInterno(linhas);

  return { titulo, artista, tomOriginal, cifra: cifraFormatada, slug };
}

// Regex para reconhecer um acorde musical válido
const REGEX_ACORDE = /^([A-G][#b]?(?:m|maj|min|dim|aug|sus|add|dom)?(?:\d+)?(?:\/[A-G][#b]?)?(?:\([^)]*\))?)$/;

/** Verifica se uma string é um acorde ou lista de acordes (linha de acordes) */
function ehLinhaDeAcordes(linha: string): boolean {
  const trimada = linha.trim();
  if (!trimada) return false;
  // Ignora linhas de seção como [Refrão], [Intro], etc.
  if (trimada.startsWith('[') && trimada.endsWith(']')) return false;
  // Ignora linhas de tab (contêm | ou -)
  if (trimada.includes('|') || /^[EBGDA]\|/.test(trimada)) return false;

  // Divide por espaços e testa cada token como acorde
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
  // Tablatura
  if (ehLinhaDeTablatura(linha)) return true;
  // Marcadores de tab, riff, solo, parte
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

  // Remove linhas de lixo (tab, riff, parte X de Y, etc)
  const linhasFiltradas: string[] = linhas.filter(l => !ehLinhaLixo(l));

  i = 0;
  while (i < linhasFiltradas.length) {
    const linhaAtual = linhasFiltradas[i];
    const proximaLinha = linhasFiltradas[i + 1] || '';
    const trimada = linhaAtual.trim();

    // Marcador de seção limpo como [Intro], [Refrão], [Verso], etc.
    // Descarta marcadores compostos como [Riff Intro], [Tab - Intro]
    if (trimada.startsWith('[') && trimada.endsWith(']')) {
      const interno = trimada.slice(1, -1).trim().toLowerCase();
      const ehMarcadorLimpo = /^(intro|verso|coro|refrao|refrão|bridge|pre.refrao|pre-refrao|solo|final|outro|chorus|verse|hook|primeira parte|segunda parte|primeira|segunda|terceira|parte \d|estrofe)/i.test(interno);
      if (ehMarcadorLimpo) saida.push(linhaAtual);
      // Marcadores não reconhecidos são descartados
      i += 1;
      continue;
    }

    if (ehLinhaDeAcordes(linhaAtual)) {
      if (proximaLinha.trim() && !ehLinhaDeAcordes(proximaLinha) && !proximaLinha.trim().startsWith('[')) {
        // Acorde com letra logo abaixo — mescla
        saida.push(mesclarAcordesComLetra(linhaAtual, proximaLinha));
        i += 2;
      } else {
        // Acorde sem letra — descarta
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
 *
 * Funciona por posição de coluna: cada acorde na linha de acordes é inserido
 * na posição correspondente dentro da letra.
 */
function mesclarAcordesComLetra(linhaAcordes: string, linhaLetra: string): string {
  // Extrai acordes com suas posições de coluna
  const acordesPosicionados: { acorde: string; col: number }[] = [];
  const regexAcorde = /(\S+)/g;
  let m;
  while ((m = regexAcorde.exec(linhaAcordes)) !== null) {
    if (REGEX_ACORDE.test(m[1])) {
      acordesPosicionados.push({ acorde: m[1], col: m.index });
    }
  }

  if (acordesPosicionados.length === 0) return linhaLetra;

  // Reconstrói a linha da direita para a esquerda, inserindo {Acorde} nas posições
  let resultado = linhaLetra;
  // Ordena da direita pra esquerda para inserir sem deslocar índices anteriores
  const ordenados = [...acordesPosicionados].sort((a, b) => b.col - a.col);

  for (const { acorde, col } of ordenados) {
    // Garante que o resultado tem espaços suficientes
    while (resultado.length < col) resultado += ' ';
    resultado = resultado.slice(0, col) + `{${acorde}}` + resultado.slice(col);
  }

  return resultado;
}
