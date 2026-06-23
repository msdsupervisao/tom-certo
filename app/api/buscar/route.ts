import { NextRequest, NextResponse } from 'next/server';

export interface ResultadoBusca {
  titulo: string;
  artista: string;
  url: string;
  slug: string;
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'pt-BR,pt;q=0.9',
  'Referer': 'https://www.cifraclub.com.br/',
};

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  if (!query || query.trim().length < 2) {
    return NextResponse.json({ resultados: [] });
  }

  const termoBusca = encodeURIComponent(query.trim());

  // Tentativa 1: endpoint JSON interno
  try {
    const r = await fetch(
      `https://www.cifraclub.com.br/api/search/?q=${termoBusca}&limit=10`,
      { headers: { ...HEADERS, Accept: 'application/json' } }
    );
    if (r.ok) {
      const data = await r.json();
      const resultados = parsearJSON(data);
      if (resultados.length > 0) return NextResponse.json({ resultados });
    }
  } catch (_) {}

  // Tentativa 2: extrair do __NEXT_DATA__ da página de busca
  try {
    const r = await fetch(
      `https://www.cifraclub.com.br/pesquisar/?q=${termoBusca}`,
      { headers: { ...HEADERS, Accept: 'text/html' } }
    );
    if (r.ok) {
      const html = await r.text();
      const resultados = extrairDeNextData(html);
      if (resultados.length > 0) return NextResponse.json({ resultados });
    }
  } catch (_) {}

  return NextResponse.json({ resultados: [] });
}

function parsearJSON(data: unknown): ResultadoBusca[] {
  let items: unknown[] = [];
  if (Array.isArray(data)) items = data;
  else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    items = (obj.items || obj.results || obj.songs || obj.data || []) as unknown[];
  }

  return (items as Record<string, string>[]).slice(0, 8).map((i) => {
    const artistaSlug = s2slug(i.artist_url || i.artist_slug || '');
    const musicaSlug = s2slug(i.song_url || i.url || '');
    const slug = `${artistaSlug}/${musicaSlug}`;
    return {
      titulo: i.song || i.name || s2txt(musicaSlug),
      artista: i.artist || s2txt(artistaSlug),
      url: `https://www.cifraclub.com.br/${slug}/`,
      slug,
    };
  }).filter((r) => r.slug.includes('/') && r.slug.length > 2);
}

function extrairDeNextData(html: string): ResultadoBusca[] {
  try {
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
    if (!match) return [];
    const json = JSON.parse(match[1]);
    const props = json?.props?.pageProps;
    const items = props?.results || props?.songs || props?.data?.results || [];
    if (!Array.isArray(items) || items.length === 0) return [];
    return items.slice(0, 8).map((item: Record<string, string>) => {
      const artistaSlug = s2slug(item.artist_url || item.artist_slug || '');
      const musicaSlug = s2slug(item.song_url || item.url || '');
      const slug = `${artistaSlug}/${musicaSlug}`;
      return {
        titulo: item.song || item.name || s2txt(musicaSlug),
        artista: item.artist || s2txt(artistaSlug),
        url: `https://www.cifraclub.com.br/${slug}/`,
        slug,
      };
    }).filter((r: ResultadoBusca) => r.slug.includes('/'));
  } catch (_) { return []; }
}

function s2slug(v: string): string {
  return v.replace(/^https?:\/\/[^/]+\//i, '').replace(/\/$/, '').split('/').pop() || '';
}

function s2txt(s: string): string {
  return s.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}
