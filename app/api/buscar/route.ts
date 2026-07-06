import { NextRequest, NextResponse } from 'next/server'
import { buscarNoCatalogo } from '@/lib/data/catalogo-musicas'

const CACHE_TTL = 1000 * 60 * 60
const searchCache = new Map<string, { ts: number; resultados: any[] }>()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() || ''
  const key = q.toLowerCase()

  if (!q) {
    return NextResponse.json({ resultados: [] })
  }

  const cached = searchCache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ resultados: cached.resultados })
  }

    try {
      const cifraUrl = `https://www.cifraclub.com.br/busca/?q=${encodeURIComponent(q)}`
      const resp = await fetch(cifraUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          Referer: 'https://www.cifraclub.com.br/',
        },
      })
      const html = await resp.text()

      const found: any[] = []

      // Tenta primeiro extrair dentro de blocos óbvios (ul/li com resultados)
      const listMatch = html.match(/<ul[^>]*class=["'][^"']*(search|result)[^"']*["'][^>]*>([\s\S]*?)<\/ul>/i)
      const area = listMatch ? listMatch[2] : html

      // Padrões múltiplos para capturar link, título e slug
      const patterns = [
        /<a[^>]+href="\/([^"\s>]+\/[^"\s>]+)\/"[^>]*>\s*<span[^>]*class=["'][^"']*titulo[^"']*["'][^>]*>([^<]+)<\/span>/gi,
        /<a[^>]+href="\/([^"\s>]+\/[^"\s>]+)\/"[^>]*>\s*([^<]+?)\s*<\/a>/gi,
        /<a[^>]+href="(https?:\/\/www\.cifraclub\.com\.br\/[^"\s>]+)"[^>]*>([^<]+)<\/a>/gi,
      ]

      for (const pat of patterns) {
        let m: RegExpExecArray | null
        while ((m = pat.exec(area)) !== null && found.length < 8) {
          let slug = m[1]
          let titulo = (m[2] || '').replace(/<[^>]+>/g, '').trim()
          if (!titulo && typeof m[2] === 'string') titulo = m[2].trim()
          // normaliza slug e artista
          if (slug.startsWith('http')) {
            // extrai caminho
            const u = new URL(slug)
            slug = u.pathname.replace(/^\//, '').replace(/\/$/, '')
          }
          const artista = slug.split('/')[0]?.replace(/-/g, ' ') || ''
          const url = `https://www.cifraclub.com.br/${slug}/`
          // evita duplicatas
          if (!found.some(f => f.url === url)) {
            found.push({ titulo: titulo || slug.split('/').pop(), artista, url, slug })
          }
        }
        if (found.length > 0) break
      }

      if (found.length > 0) {
        searchCache.set(key, { ts: Date.now(), resultados: found })
        return NextResponse.json({ resultados: found })
      }
    } catch (e) {
      // prossegue para próximo fallback
    }

  const locais = buscarNoCatalogo(q)
  if (locais.length > 0) {
    const resultados = locais.map(m => ({
      titulo: m.titulo,
      artista: m.artista,
      url: `https://www.cifraclub.com.br/${m.slug}/`,
      slug: m.slug,
    }))
    searchCache.set(key, { ts: Date.now(), resultados })
    return NextResponse.json({ resultados })
  }

    // Fallback 1: tenta buscar no CifraClub (extrai links da página de busca)
    if (q.length >= 2) {
      try {
        const cifraUrl = `https://www.cifraclub.com.br/busca/?q=${encodeURIComponent(q)}`
        const resp = await fetch(cifraUrl)
        const html = await resp.text()
        const re = /<a[^>]+href="\/([^"\s>]+\/[^"\s>]+)\/"[^>]*>([^<]+)<\/a>/g
        const found: any[] = []
        let m: RegExpExecArray | null
        while ((m = re.exec(html)) !== null && found.length < 8) {
          const slug = m[1]
          const titulo = m[2].trim()
          const artista = slug.split('/')[0]?.replace(/-/g, ' ') || ''
          found.push({ titulo, artista, url: `https://www.cifraclub.com.br/${slug}/`, slug })
        }
        if (found.length > 0) {
          searchCache.set(key, { ts: Date.now(), resultados: found })
          return NextResponse.json({ resultados: found })
        }
      } catch (e) {
        // prossegue para próximo fallback
      }
    }

  // Fallback: usa iTunes Search API quando catálogo local vazio
  if (q.length >= 2) {
    try {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&limit=8&country=BR`
      const resp = await fetch(url)
      const data = await resp.json()
      const results = (data.results || []).map((it: any) => {
        const titulo = it.trackName || it.collectionName || it.trackCensoredName || ''
        const artista = it.artistName || ''
        // cria slug simples: artista/titulo
        const slug = `${(artista || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}/${(titulo || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`
        return {
          titulo,
          artista,
          url: it.trackViewUrl || it.collectionViewUrl || null,
          slug,
        }
      })
      searchCache.set(key, { ts: Date.now(), resultados: results })
      return NextResponse.json({ resultados: results })
    } catch (e) {
      // se falhar, retorna vazio
      searchCache.set(key, { ts: Date.now(), resultados: [] })
      return NextResponse.json({ resultados: [] })
    }
  }

  searchCache.set(key, { ts: Date.now(), resultados: [] })
  return NextResponse.json({ resultados: [] })
}