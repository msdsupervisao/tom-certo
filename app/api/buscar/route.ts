import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json({ resultados: [] })
  }

  try {
    const url = `https://api.cifraclub.com.br/search?q=${encodeURIComponent(q)}&per_page=8`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
        'Referer': 'https://www.cifraclub.com.br/',
      },
    })

    if (!res.ok) {
      return NextResponse.json({ resultados: [] })
    }

    const data = await res.json()
    const items = data?.data || data?.items || data?.results || []

    const resultados = items.slice(0, 8).map((item: any) => ({
      titulo: item.name || item.title || '',
      artista: item.artist?.name || item.artist || '',
      url: `https://www.cifraclub.com.br/${item.artist?.url || ''}/${item.url || ''}/`,
      slug: `${item.artist?.url || ''}/${item.url || ''}`,
    })).filter((r: any) => r.titulo && r.artista)

    return NextResponse.json({ resultados })
  } catch {
    return NextResponse.json({ resultados: [] })
  }
}