// app/api/cifra/route.ts
//
// Busca e faz parse de uma cifra específica do Cifra Club dado um slug.
// Retorna: tom original, título real, artista real, e a cifra no formato
// {Acorde} que o nosso motor de transposição já entende.
//
// Nada é armazenado — cada request é um fetch novo. Os dados ficam só
// na memória do cliente durante aquela sessão.

import { NextRequest, NextResponse } from 'next/server';
import { parsearCifra } from '@/lib/cifra-parser';

const SLUG_VALIDO = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*){1,2}$/i;
const TAMANHO_MAXIMO_HTML = 2_000_000;
const TIMEOUT_CIFRA_MS = 8_000;

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
