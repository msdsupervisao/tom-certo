import type { Metadata } from 'next';
import { buscarMusicaPorId } from '@/lib/data/songs-mock';
import MusicPageClient from './MusicPageClient';

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: slugParam } = await params;
  const slugParts = Array.isArray(slugParam) ? slugParam : slugParam ? [slugParam] : [];
  const slug = slugParts.join('/');
  const mock = slug ? buscarMusicaPorId(slug) : null;

  if (!mock) {
    return {
      title: 'Tom Certo — Cifras no seu tom',
      description: 'Cante um trecho e receba a cifra no seu tom. Ajuste e toque com confiança.',
    };
  }

  const title = `${mock.titulo} — ${mock.artista} | Tom Certo`;
  const description = `Cifra em ${mock.tomOriginal} para ${mock.titulo} de ${mock.artista}. Ajuste o tom e toque com confiança.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}

export default async function MusicaPage({ params }: PageProps) {
  const resolvedParams = await params;
  return <MusicPageClient key={resolvedParams.slug?.join('/') ?? ''} params={resolvedParams} />;
}
