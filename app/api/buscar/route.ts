import { NextRequest, NextResponse } from 'next/server'
import { buscarNoCatalogo } from '@/lib/data/catalogo-musicas'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() || ''
  const resultados = buscarNoCatalogo(q).map(m => ({
    titulo: m.titulo,
    artista: m.artista,
    url: `https://www.cifraclub.com.br/${m.slug}/`,
    slug: m.slug,
  }))
  return NextResponse.json({ resultados })
}