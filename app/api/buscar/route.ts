import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json({ resultados: [] })
  }

  try {
    const busca = `site:cifraclub.com.br ${q}`
    const url = `https://www.google.com/search?q=${encodeURIComponent(busca)}&num=10`
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    })

    const html = await res.text()
    const resultados: { titulo: string; artista: string; url: string; slug: string }[] = []

    // Extrai links do cifraclub dos resultados do Google
    const linkRegex = /https?:\/\/www\.cifraclub\.com\.br\/([a-z0-9-]+)\/([a-z0-9-]+)\//g
    const encontrados = new Set<string>()
    let m: RegExpExecArray | null

    while ((m = linkRegex.exec(html)) !== null && resultados.length < 8) {
      const artista = m[1]
      const musica = m[2]
      const slug = `${artista}/${musica}`
      
      if (encontrados.has(slug)) continue
      encontrados.add(slug)

      resultados.push({
        titulo: musica.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        artista: artista.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        url: `https://www.cifraclub.com.br/${slug}/`,
        slug,
      })
    }

    return NextResponse.json({ resultados })
  } catch {
    return NextResponse.json({ resultados: [] })
  }
}