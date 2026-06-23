// app/musica/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { buscarMusicaPorId } from '@/lib/data/songs-mock';
import {
  calcularIntervaloSemitons,
  transporCifraCompleta,
  NomeNota,
} from '@/lib/music-theory';
import { registrarDeteccao, alternarFavorito, ehFavorito, registrarVisita } from '@/lib/historico-local';
import CifraViewer from '@/app/components/CifraViewer';
import GravadorDeTom from '@/app/components/GravadorDeTom';
import Afinador from '@/app/components/Afinador';
import ControleFonte from '@/app/components/ControleFonte';
import Sidebar from '@/app/components/ui/Sidebar';
import Button from '@/app/components/ui/Button';

export default function MusicaPage() {
  const params = useParams();
  const router = useRouter();
  const song = buscarMusicaPorId(params.id as string);

  const [tomDetectado, setTomDetectado] = useState<NomeNota | null>(null);
  const [estabilidade, setEstabilidade] = useState<number | null>(null);
  const [afinadorAberto, setAfinadorAberto] = useState(false);
  const [tamanhoFonte, setTamanhoFonte] = useState(15);
  const [favorito, setFavorito] = useState(false);

  useEffect(() => {
    if (song) {
      setFavorito(ehFavorito(song.id));
      registrarVisita(song.id, song.titulo, song.artista);
    }
  }, [song]);

  if (!song) {
    return (
      <main>
        <p className="text-text-dim">Música não encontrada.</p>
        <Button variante="ghost" onClick={() => router.push('/')} className="mt-4">
          ← Voltar para a busca
        </Button>
      </main>
    );
  }

  const semitons = tomDetectado
    ? calcularIntervaloSemitons(song.tomOriginal as NomeNota, tomDetectado)
    : 0;

  const cifraExibida = tomDetectado
    ? transporCifraCompleta(song.cifra, semitons)
    : song.cifra;

  function handleTomDetectado(nota: NomeNota, estabilidadePercentual: number) {
    setTomDetectado(nota);
    setEstabilidade(estabilidadePercentual);
    registrarDeteccao(song!.id, nota, estabilidadePercentual);
  }

  function resetarTom() {
    setTomDetectado(null);
    setEstabilidade(null);
  }

  function toggleFavorito() {
    const novaLista = alternarFavorito(song!.id);
    setFavorito(novaLista.some((item) => item.id === song!.id));
  }

  const corEstabilidade =
    estabilidade !== null && estabilidade >= 70 ? 'turquesa' : 'amarelo';

  return (
    <main>
      <div className="no-print mb-4 flex items-center justify-between">
        <button onClick={() => router.push('/')} className="text-sm text-text-dim">
          ← Voltar
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFavorito}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-panel"
            aria-label={favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            title="Favoritar"
          >
            {favorito ? '❤️' : '🤍'}
          </button>
          <ControleFonte
            tamanho={tamanhoFonte}
            onAumentar={() => setTamanhoFonte((t) => Math.min(24, t + 1))}
            onDiminuir={() => setTamanhoFonte((t) => Math.max(12, t - 1))}
          />
          <button
            onClick={() => setAfinadorAberto(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-panel"
            aria-label="Abrir afinador de violão"
            title="Afinador"
          >
            🎸
          </button>
          <button
            onClick={() => window.print()}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-panel"
            aria-label="Imprimir ou salvar como PDF"
            title="Imprimir / Salvar PDF"
          >
            🖨️
          </button>
        </div>
      </div>

      <div className="lg:flex lg:gap-8">
        <Sidebar>
          <div className="no-print">
            <header className="mb-5">
              <h1 className="font-display text-2xl font-bold md:text-3xl">
                {song.titulo}
              </h1>
              <p className="text-sm text-text-dim md:text-base">{song.artista}</p>
            </header>

            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full border border-border bg-panel px-3 py-1">
                Tom original: {song.tomOriginal}
              </span>
              {tomDetectado && (
                <span className="rounded-full bg-violeta/15 px-3 py-1 font-medium text-violeta">
                  Seu tom: {tomDetectado} ({semitons > 0 ? '+' : ''}
                  {semitons} semitons)
                </span>
              )}
            </div>

            {!tomDetectado ? (
              <GravadorDeTom onTomDetectado={handleTomDetectado} />
            ) : (
              <div className="mb-4 flex items-center justify-between rounded-xl border border-border bg-panel p-3">
                <span className="flex items-center gap-2 text-sm text-text-dim">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: `var(--${corEstabilidade})` }}
                  />
                  Estabilidade: {estabilidade}%
                </span>
                <button onClick={resetarTom} className="text-sm font-medium text-violeta">
                  Cantar de novo
                </button>
              </div>
            )}
          </div>
        </Sidebar>

        <div className="min-w-0 flex-1">
          <div className="hidden print:block print:mb-4">
            <h1 className="text-xl font-bold">{song.titulo}</h1>
            <p className="text-sm">
              {song.artista} — Tom: {tomDetectado || song.tomOriginal}
            </p>
          </div>

          <div className="mt-5 lg:mt-0">
            <CifraViewer cifra={cifraExibida} tamanhoFonte={tamanhoFonte} />
          </div>
        </div>
      </div>

      <Afinador aberto={afinadorAberto} onFechar={() => setAfinadorAberto(false)} />
    </main>
  );
}