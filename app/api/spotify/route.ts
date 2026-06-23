import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');
  if (!q) return NextResponse.json({ imagem: null });

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&limit=1&country=BR`;
    const resp = await fetch(url);
    const data = await resp.json();
    const item = data?.results?.[0];
    // artworkUrl100 é 100x100, trocamos por 500x500
    const imagem = item?.artworkUrl100?.replace('100x100', '500x500') || null;
    return NextResponse.json({ imagem });
  } catch {
    return NextResponse.json({ imagem: null });
  }
}
