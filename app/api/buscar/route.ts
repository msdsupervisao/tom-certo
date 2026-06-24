import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json({ resultados: [] })
  }

  try {
    const url = `https://www.cifraclub.com.br/search/?q=${encodeURIComponent(q)}&type=cifra`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      return NextResponse.json({ resultados: [], erro: 'Erro ao buscar no Cifra Club' })
    }

    const html = await res.text()

    // Extrai resultados da página de busca do Cifra Club
    const resultados: { titulo: string; artista: string; url: string; slug: string }[] = []

    // Padrão de link de cifra: /artista/musica/
    const regex = /href="\/([a-z0-9\-]+)\/([a-z0-9\-]+)\/"[^>]*>[\s\S]*?<[^>]+class="[^"]*js-search-title[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>[\s\S]*?<[^>]+class="[^"]*js-search-subtitle[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/gi

    // Alternativa: busca por links de cifra com título e artista no JSON embutido
    const jsonMatch = html.match(/window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\});\s*<\/script>/)
    
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1])
        const items = data?.search?.results?.cifra?.items || []
        for (const item of items.slice(0, 10)) {
          const artistSlug = item.artist?.url || ''
          const musicSlug = item.url || ''
          if (artistSlug && musicSlug) {
            resultados.push({
              titulo: item.name || musicSlug,
              artista: item.artist?.name || artistSlug,
              url: `https://www.cifraclub.com.br/${artistSlug}/${musicSlug}/`,
              slug: `${artistSlug}/${musicSlug}`,
            })
          }
        }
      } catch {
        // JSON inválido, cai para regex
      }
    }

    // Fallback: regex simples nos links
    if (resultados.length === 0) {
      const linkRegex = /href="https?:\/\/www\.cifraclub\.com\.br\/([a-z0-9\-]+)\/([a-z0-9\-]+)\/"/gi
      const titleRegex = /<h2[^>]*class="[^"]*gs-title[^"]*"[^>]*>([\s\S]*?)<\/h2>/gi
      
      const links: string[][] = []
      let m: RegExpExecArray | null
      while ((m = linkRegex.exec(html)) !== null && links.length < 10) {
        links.push([m[1], m[2]])
      }

      for (const [artista, musica] of links) {
        const tituloFormatado = musica.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        const artistaFormatado = artista.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        resultados.push({
          titulo: tituloFormatado,
          artista: artistaFormatado,
          url: `https://www.cifraclub.com.br/${artista}/${musica}/`,
          slug: `${artista}/${musica}`,
        })
      }
    }

    return NextResponse.json({ resultados: resultados.slice(0, 8) })
  } catch (error) {
    return NextResponse.json({ resultados: [], erro: 'Erro interno' }, { status: 500 })
  }
}
