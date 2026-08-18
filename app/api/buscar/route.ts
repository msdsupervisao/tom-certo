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

// Endpoint de busca (autocomplete) público do Cifra Club. Pesquisa o acervo inteiro
// e já devolve o slug real de cada música — sem chutar slug nem depender do iTunes.
// A resposta vem embrulhada em parênteses tipo `({ ... })`.
const CIFRACLUB_SEARCH = 'https://solr.sscdn.co/cc/h2/'

interface DocCifraClub {
  t: string   // "1" = artista, "2" = música
  m: string   // nome (título da música)
  a: string   // artista
  d: string   // slug do artista
  u?: string  // slug da música (só existe em música)
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

/** Busca no acervo real do Cifra Club e retorna as músicas com slug pronto. */
async function buscarNoCifraClub(q: string): Promise<Resultado[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4000)
  try {
    const resp = await fetch(`${CIFRACLUB_SEARCH}?q=${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    })
    if (!resp.ok) {
      throw new Error(`Cifra Club retornou ${resp.status}`)
    }

    const texto = await resp.text()
    const inicio = texto.indexOf('(')
    const fim = texto.lastIndexOf(')')
    if (inicio === -1 || fim === -1) {
      throw new Error('Resposta do Cifra Club em formato inesperado')
    }
    const data = JSON.parse(texto.slice(inicio + 1, fim))
    const docs = (data?.response?.docs || []) as DocCifraClub[]

    const resultados = docs
      .filter((d) => d.t === '2' && d.u && d.d)
      .map((d) => ({
        titulo: d.m,
        artista: d.a,
        url: `https://www.cifraclub.com.br/${d.d}/${d.u}/`,
        slug: `${d.d}/${d.u}`,
      }))

    return deduplicarResultados(resultados)
  } finally {
    clearTimeout(timeout)
  }
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

  // Fonte principal: o acervo real do Cifra Club.
  try {
    const resultados = await buscarNoCifraClub(q)
    if (resultados.length > 0) {
      searchCache.set(key, { ts: Date.now(), resultados })
      return NextResponse.json({ resultados })
    }
  } catch (erro) {
    console.warn('[buscar] Cifra Club indisponível, caindo para o catálogo local:', erro)
  }

  // Reserva offline: catálogo curado local (não depende de rede externa).
  const locais = buscarNoCatalogo(q)
  if (locais.length > 0) {
    const resultados = locais.map((m) => ({
      titulo: m.titulo,
      artista: m.artista,
      url: `https://www.cifraclub.com.br/${m.slug}/`,
      slug: m.slug,
    }))
    searchCache.set(key, { ts: Date.now(), resultados })
    return NextResponse.json({ resultados })
  }

  return NextResponse.json({ resultados: [] })
}
