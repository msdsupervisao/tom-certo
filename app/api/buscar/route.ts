import { NextRequest, NextResponse } from 'next/server'
import { buscarNoCatalogo } from '@/lib/data/catalogo-musicas'

interface Resultado {
  titulo: string
  artista: string
  url: string
  slug: string
}

const CACHE_TTL = 1000 * 60 * 60
const searchCache = new Map<string, { ts: number; resultados: Resultado[] }>()

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function slugify(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Remove sufixos tipo "(Ao Vivo)", "(Acústico)", "feat. Fulano" que o iTunes inclui
 * no titulo mas o CifraClub normalmente nao usa no slug da versao principal. */
function tituloBase(titulo: string): string {
  return titulo
    .replace(/[([][^)\]]*[)\]]/g, '')
    .replace(/\bfeat\.?.*$/i, '')
    .trim()
}

function deduplicarResultados(resultados: Resultado[]): Resultado[] {
  const vistos = new Set<string>()
  const unicos: Resultado[] = []

  for (const resultado of resultados) {
    if (!resultado.slug || vistos.has(resultado.slug)) continue
    vistos.add(resultado.slug)
    unicos.push(resultado)
  }

  return unicos.slice(0, 8)
}

/** Confere se existe mesmo uma pagina de cifra nesse slug, sem seguir redirecionamentos
 * (slugs inexistentes redirecionam para a pagina do artista em vez de dar 404 direto). */
async function existeNoCifraClub(slug: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2500)
    const resp = await fetch(`https://www.cifraclub.com.br/${slug}/`, {
      method: 'HEAD',
      redirect: 'manual',
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    return resp.status === 200
  } catch {
    return false
  }
}

/** Busca no iTunes e tenta confirmar a cifra real no CifraClub a partir de artista+titulo. */
async function buscarViaItunes(q: string): Promise<Resultado[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&limit=8&country=BR`
  const resp = await fetch(url)
  if (!resp.ok) {
    throw new Error(`iTunes retornou ${resp.status}`)
  }
  const data = await resp.json()
  const items = (data.results || []) as any[]

  const resultados = await Promise.all(items.map(async (it) => {
    const titulo = it.trackName || it.collectionName || it.trackCensoredName || ''
    const artista = it.artistName || ''
    const slugArtista = slugify(artista)
    const candidatos = [slugify(titulo), slugify(tituloBase(titulo))].filter((s, i, arr) => s && arr.indexOf(s) === i)

    for (const slugTitulo of candidatos) {
      const slugCifraClub = `${slugArtista}/${slugTitulo}`
      if (await existeNoCifraClub(slugCifraClub)) {
        return { titulo, artista, url: `https://www.cifraclub.com.br/${slugCifraClub}/`, slug: slugCifraClub }
      }
    }

    return null
  }))

  return deduplicarResultados(resultados.filter(Boolean) as Resultado[])
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() || ''
  const key = q.toLowerCase()

  if (q.length < 2) {
    return NextResponse.json({ resultados: [] })
  }

  const cached = searchCache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ resultados: cached.resultados })
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

  try {
    const resultados = await buscarViaItunes(q)
    searchCache.set(key, { ts: Date.now(), resultados })
    return NextResponse.json({ resultados })
  } catch (erro) {
    console.warn('[buscar] Fonte externa indisponível:', erro)
    return NextResponse.json(
      {
        resultados: [],
        erro: 'A busca externa está indisponível agora. Tente novamente em alguns segundos.',
      },
      { status: 503 }
    )
  }
}
