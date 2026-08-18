import { NextRequest, NextResponse } from 'next/server'
import { buscarNoCatalogo } from '@/lib/data/catalogo-musicas'

interface Resultado {
  titulo: string
  artista: string
  url: string
  slug: string
}

interface ArtistaResultado {
  nome: string
  slug: string
  url: string
  imagem?: string | null
}

interface BuscaCifraClub {
  resultados: Resultado[]
  artistas: ArtistaResultado[]
  totalEncontrado: number
}

const CACHE_TTL = 1000 * 60 * 60
const ARTIST_CACHE_TTL = 1000 * 60 * 60 * 6
const searchCache = new Map<string, { ts: number; payload: any }>()
const artistSongsCache = new Map<string, { ts: number; resultados: Resultado[] }>()

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
  i?: string  // caminho da foto (ex.: "8/2/7/b/hash-tb.jpg")
}

/** Monta a URL da foto do artista a partir do campo `i` do Cifra Club.
 * O `i` vem como thumbnail (`...-tb.jpg`); tiramos o `-tb` para pegar a 250x250. */
function imagemCifraClub(i?: string): string | null {
  if (!i) return null
  return `https://akamai.sscdn.co/letras/250x250/fotos/${i.replace('-tb.jpg', '.jpg')}`
}

function decodeEntities(s: string): string {
  const map: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
    '&#x27;': "'",
    '&#39;': "'",
    '&nbsp;': ' ',
    '&aacute;': 'á',
    '&eacute;': 'é',
    '&iacute;': 'í',
    '&oacute;': 'ó',
    '&uacute;': 'ú',
    '&agrave;': 'à',
    '&acirc;': 'â',
    '&ecirc;': 'ê',
    '&ocirc;': 'ô',
    '&atilde;': 'ã',
    '&otilde;': 'õ',
    '&ccedil;': 'ç',
    '&Aacute;': 'Á',
    '&Eacute;': 'É',
    '&Iacute;': 'Í',
    '&Oacute;': 'Ó',
    '&Uacute;': 'Ú',
    '&Atilde;': 'Ã',
    '&Otilde;': 'Õ',
    '&Ccedil;': 'Ç',
  }

  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&[a-zA-Z]+;|&#x27;|&#39;/g, (m) => map[m] ?? m)
}

function limparTextoHtml(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function tituloPorSlug(slugMusica: string): string {
  return slugMusica
    .split('-')
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ')
}

function deduplicarResultados(resultados: Resultado[], limite = 8): Resultado[] {
  const vistos = new Set<string>()
  const unicos: Resultado[] = []

  for (const resultado of resultados) {
    if (!resultado.slug || vistos.has(resultado.slug)) continue
    vistos.add(resultado.slug)
    unicos.push(resultado)
  }

  return unicos.slice(0, limite)
}

function deduplicarArtistas(artistas: ArtistaResultado[]): ArtistaResultado[] {
  const vistos = new Set<string>()
  const unicos: ArtistaResultado[] = []

  for (const artista of artistas) {
    if (!artista.slug || vistos.has(artista.slug)) continue
    vistos.add(artista.slug)
    unicos.push(artista)
  }

  return unicos.slice(0, 5)
}

function parseJsonp(texto: string) {
  const inicio = texto.indexOf('(')
  const fim = texto.lastIndexOf(')')
  if (inicio === -1 || fim === -1 || fim <= inicio) {
    throw new Error('Resposta do Cifra Club em formato inesperado')
  }
  return JSON.parse(texto.slice(inicio + 1, fim))
}

/** Busca no acervo real do Cifra Club e retorna as músicas com slug pronto. */
async function buscarNoCifraClub(q: string): Promise<BuscaCifraClub> {
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

    const data = parseJsonp(await resp.text())
    const docs = (data?.response?.docs || []) as DocCifraClub[]

    const resultados = docs
      .filter((d) => d.t === '2' && d.u && d.d)
      .map((d) => ({
        titulo: d.m,
        artista: d.a,
        url: `https://www.cifraclub.com.br/${d.d}/${d.u}/`,
        slug: `${d.d}/${d.u}`,
      }))

    const artistas = docs
      .filter((d) => d.t === '1' && d.d)
      .map((d) => ({
        nome: d.a || d.m,
        url: `https://www.cifraclub.com.br/${d.d}/`,
        slug: d.d,
        imagem: imagemCifraClub(d.i),
      }))

    return {
      resultados: deduplicarResultados(resultados),
      artistas: deduplicarArtistas(artistas),
      totalEncontrado: Number(data?.response?.numFound || 0),
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function buscarMusicasDoArtista(artista: ArtistaResultado): Promise<Resultado[]> {
  const cached = artistSongsCache.get(artista.slug)
  if (cached && Date.now() - cached.ts < ARTIST_CACHE_TTL) {
    return cached.resultados
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 7000)

  try {
    const resp = await fetch(`https://www.cifraclub.com.br/${artista.slug}/musicas.html`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
      signal: controller.signal,
    })

    if (!resp.ok) {
      throw new Error(`Cifra Club retornou ${resp.status} ao carregar artista`)
    }

    const html = await resp.text()
    const slugEscapado = escapeRegExp(artista.slug)
    const regex = new RegExp(`<a\\s+href="\\/(${slugEscapado}\\/([^"#?\\/]+))\\/"[\\s\\S]*?<\\/a>`, 'g')
    const resultados: Resultado[] = []
    let match: RegExpExecArray | null

    while ((match = regex.exec(html)) !== null) {
      const slug = match[1]
      const slugMusica = match[2]
      const itemHtml = match[0]
      const altMatch = itemHtml.match(/alt="Capa da música &quot;([\s\S]*?)&quot;,[^"]*"/)
      const labelMatch = itemHtml.match(/primaryLabel[^>]*>([\s\S]*?)<\/p>/)
      const titulo = limparTextoHtml(altMatch?.[1] || labelMatch?.[1] || tituloPorSlug(slugMusica))

      resultados.push({
        titulo,
        artista: artista.nome,
        url: `https://www.cifraclub.com.br/${slug}/`,
        slug,
      })
    }

    const unicos = deduplicarResultados(resultados, 500)
    artistSongsCache.set(artista.slug, { ts: Date.now(), resultados: unicos })
    return unicos
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() || ''
  const modo = searchParams.get('modo') === 'artistas' ? 'artistas' : 'musicas'
  const artistaSlug = searchParams.get('artista')?.trim() || ''
  const key = `${modo}:${q.toLowerCase()}:${artistaSlug}`

  if (q.length < 2) {
    return NextResponse.json({ resultados: [], artistas: [], totalEncontrado: 0 })
  }

  const cached = searchCache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.payload)
  }

  // Fonte principal: o acervo real do Cifra Club.
  try {
    const busca = await buscarNoCifraClub(q)
    if (modo === 'artistas') {
      const artistaSelecionado = busca.artistas.find((artista) => artista.slug === artistaSlug) || busca.artistas[0]
      if (!artistaSelecionado) {
        const payload = { resultados: [], artistas: [], totalEncontrado: busca.totalEncontrado }
        searchCache.set(key, { ts: Date.now(), payload })
        return NextResponse.json(payload)
      }
      const resultados = await buscarMusicasDoArtista(artistaSelecionado)
      const payload = {
        resultados,
        artistas: busca.artistas,
        artistaSelecionado,
        totalMusicasArtista: resultados.length,
        totalEncontrado: busca.totalEncontrado,
      }
      searchCache.set(key, { ts: Date.now(), payload })
      return NextResponse.json(payload)
    }
    if (busca.resultados.length > 0) {
      const payload = {
        resultados: busca.resultados,
        artistas: busca.artistas,
        totalEncontrado: busca.totalEncontrado,
      }
      searchCache.set(key, { ts: Date.now(), payload })
      return NextResponse.json(payload)
    }
  } catch (erro) {
    console.warn('[buscar] Cifra Club indisponivel:', erro)
    if (modo === 'artistas') {
      return NextResponse.json(
        {
          resultados: [],
          artistas: [],
          erro: 'Não foi possível carregar a lista completa do artista agora. Tente novamente em alguns segundos.',
        },
        { status: 503 }
      )
    }
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
    const payload = { resultados, artistas: [], totalEncontrado: resultados.length }
    searchCache.set(key, { ts: Date.now(), payload })
    return NextResponse.json(payload)
  }

  return NextResponse.json({ resultados: [], artistas: [], totalEncontrado: 0 })
}
